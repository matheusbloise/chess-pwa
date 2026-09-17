import { useEffect, useRef } from 'react'
import {
  PIECE_GLYPH,
  PIECE_NAME,
  PROMOTION_CHOICES,
  type PromotionPiece,
} from '../game/pieces'
import { colorName, type PendingPromotion } from '../game/types'

interface PromotionDialogProps {
  promotion: PendingPromotion
  onChoose: (piece: PromotionPiece) => void
  onCancel: () => void
}

/**
 * Modal de escolha da peça na promoção. Antes o app promovia sempre para dama;
 * agora dá para escolher torre, bispo ou cavalo (a subpromoção às vezes é o
 * único lance que ganha, ou o único que evita afogar o adversário).
 */
export function PromotionDialog({
  promotion,
  onChoose,
  onCancel,
}: PromotionDialogProps) {
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)

  // Foco na dama (escolha mais comum) assim que o modal abre.
  useEffect(() => {
    firstButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const side = promotion.color === 'w' ? 'white' : 'black'

  return (
    <div className="modal" role="presentation" onPointerDown={onCancel}>
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
        // Evita que o clique dentro do painel feche o modal.
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className="modal__title" id="promotion-title">
          Promover peão
        </h2>
        <p className="modal__text">
          O peão das {colorName(promotion.color).toLowerCase()} chegou em{' '}
          {promotion.to}. Escolha a peça:
        </p>

        <div className="promotion__options">
          {PROMOTION_CHOICES.map((piece, index) => (
            <button
              key={piece}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              className="promotion__option"
              onClick={() => onChoose(piece)}
            >
              <span className={`piece piece--${side}`} aria-hidden="true">
                {PIECE_GLYPH[piece]}
              </span>
              <span className="promotion__label">{PIECE_NAME[piece]}</span>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
