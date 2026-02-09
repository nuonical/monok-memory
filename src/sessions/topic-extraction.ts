// Topic extraction from conversation text

/** Extract topics from text using pattern matching */
export function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
    { pattern: /\b(code|coding|programming|developer)\b/i, topic: 'programming' },
    { pattern: /\b(api|endpoint|server|backend)\b/i, topic: 'backend' },
    { pattern: /\b(css|style|design|ui|ux)\b/i, topic: 'design' },
    { pattern: /\b(bug|fix|error|issue)\b/i, topic: 'debugging' },
    { pattern: /\b(feature|implement|add|create)\b/i, topic: 'features' },
    { pattern: /\b(memory|context|history|recall)\b/i, topic: 'memory-system' },
    { pattern: /\b(admin|user|auth)\b/i, topic: 'admin' },
    { pattern: /\b(file|folder|directory)\b/i, topic: 'files' },
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(lowerText) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics.slice(0, 5); // Max 5 topics
}
