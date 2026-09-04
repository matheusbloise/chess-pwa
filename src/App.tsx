import { Board } from './components/Board'
import { useChessGame } from './hooks/useChessGame'
import { colorName, type GameMode } from './game/types'
import './App.css'

function statusMessage(
  status: ReturnType<typeof useChessGame>['status'],
): string {
  if (status.isCheckmate) {
    return `Xeque-mate! ${colorName(status.winner!)} venceram.`
  }
  if (status.isStalemate) return 'Empate por afogamento (stalemate).'
  if (status.isDraw) return 'Empate.'
  const check = status.inCheck ? ' — Xeque!' : ''
  return `Vez das ${colorName(status.turn)}${check}`
}

export default function App() {
  const game = useChessGame('two-players')

  const modes: { id: GameMode; label: string }[] = [
    { id: 'two-players', label: '2 jogadores' },
    { id: 'vs-computer', label: 'vs Computador' },
  ]

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Xadrez</h1>
        <div className="mode-switch" role="tablist" aria-label="Modo de jogo">
          {modes.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={game.mode === m.id}
              className={`mode-switch__btn ${
                game.mode === m.id ? 'is-active' : ''
              }`}
              onClick={() => game.setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <p className="status" aria-live="polite">
        {statusMessage(game.status)}
      </p>

      <Board
        board={game.board}
        status={game.status}
        legalMoves={game.legalMoves}
        lastMove={game.lastMove}
        lockedColor={game.mode === 'vs-computer' ? game.aiColor : null}
        onMove={game.move}
      />

      <footer className="app__footer">
        <button className="btn btn--primary" onClick={game.reset}>
          Reiniciar
        </button>
        {game.mode === 'vs-computer' && (
          <span className="hint-text">Você joga de brancas; o computador, de pretas.</span>
        )}
      </footer>
    </div>
  )
}
