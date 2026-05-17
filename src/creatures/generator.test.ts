import { describe, expect, it } from 'vitest';
import { createCreatureIdentity, creatureFrame, generateCreature, hash32 } from './generator.js';

describe('generateCreature', () => {
  it('is deterministic for a repo path', () => {
    expect(generateCreature('/tmp/example')).toEqual(generateCreature('/tmp/example'));
  });

  it('usually varies across repo paths', () => {
    expect(generateCreature('/tmp/a')).not.toEqual(generateCreature('/tmp/b'));
  });

  it('can generate alternate persistent identities for the same repo', () => {
    const first = createCreatureIdentity('/tmp/example');
    const second = createCreatureIdentity('/tmp/example', 1);
    expect(first).not.toEqual(second);
    expect(generateCreature('/tmp/example', first)).toEqual(generateCreature('/tmp/example', first));
  });

  it('uses unsigned 32-bit hashes', () => {
    expect(hash32('/tmp/example')).toBeGreaterThanOrEqual(0);
    expect(hash32('/tmp/example')).toBeLessThanOrEqual(0xffffffff);
  });

  it('adds state-specific particles', () => {
    const config = generateCreature('/tmp/example');
    expect(creatureFrame(config, 'sleeping', 0).join('\n')).toContain('zZ');
    expect(creatureFrame(config, 'attention', 0).join('\n')).toContain('!!!');
  });
});
