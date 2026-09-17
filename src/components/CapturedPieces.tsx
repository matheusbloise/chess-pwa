import type { Color, PieceSymbol } from 'chess.js'
import { PIECE_GLYPH_SOLID, PIECE_POINTS } from '../game/pieces'
import type { CapturedMaterial } from '../game/types'

interface CapturedPiecesProps {
  captured: CapturedMaterial
  /** Lado da barra: mostra as peças que ESTE lado capturou. */
  side: Color
}

/** Peças mais valiosas primeiro, para a lista ficar legível. */
function sortByValue(pieces: PieceSymbol[]): PieceSymbol[] {
  return [...pieces].sort((a, b) => PIECE_POINTS[b] - PIECE_POINTS[a])
}

/**
 * Mostra o que cada lado capturou e o saldo material — informação que antes
 * o jogador precisava contar de cabeça.
 */
export function CapturedPieces({ captured, side }: CapturedPiecesProps) {
  // As brancas capturam peças pretas, e vice-versa.
  const taken = sortByValue(side === 'w' ? captured.black : captured.white)
  const advantage = side === 'w' ? captured.advantage : -captured.advantage

  return (
    <div className="captured" aria-label={`Peças capturadas pelas ${side === 'w' ? 'brancas' : 'pretas'}`}>
      <span className={`captured__pieces captured__pieces--${side === 'w' ? 'black' : 'white'}`}>
        {taken.map((piece, index) => (
          <span key={`${piece}-${index}`} aria-hidden="true">
            {PIECE_GLYPH_SOLID[piece]}
          </span>
        ))}
      </span>
      {advantage > 0 && <span className="captured__score">+{advantage}</span>}
    </div>
  )
}
