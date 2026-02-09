// Tests for update_user_insights and get_user_insights tools

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../../src/memory';
import { createTempDir } from '../setup';

describe('Insights Tools', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({ basePath: dir });
  });

  afterEach(() => cleanup());

  it('update_user_insights records a new insight', () => {
    const result = memory.executeTool('update_user_insights', {
      category: 'preferences',
      insight: 'User prefers dark mode',
      confidence: 'observed_once',
    }, 'u1');
    expect(result?.success).toBe(true);
    expect(result?.total_insights).toBe(1);
  });

  it('get_user_insights returns null for no insights', () => {
    const result = memory.executeTool('get_user_insights', {}, 'u1');
    expect(result?.insights).toBeNull();
  });

  it('get_user_insights returns recorded insights', () => {
    memory.executeTool('update_user_insights', {
      category: 'preferences',
      insight: 'User prefers dark mode',
    }, 'u1');
    const result = memory.executeTool('get_user_insights', {}, 'u1');
    expect(result?.insights).toBeDefined();
    const prefs = (result?.insights as Record<string, unknown[]>).preferences;
    expect(prefs.length).toBe(1);
  });

  it('update_user_insights deduplicates similar insights', () => {
    memory.executeTool('update_user_insights', {
      category: 'preferences',
      insight: 'User prefers dark mode for all interfaces',
    }, 'u1');
    memory.executeTool('update_user_insights', {
      category: 'preferences',
      insight: 'User prefers dark mode for all interfaces and themes',
      confidence: 'pattern_emerging',
    }, 'u1');

    const result = memory.executeTool('get_user_insights', {}, 'u1');
    const prefs = (result?.insights as Record<string, unknown[]>).preferences;
    expect(prefs.length).toBe(1); // Deduplicated
  });
});
