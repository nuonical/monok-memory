// Tests for tag_memory and search_by_tag tools

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../../src/memory';
import { createTempDir } from '../setup';

describe('Tagging Tools', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({ basePath: dir });
  });

  afterEach(() => cleanup());

  it('tag_memory creates a tag entry', () => {
    const result = memory.executeTool('tag_memory', {
      tags: ['work', 'important'],
      summary: 'Project deadline discussed',
      importance: 'high',
    }, 'u1');
    expect(result?.success).toBe(true);
    expect(result?.entry).toBeDefined();
  });

  it('search_by_tag finds exact matches', () => {
    memory.executeTool('tag_memory', {
      tags: ['coding'],
      summary: 'Wrote a new function',
    }, 'u1');

    const result = memory.executeTool('search_by_tag', { tag: 'coding' }, 'u1');
    expect((result?.exact_matches as unknown[]).length).toBe(1);
  });

  it('search_by_tag finds partial matches', () => {
    memory.executeTool('tag_memory', {
      tags: ['coding-project'],
      summary: 'Started new project',
    }, 'u1');

    const result = memory.executeTool('search_by_tag', { tag: 'coding' }, 'u1');
    expect((result?.partial_matches as unknown[]).length).toBe(1);
  });

  it('search_by_tag returns all_tags', () => {
    memory.executeTool('tag_memory', { tags: ['a', 'b'], summary: 'test' }, 'u1');
    const result = memory.executeTool('search_by_tag', { tag: 'a' }, 'u1');
    expect(result?.all_tags).toContain('a');
    expect(result?.all_tags).toContain('b');
  });

  it('tag_memory rejects non-array tags', () => {
    const result = memory.executeTool('tag_memory', {
      tags: 'not-an-array',
      summary: 'test',
    }, 'u1');
    expect(result?.error).toContain('non-empty array');
  });

  it('tag_memory rejects empty tags array', () => {
    const result = memory.executeTool('tag_memory', {
      tags: [],
      summary: 'test',
    }, 'u1');
    expect(result?.error).toContain('non-empty array');
  });

  it('tag_memory rejects invalid importance', () => {
    const result = memory.executeTool('tag_memory', {
      tags: ['test'],
      summary: 'test',
      importance: 'super-important',
    }, 'u1');
    expect(result?.error).toContain('Invalid importance');
  });

  it('search_by_tag returns empty for no tags file', () => {
    const result = memory.executeTool('search_by_tag', { tag: 'anything' }, 'u1');
    expect(result?.results).toEqual([]);
  });
});
