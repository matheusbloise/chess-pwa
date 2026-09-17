/**
 * Efeitos sonoros sintetizados via Web Audio API.
 *
 * Sintetizamos em vez de embutir arquivos de áudio para não aumentar o
 * tamanho do PWA nem depender de rede/cache para o som funcionar offline.
 */

export type SoundName =
  | 'move'
  | 'capture'
  | 'castle'
  | 'promote'
  | 'check'
  | 'gameEnd'
  | 'illegal'

type AudioContextConstructor = new () => AudioContext

let audioContext: AudioContext | null = null
let enabled = false

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioContext) return audioContext

  const Ctor =
    window.AudioContext ??
    ((window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext as AudioContextConstructor | undefined)
  if (!Ctor) return null

  try {
    audioContext = new Ctor()
  } catch {
    return null
  }
  return audioContext
}

export function setSoundEnabled(next: boolean): void {
  enabled = next
  // Navegadores só liberam o áudio depois de um gesto do usuário; ligar o som
  // é justamente um gesto, então aproveitamos para destravar o contexto.
  if (next) void getAudioContext()?.resume()
}

export function isSoundEnabled(): boolean {
  return enabled
}

interface ToneOptions {
  freq: number
  /** Frequência final, para um leve glissando. */
  freqTo?: number
  type?: OscillatorType
  /** Duração em segundos. */
  duration: number
  gain: number
  /** Atraso em segundos a partir de agora. */
  delay?: number
}

function playTone(ctx: AudioContext, options: ToneOptions): void {
  const { freq, freqTo, type = 'triangle', duration, gain, delay = 0 } = options
  const startAt = ctx.currentTime + delay
  const endAt = startAt + duration

  const oscillator = ctx.createOscillator()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, startAt)
  if (freqTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), endAt)
  }

  // Envelope curto: ataque rápido e decaimento exponencial evitam o "clique".
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, startAt)
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.008)
  envelope.gain.exponentialRampToValueAtTime(0.0001, endAt)

  oscillator.connect(envelope).connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

function playNoise(
  ctx: AudioContext,
  options: { duration: number; gain: number; cutoff: number },
): void {
  const { duration, gain, cutoff } = options
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < frameCount; i++) {
    // Ruído branco com decaimento linear: soa como um impacto seco.
    channel[i] = (Math.random() * 2 - 1) * (1 - i / frameCount)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff

  const envelope = ctx.createGain()
  envelope.gain.value = gain

  source.connect(filter).connect(envelope).connect(ctx.destination)
  source.start()
}

/** Toca um efeito. Silencioso quando o som está desligado ou indisponível. */
export function playSound(name: SoundName): void {
  if (!enabled) return
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  switch (name) {
    case 'move':
      playTone(ctx, { freq: 320, freqTo: 260, duration: 0.07, gain: 0.1 })
      break
    case 'capture':
      playNoise(ctx, { duration: 0.11, gain: 0.16, cutoff: 1400 })
      playTone(ctx, { freq: 180, freqTo: 90, duration: 0.12, gain: 0.12, type: 'sawtooth' })
      break
    case 'castle':
      playTone(ctx, { freq: 300, duration: 0.06, gain: 0.09 })
      playTone(ctx, { freq: 400, duration: 0.07, gain: 0.09, delay: 0.07 })
      break
    case 'promote':
      playTone(ctx, { freq: 523, duration: 0.09, gain: 0.09 })
      playTone(ctx, { freq: 659, duration: 0.09, gain: 0.09, delay: 0.08 })
      playTone(ctx, { freq: 784, duration: 0.14, gain: 0.1, delay: 0.16 })
      break
    case 'check':
      playTone(ctx, { freq: 880, duration: 0.08, gain: 0.11, type: 'square' })
      playTone(ctx, { freq: 1170, duration: 0.1, gain: 0.09, type: 'square', delay: 0.09 })
      break
    case 'gameEnd':
      playTone(ctx, { freq: 440, duration: 0.16, gain: 0.11 })
      playTone(ctx, { freq: 330, duration: 0.18, gain: 0.11, delay: 0.15 })
      playTone(ctx, { freq: 220, duration: 0.32, gain: 0.12, delay: 0.32 })
      break
    case 'illegal':
      playTone(ctx, { freq: 130, freqTo: 100, duration: 0.13, gain: 0.09, type: 'sawtooth' })
      break
  }
}
