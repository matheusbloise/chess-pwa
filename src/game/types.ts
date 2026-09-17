import type { Color, PieceSymbol, Square } from 'chess.js'
import { PIECE_POINTS } from './pieces'

/** Modos de jogo suportados. */
export type GameMode = 'two-players' | 'vs-computer'

/** Uma peça em uma casa do tabuleiro. */
export interface BoardPiece {
  square: Square
  type: PieceSymbol
  color: Color
}

/** Por que a partida terminou. */
export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient-material'
  | 'threefold-repetition'
  | 'fifty-moves'
  | 'timeout'
  | 'resignation'

/** Resultado final da partida. */
export interface GameResult {
  /** null = empate. */
  winner: Color | null
  reason: GameOverReason
}

/** Situação atual da partida. */
export interface GameStatus {
  turn: Color
  inCheck: boolean
  /** Preenchido apenas quando a partida acabou. */
  result: GameResult | null
  isGameOver: boolean
}

/** Mapa de casa de origem -> destinos legais (usado para destacar movimentos). */
export type LegalMovesMap = Record<string, Square[]>

/** Resumo de um lance já jogado, suficiente para UI e som. */
export interface MoveSummary {
  from: Square
  to: Square
  san: string
  color: Color
  piece: PieceSymbol
  captured?: PieceSymbol
  promotion?: PieceSymbol
  isCapture: boolean
  isCastle: boolean
  /** Deu xeque no adversário. */
  isCheck: boolean
}

/** Peças capturadas de cada lado e o saldo material. */
export interface CapturedMaterial {
  /** Peças BRANCAS capturadas (portanto, ganhas pelas pretas). */
  white: PieceSymbol[]
  /** Peças PRETAS capturadas (portanto, ganhas pelas brancas). */
  black: PieceSymbol[]
  /** Saldo em pontos: positivo = brancas à frente. */
  advantage: number
}

/** Lance de peão aguardando a escolha da peça de promoção. */
export interface PendingPromotion {
  from: Square
  to: Square
  color: Color
}

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

/** Nome legível da cor em português. */
export function colorName(color: Color): string {
  return color === 'w' ? 'Brancas' : 'Pretas'
}

/** Cor oposta. */
export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

/** Frase que descreve o fim da partida. */
export function describeResult(result: GameResult): string {
  const winner = result.winner ? colorName(result.winner) : null

  switch (result.reason) {
    case 'checkmate':
      return `Xeque-mate! ${winner} venceram.`
    case 'timeout':
      return `Tempo esgotado. ${winner} venceram.`
    case 'resignation':
      return `Desistência. ${winner} venceram.`
    case 'stalemate':
      return 'Empate por afogamento: sem lances legais e sem xeque.'
    case 'insufficient-material':
      return 'Empate por material insuficiente para dar mate.'
    case 'threefold-repetition':
      return 'Empate por repetição da posição três vezes.'
    case 'fifty-moves':
      return 'Empate pela regra dos 50 lances.'
  }
}

/** Calcula peças capturadas e saldo material a partir do histórico. */
export function summarizeCaptures(history: MoveSummary[]): CapturedMaterial {
  const white: PieceSymbol[] = []
  const black: PieceSymbol[] = []

  for (const move of history) {
    if (!move.captured) continue
    // Quem move captura uma peça da cor oposta.
    if (move.color === 'w') black.push(move.captured)
    else white.push(move.captured)
  }

  const points = (pieces: PieceSymbol[]) =>
    pieces.reduce((total, piece) => total + PIECE_POINTS[piece], 0)

  // Brancas ganham material ao capturar peças pretas.
  return { white, black, advantage: points(black) - points(white) }
}

/** Agrupa o histórico em jogadas completas (lance das brancas + das pretas). */
export interface HistoryRow {
  number: number
  white: MoveSummary | null
  black: MoveSummary | null
}

export function toHistoryRows(history: MoveSummary[]): HistoryRow[] {
  const rows: HistoryRow[] = []
  for (const move of history) {
    const last = rows[rows.length - 1]
    if (move.color === 'w' || !last || last.black) {
      rows.push({
        number: rows.length + 1,
        white: move.color === 'w' ? move : null,
        black: move.color === 'b' ? move : null,
      })
    } else {
      last.black = move
    }
  }
  return rows
}
