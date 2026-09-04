import { useDraggable } from '@dnd-kit/core'
import type { Color, PieceSymbol, Square } from 'chess.js'

/** Símbolos Unicode das peças. Usamos sempre os glifos "brancos" e damos
 *  cor via CSS (fill/contorno) para nitidez consistente em ambos os lados. */
const PIECE_GLYPH: Record<PieceSymbol, string> = {
  k: '\u2654', // ♔ rei
  q: '\u2655', // ♕ dama
  r: '\u2656', // ♖ torre
  b: '\u2657', // ♗ bispo
  n: '\u2658', // ♘ cavalo
  p: '\u2659', // ♙ peão
}

interface PieceProps {
  square: Square
  type: PieceSymbol
  color: Color
  /** Se false, a peça não pode ser arrastada (ex.: turno do oponente). */
  draggable: boolean
}

export function Piece({ square, type, color, draggable }: PieceProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: square,
    disabled: !draggable,
    data: { square },
  })

  return (
    <span
      ref={setNodeRef}
      className={`piece piece--${color === 'w' ? 'white' : 'black'}`}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: draggable ? 'grab' : 'default',
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
      aria-label={`Peça ${type} ${color === 'w' ? 'branca' : 'preta'} em ${square}`}
    >
      {PIECE_GLYPH[type]}
    </span>
  )
}
