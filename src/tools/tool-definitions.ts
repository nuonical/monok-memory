// Memory tool definitions in Claude tool_use format

import type { ToolDefinition } from '../types';

export const MEMORY_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: "Read a file from the user's memory storage. Use this to recall saved information. Supports subdirectories.",
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: "The file path to read (e.g., 'user_profile.md', 'conversation_summaries.md', 'topics/work.md')",
        },
      },
      required: ['filename'],
    },
  },
  {
    name: 'write_file',
    description: "Save content to a file in the user's memory storage. Use this to remember information for future conversations. Supports subdirectories (folders created automatically).",
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: "The file path to write (e.g., 'user_profile.md', 'conversation_summaries.md', 'topics/health-goals.md')",
        },
        content: {
          type: 'string',
          description: 'The content to save',
        },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'append_file',
    description: "Append content to an existing file in the user's memory storage. Creates the file if it doesn't exist. Useful for conversation summaries and logs.",
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: "The file path to append to (e.g., 'conversation_summaries.md')",
        },
        content: {
          type: 'string',
          description: 'The content to append',
        },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: "Delete a file from the user's memory storage. Cannot delete directories.",
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: "The file path to delete (e.g., 'old-notes.md', 'topics/outdated.md')",
        },
      },
      required: ['filename'],
    },
  },
  {
    name: 'list_files',
    description: "List all files and folders in the user's memory storage, including subdirectories",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_identity',
    description: 'Update your own identity/persona. Use this if the user wants to rename you or change your personality.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "Your new name (e.g., 'Aria', 'Max', 'Luna')",
        },
        personality: {
          type: 'string',
          description: 'Brief description of your personality traits',
        },
        voice: {
          type: 'string',
          description: 'Your communication style',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_identity',
    description: 'Get your current identity/persona settings',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'tag_memory',
    description: 'Add tags to a memory or conversation topic for easier retrieval later. Use this to categorize important information.',
    input_schema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: "Tags to associate (e.g., ['work', 'project-alpha', 'important'])",
        },
        summary: {
          type: 'string',
          description: 'Brief summary of what this tagged memory is about',
        },
        importance: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'How important is this memory for future recall',
        },
      },
      required: ['tags', 'summary'],
    },
  },
  {
    name: 'search_by_tag',
    description: 'Find past memories and conversations by tag. Use this to recall specific topics discussed.',
    input_schema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'The tag to search for',
        },
      },
      required: ['tag'],
    },
  },
  {
    name: 'update_user_insights',
    description: 'Record learned patterns, preferences, or behaviors about the user. Use this when you discover something important about how the user works, their preferences, communication style, or habits.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['preferences', 'communication_style', 'work_patterns', 'interests', 'goals', 'context'],
          description: 'Category of insight',
        },
        insight: {
          type: 'string',
          description: "The insight or pattern you've learned",
        },
        confidence: {
          type: 'string',
          enum: ['observed_once', 'pattern_emerging', 'well_established'],
          description: 'How confident you are in this insight based on observations',
        },
      },
      required: ['category', 'insight'],
    },
  },
  {
    name: 'get_user_insights',
    description: 'Retrieve all learned insights about the user. Use this at the start of conversations to recall their preferences and patterns.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'record_learning',
    description: 'Record insights about what works well in your interactions with this user. Use this to improve over time.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['communication_style', 'topic_preference', 'response_length', 'correction', 'success', 'adaptation'],
          description: 'Category of learning',
        },
        insight: {
          type: 'string',
          description: "What you learned (e.g., 'User prefers concise responses', 'Technical details are appreciated')",
        },
        confidence: {
          type: 'string',
          enum: ['tentative', 'emerging', 'established'],
          description: 'How confident you are in this learning based on observations',
        },
        context: {
          type: 'string',
          description: 'Optional context about when/why you noticed this',
        },
      },
      required: ['category', 'insight'],
    },
  },
  {
    name: 'get_learnings',
    description: 'Retrieve your self-improvement learnings about interacting with this user.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'track_pending_item',
    description: 'Track an unresolved item to follow up on in future conversations.',
    input_schema: {
      type: 'object',
      properties: {
        item: {
          type: 'string',
          description: "Description of the pending item (e.g., 'Audio bug fix', 'Project deadline next week')",
        },
        context: {
          type: 'string',
          description: 'Additional context about the item',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How important is this to follow up on',
        },
      },
      required: ['item'],
    },
  },
  {
    name: 'resolve_pending_item',
    description: 'Mark a pending item as resolved.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: {
          type: 'number',
          description: 'ID of the pending item to resolve',
        },
        resolution: {
          type: 'string',
          description: 'How was it resolved (optional)',
        },
      },
      required: ['item_id'],
    },
  },
];
