import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('vite manualChunks does not split react into a dedicated chunk', () => {
  const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

  assert.ok(
    !viteConfig.includes('return "react-vendor";'),
    'react packages should not be forced into a dedicated chunk because it creates a circular vendor dependency',
  );
});
