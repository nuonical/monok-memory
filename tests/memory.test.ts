// Integration tests for MemorySystem class

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySystem } from '../src/memory';
import { createTempDir, createMockLLM } from './setup';

describe('MemorySystem', () => {
  let dir: string;
  let cleanup: () => void;
  let memory: MemorySystem;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
    memory = new MemorySystem({
      basePath: dir,
      defaultIdentity: { name: 'TestBot', personality: 'helpful' },
      llm: createMockLLM(),
    });
  });

  afterEach(() => cleanup());

  it('throws if basePath is missing', () => {
    expect(() => new MemorySystem({ basePath: '' })).toThrow('basePath is required');
  });

  it('returns tool definitions', () => {
    const tools = memory.getToolDefinitions();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0].name).toBe('read_file');
  });

  it('write and read file via tools', () => {
    const writeResult = memory.executeTool('write_file', { filename: 'test.md', content: 'hello world' }, 'user1');
    expect(writeResult?.success).toBe(true);

    const readResult = memory.executeTool('read_file', { filename: 'test.md' }, 'user1');
    expect(readResult?.content).toBe('hello world');
  });

  it('list_files returns written files', () => {
    memory.executeTool('write_file', { filename: 'notes.md', content: 'notes' }, 'user1');
    const result = memory.executeTool('list_files', {}, 'user1');
    expect((result?.files as unknown[]).length).toBeGreaterThan(0);
  });

  it('pruneMessages passes through when below threshold', () => {
    const messages = [
      { role: 'user' as const, content: 'hello' },
      { role: 'assistant' as const, content: 'hi' },
    ];
    const result = memory.pruneMessages(messages);
    expect(result.pruned).toBe(false);
    expect(result.messages).toEqual(messages);
  });

  it('shouldTriggerSummary returns correct values', () => {
    const messages = Array.from({ length: 24 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg ${i}`,
    }));
    // 12 user messages should trigger
    expect(memory.shouldTriggerSummary(messages)).toBe(true);

    // 11 user messages should not
    const messages2 = Array.from({ length: 22 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg ${i}`,
    }));
    expect(memory.shouldTriggerSummary(messages2)).toBe(false);
  });

  it('getUserInsightsContext returns null when no insights', () => {
    expect(memory.getUserInsightsContext('user1')).toBeNull();
  });

  it('getRecentSessionSummaries returns empty when no summaries', () => {
    expect(memory.getRecentSessionSummaries('user1')).toEqual([]);
  });

  it('saveSessionSummary and retrieve', () => {
    const result = memory.saveSessionSummary('user1', 'We discussed testing', 10, 'testing code');
    expect(result.success).toBe(true);

    const summaries = memory.getRecentSessionSummaries('user1');
    expect(summaries.length).toBe(1);
    expect(summaries[0].summary).toBe('We discussed testing');
  });

  it('getUserIdentity returns default when no custom identity', () => {
    const identity = memory.getUserIdentity('user1');
    expect(identity.name).toBe('TestBot');
    expect(identity.personality).toBe('helpful');
  });

  it('saveUserIdentity and getUserIdentity round-trip', () => {
    memory.saveUserIdentity('user1', { name: 'Custom', personality: 'quirky' });
    const identity = memory.getUserIdentity('user1');
    expect(identity.name).toBe('Custom');
    expect(identity.personality).toBe('quirky');
  });

  it('buildSystemPrompt returns a string with identity', () => {
    const prompt = memory.buildSystemPrompt('user1');
    expect(prompt).toContain('TestBot');
    expect(prompt).toContain('helpful');
  });

  it('buildSystemPrompt includes admin section when isAdmin', () => {
    const prompt = memory.buildSystemPrompt('user1', { isAdmin: true });
    expect(prompt).toContain('Admin Capabilities');
  });

  it('saveToHistory creates a history file', () => {
    const fs = require('fs');
    const path = require('path');
    memory.saveToHistory('user1', [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ]);

    const historyBase = path.join(dir, 'user1', 'history');
    expect(fs.existsSync(historyBase)).toBe(true);

    // Check summary.txt exists
    expect(fs.existsSync(path.join(historyBase, 'summary.txt'))).toBe(true);
  });
});
