# monok-memory

Persistent, per-user memory system for AI assistants. Ships with a built-in **MCP server** for Claude Code and any MCP-compatible client, plus a programmatic API for direct integration.

Give your AI the ability to remember users across conversations — preferences, past discussions, ongoing tasks, and learned interaction patterns. All stored as flat files with zero runtime dependencies.

Extracted from [monok.ai](https://monok.ai) — production-tested with real users.

## MCP Server (Recommended)

The fastest way to add persistent memory to Claude Code or any MCP client.

### Setup

Add to your `mcp-config.json` (or Claude Code's MCP settings):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["monok-memory-mcp", "--base-path", "./user-data"]
    }
  }
}
```

That's it. Claude Code now has 15 memory tools available — file storage, tagging, user insights, self-improvement learnings, and pending item tracking.

### CLI Options

```
monok-memory-mcp --base-path <dir> [--user-id <id>] [--bot-name <name>]

Options:
  --base-path, -b  Base directory for user data storage (required)
  --user-id, -u    User ID for memory operations (default: "1")
  --bot-name       Bot name for identity (default: "Assistant")

Environment variables:
  MEMORY_BASE_PATH  Same as --base-path
  MEMORY_USER_ID    Same as --user-id
  MEMORY_BOT_NAME   Same as --bot-name
```

### Tool Renaming

To avoid collisions with Claude Code's built-in `Read`/`Write` tools, the MCP server renames five file operations:

| Original | MCP Name |
|----------|----------|
| `read_file` | `memory_read` |
| `write_file` | `memory_write` |
| `append_file` | `memory_append` |
| `delete_file` | `memory_delete` |
| `list_files` | `memory_list` |

All other tools keep their original names (they're already unique).

## Installation

```bash
npm install monok-memory
# or
npm install github:nuonical/monok-memory
```

## Features

- **MCP server** — Built-in `monok-memory-mcp` binary for Claude Code CLI and any MCP client
- **15 memory tools** — File ops, tagging, search, user insights, self-improvement, pending items
- **Session summaries** — Automatic deduplication and consolidation of conversation summaries
- **Context pruning** — Importance-scored message pruning to stay within token limits
- **Identity system** — Per-user customizable bot identity (name, personality, voice)
- **System prompt builder** — Rich prompts with identity, session history, and insights
- **Zero runtime dependencies** — Only Node.js built-ins (`fs`, `path`)

## Memory Tools

| Tool | Description |
|------|-------------|
| `memory_read` | Read a file from the user's memory storage |
| `memory_write` | Save content to a memory file (supports subdirectories) |
| `memory_append` | Append content to an existing file (creates if missing) |
| `memory_delete` | Delete a file from the user's storage |
| `memory_list` | List all files and folders in the user's storage |
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

## Programmatic API

For direct integration without MCP:

```typescript
import { MemorySystem } from 'monok-memory';

const memory = new MemorySystem({
  basePath: './data/users',
  defaultIdentity: { name: 'Alloy', personality: 'warm and thoughtful' },
});

// Get tool definitions (Claude tool_use format)
const tools = memory.getToolDefinitions();

// Execute tools when Claude calls them
const result = memory.executeTool('write_file', {
  filename: 'user_profile.md',
  content: '# User Profile\n- Prefers dark mode\n- Works in TypeScript',
}, 'user123');

// Build a system prompt with identity + session history + insights
const systemPrompt = memory.buildSystemPrompt('user123');
```

### Integrating with Claude API

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

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const toolResult = memory.executeTool(block.name, block.input, userId);
      // Send tool_result back to Claude in the next turn...
    }
  }

  return response;
}
```

## Configuration

```typescript
const memory = new MemorySystem({
  basePath: './data/users',                 // Required

  defaultIdentity: {                        // Optional
    name: 'Alloy',
    personality: 'warm and thoughtful',
    voice: 'conversational and friendly',
    description: 'An AI assistant with persistent memory',
  },

  llm: myLLMAdapter,                        // Optional — for auto-summaries

  context: {                                // Optional — pruning tuning
    summaryThreshold: 12,
    maxMessagesBeforePrune: 30,
    messagesToKeep: 15,
    recentMessagesToAlwaysKeep: 6,
  },

  sessions: {                               // Optional — summary tuning
    maxSummaries: 20,
    deduplicationThreshold: 0.7,
    consolidationThreshold: 0.6,
  },
});
```

## API Reference

### Tool Integration

```typescript
memory.getToolDefinitions(): ToolDefinition[]
memory.executeTool(toolName: string, args: object, userId: string | number): ToolResult | null
```

### Context Management

```typescript
memory.pruneMessages(messages: Message[]): PruneResult
memory.shouldTriggerSummary(messages: Message[]): boolean
memory.getAutoSummaryPrompt(exchangeCount: number): string
memory.getUserInsightsContext(userId: string | number): string | null
```

### Sessions

```typescript
memory.getRecentSessionSummaries(userId: string | number, limit?: number): SessionSummary[]
memory.saveSessionSummary(userId, summary, messageCount, conversationText): SaveResult
```

### Identity

```typescript
memory.getUserIdentity(userId: string | number): IdentityConfig
memory.saveUserIdentity(userId: string | number, identity: IdentityConfig): void
```

### History & Prompt

```typescript
memory.saveToHistory(userId: string | number, messages: Message[]): void
memory.buildSystemPrompt(userId: string | number, options?: BuildPromptOptions): string
```

## Storage Format

Each user gets an isolated directory. Everything is plain JSON or text — no database.

```
basePath/
└── {userId}/
    ├── files/                        # User's memory files
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
    ├── identity.json                 # Per-user identity override
    ├── session_summaries.json        # Session history
    └── history/                      # Dated conversation logs
        └── {year}/{month}/week-{N}/
            └── {YYYY-MM-DD}.txt
```

## Security

- **Path traversal protection** — All file operations sanitize paths to prevent directory escape
- **Extension whitelist** — Only `.md`, `.txt`, and `.json` files can be created
- **Per-user isolation** — Each user's data lives in a separate directory
- **No network calls** — All storage is local, no external requests

## License

MIT
