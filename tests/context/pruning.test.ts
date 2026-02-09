// Tests for message pruning and importance scoring

import { describe, it, expect } from 'vitest';
import { scoreMessageImportance, pruneMessages } from '../../src/context/pruning';
import { DEFAULT_CONTEXT } from '../../src/config';
import type { Message } from '../../src/types';

describe('scoreMessageImportance', () => {
  it('scores personal info highly', () => {
    const msg: Message = { role: 'user', content: 'My name is Alex and I work at Google' };
    const score = scoreMessageImportance(msg, 5, 10);
    expect(score).toBeGreaterThan(5);
  });

  it('scores code blocks', () => {
    const msg: Message = { role: 'user', content: 'Here is my code:\n```js\nconsole.log("hi")\n```' };
    const score = scoreMessageImportance(msg, 5, 10);
    expect(score).toBeGreaterThan(2);
  });

  it('gives recency bonus to later messages', () => {
    const msg: Message = { role: 'user', content: 'test' };
    const earlyScore = scoreMessageImportance(msg, 0, 10);
    const lateScore = scoreMessageImportance(msg, 9, 10);
    expect(lateScore).toBeGreaterThan(earlyScore);
  });

  it('scores short trivial messages low', () => {
    const msg: Message = { role: 'user', content: 'ok' };
    const score = scoreMessageImportance(msg, 0, 10);
    expect(score).toBeLessThan(2);
  });
});

describe('pruneMessages', () => {
  it('does not prune below threshold', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];
    const result = pruneMessages(messages, DEFAULT_CONTEXT);
    expect(result.pruned).toBe(false);
  });

  it('prunes when above threshold', () => {
    const messages: Message[] = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message ${i} about code and programming`,
    }));
    const result = pruneMessages(messages, DEFAULT_CONTEXT);
    expect(result.pruned).toBe(true);
    expect(result.messages.length).toBeLessThan(40);
    expect(result.prunedCount).toBeGreaterThan(0);
  });

  it('preserves system messages', () => {
    const messages: Message[] = [
      { role: 'system', content: 'You are a helpful assistant' },
      ...Array.from({ length: 39 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `message ${i}`,
      })),
    ];
    const result = pruneMessages(messages, DEFAULT_CONTEXT);
    expect(result.pruned).toBe(true);
    const systemMsgs = result.messages.filter(m => m.role === 'system');
    expect(systemMsgs.length).toBe(1);
  });

  it('includes context bridge in pruned result', () => {
    const messages: Message[] = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message ${i}`,
    }));
    const result = pruneMessages(messages, DEFAULT_CONTEXT);
    const bridge = result.messages.find(m =>
      typeof m.content === 'string' && m.content.includes('[System:'),
    );
    expect(bridge).toBeDefined();
  });

  it('ensures last message is from user', () => {
    const messages: Message[] = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message ${i}`,
    }));
    const result = pruneMessages(messages, DEFAULT_CONTEXT);
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg.role).toBe('user');
  });
});
