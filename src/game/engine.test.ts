import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { evaluate, searchBestMove, type SearchRequest } from './engine'

/** Pedido de busca com valores padrão, para os testes ficarem legíveis. */
function request(fen: string, overrides: Partial<SearchRequest> = {}): SearchRequest {
  return { fen, depth: 2, randomness: 0, timeBudgetMs: 5000, ...overrides }
}

describe('evaluate', () => {
  it('considera a posição inicial equilibrada', () => {
    expect(evaluate(new Chess())).toBe(0)
  })

  it('é simétrica: espelhar a posição e trocar as cores inverte o sinal', () => {
    // Brancas com um cavalo em f1 a mais.
    const white = new Chess('4k3/8/8/8/8/8/8/4KN2 w - - 0 1')
    // Exatamente a mesma posição espelhada na vertical, com as cores trocadas.
    const black = new Chess('4kn2/8/8/8/8/8/8/4K3 w - - 0 1')

    expect(evaluate(white)).toBeGreaterThan(0)
    expect(evaluate(black)).toBeLessThan(0)
    expect(evaluate(white)).toBe(-evaluate(black))
  })

  it('conta vantagem material (pretas sem a dama)', () => {
    const game = new Chess('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(evaluate(game)).toBeGreaterThan(800)
  })
})

describe('searchBestMove', () => {
  it('encontra o mate em um', () => {
    // Torre em e1 dá mate em e8: o rei em g8 está preso pelos próprios peões.
    const result = searchBestMove(request('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1'))
    expect(result?.san).toBe('Re8#')
  })

  it('captura uma dama indefesa', () => {
    const result = searchBestMove(request('4k3/8/8/7q/8/8/8/4K2R w - - 0 1'))
    expect(result?.san).toBe('Rxh5')
  })

  it('não entrega a dama de graça', () => {
    // A dama branca pode ir para h5, onde o peão g6 a captura.
    const fen = 'rnbqkbnr/pppp1p1p/6p1/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3'
    const result = searchBestMove(request(fen, { depth: 3 }))
    expect(result?.san).not.toBe('Qh5')
  })

  it('devolve null quando não há lances legais', () => {
    // Mate do pastor invertido: brancas estão matadas.
    const mated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    expect(new Chess(mated).isCheckmate()).toBe(true)
    expect(searchBestMove(request(mated))).toBeNull()
  })

  it('no nível "muito fácil" (depth 0) sorteia um lance legal, sem buscar', () => {
    const game = new Chess()
    const result = searchBestMove(request(game.fen(), { depth: 0 }))

    expect(result).not.toBeNull()
    expect(result?.depth).toBe(0)
    const legal = game
      .moves({ verbose: true })
      .some((move) => move.from === result?.from && move.to === result?.to)
    expect(legal).toBe(true)
  })

  it('respeita o teto de tempo mesmo com profundidade alta', () => {
    const startedAt = Date.now()
    const result = searchBestMove(
      request(new Chess().fen(), { depth: 20, timeBudgetMs: 300 }),
    )
    const elapsed = Date.now() - startedAt

    expect(result).not.toBeNull()
    // Só a profundidade 1 é obrigatória; o resto é abortado pelo relógio.
    expect(result?.depth).toBeGreaterThanOrEqual(1)
    expect(elapsed).toBeLessThan(5000)
  })

  it('sempre devolve um lance legal na posição inicial', () => {
    const game = new Chess()
    const result = searchBestMove(request(game.fen(), { depth: 3 }))
    expect(game.moves()).toContain(result?.san)
  })

  it('prefere o mate à captura de material', () => {
    // Brancas podem comer a torre indefesa em b2 (+5) ou dar mate com Re8.
    const result = searchBestMove(request('6k1/5ppp/8/8/8/8/1r3PPP/1R2R1K1 w - - 0 1'))
    expect(result?.san).toBe('Re8#')
  })
})
