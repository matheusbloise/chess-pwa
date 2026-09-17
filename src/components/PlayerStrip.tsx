import type { Color } from 'chess.js'
import { formatClock } from '../game/clock'
import type { CapturedMaterial } from '../game/types'
import { CapturedPieces } from './CapturedPieces'

interface PlayerStripProps {
  color: Color
  /** Ex.: "Você (brancas)" ou "Computador (pretas)". */
  label: string
  captured: CapturedMaterial
  /** Milissegundos restantes; null quando a partida é sem tempo. */
  remainingMs: number | null
  /** É a vez deste lado. */
  isTurn: boolean
  /** A IA está calculando o lance deste lado. */
  isThinking: boolean
}

/** Faixa de um jogador: nome, capturas, relógio e indicador de vez. */
export function PlayerStrip({
  color,
  label,
  captured,
  remainingMs,
  isTurn,
  isThinking,
}: PlayerStripProps) {
  const lowTime = remainingMs !== null && remainingMs <= 20_000

  return (
    <div className={`player ${isTurn ? 'player--turn' : ''}`}>
      <div className="player__identity">
        <span className={`player__dot player__dot--${color === 'w' ? 'white' : 'black'}`} />
        <span className="player__name">{label}</span>
        {isThinking && (
          <span className="player__thinking" aria-live="polite">
            pensando…
          </span>
        )}
      </div>

      <div className="player__right">
        <CapturedPieces captured={captured} side={color} />
        {remainingMs !== null && (
          <span
            className={`clock ${isTurn ? 'clock--active' : ''} ${lowTime ? 'clock--low' : ''}`}
            aria-label={`Tempo das ${color === 'w' ? 'brancas' : 'pretas'}`}
          >
            {formatClock(remainingMs)}
          </span>
        )}
      </div>
    </div>
  )
}
