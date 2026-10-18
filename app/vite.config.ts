/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

function commitHash(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'lokal';
  }
}

// The build version is sent as the locked field `versjon` in every form.
const versjon = `${pkg.version}-${commitHash()}`;

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __ATLAS_VERSJON__: JSON.stringify(versjon),
    __ATLAS_TEST_BUILD__: JSON.stringify(process.env.ATLAS_TEST_BUILD === '1'),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // React and Fluent change far less often than ATLAS: in a file of their own, a participant's browser keeps them
        // from one deploy to the next, and ATLAS's own file stays small.
        manualChunks(id) {
          if (id.includes('/node_modules/')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
});
