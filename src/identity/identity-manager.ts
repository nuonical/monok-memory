// Identity management — get/save user identity with default fallback

import fs from 'fs';
import path from 'path';
import type { IdentityConfig } from '../types';
import { ensureUserDir, readJsonFile, writeJsonFile } from '../storage/file-storage';

/** Get user's custom identity, merged with defaults */
export function getUserIdentity(
  basePath: string,
  userId: string | number,
  defaultIdentity: IdentityConfig,
): IdentityConfig {
  const userDir = path.join(basePath, String(userId));
  const userIdentityPath = path.join(userDir, 'identity.json');

  if (fs.existsSync(userIdentityPath)) {
    try {
      const userIdentity = readJsonFile<IdentityConfig>(userIdentityPath, {});
      return { ...defaultIdentity, ...userIdentity };
    } catch {
      // fall through to default
    }
  }

  return { ...defaultIdentity };
}

/** Save user's custom identity */
export function saveUserIdentity(
  basePath: string,
  userId: string | number,
  identity: IdentityConfig,
): void {
  ensureUserDir(basePath, userId);
  const userIdentityPath = path.join(basePath, String(userId), 'identity.json');
  writeJsonFile(userIdentityPath, identity);
}
