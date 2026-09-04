import type { Color, PieceSymbol, Square } from 'chess.js'

/** Modos de jogo suportados na v1. */
export type GameMode = 'two-players' | 'vs-computer'

/** Uma peça em uma casa do tabuleiro. */
export interface BoardPiece {
  square: Square
  type: PieceSymbol
  color: Color
}

/** Situação atual da partida, derivada do estado do chess.js. */
export interface GameStatus {
  turn: Color
  inCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
  /** Vencedor quando há xeque-mate, senão null. */
  winner: Color | null
}

/** Mapa de casa de origem -> destinos legais (usado para destacar movimentos). */
export type LegalMovesMap = Record<string, Square[]>

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

/** Nome legível da cor em português. */
export function colorName(color: Color): string {
  return color === 'w' ? 'Brancas' : 'Pretas'
}
