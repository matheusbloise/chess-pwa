import { useDroppable } from '@dnd-kit/core'
import type { Square as SquareId } from 'chess.js'
import type { ReactNode } from 'react'

interface SquareProps {
  id: SquareId
  /** true = casa clara, false = casa escura. */
  light: boolean
  /** Destino legal da peça selecionada/arrastada. */
  isLegalTarget: boolean
  /** Faz parte da última jogada. */
  isLastMove: boolean
  /** Rei em xeque nesta casa. */
  isCheck: boolean
  children?: ReactNode
}

export function Square({
  id,
  light,
  isLegalTarget,
  isLastMove,
  isCheck,
  children,
}: SquareProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { square: id } })

  const classes = [
    'square',
    light ? 'square--light' : 'square--dark',
    isLastMove ? 'square--last-move' : '',
    isCheck ? 'square--check' : '',
    isOver ? 'square--over' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={setNodeRef} className={classes} data-square={id}>
      {isLegalTarget && (
        <span className={children ? 'hint hint--capture' : 'hint hint--move'} />
      )}
      {children}
    </div>
  )
}
