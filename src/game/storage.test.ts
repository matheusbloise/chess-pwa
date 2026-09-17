import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearState, DEFAULT_STATE, loadState, saveState } from './storage'

/** localStorage de mentira, suficiente para o que storage.ts usa. */
function createMemoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
  }
}

function setStorage(storage: unknown) {
  vi.stubGlobal('window', { localStorage: storage })
}

beforeEach(() => setStorage(createMemoryStorage()))
afterEach(() => vi.unstubAllGlobals())

describe('loadState', () => {
  it('devolve os padrões quando nada foi salvo', () => {
    expect(loadState()).toEqual(DEFAULT_STATE)
  })

  it('faz a volta completa dos dados salvos', () => {
    saveState({
      pgn: '1. e4 e5',
      mode: 'vs-computer',
      difficulty: 'hard',
      humanColor: 'b',
      flipped: true,
      soundEnabled: false,
      timeControlId: '5+3',
      clock: { white: 120_000, black: 95_500 },
    })

    expect(loadState()).toEqual({
      version: 1,
      pgn: '1. e4 e5',
      mode: 'vs-computer',
      difficulty: 'hard',
      humanColor: 'b',
      flipped: true,
      soundEnabled: false,
      timeControlId: '5+3',
      clock: { white: 120_000, black: 95_500 },
    })
  })

  it('ignora campos inválidos e usa o padrão em cada um', () => {
    window.localStorage.setItem(
      'chess-pwa:state',
      JSON.stringify({
        version: 1,
        pgn: 42,
        mode: 'modo-que-nao-existe',
        difficulty: 'impossivel',
        humanColor: 'verde',
        flipped: 'sim',
        soundEnabled: 1,
        timeControlId: '99+99',
        clock: { white: 'muito', black: null },
      }),
    )

    expect(loadState()).toEqual(DEFAULT_STATE)
  })

  it('descarta estado de uma versão diferente', () => {
    window.localStorage.setItem(
      'chess-pwa:state',
      JSON.stringify({ version: 999, pgn: '1. e4', mode: 'vs-computer' }),
    )
    expect(loadState()).toEqual(DEFAULT_STATE)
  })

  it('sobrevive a JSON corrompido', () => {
    window.localStorage.setItem('chess-pwa:state', '{isso não é json')
    expect(loadState()).toEqual(DEFAULT_STATE)
  })

  it('funciona sem localStorage (modo privado ou storage bloqueado)', () => {
    setStorage(undefined)
    expect(loadState()).toEqual(DEFAULT_STATE)

    // E não deve lançar ao tentar gravar.
    expect(() =>
      saveState({ ...DEFAULT_STATE, pgn: '1. e4', clock: null }),
    ).not.toThrow()
  })

  it('não quebra quando o storage lança ao gravar (cota cheia)', () => {
    setStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
    })

    expect(() =>
      saveState({ ...DEFAULT_STATE, pgn: '1. e4', clock: null }),
    ).not.toThrow()
  })
})

describe('clearState', () => {
  it('apaga o estado salvo', () => {
    saveState({ ...DEFAULT_STATE, pgn: '1. d4', clock: null })
    expect(loadState().pgn).toBe('1. d4')

    clearState()
    expect(loadState()).toEqual(DEFAULT_STATE)
  })
})
