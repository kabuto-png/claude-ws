/**
 * Session Manager - Handles Claude session persistence and resumption
 *
 * Responsible for:
 * - Saving session IDs from SDK init messages
 * - Providing resume/fork options for conversation continuation
 * - Managing session lifecycle including forking after rewind
 */

import { db, schema } from './db';
import { eq, desc } from 'drizzle-orm';

export interface SessionOptions {
  resume?: string;
  forkSession?: string;
}

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
   * Get SDK session options for a task
   * Returns { forkSession } if task was rewound, otherwise { resume }
   * Fork creates a new branch from the checkpoint, effectively rewinding conversation
   */
  async getSessionOptions(taskId: string): Promise<SessionOptions> {
    // Check if task has a fork session (after rewind)
    const task = await db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });

    if (task?.forkedFromSessionId) {
      console.log(`[SessionManager] Using fork session for task ${taskId}: ${task.forkedFromSessionId}`);
      return { forkSession: task.forkedFromSessionId };
    }

    // Otherwise use normal resume
    const sessionId = await this.getLastSessionId(taskId);
    return sessionId ? { resume: sessionId } : {};
  }

  /**
   * Clear fork session after it's been used
   * Called after successful fork to prevent re-forking
   */
  async clearForkSession(taskId: string): Promise<void> {
    await db
      .update(schema.tasks)
      .set({ forkedFromSessionId: null, updatedAt: Date.now() })
      .where(eq(schema.tasks.id, taskId));
    console.log(`[SessionManager] Cleared fork session for task ${taskId}`);
  }

  /**
   * Check if task has pending fork
   */
  async hasPendingFork(taskId: string): Promise<boolean> {
    const task = await db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });
    return !!task?.forkedFromSessionId;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
