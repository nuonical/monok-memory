// User insights context builder

import fs from 'fs';
import path from 'path';
import type { InsightsData } from '../types';
import { getUserFilesDir, readJsonFile } from '../storage/file-storage';

/** Get user insights formatted as context string for system prompt injection */
export function getUserInsightsContext(basePath: string, userId: string | number): string | null {
  const filesDir = getUserFilesDir(basePath, userId);
  const insightsFile = path.join(filesDir, 'user_insights.json');

  if (!fs.existsSync(insightsFile)) {
    return null;
  }

  try {
    const insights = readJsonFile<InsightsData>(insightsFile, {
      preferences: [],
      communication_style: [],
      work_patterns: [],
      interests: [],
      goals: [],
      context: [],
      last_updated: null,
    });

    const contextParts: string[] = [];

    for (const [category, items] of Object.entries(insights)) {
      if (Array.isArray(items) && items.length > 0) {
        const highConfidence = items.filter(
          (i: { confidence: string }) => i.confidence === 'well_established' || i.confidence === 'pattern_emerging',
        );
        if (highConfidence.length > 0) {
          contextParts.push(
            `**${category.replace(/_/g, ' ')}**: ${highConfidence.map((i: { insight: string }) => i.insight).join('; ')}`,
          );
        }
      }
    }

    return contextParts.length > 0 ? contextParts.join('\n') : null;
  } catch {
    return null;
  }
}
