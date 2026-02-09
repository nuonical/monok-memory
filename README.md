# monok-memory

Persistent, per-user memory system for AI chatbots. Give your AI assistant the ability to remember users across conversations — their preferences, past discussions, ongoing tasks, and learned interaction patterns. All stored as flat files with zero runtime dependencies.

Extracted from [monok.ai](https://monok.ai) — production-tested with real users.

## Features

- **Persistent file-based memory** — Read, write, and organize per-user memory files (notes, profiles, topic files)
- **Tagging & search** — Tag conversations by topic and importance, then retrieve them later
- **User insights** — Automatically track user preferences, communication style, work patterns, interests, and goals
- **Self-improvement learnings** — Record what works well in interactions and adapt over time
- **Pending item tracking** — Track unresolved items and follow up in future conversations
- **Session summaries** — Summarize conversations with automatic deduplication and consolidation
- **Context pruning** — Intelligently prune long conversations using importance scoring to stay within token limits
- **Identity system** — Per-user customizable bot identity (name, personality, voice)
- **System prompt builder** — Generate rich system prompts with identity, session history, and user insights baked in
- **Conversation history** — Save dated conversation logs organized by year/month/week
- **Claude tool_use integration** — 13 ready-to-use tool definitions that plug directly into Claude's tool_use API
- **Zero runtime dependencies** — Only uses Node.js built-ins (`fs`, `path`)
- **Bring your own LLM** — Simple adapter interface works with any provider (Anthropic, OpenAI, etc.)

## Installation

```bash
npm install monok-memory
```

Or install directly from GitHub:

```bash
npm install github:nuonical/monok-memory
```

## Quick Start

```typescript
import { MemorySystem } from 'monok-memory';

const memory = new MemorySystem({
  basePath: './data/users',
  defaultIdentity: { name: 'Alloy', personality: 'warm and thoughtful' },
});

// Get Claude tool definitions — plug these into your API call
const tools = memory.getToolDefinitions();

// Execute tools when Claude calls them
const result = memory.executeTool('write_file', {
  filename: 'user_profile.md',
  content: '# User Profile\n- Prefers dark mode\n- Works in TypeScript',
}, 'user123');

// Build a system prompt with identity + session history + insights
const systemPrompt = memory.buildSystemPrompt('user123');
```

### Integrating with Claude

Here's a minimal example of wiring `monok-memory` into a Claude API call:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { MemorySystem } from 'monok-memory';

const anthropic = new Anthropic();
const memory = new MemorySystem({
  basePath: './data/users',
  defaultIdentity: { name: 'Alloy', personality: 'warm and thoughtful' },
});

async function chat(userId: string, userMessage: string) {
  const systemPrompt = memory.buildSystemPrompt(userId);
  const tools = memory.getToolDefinitions();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    tools,
  });

  // Handle tool calls from Claude
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const toolResult = memory.executeTool(block.name, block.input, userId);
      // Send tool_result back to Claude in the next turn...
    }
  }

  return response;
}
```

## Memory Tools

The package includes 15 tools in Claude `tool_use` format. Claude uses these autonomously to manage user memory:

| Tool | Description |
|------|-------------|
| `read_file` | Read a file from the user's memory storage |
| `write_file` | Save content to a memory file (supports subdirectories) |
| `append_file` | Append content to an existing file (creates if missing) |
| `delete_file` | Delete a file from the user's storage |
| `list_files` | List all files and folders in the user's storage |
| `get_identity` | Get the bot's current identity/persona settings |
| `update_identity` | Update the bot's name, personality, or voice |
| `tag_memory` | Tag a conversation with topics and importance level |
| `search_by_tag` | Find past memories by topic tag |
| `update_user_insights` | Record learned patterns and preferences about the user |
| `get_user_insights` | Retrieve all learned insights about the user |
| `record_learning` | Record self-improvement insights about interactions |
| `get_learnings` | Retrieve self-improvement learnings |
| `track_pending_item` | Track an unresolved item for follow-up |
| `resolve_pending_item` | Mark a pending item as resolved |

### User Insights Categories

When Claude calls `update_user_insights`, it categorizes observations about the user:

- **preferences** — UI preferences, tool choices, workflow habits
- **communication_style** — How the user likes to communicate
- **work_patterns** — Scheduling, productivity patterns, work habits
- **interests** — Topics and subjects the user engages with
- **goals** — Short and long-term objectives the user has mentioned
- **context** — Background info (role, team, projects)

### Self-Improvement Categories

The `record_learning` tool lets the bot improve over time:

- **communication_style** — What response style works best
- **topic_preference** — Topics the user engages with most
- **response_length** — Preferred level of detail
- **correction** — Things the user corrected
- **success** — Approaches that worked well
- **adaptation** — Adjustments made based on feedback

## Configuration

```typescript
const memory = new MemorySystem({
  // Required — base directory for all user data
  basePath: './data/users',

  // Optional — default bot identity (users can override per-user)
  defaultIdentity: {
    name: 'Alloy',
    personality: 'warm and thoughtful',
    voice: 'conversational and friendly',
    description: 'An AI assistant with persistent memory',
  },

  // Optional — LLM provider for auto-generated summaries
  llm: myLLMAdapter,

  // Optional — context management tuning
  context: {
    summaryThreshold: 12,           // user exchanges before auto-summary triggers
    maxMessagesBeforePrune: 30,     // start pruning after this many messages
    messagesToKeep: 15,             // keep this many messages after pruning
    recentMessagesToAlwaysKeep: 6,  // always keep the latest N for continuity
  },

  // Optional — session summary tuning
  sessions: {
    maxSummaries: 20,               // max stored session summaries per user
    deduplicationThreshold: 0.7,    // similarity threshold for dedup (0-1)
    consolidationThreshold: 0.6,    // similarity threshold for merging (0-1)
  },

  // Optional — custom logger (defaults to console)
  logger: console,
});
```

## API Reference

### Tool Integration

```typescript
// Get all 13 memory tool definitions (Claude tool_use format)
memory.getToolDefinitions(): ToolDefinition[]

// Execute a memory tool by name — returns null if tool name isn't recognized
memory.executeTool(toolName: string, args: object, userId: string | number): ToolResult | null
```

### Context Management

```typescript
// Prune messages using importance scoring (keeps system messages, recent messages,
// and highest-scored older messages; adds a context bridge note)
memory.pruneMessages(messages: Message[]): { messages: Message[], pruned: boolean, prunedCount?: number }

// Check if auto-summary should trigger based on message count
memory.shouldTriggerSummary(messages: Message[]): boolean

// Get the instruction prompt for auto-summarization
memory.getAutoSummaryPrompt(exchangeCount: number): string

// Get formatted user insights for injection into system prompt
memory.getUserInsightsContext(userId: string | number): string | null
```

### Sessions

```typescript
// Get recent session summaries (newest first)
memory.getRecentSessionSummaries(userId: string | number, limit?: number): SessionSummary[]

// Save a session summary — automatically deduplicates and consolidates similar entries
memory.saveSessionSummary(userId, summary, messageCount, conversationText): { success?, skipped?, reason?, summary? }
```

### Identity

```typescript
// Get user identity (user-specific overrides merged with defaults)
memory.getUserIdentity(userId: string | number): IdentityConfig

// Save a per-user identity override
memory.saveUserIdentity(userId: string | number, identity: IdentityConfig): void
```

### History & Prompt

```typescript
// Save messages to a dated history file (year/month/week structure)
memory.saveToHistory(userId: string | number, messages: Message[]): void

// Build a complete system prompt with identity, session history, and user insights
memory.buildSystemPrompt(userId: string | number, options?: BuildPromptOptions): string

// BuildPromptOptions lets you inject extra prompt text (e.g., admin instructions)
// { extraPrompt?: string }
```

## Context Pruning

When conversations get long, `pruneMessages()` intelligently removes less important messages while preserving context. Each message gets an importance score based on:

| Signal | Score Boost |
|--------|------------|
| Personal information sharing | +5 |
| Commitments or follow-up items | +4 |
| Questions from the user | +3 |
| Emotional expressions | +3 |
| Code blocks | +2 |
| Technical content | +2 |
| Recency (newer messages) | +1 to +3 |

System messages and the most recent messages are always preserved. A context bridge note is injected to maintain conversational continuity.

## LLM Provider

The package ships with zero LLM dependencies. Provide your own adapter for features like auto-generated summaries:

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
      model: 'claude-sonnet-4-5-20250514',
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

Each user gets an isolated directory under `basePath`. Everything is plain JSON or text — no database required.

```
basePath/
└── {userId}/
    ├── files/                        # User's memory files
    │   ├── notes.md                  # Free-form notes
    │   ├── user_profile.md           # Key facts about the user
    │   ├── conversation_summaries.md # Dated conversation summaries
    │   ├── memory_tags.json          # Tagged memory entries
    │   ├── user_insights.json        # Learned user patterns
    │   ├── pending_items.json        # Tracked follow-up items
    │   ├── self_improvement/
    │   │   └── learnings.json        # Self-improvement data
    │   └── topics/
    │       └── *.md                  # Topic-specific memory files
    ├── identity.json                 # Per-user identity override
    ├── session_summaries.json        # Session history with dedup
    └── history/                      # Dated conversation logs
        └── {year}/{month}/week-{N}/
            └── {YYYY-MM-DD}.txt
```

## Advanced Usage

All internal functions are exported for selective use:

```typescript
import {
  // Context & pruning
  scoreMessageImportance,
  pruneMessages,

  // Sessions
  extractTopics,
  isSummaryDuplicate,
  getRecentSessionSummaries,
  saveSessionSummary,

  // Storage helpers
  getUserFilesDir,
  readJsonFile,
  writeJsonFile,

  // Identity
  getUserIdentity,
  saveUserIdentity,

  // Prompt building
  buildIdentityPrompt,
} from 'monok-memory';
```

## Security

- **Path traversal protection** — All file operations sanitize paths to prevent directory escape
- **Extension whitelist** — Only `.md`, `.txt`, and `.json` files can be created
- **Per-user isolation** — Each user's data is stored in a separate directory
- **No network calls** — The package never makes network requests; all storage is local

## License

MIT
