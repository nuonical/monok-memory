// Tests for record_learning and get_learnings tools

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../../src/memory';
import { createTempDir } from '../setup';

describe('Learnings Tools', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({ basePath: dir });
  });

  afterEach(() => cleanup());

  it('record_learning creates a new learning', () => {
    const result = memory.executeTool('record_learning', {
      category: 'communication_style',
      insight: 'User prefers concise responses',
      confidence: 'tentative',
    }, 'u1');
    expect(result?.success).toBe(true);
    expect(result?.total_learnings).toBe(1);
  });

  it('get_learnings returns null when no learnings', () => {
    const result = memory.executeTool('get_learnings', {}, 'u1');
    expect(result?.learnings).toBeNull();
  });

  it('get_learnings returns recorded learnings', () => {
    memory.executeTool('record_learning', {
      category: 'success',
      insight: 'Code examples helped',
    }, 'u1');
    const result = memory.executeTool('get_learnings', {}, 'u1');
    const success = (result?.learnings as Record<string, unknown[]>).success;
    expect(success.length).toBe(1);
  });

  it('record_learning escalates confidence on duplicate', () => {
    memory.executeTool('record_learning', {
      category: 'communication_style',
      insight: 'User prefers concise responses over verbose ones',
      confidence: 'tentative',
    }, 'u1');
    memory.executeTool('record_learning', {
      category: 'communication_style',
      insight: 'User prefers concise responses over verbose ones always',
    }, 'u1');

    const result = memory.executeTool('get_learnings', {}, 'u1');
    const items = (result?.learnings as Record<string, Array<{ confidence: string }>>).communication_style;
    expect(items.length).toBe(1);
    expect(items[0].confidence).toBe('emerging');
  });
});
