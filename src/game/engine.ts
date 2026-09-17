import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import { PIECE_CENTIPAWNS } from './pieces'

/**
 * Motor de xadrez: negamax com poda alpha-beta, aprofundamento iterativo,
 * ordenação de lances e busca de quiescência.
 *
 * Este módulo é puro (sem React, sem DOM) para poder rodar dentro de um
 * Web Worker e não travar a interface durante a busca.
 */

/** Pontuação atribuída a um mate; valores próximos indicam mate forçado. */
const MATE_SCORE = 100_000
/** Profundidade extra usada apenas para resolver sequências de capturas. */
const QUIESCENCE_DEPTH = 4
/** A cada N nós verificamos o relógio (evita chamar Date.now() sem parar). */
const CLOCK_CHECK_MASK = 1023

/**
 * Tabelas piece-square, escritas do ponto de vista das brancas e na mesma
 * orientação em que o tabuleiro é exibido: índice 0 = a8, índice 63 = h1.
 * Para as pretas espelhamos a fileira (row -> 7 - row).
 *
 * Valores da "Simplified Evaluation Function" (Chess Programming Wiki).
 */
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
]

const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
]

const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
]

const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
]

const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
]

/** Rei no meio-jogo: prefere ficar escondido atrás dos peões. */
const PST_KING_MIDGAME = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
]

/** Rei no final: precisa ser ativo e centralizado. */
const PST_KING_ENDGAME = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
]

const PST: Record<Exclude<PieceSymbol, 'k'>, number[]> = {
  p: PST_PAWN,
  n: PST_KNIGHT,
  b: PST_BISHOP,
  r: PST_ROOK,
  q: PST_QUEEN,
}

/** Abaixo deste total de material sem peões consideramos que é final de jogo. */
const ENDGAME_MATERIAL_THRESHOLD = 2600
/** Bônus por manter o par de bispos. */
const BISHOP_PAIR_BONUS = 30

/**
 * Avalia a posição em centipeões, sempre do ponto de vista das BRANCAS
 * (positivo = brancas melhor).
 */
export function evaluate(game: Chess): number {
  const board = game.board()

  let nonPawnMaterial = 0
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type === 'k' || cell.type === 'p') continue
      nonPawnMaterial += PIECE_CENTIPAWNS[cell.type]
    }
  }
  const endgame = nonPawnMaterial <= ENDGAME_MATERIAL_THRESHOLD

  let score = 0
  let whiteBishops = 0
  let blackBishops = 0

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col]
      if (!cell) continue

      // Espelha a tabela para as pretas.
      const index = cell.color === 'w' ? row * 8 + col : (7 - row) * 8 + col

      let value: number
      if (cell.type === 'k') {
        // O material do rei se anula entre os lados; só a posição importa.
        value = endgame ? PST_KING_ENDGAME[index] : PST_KING_MIDGAME[index]
      } else {
        value = PIECE_CENTIPAWNS[cell.type] + PST[cell.type][index]
        if (cell.type === 'b') {
          if (cell.color === 'w') whiteBishops++
          else blackBishops++
        }
      }

      score += cell.color === 'w' ? value : -value
    }
  }

  if (whiteBishops >= 2) score += BISHOP_PAIR_BONUS
  if (blackBishops >= 2) score -= BISHOP_PAIR_BONUS

  return score
}

/** Avaliação do ponto de vista de quem tem a vez (necessário no negamax). */
function evaluateForSideToMove(game: Chess): number {
  const score = evaluate(game)
  return game.turn() === 'w' ? score : -score
}

/**
 * Heurística de ordenação: quanto antes testarmos bons lances, mais a poda
 * alpha-beta corta. Capturas usam MVV-LVA (vítima valiosa, atacante barato).
 */
function moveOrderScore(move: Move): number {
  let score = 0
  if (move.captured) {
    score += 10_000 + PIECE_CENTIPAWNS[move.captured] - PIECE_CENTIPAWNS[move.piece] / 10
  }
  if (move.promotion) score += 9_000 + PIECE_CENTIPAWNS[move.promotion]
  return score
}

function orderMoves(moves: Move[]): Move[] {
  return moves
    .map((move) => ({ move, score: moveOrderScore(move) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.move)
}

interface SearchContext {
  game: Chess
  nodes: number
  deadline: number
  aborted: boolean
}

function outOfTime(ctx: SearchContext): boolean {
  if (ctx.aborted) return true
  if ((ctx.nodes & CLOCK_CHECK_MASK) === 0 && Date.now() >= ctx.deadline) {
    ctx.aborted = true
  }
  return ctx.aborted
}

function applyMove(game: Chess, move: Move): void {
  game.move({ from: move.from, to: move.to, promotion: move.promotion })
}

/**
 * Empates que não dependem de gerar lances. `isDraw()` chamaria
 * `isStalemate()` (que gera lances de novo), então checamos as regras
 * diretamente para não pagar esse custo duas vezes por nó.
 */
function isNonStalemateDraw(game: Chess): boolean {
  return (
    game.isDrawByFiftyMoves() ||
    game.isThreefoldRepetition() ||
    game.isInsufficientMaterial()
  )
}

/**
 * Busca de quiescência: no horizonte da busca, continua explorando apenas
 * capturas e promoções para não avaliar posições no meio de uma troca
 * (o clássico "efeito horizonte").
 */
function quiescence(
  ctx: SearchContext,
  alpha: number,
  beta: number,
  depthLeft: number,
): number {
  ctx.nodes++
  if (outOfTime(ctx)) return alpha

  const standPat = evaluateForSideToMove(ctx.game)
  if (depthLeft === 0) return standPat
  if (standPat >= beta) return beta
  if (standPat > alpha) alpha = standPat

  const tactical = (ctx.game.moves({ verbose: true }) as Move[]).filter(
    (move) => move.captured || move.promotion,
  )

  for (const move of orderMoves(tactical)) {
    applyMove(ctx.game, move)
    const score = -quiescence(ctx, -beta, -alpha, depthLeft - 1)
    ctx.game.undo()

    if (ctx.aborted) return alpha
    if (score >= beta) return beta
    if (score > alpha) alpha = score
  }

  return alpha
}

/** Negamax com poda alpha-beta. `ply` = distância da raiz (para mates curtos). */
function negamax(
  ctx: SearchContext,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
): number {
  ctx.nodes++
  if (outOfTime(ctx)) return alpha

  const game = ctx.game
  const moves = game.moves({ verbose: true }) as Move[]

  if (moves.length === 0) {
    // Sem lances: mate (perde) ou afogamento (empate).
    return game.inCheck() ? -MATE_SCORE + ply : 0
  }
  if (isNonStalemateDraw(game)) return 0
  if (depth === 0) return quiescence(ctx, alpha, beta, QUIESCENCE_DEPTH)

  let best = -Infinity
  for (const move of orderMoves(moves)) {
    applyMove(game, move)
    const score = -negamax(ctx, depth - 1, -beta, -alpha, ply + 1)
    game.undo()

    if (ctx.aborted) return best === -Infinity ? alpha : best
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break // poda
  }

  return best
}

export interface SearchRequest {
  /** Posição a analisar. */
  fen: string
  /**
   * Profundidade máxima do aprofundamento iterativo.
   * `0` desliga a busca: escolhe um lance legal aleatório (nível "muito fácil").
   */
  depth: number
  /**
   * Ruído aleatório (centipeões) somado à pontuação de cada lance da raiz.
   * Quanto maior, mais a IA erra — é o que define os níveis mais fáceis.
   */
  randomness: number
  /** Teto de tempo. A busca devolve o melhor lance da última profundidade concluída. */
  timeBudgetMs: number
}

export interface SearchResult {
  from: Square
  to: Square
  promotion?: PieceSymbol
  san: string
  /** Avaliação em centipeões, do ponto de vista de quem jogou. */
  score: number
  /** Última profundidade totalmente concluída. */
  depth: number
  nodes: number
  elapsedMs: number
}

/**
 * Escolhe o melhor lance para a posição informada.
 * Retorna null quando não há lances legais (mate ou afogamento).
 */
export function searchBestMove(request: SearchRequest): SearchResult | null {
  const startedAt = Date.now()
  const game = new Chess(request.fen)
  const rootMoves = game.moves({ verbose: true }) as Move[]
  if (rootMoves.length === 0) return null

  // Nível "muito fácil": nenhuma busca, apenas um lance legal sorteado.
  // É o comportamento da IA original do app, mantido como o degrau mais baixo.
  if (request.depth <= 0) {
    const move = rootMoves[Math.floor(Math.random() * rootMoves.length)]
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      score: 0,
      depth: 0,
      nodes: rootMoves.length,
      elapsedMs: Date.now() - startedAt,
    }
  }

  const ctx: SearchContext = {
    game,
    nodes: 0,
    deadline: startedAt + Math.max(1, request.timeBudgetMs),
    aborted: false,
  }

  let order = orderMoves(rootMoves)
  let best = order[0]
  let bestScore = 0
  let completedDepth = 0

  for (let depth = 1; depth <= request.depth; depth++) {
    const scored: { move: Move; score: number }[] = []
    let alpha = -Infinity

    for (const move of order) {
      applyMove(game, move)
      const raw = -negamax(ctx, depth - 1, -Infinity, -alpha, 1)
      game.undo()
      if (ctx.aborted) break

      // O ruído é aplicado na raiz para que os níveis fáceis escolham,
      // de vez em quando, um lance pior de propósito.
      const noise =
        request.randomness > 0 ? (Math.random() * 2 - 1) * request.randomness : 0
      const score = raw + noise

      scored.push({ move, score })
      if (score > alpha) alpha = score
    }

    // Profundidade interrompida pelo relógio: descartamos o resultado parcial
    // e ficamos com o da profundidade anterior, que está completo.
    if (ctx.aborted || scored.length !== order.length) break

    scored.sort((a, b) => b.score - a.score)
    order = scored.map((entry) => entry.move)
    best = scored[0].move
    bestScore = scored[0].score
    completedDepth = depth

    // Mate encontrado: aprofundar mais não muda nada.
    if (Math.abs(bestScore) >= MATE_SCORE - 1000) break
  }

  return {
    from: best.from,
    to: best.to,
    promotion: best.promotion,
    san: best.san,
    score: Math.round(bestScore),
    depth: completedDepth,
    nodes: ctx.nodes,
    elapsedMs: Date.now() - startedAt,
  }
}

/* ------------------------------------------------------------------ *
 * Protocolo de mensagens com o Web Worker (ver engine.worker.ts)
 * ------------------------------------------------------------------ */

export interface EngineRequestMessage {
  /** Correlaciona pedido e resposta. */
  id: number
  request: SearchRequest
}

export interface EngineResponseMessage {
  id: number
  result: SearchResult | null
  /** Preenchido quando a busca falhou dentro do worker. */
  error?: string
}
