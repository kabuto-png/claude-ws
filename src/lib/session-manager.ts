/**
 * Session Manager - Handles Claude session persistence and resumption
 *
 * Responsible for:
 * - Saving session IDs from SDK init messages
 * - Providing resume options for conversation continuation
 * - Managing session lifecycle
 */

import { db, schema } from './db';
import { eq, desc } from 'drizzle-orm';

export class SessionManager {
  /**
   * Save session ID for an attempt
   */
  async saveSession(attemptId: string, sessionId: string): Promise<void> {
    await db
      .update(schema.attempts)
      .set({ sessionId })
      .where(eq(schema.attempts.id, attemptId));
    console.log(`[SessionManager] Saved session ${sessionId} for attempt ${attemptId}`);
  }

  /**
   * Get the last session ID for a task (for resume)
   */
  async getLastSessionId(taskId: string): Promise<string | null> {
    const lastAttempt = await db.query.attempts.findFirst({
      where: eq(schema.attempts.taskId, taskId),
      orderBy: [desc(schema.attempts.createdAt)],
    });
    return lastAttempt?.sessionId ?? null;
  }

  /**
   * Get session ID for a specific attempt
   */
  async getSessionId(attemptId: string): Promise<string | null> {
    const attempt = await db.query.attempts.findFirst({
      where: eq(schema.attempts.id, attemptId),
    });
    return attempt?.sessionId ?? null;
  }

  /**
   * Get SDK resume options for a task
   * Returns { resume: sessionId } if session exists, empty object otherwise
   */
  async getResumeOptions(taskId: string): Promise<{ resume?: string }> {
    const sessionId = await this.getLastSessionId(taskId);
    return sessionId ? { resume: sessionId } : {};
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
