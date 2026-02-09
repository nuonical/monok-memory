// MemorySystem — main entry point wrapping all modules

import type {
  MemoryConfig,
  ResolvedConfig,
  ToolDefinition,
  ToolResult,
  Message,
  PruneResult,
  SessionSummary,
  IdentityConfig,
} from './types';
import { resolveConfig } from './config';
import { MEMORY_TOOLS } from './tools/tool-definitions';
import { executeMemoryTool, type ToolExecutorDeps } from './tools/tool-executor';
import { pruneMessages } from './context/pruning';
import { shouldTriggerSummary, getAutoSummaryPrompt } from './context/auto-summary';
import { getUserInsightsContext } from './context/insights';
import {
  getRecentSessionSummaries,
  saveSessionSummary,
} from './sessions/session-summary';
import { getUserIdentity, saveUserIdentity } from './identity/identity-manager';
import { saveToHistory } from './history/history-manager';
import { buildIdentityPrompt } from './prompt/prompt-builder';

export class MemorySystem {
  private config: ResolvedConfig;
  private toolDeps: ToolExecutorDeps;

  constructor(userConfig: MemoryConfig) {
    this.config = resolveConfig(userConfig);

    // Build the deps object that the tool executor needs
    this.toolDeps = {
      basePath: this.config.basePath,
      getUserIdentity: (userId) => getUserIdentity(this.config.basePath, userId, this.config.defaultIdentity),
      saveUserIdentity: (userId, identity) => saveUserIdentity(this.config.basePath, userId, identity),
    };
  }

  // ── Tool integration ──────────────────────────────────────────────

  /** Get all memory tool definitions (Claude tool_use format) */
  getToolDefinitions(): ToolDefinition[] {
    return MEMORY_TOOLS;
  }

  /** Execute a memory tool by name. Returns null if tool name is not recognized. */
  executeTool(toolName: string, args: Record<string, unknown>, userId: string | number): ToolResult | null {
    return executeMemoryTool(toolName, args, userId, this.toolDeps);
  }

  // ── Context management ────────────────────────────────────────────

  /** Prune messages using importance scoring */
  pruneMessages(messages: Message[]): PruneResult {
    return pruneMessages(messages, this.config.context);
  }

  /** Check if auto-summary should be triggered */
  shouldTriggerSummary(messages: Message[]): boolean {
    return shouldTriggerSummary(messages, this.config.context);
  }

  /** Get the auto-summary instruction prompt */
  getAutoSummaryPrompt(exchangeCount: number): string {
    return getAutoSummaryPrompt(exchangeCount);
  }

  /** Get user insights formatted as context string */
  getUserInsightsContext(userId: string | number): string | null {
    return getUserInsightsContext(this.config.basePath, userId);
  }

  // ── Sessions ──────────────────────────────────────────────────────

  /** Get recent session summaries for a user */
  getRecentSessionSummaries(userId: string | number, limit = 5): SessionSummary[] {
    return getRecentSessionSummaries(this.config.basePath, userId, limit);
  }

  /** Save a session summary with deduplication */
  saveSessionSummary(
    userId: string | number,
    summary: string,
    messageCount: number,
    conversationText: string,
  ): { success?: boolean; skipped?: boolean; reason?: string; summary?: SessionSummary } {
    return saveSessionSummary(
      this.config.basePath,
      userId,
      summary,
      messageCount,
      conversationText,
      this.config.sessions,
      this.config.logger,
    );
  }

  // ── Identity ──────────────────────────────────────────────────────

  /** Get user identity (merged with defaults) */
  getUserIdentity(userId: string | number): IdentityConfig {
    return getUserIdentity(this.config.basePath, userId, this.config.defaultIdentity);
  }

  /** Save user identity */
  saveUserIdentity(userId: string | number, identity: IdentityConfig): void {
    saveUserIdentity(this.config.basePath, userId, identity);
  }

  // ── History ───────────────────────────────────────────────────────

  /** Save messages to dated history file */
  saveToHistory(userId: string | number, messages: Message[]): void {
    saveToHistory(this.config.basePath, userId, messages);
  }

  // ── System prompt ─────────────────────────────────────────────────

  /** Build full system prompt for a user */
  buildSystemPrompt(userId: string | number): string {
    const identity = this.getUserIdentity(userId);
    const sessionSummaries = this.getRecentSessionSummaries(userId);
    const userInsights = this.getUserInsightsContext(userId);
    return buildIdentityPrompt(identity, sessionSummaries, userInsights);
  }
}
