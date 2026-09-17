import { useEffect, useRef } from 'react'
import { toHistoryRows, type MoveSummary } from '../game/types'

interface MoveHistoryProps {
  history: MoveSummary[]
}

/** Lista de lances em notação algébrica, agrupados por jogada. */
export function MoveHistory({ history }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rows = toHistoryRows(history)

  // Acompanha o lance mais recente.
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [history.length])

  return (
    <section className="panel" aria-label="Lances da partida">
      <h2 className="panel__title">Lances</h2>
      {rows.length === 0 ? (
        <p className="panel__empty">A partida ainda não começou.</p>
      ) : (
        <div className="history" ref={scrollRef}>
          <ol className="history__list">
            {rows.map((row) => (
              <li key={row.number} className="history__row">
                <span className="history__number">{row.number}.</span>
                <span className="history__move">{row.white?.san ?? ''}</span>
                <span className="history__move">{row.black?.san ?? ''}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
