// Tests for auto-summary trigger and prompt

import { describe, it, expect } from 'vitest';
import { shouldTriggerSummary, getAutoSummaryPrompt } from '../../src/context/auto-summary';
import { DEFAULT_CONTEXT } from '../../src/config';
import type { Message } from '../../src/types';

describe('shouldTriggerSummary', () => {
  it('returns true at threshold', () => {
    const messages: Message[] = Array.from({ length: 24 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg ${i}`,
    }));
    // 12 user messages
    expect(shouldTriggerSummary(messages, DEFAULT_CONTEXT)).toBe(true);
  });

  it('returns false below threshold', () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg ${i}`,
    }));
    // 10 user messages
    expect(shouldTriggerSummary(messages, DEFAULT_CONTEXT)).toBe(false);
  });

  it('returns false for empty messages', () => {
    expect(shouldTriggerSummary([], DEFAULT_CONTEXT)).toBe(false);
  });

  it('returns true at 2x threshold', () => {
    const messages: Message[] = Array.from({ length: 48 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg ${i}`,
    }));
    // 24 user messages
    expect(shouldTriggerSummary(messages, DEFAULT_CONTEXT)).toBe(true);
  });

  it('respects custom threshold', () => {
    const messages: Message[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg ${i}`,
    }));
    // 5 user messages
    expect(shouldTriggerSummary(messages, { ...DEFAULT_CONTEXT, summaryThreshold: 5 })).toBe(true);
  });
});

describe('getAutoSummaryPrompt', () => {
  it('includes exchange count', () => {
    const prompt = getAutoSummaryPrompt(12);
    expect(prompt).toContain('12 exchanges');
  });

  it('includes memory instructions', () => {
    const prompt = getAutoSummaryPrompt(12);
    expect(prompt).toContain('memory tools');
    expect(prompt).toContain('tag_memory');
    expect(prompt).toContain('conversation_summaries.md');
  });
});
