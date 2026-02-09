// Tests for get_identity and update_identity tools

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../../src/memory';
import { createTempDir } from '../setup';

describe('Identity Tools', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({
      basePath: dir,
      defaultIdentity: { name: 'DefaultBot', personality: 'cheerful' },
    });
  });

  afterEach(() => cleanup());

  it('get_identity returns default identity', () => {
    const result = memory.executeTool('get_identity', {}, 'u1');
    expect(result?.name).toBe('DefaultBot');
    expect(result?.personality).toBe('cheerful');
  });

  it('update_identity changes the identity', () => {
    const result = memory.executeTool('update_identity', {
      name: 'Luna',
      personality: 'witty and creative',
    }, 'u1');
    expect(result?.success).toBe(true);

    const getResult = memory.executeTool('get_identity', {}, 'u1');
    expect(getResult?.name).toBe('Luna');
    expect(getResult?.personality).toBe('witty and creative');
  });

  it('update_identity errors with no fields', () => {
    const result = memory.executeTool('update_identity', {}, 'u1');
    expect(result?.error).toContain('No valid fields');
  });

  it('update_identity truncates long names', () => {
    const result = memory.executeTool('update_identity', {
      name: 'A'.repeat(100),
    }, 'u1');
    expect(result?.success).toBe(true);
    const getResult = memory.executeTool('get_identity', {}, 'u1');
    expect((getResult?.name as string).length).toBe(50);
  });

  it('identity is per-user', () => {
    memory.executeTool('update_identity', { name: 'Custom' }, 'u1');
    const u2 = memory.executeTool('get_identity', {}, 'u2');
    expect(u2?.name).toBe('DefaultBot'); // user2 still has default
  });
});
