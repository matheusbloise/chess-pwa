import { defineConfig } from 'vitest/config'

/**
 * Config separada da do Vite de propósito: os testes cobrem a lógica pura do
 * jogo (motor, regras, relógio, persistência) e não precisam do plugin de PWA
 * nem do de React, que só deixariam a execução mais lenta.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
