import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

export interface ExtractedItem {
  type: 'skill' | 'command' | 'agent' | 'agent_set' | 'unknown';
  sourcePath: string;
  targetPath: string;
  name: string;
  // For agent_set: count of components
  componentCount?: number;
}

export interface UploadSession {
  extractDir: string;
  items: ExtractedItem[];
  createdAt: number;
}

// In-memory session storage
export const uploadSessions = new Map<string, UploadSession>();

// Clean up sessions older than 1 hour
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      cleanupDirectory(session.extractDir).catch(() => {});
      uploadSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export async function cleanupDirectory(dirPath: string) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await cleanupDirectory(entryPath);
      } else {
        await unlink(entryPath);
      }
    }
    await unlink(dirPath).catch(() => {});
  } catch {
    // Ignore cleanup errors
  }
}
