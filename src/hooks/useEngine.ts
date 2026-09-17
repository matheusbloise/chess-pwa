import { useCallback, useEffect, useMemo, useRef } from 'react'
import { buildSearchRequest, searchBestMoveSync, type Difficulty } from '../game/ai'
import type { EngineResponseMessage, SearchResult } from '../game/engine'

/** Erro usado para descartar uma busca que não interessa mais. */
export class EngineCancelledError extends Error {
  constructor() {
    super('Busca da IA cancelada')
    this.name = 'EngineCancelledError'
  }
}

interface PendingRequest {
  resolve: (result: SearchResult | null) => void
  reject: (error: Error) => void
}

export interface EngineHandle {
  /** Pede o melhor lance para a posição. Rejeita com EngineCancelledError se cancelado. */
  requestMove: (fen: string, difficulty: Difficulty) => Promise<SearchResult | null>
  /** Aborta a busca em andamento (encerra o worker; ele é recriado no próximo pedido). */
  cancel: () => void
}

/**
 * Gerencia o Web Worker do motor: criação sob demanda, correlação de
 * pedidos/respostas, cancelamento e limpeza no desmonte.
 *
 * Se Worker não estiver disponível, cai para a busca síncrona — mais lenta
 * para a UI, mas o jogo continua funcionando.
 */
export function useEngine(): EngineHandle {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef(new Map<number, PendingRequest>())
  const nextIdRef = useRef(1)
  /** Fica true quando a criação do worker falha, para não tentar de novo. */
  const workerUnavailableRef = useRef(false)

  const rejectAllPending = useCallback(() => {
    for (const pending of pendingRef.current.values()) {
      pending.reject(new EngineCancelledError())
    }
    pendingRef.current.clear()
  }, [])

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const getWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current
    if (workerUnavailableRef.current || typeof Worker === 'undefined') return null

    try {
      const worker = new Worker(new URL('../game/engine.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (event: MessageEvent<EngineResponseMessage>) => {
        const { id, result, error } = event.data
        const pending = pendingRef.current.get(id)
        if (!pending) return // resposta de uma busca já cancelada
        pendingRef.current.delete(id)
        if (error) pending.reject(new Error(error))
        else pending.resolve(result)
      }

      worker.onerror = (event) => {
        console.error('Falha no worker do motor de xadrez:', event.message)
        // Derruba o worker e passa a usar o fallback síncrono.
        workerUnavailableRef.current = true
        const failures = [...pendingRef.current.values()]
        pendingRef.current.clear()
        terminateWorker()
        for (const pending of failures) pending.reject(new Error(event.message))
      }

      workerRef.current = worker
      return worker
    } catch (error) {
      console.warn('Web Worker indisponível; usando busca síncrona.', error)
      workerUnavailableRef.current = true
      return null
    }
  }, [terminateWorker])

  const requestMove = useCallback(
    (fen: string, difficulty: Difficulty): Promise<SearchResult | null> => {
      const worker = getWorker()

      if (!worker) {
        // Fallback: adia um tick para a UI conseguir pintar "pensando...".
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              resolve(searchBestMoveSync(fen, difficulty))
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)))
            }
          }, 0)
        })
      }

      const id = nextIdRef.current++
      return new Promise<SearchResult | null>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject })
        worker.postMessage({ id, request: buildSearchRequest(fen, difficulty) })
      })
    },
    [getWorker],
  )

  const cancel = useCallback(() => {
    if (pendingRef.current.size === 0) return
    rejectAllPending()
    // Encerrar é a única forma de realmente parar a busca (não há sinal
    // cooperativo dentro do worker). Ele é recriado no próximo pedido.
    terminateWorker()
  }, [rejectAllPending, terminateWorker])

  useEffect(() => {
    return () => {
      rejectAllPending()
      terminateWorker()
    }
  }, [rejectAllPending, terminateWorker])

  // Identidade estável: este handle entra nas dependências do efeito que
  // dispara a IA, e um objeto novo por render faria o efeito reexecutar sem fim.
  return useMemo(() => ({ requestMove, cancel }), [requestMove, cancel])
}
