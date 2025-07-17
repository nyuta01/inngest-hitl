import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@a2a-js/sdk': path.resolve(__dirname, './node_modules/@a2a-js/sdk')
    }
  }
})