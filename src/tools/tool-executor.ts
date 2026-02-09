// Memory tool executor — executeMemoryTool() switch logic

import fs from 'fs';
import path from 'path';
import type {
  ToolResult,
  IdentityConfig,
  TagsData,
  InsightsData,
  LearningsData,
  PendingItemsData,
} from '../types';
import { getUserFilesDir } from '../storage/file-storage';
import { listRecursive, readJsonFile, writeJsonFile } from '../storage/file-storage';

export interface ToolExecutorDeps {
  basePath: string;
  getUserIdentity: (userId: string | number) => IdentityConfig;
  saveUserIdentity: (userId: string | number, identity: IdentityConfig) => void;
}

/** Execute a memory tool by name. Returns null if the tool name is not recognized. */
export function executeMemoryTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string | number,
  deps: ToolExecutorDeps,
): ToolResult | null {
  const filesDir = getUserFilesDir(deps.basePath, userId);

  switch (toolName) {
    case 'read_file': {
      const safePath = path.normalize(String(args.filename)).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(filesDir, safePath);

      if (!filePath.startsWith(filesDir)) {
        return { error: 'Invalid file path: path must stay within user directory' };
      }

      if (!fs.existsSync(filePath)) {
        return { error: `File '${safePath}' not found` };
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return { filename: safePath, content };
      } catch (e: unknown) {
        return { error: `Failed to read file: ${(e as Error).message}` };
      }
    }

    case 'write_file': {
      const safePath = path.normalize(String(args.filename)).replace(/^(\.\.(\/|\\|$))+/, '');
      const ext = path.extname(safePath).toLowerCase();
      const allowedExts = ['.md', '.txt', '.json'];

      if (!ext) {
        return { error: `File must have an extension. Allowed: ${allowedExts.join(', ')}` };
      }

      if (!allowedExts.includes(ext)) {
        return { error: `Invalid file extension. Allowed: ${allowedExts.join(', ')}` };
      }

      const filePath = path.join(filesDir, safePath || 'notes.md');

      if (!filePath.startsWith(filesDir)) {
        return { error: 'Invalid file path: path must stay within user directory' };
      }

      try {
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        const content = String(args.content);
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true, filename: safePath, size: Buffer.byteLength(content, 'utf8') };
      } catch (e: unknown) {
        return { error: `Failed to write file: ${(e as Error).message}` };
      }
    }

    case 'append_file': {
      const safePath = path.normalize(String(args.filename)).replace(/^(\.\.(\/|\\|$))+/, '');
      const ext = path.extname(safePath).toLowerCase();
      const allowedExts = ['.md', '.txt', '.json'];

      if (!ext) {
        return { error: `File must have an extension. Allowed: ${allowedExts.join(', ')}` };
      }

      if (!allowedExts.includes(ext)) {
        return { error: `Invalid file extension. Allowed: ${allowedExts.join(', ')}` };
      }

      const filePath = path.join(filesDir, safePath || 'notes.md');

      if (!filePath.startsWith(filesDir)) {
        return { error: 'Invalid file path: path must stay within user directory' };
      }

      try {
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        const content = String(args.content);
        fs.appendFileSync(filePath, content, 'utf8');
        const stat = fs.statSync(filePath);
        return { success: true, filename: safePath, size: stat.size };
      } catch (e: unknown) {
        return { error: `Failed to append to file: ${(e as Error).message}` };
      }
    }

    case 'delete_file': {
      const safePath = path.normalize(String(args.filename)).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(filesDir, safePath);

      if (!filePath.startsWith(filesDir)) {
        return { error: 'Invalid file path: path must stay within user directory' };
      }

      if (!fs.existsSync(filePath)) {
        return { error: `File '${safePath}' not found` };
      }

      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          return { error: 'Cannot delete directories. Only files can be deleted.' };
        }
        fs.unlinkSync(filePath);
        return { success: true, message: `Deleted '${safePath}'` };
      } catch (e: unknown) {
        return { error: `Failed to delete file: ${(e as Error).message}` };
      }
    }

    case 'list_files': {
      try {
        if (!fs.existsSync(filesDir)) {
          return { files: [] };
        }
        const files = listRecursive(filesDir);
        return { files };
      } catch (e: unknown) {
        return { error: `Failed to list files: ${(e as Error).message}` };
      }
    }

    case 'get_identity': {
      try {
        const identity = deps.getUserIdentity(userId);
        return {
          name: identity.name,
          personality: identity.personality,
          voice: identity.voice,
          description: identity.description,
        };
      } catch (e: unknown) {
        return { error: `Failed to get identity: ${(e as Error).message}` };
      }
    }

    case 'update_identity': {
      try {
        const updates: Record<string, string> = {};
        if (args.name) updates.name = String(args.name).substring(0, 50);
        if (args.personality) updates.personality = String(args.personality).substring(0, 200);
        if (args.voice) updates.voice = String(args.voice).substring(0, 200);

        if (Object.keys(updates).length === 0) {
          return { error: 'No valid fields provided to update' };
        }

        const currentIdentity = deps.getUserIdentity(userId);
        const newIdentity = { ...currentIdentity, ...updates };
        deps.saveUserIdentity(userId, newIdentity);

        return {
          success: true,
          message: 'Identity updated successfully',
          identity: newIdentity,
        };
      } catch (e: unknown) {
        return { error: `Failed to update identity: ${(e as Error).message}` };
      }
    }

    case 'tag_memory': {
      try {
        if (!Array.isArray(args.tags) || args.tags.length === 0) {
          return { error: 'tags must be a non-empty array of strings' };
        }
        const tags = (args.tags as unknown[]).map(t => String(t).trim()).filter(t => t.length > 0);
        if (tags.length === 0) {
          return { error: 'tags must contain at least one non-empty string' };
        }

        const validImportance = ['low', 'medium', 'high', 'critical'];
        const importance = String(args.importance || 'medium');
        if (!validImportance.includes(importance)) {
          return { error: `Invalid importance. Allowed: ${validImportance.join(', ')}` };
        }

        const tagsFile = path.join(filesDir, 'memory_tags.json');
        const tagsData = readJsonFile<TagsData>(tagsFile, { tags: {}, entries: [] });

        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          tags,
          summary: String(args.summary),
          importance,
        };

        tagsData.entries.push(entry);

        for (const tag of tags) {
          if (!tagsData.tags[tag]) {
            tagsData.tags[tag] = [];
          }
          tagsData.tags[tag].push(entry.id);
        }

        writeJsonFile(tagsFile, tagsData);

        return {
          success: true,
          message: `Tagged memory with: ${tags.join(', ')}`,
          entry,
        };
      } catch (e: unknown) {
        return { error: `Failed to tag memory: ${(e as Error).message}` };
      }
    }

    case 'search_by_tag': {
      try {
        const tagsFile = path.join(filesDir, 'memory_tags.json');

        if (!fs.existsSync(tagsFile)) {
          return { results: [], message: 'No tagged memories found' };
        }

        const tagsData = readJsonFile<TagsData>(tagsFile, { tags: {}, entries: [] });
        const tag = String(args.tag).toLowerCase();

        const matchingIds = tagsData.tags[tag] || [];
        const results = tagsData.entries.filter(e => matchingIds.includes(e.id));

        const partialMatches = tagsData.entries.filter(
          e => !matchingIds.includes(e.id) && e.tags.some(t => t.toLowerCase().includes(tag)),
        );

        return {
          exact_matches: results,
          partial_matches: partialMatches,
          all_tags: Object.keys(tagsData.tags),
        };
      } catch (e: unknown) {
        return { error: `Failed to search tags: ${(e as Error).message}` };
      }
    }

    case 'update_user_insights': {
      try {
        const validCategories = ['preferences', 'communication_style', 'work_patterns', 'interests', 'goals', 'context'];
        const category = String(args.category);
        if (!validCategories.includes(category)) {
          return { error: `Invalid category. Allowed: ${validCategories.join(', ')}` };
        }

        const validConfidence = ['observed_once', 'pattern_emerging', 'well_established'];
        if (args.confidence && !validConfidence.includes(String(args.confidence))) {
          return { error: `Invalid confidence. Allowed: ${validConfidence.join(', ')}` };
        }

        const insightsFile = path.join(filesDir, 'user_insights.json');
        const insights = readJsonFile<InsightsData>(insightsFile, {
          preferences: [],
          communication_style: [],
          work_patterns: [],
          interests: [],
          goals: [],
          context: [],
          last_updated: null,
        });
        if (!insights[category]) {
          (insights as Record<string, unknown>)[category] = [];
        }
        const categoryItems = insights[category] as InsightsData['preferences'];

        const insightText = String(args.insight);
        const existing = categoryItems.find(
          i =>
            i.insight.toLowerCase().includes(insightText.toLowerCase().substring(0, 30)) ||
            insightText.toLowerCase().includes(i.insight.toLowerCase().substring(0, 30)),
        );

        if (existing) {
          existing.confidence = String(args.confidence || 'pattern_emerging');
          existing.last_observed = new Date().toISOString();
          existing.observation_count = (existing.observation_count || 1) + 1;
        } else {
          categoryItems.push({
            insight: insightText,
            confidence: String(args.confidence || 'observed_once'),
            first_observed: new Date().toISOString(),
            last_observed: new Date().toISOString(),
            observation_count: 1,
          });
        }

        insights.last_updated = new Date().toISOString();
        writeJsonFile(insightsFile, insights);

        return {
          success: true,
          message: `Recorded insight in ${category}`,
          category,
          total_insights: categoryItems.length,
        };
      } catch (e: unknown) {
        return { error: `Failed to update insights: ${(e as Error).message}` };
      }
    }

    case 'get_user_insights': {
      try {
        const insightsFile = path.join(filesDir, 'user_insights.json');

        if (!fs.existsSync(insightsFile)) {
          return { message: 'No user insights recorded yet', insights: null };
        }

        const insights = readJsonFile<InsightsData>(insightsFile, {
          preferences: [],
          communication_style: [],
          work_patterns: [],
          interests: [],
          goals: [],
          context: [],
          last_updated: null,
        });

        const summary: Record<string, unknown> = {};
        for (const [category, items] of Object.entries(insights)) {
          if (Array.isArray(items) && items.length > 0) {
            summary[category] = items.map(i => ({
              insight: i.insight,
              confidence: i.confidence,
              observations: i.observation_count,
            }));
          }
        }

        return { insights: summary, last_updated: insights.last_updated };
      } catch (e: unknown) {
        return { error: `Failed to get insights: ${(e as Error).message}` };
      }
    }

    case 'record_learning': {
      try {
        const validCategories = ['communication_style', 'topic_preference', 'response_length', 'correction', 'success', 'adaptation'];
        const category = String(args.category);
        if (!validCategories.includes(category)) {
          return { error: `Invalid category. Allowed: ${validCategories.join(', ')}` };
        }

        const validConfidence = ['tentative', 'emerging', 'established'];
        if (args.confidence && !validConfidence.includes(String(args.confidence))) {
          return { error: `Invalid confidence. Allowed: ${validConfidence.join(', ')}` };
        }

        const learningsDir = path.join(filesDir, 'self_improvement');
        fs.mkdirSync(learningsDir, { recursive: true });

        const learningsFile = path.join(learningsDir, 'learnings.json');
        const learnings = readJsonFile<LearningsData>(learningsFile, {
          communication_style: [],
          topic_preference: [],
          response_length: [],
          correction: [],
          success: [],
          adaptation: [],
          last_updated: null,
        });
        if (!learnings[category]) {
          (learnings as Record<string, unknown>)[category] = [];
        }
        const categoryItems = learnings[category] as LearningsData['communication_style'];

        const insightText = String(args.insight);
        const existing = categoryItems.find(
          l =>
            l.insight.toLowerCase().includes(insightText.toLowerCase().substring(0, 30)) ||
            insightText.toLowerCase().includes(l.insight.toLowerCase().substring(0, 30)),
        );

        if (existing) {
          if (existing.confidence === 'tentative') existing.confidence = 'emerging';
          else if (existing.confidence === 'emerging') existing.confidence = 'established';
          existing.last_observed = new Date().toISOString();
          existing.observation_count = (existing.observation_count || 1) + 1;
        } else {
          categoryItems.push({
            id: Date.now(),
            insight: insightText,
            confidence: String(args.confidence || 'tentative'),
            context: args.context ? String(args.context) : null,
            first_observed: new Date().toISOString(),
            last_observed: new Date().toISOString(),
            observation_count: 1,
          });
        }

        learnings.last_updated = new Date().toISOString();
        writeJsonFile(learningsFile, learnings);

        return {
          success: true,
          message: `Recorded learning in ${category}`,
          category,
          total_learnings: categoryItems.length,
        };
      } catch (e: unknown) {
        return { error: `Failed to record learning: ${(e as Error).message}` };
      }
    }

    case 'get_learnings': {
      try {
        const learningsFile = path.join(filesDir, 'self_improvement', 'learnings.json');

        if (!fs.existsSync(learningsFile)) {
          return { message: 'No self-improvement learnings recorded yet', learnings: null };
        }

        const learnings = readJsonFile<LearningsData>(learningsFile, {
          communication_style: [],
          topic_preference: [],
          response_length: [],
          correction: [],
          success: [],
          adaptation: [],
          last_updated: null,
        });

        const summary: Record<string, unknown> = {};
        for (const [category, items] of Object.entries(learnings)) {
          if (Array.isArray(items) && items.length > 0) {
            summary[category] = items.map(l => ({
              insight: l.insight,
              confidence: l.confidence,
              observations: l.observation_count,
            }));
          }
        }

        return { learnings: summary, last_updated: learnings.last_updated };
      } catch (e: unknown) {
        return { error: `Failed to get learnings: ${(e as Error).message}` };
      }
    }

    case 'track_pending_item': {
      try {
        const validPriority = ['low', 'medium', 'high'];
        const priority = String(args.priority || 'medium');
        if (!validPriority.includes(priority)) {
          return { error: `Invalid priority. Allowed: ${validPriority.join(', ')}` };
        }

        const pendingFile = path.join(filesDir, 'pending_items.json');
        const data = readJsonFile<PendingItemsData>(pendingFile, { items: [], last_updated: null });

        const newItem = {
          id: Date.now(),
          item: String(args.item),
          context: args.context ? String(args.context) : null,
          priority,
          created: new Date().toISOString(),
          resolved: false,
        };

        data.items.push(newItem);
        data.last_updated = new Date().toISOString();

        if (data.items.length > 20) {
          const unresolved = data.items.filter(i => !i.resolved);
          const resolved = data.items.filter(i => i.resolved).slice(-5);
          data.items = [...unresolved, ...resolved];
        }

        writeJsonFile(pendingFile, data);

        return {
          success: true,
          message: `Tracking pending item: ${newItem.item}`,
          item: newItem,
        };
      } catch (e: unknown) {
        return { error: `Failed to track pending item: ${(e as Error).message}` };
      }
    }

    case 'resolve_pending_item': {
      try {
        const pendingFile = path.join(filesDir, 'pending_items.json');

        if (!fs.existsSync(pendingFile)) {
          return { error: 'No pending items found' };
        }

        const data = readJsonFile<PendingItemsData>(pendingFile, { items: [], last_updated: null });
        const item = data.items.find(i => i.id === Number(args.item_id));

        if (!item) {
          return { error: `Pending item ${args.item_id} not found` };
        }

        item.resolved = true;
        item.resolved_at = new Date().toISOString();
        item.resolution = args.resolution ? String(args.resolution) : null;
        data.last_updated = new Date().toISOString();

        writeJsonFile(pendingFile, data);

        return {
          success: true,
          message: `Resolved: ${item.item}`,
          item,
        };
      } catch (e: unknown) {
        return { error: `Failed to resolve pending item: ${(e as Error).message}` };
      }
    }

    default:
      return null; // Not a memory tool
  }
}
