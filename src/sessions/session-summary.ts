// Session summary management — save, deduplicate, consolidate, retrieve

import fs from 'fs';
import path from 'path';
import type { SessionSummary, SessionSummariesData, ResolvedSessionsConfig, Logger } from '../types';
import { readJsonFile, writeJsonFile } from '../storage/file-storage';
import { extractTopics } from './topic-extraction';

/** Get path to session summaries file */
export function getSessionSummariesPath(basePath: string, userId: string | number): string {
  return path.join(basePath, String(userId), 'session_summaries.json');
}

/** Extract meaningful words (>3 chars) from text */
function getWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3),
  );
}

/** Check if a new summary is too similar to existing ones */
export function isSummaryDuplicate(
  newSummary: string,
  existingSummaries: SessionSummary[],
  threshold: number,
): boolean {
  const newWords = getWords(newSummary);
  if (newWords.size === 0) return false;

  // Check against last 5 summaries
  for (const existing of existingSummaries.slice(-5)) {
    const existingWords = getWords(existing.summary || '');
    if (existingWords.size === 0) continue;

    const overlap = [...newWords].filter(w => existingWords.has(w)).length;
    const similarity = overlap / Math.max(newWords.size, existingWords.size);

    if (similarity > threshold) {
      return true;
    }
  }
  return false;
}

/** Merge similar summaries into consolidated ones */
export function consolidateSimilarSummaries(
  summaries: SessionSummary[],
  threshold: number,
): SessionSummary[] {
  if (summaries.length < 2) return summaries;

  const consolidated: SessionSummary[] = [];
  const used = new Set<number>();

  for (let i = 0; i < summaries.length; i++) {
    if (used.has(i)) continue;

    const current = summaries[i];
    const similar = [current];
    const allTopics = new Set(current.topics || []);

    for (let j = i + 1; j < summaries.length; j++) {
      if (used.has(j)) continue;

      const other = summaries[j];
      const currentWords = getWords(current.summary || '');
      const otherWords = getWords(other.summary || '');

      if (currentWords.size === 0 || otherWords.size === 0) continue;

      const overlap = [...currentWords].filter(w => otherWords.has(w)).length;
      const similarity = overlap / Math.max(currentWords.size, otherWords.size);

      if (similarity > threshold) {
        similar.push(other);
        used.add(j);
        (other.topics || []).forEach(t => allTopics.add(t));
      }
    }

    used.add(i);

    if (similar.length > 1) {
      const merged: SessionSummary = {
        ...similar[similar.length - 1],
        summary: `${similar[similar.length - 1].summary} (consolidated from ${similar.length} similar sessions)`,
        topics: [...allTopics],
        mergedFrom: similar.length,
      };
      consolidated.push(merged);
    } else {
      consolidated.push(current);
    }
  }

  return consolidated;
}

/** Get recent session summaries for context */
export function getRecentSessionSummaries(
  basePath: string,
  userId: string | number,
  limit = 5,
): SessionSummary[] {
  const summariesPath = getSessionSummariesPath(basePath, userId);
  if (!fs.existsSync(summariesPath)) {
    return [];
  }

  try {
    const data = readJsonFile<SessionSummariesData>(summariesPath, { summaries: [] });
    return (data.summaries || []).slice(-limit);
  } catch {
    return [];
  }
}

/** Save a session summary with deduplication and consolidation */
export function saveSessionSummary(
  basePath: string,
  userId: string | number,
  summary: string,
  messageCount: number,
  conversationText: string,
  sessionsConfig: ResolvedSessionsConfig,
  logger: Logger,
): { success?: boolean; skipped?: boolean; reason?: string; summary?: SessionSummary } {
  const summariesPath = getSessionSummariesPath(basePath, userId);
  const summariesData = readJsonFile<SessionSummariesData>(summariesPath, { summaries: [] });

  // Check for duplicate before adding
  if (isSummaryDuplicate(summary, summariesData.summaries, sessionsConfig.deduplicationThreshold)) {
    logger.log(`[session-summary] Skipping duplicate summary for user ${userId}`);
    return { skipped: true, reason: 'Summary too similar to recent session' };
  }

  const sessionSummary: SessionSummary = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    messageCount,
    summary,
    topics: extractTopics(conversationText),
  };

  summariesData.summaries.push(sessionSummary);

  // Consolidate similar summaries periodically
  if (summariesData.summaries.length > 10 && summariesData.summaries.length % 5 === 0) {
    summariesData.summaries = consolidateSimilarSummaries(
      summariesData.summaries,
      sessionsConfig.consolidationThreshold,
    );
  }

  // Keep only max summaries
  if (summariesData.summaries.length > sessionsConfig.maxSummaries) {
    summariesData.summaries = summariesData.summaries.slice(-sessionsConfig.maxSummaries);
  }

  summariesData.lastUpdated = new Date().toISOString();
  writeJsonFile(summariesPath, summariesData);

  logger.log(`[session-summary] Generated summary for user ${userId}: ${summary.substring(0, 100)}...`);

  return { success: true, summary: sessionSummary };
}
