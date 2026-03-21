import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('vite manualChunks does not split react or supabase into dedicated chunks', () => {
  const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

  assert.ok(
    !viteConfig.includes('return "react-vendor";'),
    'react packages should not be forced into a dedicated chunk because it creates a circular vendor dependency',
  );

  assert.ok(
    !viteConfig.includes('return "supabase-vendor";'),
    'supabase packages should not be forced into a dedicated chunk because it creates a circular vendor dependency',
  );
});
