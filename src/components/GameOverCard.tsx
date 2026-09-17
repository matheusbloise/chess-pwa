import { colorName, describeResult, type GameResult } from '../game/types'

interface GameOverCardProps {
  result: GameResult
  onNewGame: () => void
  onUndo: () => void
  onDismiss: () => void
}

/** Cartão sobre o tabuleiro anunciando o fim da partida e o que fazer agora. */
export function GameOverCard({
  result,
  onNewGame,
  onUndo,
  onDismiss,
}: GameOverCardProps) {
  const headline = result.winner
    ? `${colorName(result.winner)} venceram`
    : 'Empate'

  return (
    <div className="gameover" role="alertdialog" aria-labelledby="gameover-title">
      <div className="gameover__card">
        <h2 className="gameover__title" id="gameover-title">
          {headline}
        </h2>
        <p className="gameover__reason">{describeResult(result)}</p>
        <div className="gameover__actions">
          <button type="button" className="btn btn--primary" onClick={onNewGame}>
            Nova partida
          </button>
          <button type="button" className="btn btn--ghost" onClick={onUndo}>
            Desfazer lance
          </button>
        </div>
        <button
          type="button"
          className="gameover__dismiss"
          onClick={onDismiss}
          aria-label="Fechar aviso e ver a posição final"
        >
          ver o tabuleiro
        </button>
      </div>
    </div>
  )
}
