import type { Chess, Move } from 'chess.js'

/**
 * Interface de uma IA de xadrez. Recebe a posição atual e devolve a jogada
 * escolhida (ou null se não houver jogadas legais).
 *
 * Manter essa interface permite trocar a implementação (aleatória -> minimax)
 * sem alterar o resto do app.
 */
export interface ChessAI {
  readonly name: string
  chooseMove(game: Chess): Move | null
}

/**
 * IA nível 1: escolhe uma jogada legal totalmente aleatória.
 * Joga mal de propósito — serve para validar o fluxo do modo "vs computador".
 */
export const randomAI: ChessAI = {
  name: 'Aleatória (nível 1)',
  chooseMove(game: Chess): Move | null {
    const moves = game.moves({ verbose: true }) as Move[]
    if (moves.length === 0) return null
    const index = Math.floor(Math.random() * moves.length)
    return moves[index]
  },
}
