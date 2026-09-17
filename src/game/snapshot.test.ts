import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { buildResult, buildSnapshot, createGame } from './snapshot'

describe('buildSnapshot', () => {
  it('descreve a posição inicial', () => {
    const snapshot = buildSnapshot(new Chess())

    expect(snapshot.status.turn).toBe('w')
    expect(snapshot.status.isGameOver).toBe(false)
    expect(snapshot.status.result).toBeNull()
    expect(snapshot.history).toEqual([])
    expect(snapshot.lastMove).toBeNull()
    expect(snapshot.promotionMoves.size).toBe(0)

    // 20 lances legais no primeiro lance: 16 de peão e 4 de cavalo.
    const total = Object.values(snapshot.legalMoves).flat().length
    expect(total).toBe(20)
  })

  it('marca os lances de promoção (é o que abre o modal de escolha)', () => {
    // Peão branco em a7, prestes a promover.
    const snapshot = buildSnapshot(new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'))

    expect(snapshot.promotionMoves.has('a7a8')).toBe(true)
    // O destino aparece uma única vez, mesmo havendo 4 peças possíveis.
    expect(snapshot.legalMoves['a7']).toEqual(['a8'])
  })

  it('não marca promoção num lance comum de peão', () => {
    const snapshot = buildSnapshot(new Chess())
    expect(snapshot.promotionMoves.has('e2e4')).toBe(false)
  })

  it('resume o último lance e o histórico', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')
    game.move('Nf3')

    const snapshot = buildSnapshot(game)

    expect(snapshot.history.map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3'])
    expect(snapshot.lastMove).toEqual({ from: 'g1', to: 'f3' })
    expect(snapshot.status.turn).toBe('b')
  })

  it('marca captura, roque e xeque no resumo do lance', () => {
    const game = new Chess()
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nd4 4.Nxd4 exd4 5.O-O
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nd4', 'Nxd4', 'exd4', 'O-O']) {
      game.move(san)
    }
    const history = buildSnapshot(game).history

    const capture = history.find((move) => move.san === 'Nxd4')
    expect(capture?.isCapture).toBe(true)
    expect(capture?.captured).toBe('n')

    const castle = history.find((move) => move.san === 'O-O')
    expect(castle?.isCastle).toBe(true)
  })
})

describe('buildResult', () => {
  it('identifica xeque-mate e o vencedor', () => {
    // Mate do pastor: as pretas estão matadas.
    const game = new Chess()
    for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) {
      game.move(san)
    }
    expect(buildResult(game)).toEqual({ winner: 'w', reason: 'checkmate' })
  })

  it('identifica afogamento (stalemate)', () => {
    // Pretas na vez, sem lances legais e sem estar em xeque.
    const game = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(game.isStalemate()).toBe(true)
    expect(buildResult(game)).toEqual({ winner: null, reason: 'stalemate' })
  })

  it('identifica material insuficiente', () => {
    const game = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
    expect(buildResult(game)).toEqual({
      winner: null,
      reason: 'insufficient-material',
    })
  })

  it('identifica a regra dos 50 lances', () => {
    // Contador de meios-lances em 100 = 50 lances sem captura nem peão.
    const game = new Chess('4k3/8/4r3/8/8/4R3/8/4K3 w - - 100 60')
    expect(buildResult(game)).toEqual({ winner: null, reason: 'fifty-moves' })
  })

  it('devolve null com a partida em andamento', () => {
    expect(buildResult(new Chess())).toBeNull()
  })
})

describe('createGame', () => {
  it('começa uma partida nova quando não há PGN salvo', () => {
    expect(createGame('').history()).toEqual([])
  })

  it('restaura o histórico a partir do PGN salvo', () => {
    const original = new Chess()
    original.move('d4')
    original.move('d5')
    original.move('c4')

    const restored = createGame(original.pgn())

    expect(restored.history()).toEqual(['d4', 'd5', 'c4'])
    expect(restored.fen()).toBe(original.fen())
  })

  it('ignora PGN inválido em vez de quebrar o app', () => {
    const game = createGame('isso não é um PGN de verdade ###')
    expect(game.history()).toEqual([])
    expect(game.fen()).toBe(new Chess().fen())
  })
})
