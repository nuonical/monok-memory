// Test setup — temp directory helpers and mock LLM

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { LLMProvider } from '../src/types';

/** Create a temp directory for tests, return path and cleanup function */
export function createTempDir(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'monok-memory-test-'));
  return {
    dir,
    cleanup: () => {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Mock LLM provider that returns a fixed response */
export function createMockLLM(response = 'Mock LLM response'): LLMProvider {
  return {
    generateText: async () => response,
  };
}
