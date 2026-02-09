// File storage utilities — path resolution, directory creation, read/write helpers

import fs from 'fs';
import path from 'path';
import type { FileEntry, HistoryFile } from '../types';

/** Ensure a user data directory exists and return its path */
export function ensureUserDir(basePath: string, userId: string | number): string {
  const userDir = path.join(basePath, String(userId));
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

/** Get (and ensure) the user's files directory for memory storage */
export function getUserFilesDir(basePath: string, userId: string | number): string {
  const filesDir = path.join(basePath, String(userId), 'files');
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  return filesDir;
}

/** Read a JSON file, returning the parsed object or a fallback */
export function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write a JSON file with pretty printing (ensures parent directory exists) */
export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/** Read a text file, returning null if it doesn't exist */
export function readTextFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/** Write a text file */
export function writeTextFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf8');
}

/** Ensure a directory exists */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Recursively list all files and folders, excluding dotfiles */
export function listRecursive(dir: string, prefix = ''): FileEntry[] {
  const results: FileEntry[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push({ name: relativePath, type: 'folder' });
      results.push(...listRecursive(fullPath, relativePath));
    } else {
      const stat = fs.statSync(fullPath);
      results.push({ name: relativePath, type: 'file', size: stat.size });
    }
  }
  return results;
}

/** Recursively find all history text files (YYYY-MM-DD.txt pattern) */
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
