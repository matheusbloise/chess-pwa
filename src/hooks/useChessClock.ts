import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color } from 'chess.js'
import { initialMs, isTimed, type TimeControl } from '../game/clock'

/** Frequência de atualização do mostrador (10x por segundo). */
const TICK_MS = 100

export interface ClockTimes {
  /** Milissegundos restantes. */
  white: number
  black: number
}

/**
 * Estado do relógio. Guardamos o instante em que o lado ativo começou a pensar
 * (`since`) e descontamos por diferença de timestamps, em vez de acumular
 * ticks — assim o relógio não atrasa se o navegador engasgar ou throttlar a aba.
 */
interface ClockState extends ClockTimes {
  activeColor: Color | null
  since: number | null
}

export interface ChessClockApi {
  /** false em "Sem tempo": não há contagem nem mostrador. */
  enabled: boolean
  /** Milissegundos restantes, já descontando o tempo corrido do lado ativo. */
  times: ClockTimes
  activeColor: Color | null
  isRunning: boolean
  /** Começa a contar para `color` (sem mexer no tempo dos dois lados). */
  startTurn: (color: Color) => void
  /** Fecha o lance de `from` (aplica incremento) e passa o relógio para `to`. */
  switchTurn: (from: Color, to: Color) => void
  /** Congela a contagem, creditando o tempo já corrido. */
  stop: () => void
  /** Volta ao tempo inicial do controle atual, ou aos valores informados. */
  reset: (times?: ClockTimes | null) => void
}

/** Tempos restantes em `at`, descontando o que o lado ativo já gastou. */
function timesAt(state: ClockState, at: number): ClockTimes {
  if (state.activeColor === null || state.since === null) {
    return { white: state.white, black: state.black }
  }
  const elapsed = Math.max(0, at - state.since)
  return state.activeColor === 'w'
    ? { white: Math.max(0, state.white - elapsed), black: state.black }
    : { white: state.white, black: Math.max(0, state.black - elapsed) }
}

/** Credita o tempo corrido ao lado ativo e soma o incremento. */
function commitTimes(state: ClockState, incrementMs: number): ClockTimes {
  const times = timesAt(state, Date.now())
  if (state.activeColor === null) return times
  const key = state.activeColor === 'w' ? 'white' : 'black'
  // Sem incremento se o tempo já zerou: quem perdeu no tempo não ganha bônus.
  const bonus = times[key] > 0 ? incrementMs : 0
  return { ...times, [key]: times[key] + bonus }
}

function remainingFor(times: ClockTimes, color: Color): number {
  return color === 'w' ? times.white : times.black
}

/**
 * Relógio de xadrez com incremento. É dirigido pelos eventos da partida
 * (`startTurn` / `switchTurn` / `stop`), não pelo render.
 *
 * @param control  Controle de tempo escolhido ("Sem tempo" desliga tudo).
 * @param onFlag   Chamado uma vez quando o tempo de um lado zera.
 * @param initial  Tempos restaurados de uma partida salva. Opcional.
 */
export function useChessClock(
  control: TimeControl,
  onFlag: (color: Color) => void,
  initial?: ClockTimes | null,
): ChessClockApi {
  const enabled = isTimed(control)
  const startMs = initialMs(control)
  const incrementMs = control.incrementSeconds * 1000

  const [state, setState] = useState<ClockState>(() => ({
    white: initial?.white ?? startMs,
    black: initial?.black ?? startMs,
    activeColor: null,
    since: null,
  }))

  /**
   * Instante usado para renderizar o mostrador. Fica em estado (e não em ref)
   * para que o cálculo dos tempos durante o render seja uma função pura do
   * estado — o intervalo é quem avança este relógio.
   */
  const [now, setNow] = useState(() => Date.now())

  // Callback em ref: o efeito do intervalo não deve reiniciar quando a
  // identidade da função muda.
  const onFlagRef = useRef(onFlag)
  useEffect(() => {
    onFlagRef.current = onFlag
  }, [onFlag])

  const startTurn = useCallback(
    (color: Color) => {
      if (!enabled) return
      const at = Date.now()
      setState((current) => ({ ...current, activeColor: color, since: at }))
      setNow(at)
    },
    [enabled],
  )

  const switchTurn = useCallback(
    (from: Color, to: Color) => {
      if (!enabled) return
      const at = Date.now()
      setState((current) => {
        // Só cobramos o tempo se o relógio estava mesmo com `from`; no primeiro
        // lance da partida ele ainda está parado, e isso é proposital.
        const times =
          current.activeColor === from
            ? commitTimes(current, incrementMs)
            : { white: current.white, black: current.black }
        return { ...times, activeColor: to, since: at }
      })
      setNow(at)
    },
    [enabled, incrementMs],
  )

  const stop = useCallback(() => {
    if (!enabled) return
    const at = Date.now()
    setState((current) => ({
      ...commitTimes(current, 0),
      activeColor: null,
      since: null,
    }))
    setNow(at)
  }, [enabled])

  const reset = useCallback(
    (times?: ClockTimes | null) => {
      setState({
        white: times?.white ?? startMs,
        black: times?.black ?? startMs,
        activeColor: null,
        since: null,
      })
      setNow(Date.now())
    },
    [startMs],
  )

  // Trocar o controle de tempo recomeça do tempo inicial do novo preset.
  const previousControlId = useRef(control.id)
  useEffect(() => {
    if (previousControlId.current === control.id) return
    previousControlId.current = control.id
    reset()
  }, [control.id, reset])

  const isRunning = enabled && state.activeColor !== null

  // Mostrador e queda de bandeira: só roda enquanto alguém está contando.
  useEffect(() => {
    const active = state.activeColor
    if (!enabled || active === null) return

    const timer = setInterval(() => {
      const at = Date.now()
      const times = timesAt(state, at)

      if (remainingFor(times, active) <= 0) {
        setState({ ...times, activeColor: null, since: null })
        setNow(at)
        onFlagRef.current(active)
        return
      }
      setNow(at)
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [enabled, state])

  // Derivado puro: função do estado e do instante mais recente.
  const times = useMemo(() => timesAt(state, now), [state, now])

  return {
    enabled,
    times,
    activeColor: state.activeColor,
    isRunning,
    startTurn,
    switchTurn,
    stop,
    reset,
  }
}
