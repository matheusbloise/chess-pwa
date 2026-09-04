// Gera ícones PNG do PWA sem dependências externas.
// Desenha um mini-tabuleiro de xadrez com fundo temático.
// Uso: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
mkdirSync(publicDir, { recursive: true })

// Paleta
const BG = [49, 46, 43] // #312e2b
const LIGHT = [235, 236, 208] // casa clara
const DARK = [119, 149, 86] // casa escura (verde estilo tabuleiro)

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(size) {
  // Raw RGBA pixel data com filtro 0 por linha
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  const margin = Math.floor(size * 0.14)
  const boardSize = size - margin * 2
  const cell = boardSize / 8

  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filtro None
    for (let x = 0; x < size; x++) {
      let color = BG
      const bx = x - margin
      const by = y - margin
      if (bx >= 0 && bx < boardSize && by >= 0 && by < boardSize) {
        const cx = Math.floor(bx / cell)
        const cy = Math.floor(by / cell)
        color = (cx + cy) % 2 === 0 ? LIGHT : DARK
      }
      const off = y * (stride + 1) + 1 + x * 4
      raw[off] = color[0]
      raw[off + 1] = color[1]
      raw[off + 2] = color[2]
      raw[off + 3] = 255
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of targets) {
  writeFileSync(join(publicDir, name), makePng(size))
  console.log('gerado', name, size + 'x' + size)
}
