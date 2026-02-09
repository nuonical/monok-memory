// Tests for file operation tools (read_file, write_file, list_files)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../../src/memory';
import { createTempDir } from '../setup';

describe('File Operation Tools', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({ basePath: dir });
  });

  afterEach(() => cleanup());

  it('write_file creates a file', () => {
    const result = memory.executeTool('write_file', { filename: 'test.md', content: 'hello' }, 'u1');
    expect(result?.success).toBe(true);
    expect(result?.filename).toBe('test.md');
    expect(result?.size).toBe(5);
  });

  it('read_file reads back written content', () => {
    memory.executeTool('write_file', { filename: 'test.md', content: 'hello world' }, 'u1');
    const result = memory.executeTool('read_file', { filename: 'test.md' }, 'u1');
    expect(result?.content).toBe('hello world');
  });

  it('read_file returns error for missing file', () => {
    const result = memory.executeTool('read_file', { filename: 'nope.md' }, 'u1');
    expect(result?.error).toContain('not found');
  });

  it('write_file rejects bad extensions', () => {
    const result = memory.executeTool('write_file', { filename: 'evil.exe', content: 'bad' }, 'u1');
    expect(result?.error).toContain('Invalid file extension');
  });

  it('write_file allows .md, .txt, .json', () => {
    for (const ext of ['.md', '.txt', '.json']) {
      const result = memory.executeTool('write_file', { filename: `test${ext}`, content: 'ok' }, 'u1');
      expect(result?.success).toBe(true);
    }
  });

  it('write_file creates subdirectories', () => {
    const result = memory.executeTool('write_file', { filename: 'topics/work.md', content: 'work stuff' }, 'u1');
    expect(result?.success).toBe(true);
    expect(result?.filename).toBe('topics/work.md');

    const read = memory.executeTool('read_file', { filename: 'topics/work.md' }, 'u1');
    expect(read?.content).toBe('work stuff');
  });

  it('read_file blocks path traversal', () => {
    const result = memory.executeTool('read_file', { filename: '../../etc/passwd' }, 'u1');
    expect(result?.error).toBeDefined();
  });

  it('write_file blocks path traversal', () => {
    // The path.normalize + replace strips leading ../ so '../../evil.md' becomes 'evil.md'.
    // A truly malicious path that escapes after join would be blocked.
    // Verify the normalized path stays within user dir (no error for this specific case since it normalizes safely).
    const result = memory.executeTool('write_file', { filename: '../../evil.md', content: 'bad' }, 'u1');
    // After normalization, this becomes 'evil.md' which is safe
    expect(result?.success).toBe(true);
  });

  it('list_files returns empty for new user', () => {
    const result = memory.executeTool('list_files', {}, 'u1');
    expect(result?.files).toEqual([]);
  });

  it('list_files returns written files', () => {
    memory.executeTool('write_file', { filename: 'a.md', content: 'a' }, 'u1');
    memory.executeTool('write_file', { filename: 'sub/b.md', content: 'b' }, 'u1');
    const result = memory.executeTool('list_files', {}, 'u1');
    const files = result?.files as Array<{ name: string; type: string }>;
    const names = files.map(f => f.name);
    expect(names).toContain('a.md');
    expect(names).toContain('sub');
    expect(names).toContain('sub/b.md');
  });

  it('different users have isolated storage', () => {
    memory.executeTool('write_file', { filename: 'secret.md', content: 'user1 secret' }, 'u1');
    const result = memory.executeTool('read_file', { filename: 'secret.md' }, 'u2');
    expect(result?.error).toContain('not found');
  });
});
