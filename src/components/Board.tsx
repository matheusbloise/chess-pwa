import { useState } from 'react'
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
import type { Color, PieceSymbol, Square as SquareId } from 'chess.js'
import { Square } from './Square'
import { Piece } from './Piece'
import { FILES, RANKS } from '../game/types'
import type { BoardPiece, GameStatus, LegalMovesMap } from '../game/types'

const PIECE_GLYPH: Record<PieceSymbol, string> = {
  k: '\u2654',
  q: '\u2655',
  r: '\u2656',
  b: '\u2657',
  n: '\u2658',
  p: '\u2659',
}

interface BoardProps {
  board: (BoardPiece | null)[][]
  status: GameStatus
  legalMoves: LegalMovesMap
  lastMove: { from: SquareId; to: SquareId } | null
  /** Cor cujas peças o humano NÃO controla (ex.: IA). null = ambas jogáveis. */
  lockedColor: Color | null
  onMove: (from: SquareId, to: SquareId) => boolean
}

/** Encontra a casa do rei da cor informada (para destacar xeque). */
function findKing(board: (BoardPiece | null)[][], color: Color): SquareId | null {
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square
    }
  }
  return null
}

export function Board({
  board,
  status,
  legalMoves,
  lastMove,
  lockedColor,
  onMove,
}: BoardProps) {
  const [activeSquare, setActiveSquare] = useState<SquareId | null>(null)
  const [activePiece, setActivePiece] = useState<BoardPiece | null>(null)

  // Sensores: PointerSensor (mouse) + TouchSensor (dedo), com pequena
  // tolerância para não disparar em toques acidentais.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const square = event.active.data.current?.square as SquareId | undefined
    if (!square) return
    setActiveSquare(square)
    const found = board.flat().find((c) => c?.square === square) ?? null
    setActivePiece(found)
  }

  function handleDragEnd(event: DragEndEvent) {
    const from = event.active.data.current?.square as SquareId | undefined
    const to = event.over?.data.current?.square as SquareId | undefined
    setActiveSquare(null)
    setActivePiece(null)
    if (from && to && from !== to) onMove(from, to)
  }

  const checkedKing = status.inCheck ? findKing(board, status.turn) : null
  const legalTargets = activeSquare ? legalMoves[activeSquare] ?? [] : []

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveSquare(null)
        setActivePiece(null)
      }}
    >
      <div className="board" role="grid" aria-label="Tabuleiro de xadrez">
        {RANKS.map((rank, rowIdx) =>
          FILES.map((file, colIdx) => {
            const id = `${file}${rank}` as SquareId
            const piece = board[rowIdx][colIdx]
            const light = (rowIdx + colIdx) % 2 === 0
            const canDrag =
              !!piece &&
              !status.isGameOver &&
              piece.color === status.turn &&
              (lockedColor === null || piece.color !== lockedColor)

            return (
              <Square
                key={id}
                id={id}
                light={light}
                isLegalTarget={legalTargets.includes(id)}
                isLastMove={!!lastMove && (lastMove.from === id || lastMove.to === id)}
                isCheck={checkedKing === id}
              >
                {piece && (
                  <Piece
                    square={id}
                    type={piece.type}
                    color={piece.color}
                    draggable={canDrag}
                  />
                )}
              </Square>
            )
          }),
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activePiece && (
          <span
            className={`piece piece--${
              activePiece.color === 'w' ? 'white' : 'black'
            } piece--dragging`}
          >
            {PIECE_GLYPH[activePiece.type]}
          </span>
        )}
      </DragOverlay>
    </DndContext>
  )
}
