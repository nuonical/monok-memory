/**
 * monok-memory MCP Server
 *
 * Exposes all monok-memory tools via the Model Context Protocol (MCP) stdio transport.
 * Use with Claude Code CLI or any MCP-compatible client:
 *
 *   npx monok-memory-mcp --base-path ./user-data
 *
 * Or in mcp-config.json:
 *   {
 *     "mcpServers": {
 *       "memory": {
 *         "command": "npx",
 *         "args": ["monok-memory-mcp", "--base-path", "./user-data"]
 *       }
 *     }
 *   }
 *
 * Environment variables:
 *   MEMORY_BASE_PATH  — base directory for user data (required unless --base-path given)
 *   MEMORY_USER_ID    — user ID (default: "1")
 *   MEMORY_BOT_NAME   — bot name for identity (default: "Assistant")
 */

import * as readline from 'readline';
import { MemorySystem } from './memory';
import { MEMORY_TOOLS } from './tools/tool-definitions';

// ── CLI args / env ─────────────────────────────────────────────────

function parseArgs(): { basePath: string; userId: string; botName: string } {
  const args = process.argv.slice(2);
  let basePath = process.env.MEMORY_BASE_PATH || '';
  let userId = process.env.MEMORY_USER_ID || '1';
  let botName = process.env.MEMORY_BOT_NAME || 'Assistant';

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--base-path' || args[i] === '-b') && args[i + 1]) {
      basePath = args[++i];
    } else if ((args[i] === '--user-id' || args[i] === '-u') && args[i + 1]) {
      userId = args[++i];
    } else if ((args[i] === '--bot-name') && args[i + 1]) {
      botName = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      process.stderr.write(`
monok-memory MCP Server — persistent memory tools for AI assistants

Usage:
  monok-memory-mcp --base-path <dir> [--user-id <id>] [--bot-name <name>]

Options:
  --base-path, -b  Base directory for user data storage (required)
  --user-id, -u    User ID for memory operations (default: "1")
  --bot-name       Bot name for identity (default: "Assistant")
  --help, -h       Show this help message

Environment variables:
  MEMORY_BASE_PATH  Same as --base-path
  MEMORY_USER_ID    Same as --user-id
  MEMORY_BOT_NAME   Same as --bot-name

This server implements the Model Context Protocol (MCP) over stdio.
Add it to your Claude Code mcp-config.json or any MCP client.
`);
      process.exit(0);
    }
  }

  if (!basePath) {
    process.stderr.write(
      'Error: --base-path or MEMORY_BASE_PATH is required.\n' +
      'Run with --help for usage.\n'
    );
    process.exit(1);
  }

  return { basePath, userId, botName };
}

const config = parseArgs();

// ── Memory system ──────────────────────────────────────────────────

const memory = new MemorySystem({
  basePath: config.basePath,
  defaultIdentity: { name: config.botName, personality: 'helpful' },
  logger: {
    log: (...args: unknown[]) => process.stderr.write(`[monok-memory] ${args.join(' ')}\n`),
    error: (...args: unknown[]) => process.stderr.write(`[monok-memory] ERROR: ${args.join(' ')}\n`),
  },
});

function log(msg: string) {
  process.stderr.write(`[mcp-memory ${new Date().toISOString()}] ${msg}\n`);
}

// ── Tool renaming (avoid collisions with Claude Code native tools) ─

const TOOL_RENAMES: Record<string, string> = {
  read_file: 'memory_read',
  write_file: 'memory_write',
  append_file: 'memory_append',
  delete_file: 'memory_delete',
  list_files: 'memory_list',
};

const REVERSE_RENAMES: Record<string, string> = {};
for (const [original, renamed] of Object.entries(TOOL_RENAMES)) {
  REVERSE_RENAMES[renamed] = original;
}

const tools = MEMORY_TOOLS.map(tool => ({
  name: TOOL_RENAMES[tool.name] || tool.name,
  description: tool.description,
  inputSchema: tool.input_schema,
}));

// ── JSON-RPC / MCP transport ───────────────────────────────────────

function send(obj: unknown) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line: string) => {
  if (!line.trim()) return;

  let request: any;
  try {
    request = JSON.parse(line);
  } catch (e: any) {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${e.message}` } });
    return;
  }

  // Notifications have no id
  if (request.id === undefined || request.id === null) {
    log(`Notification: ${request.method}`);
    return;
  }

  try {
    if (request.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'monok-memory', version: '1.0.0' },
          capabilities: { tools: {} },
        },
      });
      log('Initialized');
    }

    else if (request.method === 'tools/list') {
      send({ jsonrpc: '2.0', id: request.id, result: { tools } });
      log(`Listed ${tools.length} tools`);
    }

    else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;
      log(`Calling tool: ${name}`);

      const originalName = REVERSE_RENAMES[name] || name;

      try {
        const result = memory.executeTool(originalName, args || {}, config.userId);

        if (result === null) {
          send({
            jsonrpc: '2.0', id: request.id,
            result: { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true },
          });
          return;
        }

        send({
          jsonrpc: '2.0', id: request.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: !!result.error },
        });
        log(`Tool ${name} ${result.error ? 'error' : 'completed'}`);
      } catch (toolErr: any) {
        send({
          jsonrpc: '2.0', id: request.id,
          result: { content: [{ type: 'text', text: JSON.stringify({ error: toolErr.message }) }], isError: true },
        });
        log(`Tool ${name} error: ${toolErr.message}`);
      }
    }

    else {
      send({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Method not found: ${request.method}` } });
    }

  } catch (e: any) {
    send({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: `Internal error: ${e.message}` } });
    log(`Error handling ${request.method}: ${e.message}`);
  }
});

process.on('SIGTERM', () => { rl.close(); process.exit(0); });
process.on('SIGINT', () => { rl.close(); process.exit(0); });

log(`MCP server started (basePath: ${config.basePath}, userId: ${config.userId})`);
