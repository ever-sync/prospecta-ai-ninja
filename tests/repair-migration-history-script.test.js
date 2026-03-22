import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('repair-migration-history script derives drift and repairs both sides before db push', () => {
  const script = readFileSync(new URL('../scripts/repair-migration-history.ps1', import.meta.url), 'utf8');

  assert.match(
    script,
    /migration list/,
    'repair script should derive the current drift from the linked remote project',
  );

  assert.match(
    script,
    /migration\", \"repair\", \"--status\", \"reverted\"/,
    'repair script should revert unexpected remote-only history entries first',
  );

  assert.match(
    script,
    /migration\", \"repair\", \"--status\", \"applied\"/,
    'repair script should mark local timestamp migrations as applied',
  );

  assert.match(
    script,
    /db\", \"push\"/,
    'repair script should optionally validate the result with db push',
  );
});
