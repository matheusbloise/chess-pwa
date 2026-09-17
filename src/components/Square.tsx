import { useDroppable } from '@dnd-kit/core'
import type { Square as SquareId } from 'chess.js'
import type { ReactNode } from 'react'

interface SquareProps {
  id: SquareId
  /** true = casa clara, false = casa escura. */
  light: boolean
  /** Peça selecionada está nesta casa. */
  isSelected: boolean
  /** Destino legal da peça selecionada/arrastada. */
  isLegalTarget: boolean
  /** Faz parte da última jogada. */
  isLastMove: boolean
  /** Rei em xeque nesta casa. */
  isCheck: boolean
  /** Letra da coluna, exibida só na última linha visível. */
  fileLabel?: string
  /** Número da linha, exibido só na primeira coluna visível. */
  rankLabel?: string
  /** Casa que recebe o foco do teclado (roving tabindex do padrão ARIA grid). */
  isFocusTarget: boolean
  /** Descrição para leitores de tela (peça e situação da casa). */
  label: string
  onActivate: (id: SquareId) => void
  onFocus: (id: SquareId) => void
  children?: ReactNode
}

export function Square({
  id,
  light,
  isSelected,
  isLegalTarget,
  isLastMove,
  isCheck,
  fileLabel,
  rankLabel,
  isFocusTarget,
  label,
  onActivate,
  onFocus,
  children,
}: SquareProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { square: id } })

  const classes = [
    'square',
    light ? 'square--light' : 'square--dark',
    isLastMove ? 'square--last-move' : '',
    isSelected ? 'square--selected' : '',
    isCheck ? 'square--check' : '',
    isOver ? 'square--over' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      className={classes}
      data-square={id}
      role="gridcell"
      aria-label={label}
      aria-selected={isSelected}
      tabIndex={isFocusTarget ? 0 : -1}
      // Selecionamos no pointerdown, e não no click: em telas de toque o
      // sensor de arrastar do dnd-kit pode cancelar o click sintético.
      onPointerDown={() => onActivate(id)}
      onFocus={() => onFocus(id)}
    >
      {isLegalTarget && (
        <span className={children ? 'hint hint--capture' : 'hint hint--move'} />
      )}
      {children}
      {rankLabel && <span className="square__rank">{rankLabel}</span>}
      {fileLabel && <span className="square__file">{fileLabel}</span>}
    </div>
  )
}
