import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('publish-go-live script fails hard on CLI errors and supports functions-only mode', () => {
  const script = readFileSync(new URL('../scripts/publish-go-live.ps1', import.meta.url), 'utf8');

  assert.match(
    script,
    /\[switch\]\$SkipMigrations/,
    'publish script should expose an explicit SkipMigrations switch for functions-only deployments',
  );

  assert.match(
    script,
    /if \(\$LASTEXITCODE -ne 0\)/,
    'publish script should stop when Supabase CLI returns a non-zero exit code',
  );

  assert.match(
    script,
    /Falha ao aplicar migrations\./,
    'publish script should fail loudly when db push does not complete',
  );

  assert.match(
    script,
    /Pulando migrations por solicitacao explicita/,
    'publish script should make the functions-only path explicit in its output',
  );
});
