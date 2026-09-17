import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Color, Square as SquareId } from 'chess.js'
import { Square } from './Square'
import { Piece } from './Piece'
import { PIECE_GLYPH, PIECE_NAME } from '../game/pieces'
import { FILES, RANKS } from '../game/types'
import type { BoardPiece, LegalMovesMap } from '../game/types'

interface BoardProps {
  board: (BoardPiece | null)[][]
  turn: Color
  inCheck: boolean
  legalMoves: LegalMovesMap
  lastMove: { from: SquareId; to: SquareId } | null
  /** Muda a cada posição nova; usado para limpar a seleção. */
  positionKey: string
  /** Pretas embaixo. */
  flipped: boolean
  /** Se o humano pode mover peças dessa cor agora. */
  canMove: (color: Color) => boolean
  onMove: (from: SquareId, to: SquareId) => unknown
}

function pieceLabel(piece: BoardPiece): string {
  return `${PIECE_NAME[piece.type]} das ${piece.color === 'w' ? 'brancas' : 'pretas'}`
}

export function Board({
  board,
  turn,
  inCheck,
  legalMoves,
  lastMove,
  positionKey,
  flipped,
  canMove,
  onMove,
}: BoardProps) {
  const [selected, setSelected] = useState<SquareId | null>(null)
  const [dragging, setDragging] = useState<SquareId | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)

  // Ordem visível das colunas/linhas: inverter só muda a apresentação.
  const files = useMemo(() => (flipped ? [...FILES].reverse() : [...FILES]), [flipped])
  const ranks = useMemo(() => (flipped ? [...RANKS].reverse() : [...RANKS]), [flipped])

  const [focused, setFocused] = useState<SquareId>(() => `${files[0]}${ranks[0]}` as SquareId)

  /** Peças indexadas pela casa: o array vem em linhas de rank 8 a 1. */
  const pieces = useMemo(() => {
    const map = new Map<SquareId, BoardPiece>()
    for (const row of board) {
      for (const cell of row) {
        if (cell) map.set(cell.square, cell)
      }
    }
    return map
  }, [board])

  const checkedKing = useMemo(() => {
    if (!inCheck) return null
    for (const piece of pieces.values()) {
      if (piece.type === 'k' && piece.color === turn) return piece.square
    }
    return null
  }, [inCheck, pieces, turn])

  // Posição nova (inclusive lance da IA): a seleção antiga não vale mais.
  // Ajuste durante o render, que é o padrão recomendado para "zerar estado
  // quando uma prop muda" — evita o render extra de um efeito.
  const [seenPosition, setSeenPosition] = useState(positionKey)
  if (seenPosition !== positionKey) {
    setSeenPosition(positionKey)
    setSelected(null)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
  )

  const activeSquare = dragging ?? selected
  const targets = activeSquare ? legalMoves[activeSquare] ?? [] : []

  function activate(id: SquareId) {
    if (selected) {
      if (id === selected) {
        setSelected(null)
        return
      }
      if ((legalMoves[selected] ?? []).includes(id)) {
        onMove(selected, id)
        setSelected(null)
        return
      }
    }
    const piece = pieces.get(id)
    setSelected(piece && canMove(piece.color) ? id : null)
  }

  /** Navegação por setas dentro da grade (padrão ARIA grid). */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate(focused)
      return
    }
    if (event.key === 'Escape') {
      setSelected(null)
      return
    }

    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()

    const col = files.indexOf(focused[0] as (typeof FILES)[number])
    const row = ranks.indexOf(focused[1] as (typeof RANKS)[number])
    const nextCol = Math.min(7, Math.max(0, col + delta[0]))
    const nextRow = Math.min(7, Math.max(0, row + delta[1]))
    const next = `${files[nextCol]}${ranks[nextRow]}` as SquareId

    setFocused(next)
    boardRef.current
      ?.querySelector<HTMLElement>(`[data-square="${next}"]`)
      ?.focus()
  }

  function handleDragStart(event: DragStartEvent) {
    const square = event.active.data.current?.square as SquareId | undefined
    if (!square) return
    setDragging(square)
    setSelected(square)
  }

  function handleDragEnd(event: DragEndEvent) {
    const from = event.active.data.current?.square as SquareId | undefined
    const to = event.over?.data.current?.square as SquareId | undefined
    setDragging(null)
    if (from && to && from !== to) {
      onMove(from, to)
      setSelected(null)
    }
  }

  const draggedPiece = dragging ? pieces.get(dragging) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div
        ref={boardRef}
        className="board"
        role="grid"
        aria-label="Tabuleiro de xadrez"
        onKeyDown={handleKeyDown}
      >
        {ranks.map((rank, rowIdx) => (
          // display:contents mantém a grade 8x8 do CSS e ainda expõe as linhas
          // para leitores de tela.
          <div key={rank} role="row" className="board__row">
            {files.map((file, colIdx) => {
              const id = `${file}${rank}` as SquareId
              const piece = pieces.get(id) ?? null
              // A cor da casa depende da posição real, não da orientação.
              const light =
                (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0
              const isTarget = targets.includes(id)

              return (
                <Square
                  key={id}
                  id={id}
                  light={light}
                  isSelected={selected === id}
                  isLegalTarget={isTarget}
                  isLastMove={
                    !!lastMove && (lastMove.from === id || lastMove.to === id)
                  }
                  isCheck={checkedKing === id}
                  isFocusTarget={focused === id}
                  // Coordenadas apenas na borda visível, como num tabuleiro real.
                  rankLabel={colIdx === 0 ? rank : undefined}
                  fileLabel={rowIdx === 7 ? file : undefined}
                  label={[
                    id,
                    piece ? pieceLabel(piece) : 'vazia',
                    isTarget ? 'destino possível' : '',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onActivate={activate}
                  onFocus={setFocused}
                >
                  {piece && (
                    <Piece
                      square={id}
                      type={piece.type}
                      color={piece.color}
                      draggable={canMove(piece.color)}
                    />
                  )}
                </Square>
              )
            })}
          </div>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggedPiece && (
          <span
            className={`piece piece--${
              draggedPiece.color === 'w' ? 'white' : 'black'
            } piece--dragging`}
          >
            {PIECE_GLYPH[draggedPiece.type]}
          </span>
        )}
      </DragOverlay>
    </DndContext>
  )
}
