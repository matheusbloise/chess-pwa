import { useDraggable } from '@dnd-kit/core'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { PIECE_GLYPH } from '../game/pieces'

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
      // A casa já anuncia peça e posição para leitores de tela; aqui o glifo
      // é puramente decorativo, então evitamos a leitura duplicada.
      aria-hidden="true"
      tabIndex={-1}
    >
      {PIECE_GLYPH[type]}
    </span>
  )
}
