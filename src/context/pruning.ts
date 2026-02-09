// Context pruning — importance scoring and message pruning

import type { Message, PruneResult, ResolvedContextConfig } from '../types';

/** Score a message's importance for intelligent pruning */
export function scoreMessageImportance(message: Message, index: number, totalMessages: number): number {
  let score = 0;
  const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
  const lowerContent = content.toLowerCase();

  // Length-based scoring (longer = more substantive, capped)
  score += Math.min(content.length / 500, 3);

  // User facts and personal information (high importance)
  if (/\b(I am|my name|I prefer|I always|I never|I like|I hate|I work|my job)\b/i.test(content)) {
    score += 5;
  }

  // Commitments and action items
  if (/\b(will|going to|remind me|todo|don't forget|remember to|make sure|promise)\b/i.test(content)) {
    score += 4;
  }

  // Technical specifics (code blocks, specific details)
  if (content.includes('```')) {
    score += 2;
  }

  // File references (indicates context about project/files)
  if (/\.(js|ts|py|md|json|css|html|txt)(\s|$)/i.test(content)) {
    score += 1.5;
  }

  // Questions (context for understanding conversation flow)
  if (/\?/.test(content)) {
    score += 1;
  }

  // Decisions and preferences
  if (/\b(decided|prefer|better|chose|want|need|should|must)\b/i.test(lowerContent)) {
    score += 2;
  }

  // Names, dates, numbers (specific facts)
  if (/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(content)) {
    score += 2;
  }

  // Emotional content (personal connection)
  if (/\b(feel|feeling|happy|sad|frustrated|excited|worried|concerned)\b/i.test(lowerContent)) {
    score += 1.5;
  }

  // Error/issue discussions (debugging context)
  if (/\b(error|bug|issue|problem|broken|fix|crash|fail)\b/i.test(lowerContent)) {
    score += 2;
  }

  // Recency bonus (40% weight to recency)
  const recencyScore = (index / totalMessages) * 4;
  score += recencyScore;

  return score;
}

/** Prune old messages while preserving context with importance scoring */
export function pruneMessages(messages: Message[], config: ResolvedContextConfig): PruneResult {
  if (messages.length <= config.maxMessagesBeforePrune) {
    return { messages, pruned: false };
  }

  // Keep system messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  // Always keep the most recent messages for conversational continuity
  const recentMessages = nonSystemMessages.slice(-config.recentMessagesToAlwaysKeep);
  const olderMessages = nonSystemMessages.slice(0, -config.recentMessagesToAlwaysKeep);

  // Score older messages for importance-based selection
  const scoredOlderMessages = olderMessages.map((msg, index) => ({
    message: msg,
    index,
    score: scoreMessageImportance(msg, index, olderMessages.length),
  }));

  // How many older messages can we keep? (total - recent)
  const olderSlotsAvailable = config.messagesToKeep - config.recentMessagesToAlwaysKeep;

  // Sort by score and take top older messages
  const sortedByScore = [...scoredOlderMessages].sort((a, b) => b.score - a.score);
  const keptOlderMessages = sortedByScore
    .slice(0, Math.max(0, olderSlotsAvailable))
    .sort((a, b) => a.index - b.index) // Restore chronological order
    .map(item => item.message);

  const prunedCount = olderMessages.length - keptOlderMessages.length;

  // Build context bridge with topics from pruned messages
  const prunedContent = scoredOlderMessages
    .filter(m => !sortedByScore.slice(0, olderSlotsAvailable).includes(m))
    .map(m => (typeof m.message.content === 'string' ? m.message.content : ''))
    .join(' ');

  // Extract key topics from pruned content
  const prunedTopics: string[] = [];
  if (/\b(code|programming|function|api)\b/i.test(prunedContent)) prunedTopics.push('code discussion');
  if (/\b(file|folder|directory)\b/i.test(prunedContent)) prunedTopics.push('files');
  if (/\b(bug|fix|error)\b/i.test(prunedContent)) prunedTopics.push('debugging');
  if (/\b(prefer|like|want)\b/i.test(prunedContent)) prunedTopics.push('preferences');

  const topicsStr =
    prunedTopics.length > 0 ? ` Topics covered: ${prunedTopics.join(', ')}.` : '';

  const contextBridge: Message = {
    role: 'user',
    content: `[System: ${prunedCount} earlier messages were archived (important context preserved via intelligent selection).${topicsStr} Memory files contain additional context. Continue naturally.]`,
  };

  // Reconstruct: system msgs + context bridge + best older msgs + recent msgs
  const result: Message[] = [...systemMessages, contextBridge, ...keptOlderMessages, ...recentMessages];

  // Safety check: if the last message is not from user, append a continuation prompt
  if (result.length > 0 && result[result.length - 1].role !== 'user') {
    result.push({
      role: 'user',
      content: '[Continue the conversation naturally based on the context above.]',
    });
  }

  return { messages: result, pruned: true, prunedCount };
}
