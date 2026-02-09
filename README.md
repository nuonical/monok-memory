# monok-memory

Persistent per-user memory system for AI chatbots. File-based storage with tagging, insights, learnings, context management, and session summaries. Zero runtime dependencies.

Extracted from [monok.ai](https://monok.ai) — production-tested with real users.

## Installation

```bash
npm install monok-memory
```

Or install from GitHub:

```bash
npm install github:user/monok-memory
```

## Quick Start

```typescript
import { MemorySystem } from 'monok-memory';

const memory = new MemorySystem({
  basePath: './data/users',  // where user directories live
  defaultIdentity: { name: 'Alloy', personality: 'warm and thoughtful' },
});

// Write and read memory files
memory.executeTool('write_file', { filename: 'notes.md', content: '# Notes' }, 'user123');
memory.executeTool('read_file', { filename: 'notes.md' }, 'user123');

// Get tool definitions for Claude tool_use
const tools = memory.getToolDefinitions();

// Build system prompt with identity, session history, and insights
const systemPrompt = memory.buildSystemPrompt('user123');
```

## API Reference

### `new MemorySystem(config)`

Create a new memory system instance.

```typescript
const memory = new MemorySystem({
  basePath: './data/users',       // required — where user dirs live
  defaultIdentity: {              // optional — defaults shown
    name: 'Alloy',
    personality: 'warm and thoughtful',
  },
  llm: myLLMAdapter,              // optional — for auto-generated summaries
  context: {                      // optional — defaults shown
    summaryThreshold: 12,         // user exchanges before auto-summary
    maxMessagesBeforePrune: 30,   // start pruning after this many messages
    messagesToKeep: 15,           // keep this many after pruning
    recentMessagesToAlwaysKeep: 6 // always keep latest N for continuity
  },
  sessions: {                     // optional — defaults shown
    maxSummaries: 20,             // max stored session summaries
    deduplicationThreshold: 0.7,  // similarity threshold for dedup (0-1)
    consolidationThreshold: 0.6,  // similarity threshold for consolidation
  },
  logger: console,                // optional — custom logger
});
```

### Tool Integration

```typescript
// Get Claude tool_use definitions
memory.getToolDefinitions(): ToolDefinition[]

// Execute a memory tool
memory.executeTool(toolName: string, args: object, userId: string | number): ToolResult | null
```

Available tools: `read_file`, `write_file`, `list_files`, `get_identity`, `update_identity`, `tag_memory`, `search_by_tag`, `update_user_insights`, `get_user_insights`, `record_learning`, `get_learnings`, `track_pending_item`, `resolve_pending_item`.

### Context Management

```typescript
// Prune messages using importance scoring
memory.pruneMessages(messages): { messages, pruned, prunedCount }

// Check if auto-summary should trigger
memory.shouldTriggerSummary(messages): boolean

// Get auto-summary instruction prompt
memory.getAutoSummaryPrompt(exchangeCount): string

// Get user insights formatted for system prompt
memory.getUserInsightsContext(userId): string | null
```

### Sessions

```typescript
// Get recent session summaries
memory.getRecentSessionSummaries(userId, limit?): SessionSummary[]

// Save a session summary (with deduplication)
memory.saveSessionSummary(userId, summary, messageCount, conversationText)
```

### Identity

```typescript
// Get user identity (merged with defaults)
memory.getUserIdentity(userId): IdentityConfig

// Save user identity
memory.saveUserIdentity(userId, identity)
```

### History

```typescript
// Save messages to dated history file
memory.saveToHistory(userId, messages)
```

### System Prompt

```typescript
// Build full system prompt with identity + session history + insights
memory.buildSystemPrompt(userId, { isAdmin?: boolean }): string
```

## LLM Provider

The package ships with zero LLM dependencies. Provide your own adapter for features that need text generation:

```typescript
interface LLMProvider {
  generateText(opts: {
    system: string;
    userMessage: string;
    maxTokens?: number;
  }): Promise<string>;
}
```

### Anthropic Adapter

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const llm = {
  async generateText({ system, userMessage, maxTokens = 1024 }) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  },
};
```

### OpenAI Adapter

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();

const llm = {
  async generateText({ system, userMessage, maxTokens = 1024 }) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    });
    return response.choices[0].message.content || '';
  },
};
```

## Storage Format

Each user gets a directory under `basePath`:

```
basePath/
└── {userId}/
    ├── files/                    # User's memory files
    │   ├── notes.md
    │   ├── user_profile.md
    │   ├── conversation_summaries.md
    │   ├── memory_tags.json
    │   ├── user_insights.json
    │   ├── pending_items.json
    │   ├── self_improvement/
    │   │   └── learnings.json
    │   └── topics/
    │       └── *.md
    ├── identity.json             # Per-user identity override
    ├── session_summaries.json    # Session history
    └── history/                  # Dated conversation logs
        └── {year}/{month}/week-{week}/
            └── {YYYY-MM-DD}.txt
```

All files are plain JSON or text. No database required.

## Advanced Usage

Individual functions are exported for selective use:

```typescript
import {
  scoreMessageImportance,
  pruneMessages,
  extractTopics,
  isSummaryDuplicate,
  getUserFilesDir,
  buildIdentityPrompt,
} from 'monok-memory';
```

## License

MIT
