// All interfaces and types for monok-memory

/** Configuration for the MemorySystem */
export interface MemoryConfig {
  /** Base path where user directories live (required) */
  basePath: string;
  /** Default identity used when no user-specific identity exists */
  defaultIdentity?: IdentityConfig;
  /** Optional LLM provider for auto-generated summaries */
  llm?: LLMProvider;
  /** Context management settings */
  context?: ContextConfig;
  /** Session summary settings */
  sessions?: SessionsConfig;
  /** Optional logger (defaults to console) */
  logger?: Logger;
}

/** Resolved configuration with all defaults applied */
export interface ResolvedConfig {
  basePath: string;
  defaultIdentity: IdentityConfig;
  llm: LLMProvider | null;
  context: ResolvedContextConfig;
  sessions: ResolvedSessionsConfig;
  logger: Logger;
}

/** Identity configuration */
export interface IdentityConfig {
  name?: string;
  personality?: string;
  voice?: string;
  description?: string;
}

/** LLM provider interface — bring your own */
export interface LLMProvider {
  generateText(opts: {
    system: string;
    userMessage: string;
    maxTokens?: number;
  }): Promise<string>;
}

/** Context management configuration */
export interface ContextConfig {
  /** Number of user exchanges before triggering auto-summary (default: 12) */
  summaryThreshold?: number;
  /** Start pruning after this many messages (default: 30) */
  maxMessagesBeforePrune?: number;
  /** Keep this many messages after pruning (default: 15) */
  messagesToKeep?: number;
  /** Always keep the last N messages for continuity (default: 6) */
  recentMessagesToAlwaysKeep?: number;
}

/** Resolved context config with defaults */
export interface ResolvedContextConfig {
  summaryThreshold: number;
  maxMessagesBeforePrune: number;
  messagesToKeep: number;
  recentMessagesToAlwaysKeep: number;
}

/** Session summary configuration */
export interface SessionsConfig {
  /** Maximum number of session summaries to keep (default: 20) */
  maxSummaries?: number;
  /** Similarity threshold for deduplication (0-1, default: 0.7) */
  deduplicationThreshold?: number;
  /** Similarity threshold for consolidation (0-1, default: 0.6) */
  consolidationThreshold?: number;
}

/** Resolved sessions config with defaults */
export interface ResolvedSessionsConfig {
  maxSummaries: number;
  deduplicationThreshold: number;
  consolidationThreshold: number;
}

/** Logger interface */
export interface Logger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/** A chat message */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | unknown[];
  timestamp?: string | number;
}

/** Tool definition in Claude tool_use format */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** Result from a tool execution */
export interface ToolResult {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

/** A session summary entry */
export interface SessionSummary {
  id: number;
  timestamp: string;
  date: string;
  messageCount: number;
  summary: string;
  topics: string[];
  mergedFrom?: number;
}

/** Session summaries data file */
export interface SessionSummariesData {
  summaries: SessionSummary[];
  lastUpdated?: string;
}

/** A tagged memory entry */
export interface TagEntry {
  id: number;
  timestamp: string;
  tags: string[];
  summary: string;
  importance: string;
}

/** Tags data file */
export interface TagsData {
  tags: Record<string, number[]>;
  entries: TagEntry[];
}

/** A single insight */
export interface InsightEntry {
  insight: string;
  confidence: string;
  first_observed: string;
  last_observed: string;
  observation_count: number;
}

/** Insights data file */
export interface InsightsData {
  preferences: InsightEntry[];
  communication_style: InsightEntry[];
  work_patterns: InsightEntry[];
  interests: InsightEntry[];
  goals: InsightEntry[];
  context: InsightEntry[];
  last_updated: string | null;
  [key: string]: InsightEntry[] | string | null;
}

/** A single learning */
export interface LearningEntry {
  id: number;
  insight: string;
  confidence: string;
  context: string | null;
  first_observed: string;
  last_observed: string;
  observation_count: number;
}

/** Learnings data file */
export interface LearningsData {
  communication_style: LearningEntry[];
  topic_preference: LearningEntry[];
  response_length: LearningEntry[];
  correction: LearningEntry[];
  success: LearningEntry[];
  adaptation: LearningEntry[];
  last_updated: string | null;
  [key: string]: LearningEntry[] | string | null;
}

/** A pending item */
export interface PendingItem {
  id: number;
  item: string;
  context: string | null;
  priority: string;
  created: string;
  resolved: boolean;
  resolved_at?: string;
  resolution?: string | null;
}

/** Pending items data file */
export interface PendingItemsData {
  items: PendingItem[];
  last_updated: string | null;
}

/** Result from pruneMessages() */
export interface PruneResult {
  messages: Message[];
  pruned: boolean;
  prunedCount?: number;
}

/** File listing entry */
export interface FileEntry {
  name: string;
  type: 'file' | 'folder';
  size?: number;
}

/** History file entry */
export interface HistoryFile {
  path: string;
  name: string;
}

/** Options for building system prompt (extend with app-specific fields) */
export interface BuildPromptOptions {
  /** Extra prompt text to append after the base identity prompt (before session/insights sections) */
  extraPrompt?: string;
}
