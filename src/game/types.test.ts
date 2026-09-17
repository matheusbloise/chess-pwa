import type { Color, PieceSymbol, Square } from 'chess.js'
import { describe, expect, it } from 'vitest'
import {
  colorName,
  describeResult,
  opposite,
  summarizeCaptures,
  toHistoryRows,
  type MoveSummary,
} from './types'

/** MoveSummary mínimo: só o que cada teste precisa. */
function move(
  color: Color,
  san: string,
  captured?: PieceSymbol,
): MoveSummary {
  return {
    from: 'a1' as Square,
    to: 'a2' as Square,
    san,
    color,
    piece: 'p',
    captured,
    isCapture: captured !== undefined,
    isCastle: false,
    isCheck: false,
  }
}

describe('helpers de cor', () => {
  it('nomeia as cores em português', () => {
    expect(colorName('w')).toBe('Brancas')
    expect(colorName('b')).toBe('Pretas')
  })

  it('inverte a cor', () => {
    expect(opposite('w')).toBe('b')
    expect(opposite('b')).toBe('w')
  })
})

describe('summarizeCaptures', () => {
  it('não acusa capturas numa partida sem capturas', () => {
    const result = summarizeCaptures([move('w', 'e4'), move('b', 'e5')])
    expect(result).toEqual({ white: [], black: [], advantage: 0 })
  })

  it('atribui a peça capturada ao lado certo', () => {
    // As brancas capturam um cavalo preto; as pretas capturam um peão branco.
    const result = summarizeCaptures([move('w', 'Nxc6', 'n'), move('b', 'dxe4', 'p')])

    expect(result.black).toEqual(['n']) // peças pretas que saíram do tabuleiro
    expect(result.white).toEqual(['p']) // peças brancas que saíram do tabuleiro
    // Brancas ganharam 3 e perderam 1.
    expect(result.advantage).toBe(2)
  })

  it('calcula saldo negativo quando as pretas estão à frente', () => {
    const result = summarizeCaptures([move('b', 'Qxd1', 'q'), move('w', 'Rxa8', 'r')])
    expect(result.advantage).toBe(-4)
  })
})

describe('toHistoryRows', () => {
  it('agrupa em jogadas completas', () => {
    const rows = toHistoryRows([
      move('w', 'e4'),
      move('b', 'e5'),
      move('w', 'Nf3'),
      move('b', 'Nc6'),
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0].number).toBe(1)
    expect(rows[0].white?.san).toBe('e4')
    expect(rows[0].black?.san).toBe('e5')
    expect(rows[1].white?.san).toBe('Nf3')
    expect(rows[1].black?.san).toBe('Nc6')
  })

  it('deixa a jogada das pretas vazia quando as brancas acabaram de jogar', () => {
    const rows = toHistoryRows([move('w', 'e4')])
    expect(rows).toHaveLength(1)
    expect(rows[0].black).toBeNull()
  })

  it('lida com histórico começando pelas pretas (posição carregada)', () => {
    const rows = toHistoryRows([move('b', 'e5'), move('w', 'Nf3')])
    expect(rows).toHaveLength(2)
    expect(rows[0].white).toBeNull()
    expect(rows[0].black?.san).toBe('e5')
    expect(rows[1].white?.san).toBe('Nf3')
  })

  it('devolve lista vazia sem lances', () => {
    expect(toHistoryRows([])).toEqual([])
  })
})

describe('describeResult', () => {
  it('descreve vitórias', () => {
    expect(describeResult({ winner: 'w', reason: 'checkmate' })).toContain('Xeque-mate')
    expect(describeResult({ winner: 'b', reason: 'timeout' })).toContain('Tempo esgotado')
    expect(describeResult({ winner: 'w', reason: 'resignation' })).toContain(
      'Desistência',
    )
  })

  it('distingue os motivos de empate, em vez de só dizer "empate"', () => {
    const reasons = [
      'stalemate',
      'insufficient-material',
      'threefold-repetition',
      'fifty-moves',
    ] as const

    const messages = reasons.map((reason) => describeResult({ winner: null, reason }))

    expect(messages[0]).toContain('afogamento')
    expect(messages[1]).toContain('material insuficiente')
    expect(messages[2]).toContain('repetição')
    expect(messages[3]).toContain('50 lances')
    // Cada motivo tem a sua própria frase.
    expect(new Set(messages).size).toBe(reasons.length)
  })
})
