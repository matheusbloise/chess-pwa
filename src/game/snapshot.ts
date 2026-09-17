import { Chess, type Move, type Square } from 'chess.js'
import {
  opposite,
  type BoardPiece,
  type GameResult,
  type GameStatus,
  type LegalMovesMap,
  type MoveSummary,
} from './types'

/**
 * Derivação pura do estado da partida: dado um `Chess`, produz tudo o que a
 * interface precisa. Fica fora do hook de propósito, para ser testável sem
 * React e para garantir que tabuleiro, status e histórico sejam calculados
 * sempre juntos (nunca meio atualizados).
 */
export interface GameSnapshot {
  fen: string
  board: (BoardPiece | null)[][]
  status: GameStatus
  legalMoves: LegalMovesMap
  /** Chaves `${from}${to}` que correspondem a lances de promoção. */
  promotionMoves: Set<string>
  history: MoveSummary[]
  lastMove: { from: Square; to: Square } | null
}

export function buildResult(game: Chess): GameResult | null {
  // A ordem importa: mate antes de afogamento, e afogamento antes dos empates
  // por material/repetição/50 lances.
  if (game.isCheckmate()) return { winner: opposite(game.turn()), reason: 'checkmate' }
  if (game.isStalemate()) return { winner: null, reason: 'stalemate' }
  if (game.isInsufficientMaterial()) {
    return { winner: null, reason: 'insufficient-material' }
  }
  if (game.isThreefoldRepetition()) {
    return { winner: null, reason: 'threefold-repetition' }
  }
  if (game.isDrawByFiftyMoves()) return { winner: null, reason: 'fifty-moves' }
  return null
}

export function toSummary(move: Move): MoveSummary {
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    color: move.color,
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion,
    isCapture: move.isCapture(),
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    // chess.js marca xeque/mate na própria notação.
    isCheck: move.san.endsWith('+') || move.san.endsWith('#'),
  }
}

export function buildSnapshot(game: Chess): GameSnapshot {
  const legalMoves: LegalMovesMap = {}
  const promotionMoves = new Set<string>()
  for (const move of game.moves({ verbose: true }) as Move[]) {
    const targets = (legalMoves[move.from] ??= [])
    // Uma promoção gera 4 lances (dama, torre, bispo, cavalo) para a mesma
    // casa; a UI só precisa da casa uma vez.
    if (!targets.includes(move.to)) targets.push(move.to)
    if (move.promotion) promotionMoves.add(`${move.from}${move.to}`)
  }

  const history = (game.history({ verbose: true }) as Move[]).map(toSummary)
  const last = history[history.length - 1]
  const result = buildResult(game)

  return {
    fen: game.fen(),
    board: game
      .board()
      .map((row) =>
        row.map((cell) =>
          cell ? { square: cell.square, type: cell.type, color: cell.color } : null,
        ),
      ),
    status: {
      turn: game.turn(),
      inCheck: game.inCheck(),
      result,
      isGameOver: result !== null,
    },
    legalMoves,
    promotionMoves,
    history,
    lastMove: last ? { from: last.from, to: last.to } : null,
  }
}

/** Recria a partida a partir do PGN salvo; PGN inválido cai numa partida nova. */
export function createGame(pgn: string): Chess {
  const game = new Chess()
  if (pgn.trim()) {
    try {
      game.loadPgn(pgn)
    } catch {
      game.reset()
    }
  }
  return game
}
