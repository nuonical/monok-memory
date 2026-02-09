// Tests for session summary management

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isSummaryDuplicate,
  consolidateSimilarSummaries,
  saveSessionSummary,
  getRecentSessionSummaries,
} from '../../src/sessions/session-summary';
import { extractTopics } from '../../src/sessions/topic-extraction';
import { DEFAULT_SESSIONS } from '../../src/config';
import { createTempDir } from '../setup';
import type { SessionSummary } from '../../src/types';

const mockLogger = { log: () => {}, error: () => {} };

describe('extractTopics', () => {
  it('extracts programming topic', () => {
    expect(extractTopics('We talked about coding a new feature')).toContain('programming');
    expect(extractTopics('We talked about coding a new feature')).toContain('features');
  });

  it('extracts debugging topic', () => {
    expect(extractTopics('Found a bug in the error handler')).toContain('debugging');
  });

  it('returns max 5 topics', () => {
    const text = 'code api css bug feature memory admin file folder directory';
    expect(extractTopics(text).length).toBeLessThanOrEqual(5);
  });

  it('returns empty for unrelated text', () => {
    expect(extractTopics('Hello how are you today')).toEqual([]);
  });
});

describe('isSummaryDuplicate', () => {
  it('detects highly similar summaries', () => {
    const existing: SessionSummary[] = [{
      id: 1, timestamp: '', date: '', messageCount: 5,
      summary: 'Discussed the new memory system implementation for the chat app',
      topics: [],
    }];
    expect(isSummaryDuplicate(
      'Discussed the new memory system implementation for the chat application',
      existing, 0.7,
    )).toBe(true);
  });

  it('allows different summaries', () => {
    const existing: SessionSummary[] = [{
      id: 1, timestamp: '', date: '', messageCount: 5,
      summary: 'Talked about vacation plans for summer',
      topics: [],
    }];
    expect(isSummaryDuplicate(
      'Implemented a new authentication system for the API',
      existing, 0.7,
    )).toBe(false);
  });

  it('returns false for empty summaries', () => {
    expect(isSummaryDuplicate('', [], 0.7)).toBe(false);
  });
});

describe('consolidateSimilarSummaries', () => {
  it('merges similar summaries', () => {
    const summaries: SessionSummary[] = [
      { id: 1, timestamp: '', date: 'Jan 1', messageCount: 5, summary: 'Discussed the memory system features in detail', topics: ['memory'] },
      { id: 2, timestamp: '', date: 'Jan 2', messageCount: 8, summary: 'Discussed the memory system features and testing', topics: ['testing'] },
    ];
    const result = consolidateSimilarSummaries(summaries, 0.6);
    expect(result.length).toBe(1);
    expect(result[0].mergedFrom).toBe(2);
    expect(result[0].topics).toContain('memory');
    expect(result[0].topics).toContain('testing');
  });

  it('keeps dissimilar summaries separate', () => {
    const summaries: SessionSummary[] = [
      { id: 1, timestamp: '', date: '', messageCount: 5, summary: 'Vacation planning for the summer holiday season', topics: [] },
      { id: 2, timestamp: '', date: '', messageCount: 5, summary: 'Debugging the authentication system API endpoint', topics: [] },
    ];
    const result = consolidateSimilarSummaries(summaries, 0.6);
    expect(result.length).toBe(2);
  });

  it('handles single summary', () => {
    const summaries: SessionSummary[] = [
      { id: 1, timestamp: '', date: '', messageCount: 5, summary: 'test', topics: [] },
    ];
    expect(consolidateSimilarSummaries(summaries, 0.6)).toEqual(summaries);
  });
});

describe('saveSessionSummary & getRecentSessionSummaries', () => {
  let dir: string;
  let cleanup: () => void;

  beforeEach(() => {
    ({ dir, cleanup } = createTempDir());
  });

  afterEach(() => cleanup());

  it('saves and retrieves a summary', () => {
    const result = saveSessionSummary(dir, 'u1', 'Test summary', 10, 'coding discussion', DEFAULT_SESSIONS, mockLogger);
    expect(result.success).toBe(true);

    const summaries = getRecentSessionSummaries(dir, 'u1');
    expect(summaries.length).toBe(1);
    expect(summaries[0].summary).toBe('Test summary');
  });

  it('skips duplicate summaries', () => {
    saveSessionSummary(dir, 'u1', 'Discussed the memory system implementation features', 10, 'code', DEFAULT_SESSIONS, mockLogger);
    const result = saveSessionSummary(dir, 'u1', 'Discussed the memory system implementation features in detail', 10, 'code', DEFAULT_SESSIONS, mockLogger);
    expect(result.skipped).toBe(true);
  });

  it('respects limit parameter', () => {
    const distinctSummaries = [
      'Vacation planning for the summer holiday in Greece',
      'Debugging authentication system with OAuth tokens',
      'Discussed machine learning model training pipeline',
      'Reviewed quarterly financial budget spreadsheet',
      'Built a new React component for dashboard widgets',
      'Configured Kubernetes deployment for staging environment',
      'Analyzed customer feedback survey results thoroughly',
      'Planned birthday surprise party for friend',
      'Migrated legacy database schema to PostgreSQL',
      'Wrote documentation for the REST API endpoints',
    ];
    for (let i = 0; i < 10; i++) {
      saveSessionSummary(dir, 'u1', distinctSummaries[i], i + 1, distinctSummaries[i], DEFAULT_SESSIONS, mockLogger);
    }
    const summaries = getRecentSessionSummaries(dir, 'u1', 3);
    expect(summaries.length).toBe(3);
  });

  it('returns empty for non-existent user', () => {
    expect(getRecentSessionSummaries(dir, 'nonexistent')).toEqual([]);
  });
});
