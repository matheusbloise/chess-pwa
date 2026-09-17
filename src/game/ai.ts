import { searchBestMove, type SearchRequest, type SearchResult } from './engine'

/** Níveis de dificuldade oferecidos no modo "vs computador". */
export type Difficulty = 'random' | 'easy' | 'medium' | 'hard'

export interface DifficultySettings {
  id: Difficulty
  label: string
  /** Texto curto exibido como dica ao selecionar o nível. */
  description: string
  /** Profundidade máxima da busca. 0 = lance aleatório, sem busca. */
  depth: number
  /** Ruído em centipeões somado na raiz: quanto maior, mais a IA erra. */
  randomness: number
  /** Teto de tempo por lance. */
  timeBudgetMs: number
  /** Tempo mínimo de "pensamento", só para o lance não aparecer instantâneo. */
  minThinkMs: number
}

export const DIFFICULTIES: DifficultySettings[] = [
  {
    id: 'random',
    label: 'Muito fácil',
    description: 'Sorteia um lance legal qualquer. Ótimo para quem está aprendendo.',
    depth: 0,
    randomness: 0,
    timeBudgetMs: 50,
    minThinkMs: 350,
  },
  {
    id: 'easy',
    label: 'Fácil',
    description: 'Olha um lance à frente: pega peças de graça, mas erra bastante.',
    depth: 1,
    randomness: 130,
    timeBudgetMs: 500,
    minThinkMs: 300,
  },
  {
    id: 'medium',
    label: 'Médio',
    description: 'Calcula duas jogadas à frente e raramente entrega peças.',
    depth: 2,
    randomness: 45,
    timeBudgetMs: 1500,
    minThinkMs: 250,
  },
  {
    id: 'hard',
    label: 'Difícil',
    description: 'Três jogadas à frente, analisando sequências de capturas.',
    depth: 3,
    randomness: 0,
    timeBudgetMs: 4000,
    minThinkMs: 0,
  },
]

export const DIFFICULTY: Record<Difficulty, DifficultySettings> = Object.fromEntries(
  DIFFICULTIES.map((settings) => [settings.id, settings]),
) as Record<Difficulty, DifficultySettings>

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && value in DIFFICULTY
}

export function buildSearchRequest(fen: string, difficulty: Difficulty): SearchRequest {
  const settings = DIFFICULTY[difficulty]
  return {
    fen,
    depth: settings.depth,
    randomness: settings.randomness,
    timeBudgetMs: settings.timeBudgetMs,
  }
}

/**
 * Busca síncrona, usada como fallback quando o Web Worker não está disponível
 * (navegador antigo, `file://`, política de segurança restritiva).
 * Roda na thread principal, então travará a UI pelo tempo da busca.
 */
export function searchBestMoveSync(
  fen: string,
  difficulty: Difficulty,
): SearchResult | null {
  return searchBestMove(buildSearchRequest(fen, difficulty))
}
