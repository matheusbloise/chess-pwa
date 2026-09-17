import { searchBestMove } from './engine'
import type { EngineRequestMessage, EngineResponseMessage } from './engine'

/**
 * Web Worker que executa a busca do motor fora da thread principal, para que
 * a interface continue respondendo (arrastar peças, animações) enquanto a IA
 * calcula.
 *
 * Tipamos `self` manualmente em vez de incluir a lib "webworker" no tsconfig:
 * assim evitamos conflito de declarações com a lib "DOM" usada pelo app.
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<EngineRequestMessage>) => void) | null
  postMessage: (message: EngineResponseMessage) => void
}

ctx.onmessage = (event) => {
  const { id, request } = event.data
  try {
    ctx.postMessage({ id, result: searchBestMove(request) })
  } catch (error) {
    ctx.postMessage({
      id,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
