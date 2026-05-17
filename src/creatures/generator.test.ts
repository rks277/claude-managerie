import { describe, expect, it } from 'vitest';
import {
  createCreatureIdentity,
  creatureFrame,
  generateCreature,
  hash32,
  isCurrentCreatureIdentity,
} from './generator.js';

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

  it('creates current version identities', () => {
    expect(createCreatureIdentity('/tmp/example').version).toBe(2);
    expect(isCurrentCreatureIdentity(createCreatureIdentity('/tmp/example'))).toBe(true);
  });

  it('rejects stale version 1 identities', () => {
    expect(
      isCurrentCreatureIdentity({
        version: 1,
        seed: 1,
        palette: 1,
        body: 1,
        variant: 1,
        mark: 1,
        gait: 1,
      }),
    ).toBe(false);
  });

  it('keeps sample repo signatures visually distinct', () => {
    const repos = [
      '/Users/you/code/agent-terrarium',
      '/Users/you/code/claude-managerie',
      '/Users/you/code/dotfiles',
      '/Users/you/code/work/api',
      '/Users/you/code/work/web',
      '/Users/you/code/notes',
      '/Users/you/code/tiny-tools',
      '/Users/you/code/research-index',
    ];
    const signatures = repos.map((repo) => {
      const config = generateCreature(repo);
      return [config.species, config.palette, config.detail, config.mark, config.motion].join(':');
    });

    expect(new Set(signatures).size).toBe(signatures.length);
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
