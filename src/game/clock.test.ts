import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TIME_CONTROL,
  formatClock,
  getTimeControl,
  initialMs,
  isTimed,
  isTimeControlId,
  TIME_CONTROLS,
} from './clock'

describe('controles de tempo', () => {
  it('tem "Sem tempo" como padrão', () => {
    expect(DEFAULT_TIME_CONTROL.id).toBe('unlimited')
    expect(DEFAULT_TIME_CONTROL.initialSeconds).toBeNull()
    expect(isTimed(DEFAULT_TIME_CONTROL)).toBe(false)
    expect(initialMs(DEFAULT_TIME_CONTROL)).toBe(0)
  })

  it('reconhece os presets cronometrados', () => {
    const blitz = getTimeControl('5+3')
    expect(isTimed(blitz)).toBe(true)
    expect(initialMs(blitz)).toBe(300_000)
    expect(blitz.incrementSeconds).toBe(3)
  })

  it('cai no padrão diante de um id desconhecido ou ausente', () => {
    expect(getTimeControl('nao-existe')).toBe(DEFAULT_TIME_CONTROL)
    expect(getTimeControl(null)).toBe(DEFAULT_TIME_CONTROL)
    expect(getTimeControl(undefined)).toBe(DEFAULT_TIME_CONTROL)
  })

  it('valida ids', () => {
    expect(isTimeControlId('10+0')).toBe(true)
    expect(isTimeControlId('99+99')).toBe(false)
    expect(isTimeControlId(42)).toBe(false)
  })

  it('não tem ids repetidos', () => {
    const ids = TIME_CONTROLS.map((control) => control.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('formatClock', () => {
  it('mostra minutos e segundos', () => {
    expect(formatClock(300_000)).toBe('5:00')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(20_000)).toBe('0:20')
  })

  it('mostra décimos abaixo de 20 segundos', () => {
    expect(formatClock(19_999)).toBe('0:19.9')
    expect(formatClock(9_400)).toBe('0:09.4')
  })

  it('inclui horas em partidas longas', () => {
    expect(formatClock(3_600_000)).toBe('1:00:00')
  })

  it('nunca mostra tempo negativo', () => {
    expect(formatClock(0)).toBe('0:00.0')
    expect(formatClock(-5_000)).toBe('0:00.0')
  })
})
