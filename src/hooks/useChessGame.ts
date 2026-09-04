import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Color, type Square } from 'chess.js'
import { randomAI } from '../game/ai'
import type { BoardPiece, GameMode, GameStatus, LegalMovesMap } from '../game/types'

/** Cor controlada pela IA no modo vs-computador (a IA joga de pretas). */
const AI_COLOR: Color = 'b'
/** Pequeno atraso para a jogada da IA parecer natural (ms). */
const AI_MOVE_DELAY = 400

function buildStatus(game: Chess): GameStatus {
  const isCheckmate = game.isCheckmate()
  return {
    turn: game.turn(),
    inCheck: game.inCheck(),
    isCheckmate,
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    // Em xeque-mate, quem está no turno perdeu; o vencedor é o oponente.
    winner: isCheckmate ? (game.turn() === 'w' ? 'b' : 'w') : null,
  }
}

function buildBoard(game: Chess): (BoardPiece | null)[][] {
  return game.board().map((row) =>
    row.map((cell) =>
      cell ? { square: cell.square, type: cell.type, color: cell.color } : null,
    ),
  )
}

/** Mapa origem -> destinos legais, para destacar jogadas na UI. */
function buildLegalMoves(game: Chess): LegalMovesMap {
  const map: LegalMovesMap = {}
  for (const move of game.moves({ verbose: true })) {
    ;(map[move.from] ??= []).push(move.to as Square)
  }
  return map
}

export interface UseChessGame {
  board: (BoardPiece | null)[][]
  status: GameStatus
  legalMoves: LegalMovesMap
  mode: GameMode
  aiColor: Color
  /** Casa da última jogada, para destaque visual. */
  lastMove: { from: Square; to: Square } | null
  /** Tenta mover; retorna true se a jogada foi legal e aplicada. */
  move: (from: Square, to: Square) => boolean
  /** Destinos legais a partir de uma casa. */
  movesFrom: (square: Square) => Square[]
  reset: () => void
  setMode: (mode: GameMode) => void
}

export function useChessGame(initialMode: GameMode = 'two-players'): UseChessGame {
  const gameRef = useRef(new Chess())
  const [mode, setModeState] = useState<GameMode>(initialMode)
  const [, forceTick] = useState(0)
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)

  const rerender = useCallback(() => forceTick((t) => t + 1), [])

  // FEN é a "impressão digital" da posição: muda a cada jogada e serve como
  // dependência estável para recalcular estado derivado.
  const fen = gameRef.current.fen()
  const status = useMemo(() => buildStatus(gameRef.current), [fen])
  const board = useMemo(() => buildBoard(gameRef.current), [fen])
  const legalMoves = useMemo(() => buildLegalMoves(gameRef.current), [fen])

  const applyMove = useCallback(
    (from: Square, to: Square): boolean => {
      try {
        // promotion 'q': promove sempre para dama (suficiente na v1).
        const result = gameRef.current.move({ from, to, promotion: 'q' })
        if (!result) return false
        setLastMove({ from, to })
        rerender()
        return true
      } catch {
        // chess.js lança em jogada ilegal.
        return false
      }
    },
    [rerender],
  )

  const move = useCallback(
    (from: Square, to: Square): boolean => {
      // No modo vs-computador, o humano só move as próprias peças.
      if (mode === 'vs-computer' && gameRef.current.turn() === AI_COLOR) {
        return false
      }
      return applyMove(from, to)
    },
    [mode, applyMove],
  )

  // Jogada da IA quando for a vez dela (modo vs-computador).
  useEffect(() => {
    if (mode !== 'vs-computer') return
    const game = gameRef.current
    if (game.isGameOver() || game.turn() !== AI_COLOR) return

    const timer = setTimeout(() => {
      const aiMove = randomAI.chooseMove(game)
      if (aiMove) applyMove(aiMove.from as Square, aiMove.to as Square)
    }, AI_MOVE_DELAY)
    return () => clearTimeout(timer)
    // Depende do FEN para reagir a cada mudança de turno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fen, applyMove])

  const movesFrom = useCallback((square: Square): Square[] => {
    return (
      gameRef.current
        .moves({ square, verbose: true })
        .map((m) => m.to as Square) ?? []
    )
  }, [])

  const reset = useCallback(() => {
    gameRef.current.reset()
    setLastMove(null)
    rerender()
  }, [rerender])

  const setMode = useCallback(
    (next: GameMode) => {
      gameRef.current.reset()
      setLastMove(null)
      setModeState(next)
      rerender()
    },
    [rerender],
  )

  return {
    board,
    status,
    legalMoves,
    mode,
    aiColor: AI_COLOR,
    lastMove,
    move,
    movesFrom,
    reset,
    setMode,
  }
}
