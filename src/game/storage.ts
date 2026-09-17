import type { Color } from 'chess.js'
import { isDifficulty, type Difficulty } from './ai'
import { DEFAULT_TIME_CONTROL, isTimeControlId } from './clock'
import type { GameMode } from './types'

/**
 * Persistência local da partida e das preferências.
 *
 * Guardamos o PGN (e não só o FEN) para preservar o histórico completo, o que
 * mantém "desfazer", a lista de lances e as regras de repetição funcionando
 * depois de recarregar o app.
 */

const STORAGE_KEY = 'chess-pwa:state'
const CURRENT_VERSION = 1

export interface PersistedClock {
  white: number
  black: number
}

export interface PersistedState {
  version: number
  /** PGN da partida em andamento; vazio quando ninguém jogou ainda. */
  pgn: string
  mode: GameMode
  difficulty: Difficulty
  /** Cor do jogador humano no modo vs-computador. */
  humanColor: Color
  /** Tabuleiro invertido (pretas embaixo). */
  flipped: boolean
  soundEnabled: boolean
  timeControlId: string
  /** Tempo restante de cada lado; null quando não há relógio. */
  clock: PersistedClock | null
}

export const DEFAULT_STATE: PersistedState = {
  version: CURRENT_VERSION,
  pgn: '',
  mode: 'two-players',
  difficulty: 'easy',
  humanColor: 'w',
  flipped: false,
  soundEnabled: true,
  timeControlId: DEFAULT_TIME_CONTROL.id,
  clock: null,
}

function getStorage(): Storage | null {
  try {
    // Em modo privado/iframe restrito o acesso pode lançar.
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isMode(value: unknown): value is GameMode {
  return value === 'two-players' || value === 'vs-computer'
}

function isColor(value: unknown): value is Color {
  return value === 'w' || value === 'b'
}

function parseClock(value: unknown): PersistedClock | null {
  if (!value || typeof value !== 'object') return null
  const { white, black } = value as Partial<PersistedClock>
  if (typeof white !== 'number' || typeof black !== 'number') return null
  if (!Number.isFinite(white) || !Number.isFinite(black)) return null
  return { white: Math.max(0, white), black: Math.max(0, black) }
}

/**
 * Lê o estado salvo, validando cada campo. Campos inválidos ou ausentes caem
 * no padrão, então um storage corrompido nunca impede o app de abrir.
 */
export function loadState(): PersistedState {
  const storage = getStorage()
  if (!storage) return { ...DEFAULT_STATE }

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { ...DEFAULT_STATE }
  }
  if (!raw) return { ...DEFAULT_STATE }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (parsed?.version !== CURRENT_VERSION) return { ...DEFAULT_STATE }

    return {
      version: CURRENT_VERSION,
      pgn: typeof parsed.pgn === 'string' ? parsed.pgn : DEFAULT_STATE.pgn,
      mode: isMode(parsed.mode) ? parsed.mode : DEFAULT_STATE.mode,
      difficulty: isDifficulty(parsed.difficulty)
        ? parsed.difficulty
        : DEFAULT_STATE.difficulty,
      humanColor: isColor(parsed.humanColor)
        ? parsed.humanColor
        : DEFAULT_STATE.humanColor,
      flipped:
        typeof parsed.flipped === 'boolean' ? parsed.flipped : DEFAULT_STATE.flipped,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_STATE.soundEnabled,
      timeControlId: isTimeControlId(parsed.timeControlId)
        ? parsed.timeControlId
        : DEFAULT_STATE.timeControlId,
      clock: parseClock(parsed.clock),
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function saveState(state: Omit<PersistedState, 'version'>): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, version: CURRENT_VERSION } satisfies PersistedState),
    )
  } catch {
    // Cota cheia ou storage bloqueado: seguir sem persistir.
  }
}

export function clearState(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Ignorado de propósito.
  }
}
