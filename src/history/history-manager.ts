// History management — save conversations to dated file structure

import fs from 'fs';
import path from 'path';
import type { Message, HistoryFile } from '../types';
import { ensureUserDir } from '../storage/file-storage';

/** Get ISO week number for a date */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Get base history directory for user */
function getHistoryBaseDir(basePath: string, userId: string | number): string {
  const userDir = ensureUserDir(basePath, userId);
  const historyDir = path.join(userDir, 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  return historyDir;
}

/** Get history directory for a specific date (year/month/week structure) */
function getHistoryDir(basePath: string, userId: string | number, date = new Date()): string {
  const baseDir = getHistoryBaseDir(basePath, userId);
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const week = String(getWeekNumber(date)).padStart(2, '0');

  const historyDir = path.join(baseDir, year, month, `week-${week}`);
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  return historyDir;
}

/** Format messages as readable text */
export function formatMessagesAsText(messages: Message[]): string {
  if (!messages || !Array.isArray(messages)) return '';

  return messages
    .map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const timestamp = msg.timestamp ? new Date(msg.timestamp as string | number).toLocaleString() : '';
      const timeStr = timestamp ? ` [${timestamp}]` : '';
      return `${role}${timeStr}:\n${msg.content}\n`;
    })
    .join('\n---\n\n');
}

/** Update summary file with recent conversation context (in base history folder) */
function updateHistorySummary(basePath: string, userId: string | number, messages: Message[]): void {
  const historyDir = getHistoryBaseDir(basePath, userId);
  const summaryPath = path.join(historyDir, 'summary.txt');

  const recentMessages = messages.slice(-20);

  let summary = `Chat Summary for User ${userId}\n`;
  summary += `Last Updated: ${new Date().toISOString()}\n`;
  summary += `Total Messages: ${messages.length}\n`;
  summary += `${'='.repeat(40)}\n\n`;
  summary += `Recent Conversation:\n`;
  summary += `${'-'.repeat(20)}\n\n`;
  summary += formatMessagesAsText(recentMessages);

  fs.writeFileSync(summaryPath, summary, 'utf8');
}

/** Save messages to dated history file (in year/month/week structure) */
export function saveToHistory(basePath: string, userId: string | number, messages: Message[]): void {
  if (!messages || messages.length === 0) return;

  const today = new Date();
  const historyDir = getHistoryDir(basePath, userId, today);
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const historyPath = path.join(historyDir, `${dateStr}.txt`);

  const content = formatMessagesAsText(messages);
  const header = `Chat History - ${dateStr}\n${'='.repeat(40)}\n\n`;

  fs.writeFileSync(historyPath, header + content, 'utf8');

  updateHistorySummary(basePath, userId, messages);
}

/** Recursively find all history text files in the directory tree */
export function findHistoryFiles(dir: string, files: HistoryFile[] = []): HistoryFile[] {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findHistoryFiles(fullPath, files);
    } else if (entry.name.match(/^\d{4}-\d{2}-\d{2}\.txt$/)) {
      files.push({ path: fullPath, name: entry.name });
    }
  }
  return files;
}
