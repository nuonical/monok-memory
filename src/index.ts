// Barrel exports for monok-memory

// Main class
export { MemorySystem } from './memory';

// Types
export type {
  MemoryConfig,
  ResolvedConfig,
  IdentityConfig,
  LLMProvider,
  ContextConfig,
  SessionsConfig,
  Logger,
  Message,
  ToolDefinition,
  ToolResult,
  SessionSummary,
  SessionSummariesData,
  TagEntry,
  TagsData,
  InsightEntry,
  InsightsData,
  LearningEntry,
  LearningsData,
  PendingItem,
  PendingItemsData,
  PruneResult,
  FileEntry,
  HistoryFile,
  BuildPromptOptions,
} from './types';

// Config
export { resolveConfig, DEFAULT_IDENTITY, DEFAULT_CONTEXT, DEFAULT_SESSIONS } from './config';

// Storage
export {
  ensureUserDir,
  getUserFilesDir,
  readJsonFile,
  writeJsonFile,
  readTextFile,
  writeTextFile,
  ensureDir,
  listRecursive,
  findHistoryFiles,
} from './storage/file-storage';

// Tools
export { MEMORY_TOOLS } from './tools/tool-definitions';
export { executeMemoryTool } from './tools/tool-executor';
export type { ToolExecutorDeps } from './tools/tool-executor';

// Context
export { scoreMessageImportance, pruneMessages } from './context/pruning';
export { getUserInsightsContext } from './context/insights';
export { shouldTriggerSummary, getAutoSummaryPrompt } from './context/auto-summary';

// Sessions
export { extractTopics } from './sessions/topic-extraction';
export {
  getSessionSummariesPath,
  isSummaryDuplicate,
  consolidateSimilarSummaries,
  getRecentSessionSummaries,
  saveSessionSummary,
} from './sessions/session-summary';

// Identity
export { getUserIdentity, saveUserIdentity } from './identity/identity-manager';

// History
export {
  getWeekNumber,
  formatMessagesAsText,
  saveToHistory,
  findHistoryFiles as findHistoryTextFiles,
} from './history/history-manager';

// Prompt
export { buildIdentityPrompt } from './prompt/prompt-builder';
