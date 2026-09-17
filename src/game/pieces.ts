import type { PieceSymbol } from 'chess.js'

/**
 * Glifos Unicode das peças. Usamos sempre os glifos "brancos" (contorno) e
 * damos a cor via CSS, o que mantém a nitidez idêntica nos dois lados.
 * Fonte única de verdade: importe daqui em vez de redeclarar.
 */
export const PIECE_GLYPH: Record<PieceSymbol, string> = {
  k: '\u2654', // ♔ rei
  q: '\u2655', // ♕ dama
  r: '\u2656', // ♖ torre
  b: '\u2657', // ♗ bispo
  n: '\u2658', // ♘ cavalo
  p: '\u2659', // ♙ peão
}

/** Glifos preenchidos, úteis para listas de peças capturadas. */
export const PIECE_GLYPH_SOLID: Record<PieceSymbol, string> = {
  k: '\u265A', // ♚
  q: '\u265B', // ♛
  r: '\u265C', // ♜
  b: '\u265D', // ♝
  n: '\u265E', // ♞
  p: '\u265F', // ♟
}

/** Nomes em português, usados em rótulos acessíveis. */
export const PIECE_NAME: Record<PieceSymbol, string> = {
  k: 'rei',
  q: 'dama',
  r: 'torre',
  b: 'bispo',
  n: 'cavalo',
  p: 'peão',
}

/** Valor clássico das peças, em "peões" — só para exibir vantagem material. */
export const PIECE_POINTS: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

/** Valor em centipeões, usado pela avaliação do motor. */
export const PIECE_CENTIPAWNS: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

/** Peças para as quais um peão pode promover. */
export const PROMOTION_CHOICES = ['q', 'r', 'b', 'n'] as const

export type PromotionPiece = (typeof PROMOTION_CHOICES)[number]
