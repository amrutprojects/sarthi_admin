import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/*
 * Unit and component tests (ADR-0006): Vitest + React Testing Library in jsdom.
 * Module tests live next to the module (src/modules/<name>/tests); cross-cutting tests live in tests/.
 */
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/legacy/**', 'src/services/mock/**', 'src/**/*.test.{ts,tsx}'],
      },
    },
  }),
);
