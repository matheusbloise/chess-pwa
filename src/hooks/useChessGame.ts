import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color, Move, Square } from 'chess.js'
import { DIFFICULTY, type Difficulty } from '../game/ai'
import { getTimeControl, type TimeControl } from '../game/clock'
import type { PromotionPiece } from '../game/pieces'
import { playSound, setSoundEnabled as applySoundSetting } from '../game/sound'
import {
  buildResult,
  buildSnapshot,
  createGame,
  toSummary,
  type GameSnapshot,
} from '../game/snapshot'
import { loadState, saveState } from '../game/storage'
import {
  opposite,
  summarizeCaptures,
  type BoardPiece,
  type CapturedMaterial,
  type GameMode,
  type GameResult,
  type GameStatus,
  type LegalMovesMap,
  type MoveSummary,
  type PendingPromotion,
} from '../game/types'
import { EngineCancelledError, useEngine } from './useEngine'
import { useChessClock, type ChessClockApi } from './useChessClock'

/** Resultado de uma tentativa de lance, para a UI dar o retorno certo. */
export type MoveOutcome =
  /** Lance aplicado. */
  | 'moved'
  /** É promoção de peão: a UI deve perguntar em qual peça o peão vira. */
  | 'promotion-pending'
  /** Lance ilegal. */
  | 'illegal'
  /** Não é a vez desse lado, a partida acabou, ou há uma promoção em aberto. */
  | 'blocked'

function playMoveSound(summary: MoveSummary, gameOver: boolean): void {
  if (gameOver) playSound('gameEnd')
  else if (summary.isCheck) playSound('check')
  else if (summary.promotion) playSound('promote')
  else if (summary.isCastle) playSound('castle')
  else if (summary.isCapture) playSound('capture')
  else playSound('move')
}

export interface UseChessGame {
  board: (BoardPiece | null)[][]
  /** Posição atual em FEN; muda a cada lance. */
  fen: string
  status: GameStatus
  legalMoves: LegalMovesMap
  history: MoveSummary[]
  captured: CapturedMaterial
  lastMove: { from: Square; to: Square } | null

  mode: GameMode
  difficulty: Difficulty
  /** Cor do humano no modo vs-computador. */
  humanColor: Color
  /** Cor da IA, ou null no modo 2 jogadores. */
  aiColor: Color | null
  /** true enquanto o motor calcula. */
  isThinking: boolean

  flipped: boolean
  soundEnabled: boolean
  timeControl: TimeControl
  clock: ChessClockApi

  /** Promoção aguardando escolha da peça. */
  pendingPromotion: PendingPromotion | null

  /** Cores que o humano pode mover agora (para travar as peças da IA). */
  canMove: (color: Color) => boolean

  move: (from: Square, to: Square) => MoveOutcome
  confirmPromotion: (piece: PromotionPiece) => boolean
  cancelPromotion: () => void
  undo: () => boolean
  resign: () => void
  newGame: () => void

  setMode: (mode: GameMode) => void
  setDifficulty: (difficulty: Difficulty) => void
  setHumanColor: (color: Color) => void
  setTimeControlId: (id: string) => void
  setFlipped: (flipped: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
}

export function useChessGame(): UseChessGame {
  // Preferências e partida salvas: montadas uma única vez, dentro do
  // inicializador do estado (nada de criar objetos a cada render).
  const [initial] = useState(() => {
    const persisted = loadState()
    const game = createGame(persisted.pgn)
    return { persisted, game, snapshot: buildSnapshot(game) }
  })
  const { persisted } = initial

  const gameRef = useRef(initial.game)
  const [snapshot, setSnapshot] = useState<GameSnapshot>(initial.snapshot)
  /** Fim de partida que não vem das regras: tempo esgotado ou desistência. */
  const [manualResult, setManualResult] = useState<GameResult | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  const [mode, setModeState] = useState<GameMode>(persisted.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(persisted.difficulty)
  const [humanColor, setHumanColorState] = useState<Color>(persisted.humanColor)
  const [flipped, setFlipped] = useState(persisted.flipped)
  const [soundEnabled, setSoundEnabledState] = useState(persisted.soundEnabled)
  const [timeControlId, setTimeControlIdState] = useState(persisted.timeControlId)

  const timeControl = useMemo(() => getTimeControl(timeControlId), [timeControlId])
  const engine = useEngine()

  const status: GameStatus = useMemo(() => {
    // O resultado das regras tem prioridade; senão vale tempo/desistência.
    const result = snapshot.status.result ?? manualResult
    return { ...snapshot.status, result, isGameOver: result !== null }
  }, [snapshot.status, manualResult])

  const isGameOver = status.isGameOver
  const aiColor = mode === 'vs-computer' ? opposite(humanColor) : null

  const handleFlag = useCallback((color: Color) => {
    // Quem ficou sem tempo perde.
    setManualResult({ winner: opposite(color), reason: 'timeout' })
    playSound('gameEnd')
  }, [])

  const clock = useChessClock(timeControl, handleFlag, persisted.clock)
  // Métodos do relógio são estáveis; só os tempos mudam a cada tick.
  const { startTurn, switchTurn, stop: stopClock, reset: resetClock } = clock

  const commit = useCallback(() => {
    setSnapshot(buildSnapshot(gameRef.current))
  }, [])

  /** Aplica um lance sem verificar de quem é a vez (usado por humano e IA). */
  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece): boolean => {
      const game = gameRef.current
      let move: Move | null = null
      try {
        move = game.move({ from, to, promotion })
      } catch {
        // chess.js lança em lance ilegal.
        return false
      }
      if (!move) return false

      const summary = toSummary(move)
      const result = buildResult(game)

      if (result) stopClock()
      else switchTurn(summary.color, opposite(summary.color))

      playMoveSound(summary, result !== null)
      commit()
      return true
    },
    [commit, stopClock, switchTurn],
  )

  const canMove = useCallback(
    (color: Color): boolean => {
      if (isGameOver || pendingPromotion) return false
      if (color !== snapshot.status.turn) return false
      // No modo vs-computador o humano só mexe nas próprias peças.
      return aiColor === null || color !== aiColor
    },
    [isGameOver, pendingPromotion, snapshot.status.turn, aiColor],
  )

  const move = useCallback(
    (from: Square, to: Square): MoveOutcome => {
      const game = gameRef.current
      const piece = game.get(from)
      if (!piece || !canMove(piece.color)) return 'blocked'

      if (!(snapshot.legalMoves[from] ?? []).includes(to)) {
        playSound('illegal')
        return 'illegal'
      }

      // Promoção: em vez de assumir dama, devolvemos o controle para a UI
      // abrir o modal de escolha.
      if (snapshot.promotionMoves.has(`${from}${to}`)) {
        setPendingPromotion({ from, to, color: piece.color })
        return 'promotion-pending'
      }

      return applyMove(from, to) ? 'moved' : 'illegal'
    },
    [applyMove, canMove, snapshot.legalMoves, snapshot.promotionMoves],
  )

  const confirmPromotion = useCallback(
    (piece: PromotionPiece): boolean => {
      if (!pendingPromotion) return false
      const { from, to } = pendingPromotion
      setPendingPromotion(null)
      return applyMove(from, to, piece)
    },
    [applyMove, pendingPromotion],
  )

  const cancelPromotion = useCallback(() => setPendingPromotion(null), [])

  const undo = useCallback((): boolean => {
    const game = gameRef.current
    if (game.history().length === 0) return false

    // Interrompe a busca em andamento: o lance dela não vale mais.
    engine.cancel()
    setPendingPromotion(null)
    setManualResult(null)

    game.undo()
    // No modo vs-computador, desfazer um lance devolveria a vez para a IA;
    // desfazemos os dois meios-lances para o humano voltar a jogar.
    if (aiColor && game.turn() === aiColor && game.history().length > 0) {
      game.undo()
    }

    // O relógio não é rebobinado: o tempo gasto foi gasto.
    stopClock()
    playSound('move')
    commit()
    return true
  }, [aiColor, commit, engine, stopClock])

  const resign = useCallback(() => {
    if (isGameOver) return
    // Vs computador quem desiste é sempre o humano; em 2 jogadores, quem
    // está na vez.
    const loser = aiColor ? humanColor : snapshot.status.turn
    engine.cancel()
    stopClock()
    setManualResult({ winner: opposite(loser), reason: 'resignation' })
    playSound('gameEnd')
  }, [aiColor, engine, humanColor, isGameOver, snapshot.status.turn, stopClock])

  const newGame = useCallback(() => {
    engine.cancel()
    gameRef.current.reset()
    setPendingPromotion(null)
    setManualResult(null)
    setIsThinking(false)
    resetClock()
    commit()
  }, [commit, engine, resetClock])

  const setMode = useCallback(
    (next: GameMode) => {
      setModeState(next)
      newGame()
    },
    [newGame],
  )

  const setHumanColor = useCallback(
    (color: Color) => {
      setHumanColorState(color)
      // Jogar de pretas fica mais natural com o tabuleiro invertido.
      setFlipped(color === 'b')
      newGame()
    },
    [newGame],
  )

  const setTimeControlId = useCallback(
    (id: string) => {
      setTimeControlIdState(id)
      // O relógio novo só faz sentido numa partida nova.
      newGame()
    },
    [newGame],
  )

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    applySoundSetting(enabled)
    if (enabled) playSound('move')
  }, [])

  // Mantém o módulo de som alinhado com a preferência salva.
  useEffect(() => {
    applySoundSetting(soundEnabled)
  }, [soundEnabled])

  // Partida restaurada com relógio: retoma a contagem de quem está na vez.
  const resumedRef = useRef(false)
  useEffect(() => {
    if (resumedRef.current) return
    resumedRef.current = true
    const game = gameRef.current
    if (clock.enabled && !isGameOver && game.history().length > 0) {
      startTurn(game.turn())
    }
  }, [clock.enabled, isGameOver, startTurn])

  useEffect(() => {
    if (isGameOver) stopClock()
  }, [isGameOver, stopClock])

  /* ---------------------------- Jogada da IA ---------------------------- */

  useEffect(() => {
    if (!aiColor || isGameOver || pendingPromotion) {
      setIsThinking(false)
      return
    }
    if (snapshot.status.turn !== aiColor) {
      setIsThinking(false)
      return
    }

    let cancelled = false
    const fen = snapshot.fen
    const startedAt = Date.now()
    const { minThinkMs } = DIFFICULTY[difficulty]
    setIsThinking(true)

    engine
      .requestMove(fen, difficulty)
      .then(async (result) => {
        // Um lance instantâneo parece um bug; garantimos um tempo mínimo.
        const remaining = minThinkMs - (Date.now() - startedAt)
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining))
        }
        if (cancelled || !result) return
        // A posição pode ter mudado enquanto pensávamos (desfazer, nova partida).
        if (gameRef.current.fen() !== fen) return
        applyMove(result.from, result.to, result.promotion as PromotionPiece | undefined)
      })
      .catch((error: unknown) => {
        if (error instanceof EngineCancelledError) return
        console.error('Falha ao calcular o lance da IA:', error)
      })
      .finally(() => {
        if (!cancelled) setIsThinking(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    aiColor,
    applyMove,
    difficulty,
    engine,
    isGameOver,
    pendingPromotion,
    snapshot.fen,
    snapshot.status.turn,
  ])

  /* ---------------------------- Persistência ---------------------------- */

  // Os tempos mudam 10x por segundo; guardamos numa ref para não gravar no
  // localStorage a cada tick.
  const clockTimesRef = useRef(clock.times)
  useEffect(() => {
    clockTimesRef.current = clock.times
  })

  const persist = useCallback(() => {
    saveState({
      pgn: gameRef.current.pgn(),
      mode,
      difficulty,
      humanColor,
      flipped,
      soundEnabled,
      timeControlId,
      clock: clock.enabled ? clockTimesRef.current : null,
    })
  }, [
    clock.enabled,
    difficulty,
    flipped,
    humanColor,
    mode,
    soundEnabled,
    timeControlId,
  ])

  useEffect(() => {
    persist()
  }, [persist, snapshot.fen, manualResult])

  // Fechar/minimizar o app deve salvar o relógio na hora exata.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', persist)
    }
  }, [persist])

  const captured = useMemo(() => summarizeCaptures(snapshot.history), [snapshot.history])

  return {
    board: snapshot.board,
    fen: snapshot.fen,
    status,
    legalMoves: snapshot.legalMoves,
    history: snapshot.history,
    captured,
    lastMove: snapshot.lastMove,

    mode,
    difficulty,
    humanColor,
    aiColor,
    isThinking,

    flipped,
    soundEnabled,
    timeControl,
    clock,

    pendingPromotion,
    canMove,

    move,
    confirmPromotion,
    cancelPromotion,
    undo,
    resign,
    newGame,

    setMode,
    setDifficulty,
    setHumanColor,
    setTimeControlId,
    setFlipped,
    setSoundEnabled,
  }
}
