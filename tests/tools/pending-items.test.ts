// Tests for track_pending_item and resolve_pending_item tools

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../../src/memory';
import { createTempDir } from '../setup';

describe('Pending Items Tools', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({ basePath: dir });
  });

  afterEach(() => cleanup());

  it('track_pending_item creates an item', () => {
    const result = memory.executeTool('track_pending_item', {
      item: 'Fix the audio bug',
      priority: 'high',
    }, 'u1');
    expect(result?.success).toBe(true);
    expect((result?.item as { item: string }).item).toBe('Fix the audio bug');
  });

  it('resolve_pending_item marks item as resolved', () => {
    const trackResult = memory.executeTool('track_pending_item', { item: 'Test item' }, 'u1');
    const itemId = (trackResult?.item as { id: number }).id;

    const resolveResult = memory.executeTool('resolve_pending_item', {
      item_id: itemId,
      resolution: 'Done',
    }, 'u1');
    expect(resolveResult?.success).toBe(true);
    expect((resolveResult?.item as { resolved: boolean }).resolved).toBe(true);
  });

  it('resolve_pending_item errors for missing item', () => {
    memory.executeTool('track_pending_item', { item: 'Something' }, 'u1');
    const result = memory.executeTool('resolve_pending_item', { item_id: 99999 }, 'u1');
    expect(result?.error).toContain('not found');
  });

  it('resolve_pending_item errors when no file', () => {
    const result = memory.executeTool('resolve_pending_item', { item_id: 1 }, 'u1');
    expect(result?.error).toContain('No pending items found');
  });
});
