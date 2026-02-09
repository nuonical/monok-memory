// Auto-summary trigger and prompt generation

import type { Message, ResolvedContextConfig } from '../types';

/** Check if auto-summary should be triggered based on user message count */
export function shouldTriggerSummary(messages: Message[], config: ResolvedContextConfig): boolean {
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  return userMessageCount > 0 && userMessageCount % config.summaryThreshold === 0;
}

/** Generate the auto-summary instruction prompt */
export function getAutoSummaryPrompt(exchangeCount: number): string {
  return `[System instruction: You've had ${exchangeCount} exchanges in this conversation. Please briefly use your memory tools to:
1. Save any important new information to your memory files
2. Tag this conversation with relevant topics using tag_memory
3. Update user_insights if you've learned anything new about the user's preferences or patterns
4. Append a brief summary to conversation_summaries.md

Do this silently in the background, then continue responding naturally to the user.]`;
}
