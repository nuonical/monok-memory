// Configuration defaults and validation

import type {
  MemoryConfig,
  ResolvedConfig,
  IdentityConfig,
  ResolvedContextConfig,
  ResolvedSessionsConfig,
} from './types';

const DEFAULT_IDENTITY: IdentityConfig = {
  name: 'Alloy',
  personality: 'warm and thoughtful',
};

const DEFAULT_CONTEXT: ResolvedContextConfig = {
  summaryThreshold: 12,
  maxMessagesBeforePrune: 30,
  messagesToKeep: 15,
  recentMessagesToAlwaysKeep: 6,
};

const DEFAULT_SESSIONS: ResolvedSessionsConfig = {
  maxSummaries: 20,
  deduplicationThreshold: 0.7,
  consolidationThreshold: 0.6,
};

const defaultLogger = {
  log: console.log,
  error: console.error,
};

/** Resolve user config with defaults, validate required fields */
export function resolveConfig(config: MemoryConfig): ResolvedConfig {
  if (!config.basePath) {
    throw new Error('monok-memory: basePath is required');
  }

  return {
    basePath: config.basePath,
    defaultIdentity: { ...DEFAULT_IDENTITY, ...config.defaultIdentity },
    llm: config.llm ?? null,
    context: { ...DEFAULT_CONTEXT, ...config.context },
    sessions: { ...DEFAULT_SESSIONS, ...config.sessions },
    logger: config.logger ?? defaultLogger,
  };
}

export { DEFAULT_IDENTITY, DEFAULT_CONTEXT, DEFAULT_SESSIONS };
