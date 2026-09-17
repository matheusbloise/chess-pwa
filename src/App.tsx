import { useState } from 'react'
import type { Color } from 'chess.js'
import { Board } from './components/Board'
import { GameOverCard } from './components/GameOverCard'
import { MoveHistory } from './components/MoveHistory'
import { PlayerStrip } from './components/PlayerStrip'
import { PromotionDialog } from './components/PromotionDialog'
import { DIFFICULTIES, DIFFICULTY } from './game/ai'
import { TIME_CONTROLS } from './game/clock'
import { colorName, describeResult, opposite, type GameMode } from './game/types'
import { useChessGame } from './hooks/useChessGame'
import './App.css'

const MODES: { id: GameMode; label: string }[] = [
  { id: 'two-players', label: '2 jogadores' },
  { id: 'vs-computer', label: 'vs Computador' },
]

export default function App() {
  const game = useChessGame()
  const [showSettings, setShowSettings] = useState(false)
  /**
   * Posição em que o cartão de fim de jogo foi fechado. Guardar a posição (em
   * vez de um booleano) faz o cartão reaparecer sozinho na próxima partida,
   * sem precisar de efeito para zerar o estado.
   */
  const [dismissedAt, setDismissedAt] = useState<string | null>(null)

  const { status, aiColor, humanColor } = game
  const result = status.result
  const showResultCard = result !== null && dismissedAt !== game.fen

  function playerLabel(color: Color): string {
    if (!aiColor) return colorName(color)
    return color === humanColor
      ? `Você (${colorName(color).toLowerCase()})`
      : `Computador (${colorName(color).toLowerCase()})`
  }

  function statusMessage(): string {
    if (result) return describeResult(result)
    if (game.pendingPromotion) return 'Escolha a peça da promoção.'
    const check = status.inCheck ? ' — Xeque!' : ''
    return `Vez das ${colorName(status.turn)}${check}`
  }

  // Faixa de cima = adversário do lado que está embaixo.
  const bottomColor: Color = game.flipped ? 'b' : 'w'
  const topColor = opposite(bottomColor)

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Xadrez</h1>
        <div className="mode-switch" role="tablist" aria-label="Modo de jogo">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              role="tab"
              type="button"
              aria-selected={game.mode === mode.id}
              className={`mode-switch__btn ${game.mode === mode.id ? 'is-active' : ''}`}
              onClick={() => game.setMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </header>

      <p className="status" aria-live="polite">
        {statusMessage()}
      </p>

      <PlayerStrip
        color={topColor}
        label={playerLabel(topColor)}
        captured={game.captured}
        remainingMs={game.clock.enabled ? game.clock.times[topColor === 'w' ? 'white' : 'black'] : null}
        isTurn={!status.isGameOver && status.turn === topColor}
        isThinking={game.isThinking && aiColor === topColor}
      />

      <div className="board-wrap">
        <Board
          board={game.board}
          turn={status.turn}
          inCheck={status.inCheck}
          legalMoves={game.legalMoves}
          lastMove={game.lastMove}
          positionKey={game.fen}
          flipped={game.flipped}
          canMove={game.canMove}
          onMove={game.move}
        />

        {showResultCard && result && (
          <GameOverCard
            result={result}
            onNewGame={game.newGame}
            onUndo={game.undo}
            onDismiss={() => setDismissedAt(game.fen)}
          />
        )}
      </div>

      <PlayerStrip
        color={bottomColor}
        label={playerLabel(bottomColor)}
        captured={game.captured}
        remainingMs={
          game.clock.enabled
            ? game.clock.times[bottomColor === 'w' ? 'white' : 'black']
            : null
        }
        isTurn={!status.isGameOver && status.turn === bottomColor}
        isThinking={game.isThinking && aiColor === bottomColor}
      />

      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={game.newGame}>
          Nova partida
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={game.undo}
          disabled={game.history.length === 0}
        >
          Desfazer
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={game.resign}
          disabled={status.isGameOver || game.history.length === 0}
        >
          Desistir
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => game.setFlipped(!game.flipped)}
          aria-label="Inverter o tabuleiro"
          title="Inverter o tabuleiro"
        >
          ⇅
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => game.setSoundEnabled(!game.soundEnabled)}
          aria-pressed={game.soundEnabled}
          aria-label={game.soundEnabled ? 'Desligar o som' : 'Ligar o som'}
          title={game.soundEnabled ? 'Desligar o som' : 'Ligar o som'}
        >
          {game.soundEnabled ? '🔊' : '🔇'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShowSettings((open) => !open)}
          aria-expanded={showSettings}
        >
          Ajustes
        </button>
      </div>

      {showSettings && (
        <section className="panel" aria-label="Ajustes da partida">
          <div className="field">
            <span className="field__label" id="time-label">
              Tempo
            </span>
            <div className="chips" role="radiogroup" aria-labelledby="time-label">
              {TIME_CONTROLS.map((control) => (
                <button
                  key={control.id}
                  type="button"
                  role="radio"
                  aria-checked={game.timeControl.id === control.id}
                  className={`chip ${game.timeControl.id === control.id ? 'is-active' : ''}`}
                  onClick={() => game.setTimeControlId(control.id)}
                >
                  {control.label}
                </button>
              ))}
            </div>
            <p className="field__hint">Trocar o tempo começa uma partida nova.</p>
          </div>

          {game.mode === 'vs-computer' && (
            <>
              <div className="field">
                <span className="field__label" id="level-label">
                  Nível do computador
                </span>
                <div className="chips" role="radiogroup" aria-labelledby="level-label">
                  {DIFFICULTIES.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      role="radio"
                      aria-checked={game.difficulty === level.id}
                      className={`chip ${game.difficulty === level.id ? 'is-active' : ''}`}
                      onClick={() => game.setDifficulty(level.id)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
                <p className="field__hint">{DIFFICULTY[game.difficulty].description}</p>
              </div>

              <div className="field">
                <span className="field__label" id="side-label">
                  Você joga de
                </span>
                <div className="chips" role="radiogroup" aria-labelledby="side-label">
                  {(['w', 'b'] as Color[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={humanColor === color}
                      className={`chip ${humanColor === color ? 'is-active' : ''}`}
                      onClick={() => game.setHumanColor(color)}
                    >
                      {colorName(color)}
                    </button>
                  ))}
                </div>
                <p className="field__hint">Trocar de lado começa uma partida nova.</p>
              </div>
            </>
          )}
        </section>
      )}

      <MoveHistory history={game.history} />

      {game.pendingPromotion && (
        <PromotionDialog
          promotion={game.pendingPromotion}
          onChoose={game.confirmPromotion}
          onCancel={game.cancelPromotion}
        />
      )}
    </div>
  )
}
