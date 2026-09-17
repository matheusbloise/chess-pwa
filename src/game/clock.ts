/**
 * Controles de tempo. O padrão é "Sem tempo": dá para jogar com calma, sem
 * relógio nenhum na tela — os presets cronometrados são opcionais.
 */

export interface TimeControl {
  id: string
  label: string
  /** Tempo inicial por jogador. null = sem limite (relógio desligado). */
  initialSeconds: number | null
  /** Segundos somados ao relógio de quem acabou de jogar (incremento Fischer). */
  incrementSeconds: number
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'unlimited', label: 'Sem tempo', initialSeconds: null, incrementSeconds: 0 },
  { id: '3+2', label: '3 min + 2s', initialSeconds: 180, incrementSeconds: 2 },
  { id: '5+0', label: '5 min', initialSeconds: 300, incrementSeconds: 0 },
  { id: '5+3', label: '5 min + 3s', initialSeconds: 300, incrementSeconds: 3 },
  { id: '10+0', label: '10 min', initialSeconds: 600, incrementSeconds: 0 },
  { id: '15+10', label: '15 min + 10s', initialSeconds: 900, incrementSeconds: 10 },
]

export const DEFAULT_TIME_CONTROL = TIME_CONTROLS[0]

export function getTimeControl(id: string | undefined | null): TimeControl {
  return TIME_CONTROLS.find((control) => control.id === id) ?? DEFAULT_TIME_CONTROL
}

export function isTimeControlId(value: unknown): value is string {
  return typeof value === 'string' && TIME_CONTROLS.some((c) => c.id === value)
}

/** Relógio ligado? Em "Sem tempo" nada é exibido nem contado. */
export function isTimed(control: TimeControl): boolean {
  return control.initialSeconds !== null
}

/** Tempo inicial em milissegundos (0 quando não há limite). */
export function initialMs(control: TimeControl): number {
  return (control.initialSeconds ?? 0) * 1000
}

/**
 * Formata o tempo restante. Abaixo de 20s mostramos décimos, que é quando
 * cada fração passa a importar.
 */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSeconds = Math.floor(clamped / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  if (clamped < 20_000) {
    const tenths = Math.floor((clamped % 1000) / 100)
    return `${minutes}:${pad(seconds)}.${tenths}`
  }
  return `${minutes}:${pad(seconds)}`
}
