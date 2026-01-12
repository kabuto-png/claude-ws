import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and, asc, lt } from 'drizzle-orm';

// GET /api/tasks/[id]/running-attempt - Get currently running attempt for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    // Find the most recent running attempt for this task
    // Order by createdAt desc to get the latest one (in case of stale entries)
    const runningAttempt = await db.query.attempts.findFirst({
      where: and(
        eq(schema.attempts.taskId, taskId),
        eq(schema.attempts.status, 'running')
      ),
      orderBy: (attempts, { desc }) => [desc(attempts.createdAt)],
    });

    // Clean up ALL stale 'running' attempts for this task (older than 5 minutes)
    // These likely resulted from server crashes or force kills
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    await db
      .update(schema.attempts)
      .set({ status: 'failed', completedAt: Date.now() })
      .where(
        and(
          eq(schema.attempts.taskId, taskId),
          eq(schema.attempts.status, 'running'),
          lt(schema.attempts.createdAt, fiveMinutesAgo)
        )
      );

    // If we found a running attempt but it was stale (now cleaned up), return null
    if (runningAttempt && runningAttempt.createdAt < fiveMinutesAgo) {
      console.log(`[running-attempt] Cleaned up stale attempt ${runningAttempt.id}`);
      return NextResponse.json({ attempt: null, messages: [] });
    }

    if (!runningAttempt) {
      return NextResponse.json({ attempt: null, messages: [] });
    }

    // Get all JSON logs for this attempt so far
    const logs = await db.query.attemptLogs.findMany({
      where: eq(schema.attemptLogs.attemptId, runningAttempt.id),
      orderBy: [asc(schema.attemptLogs.createdAt)],
    });

    // Parse logs into messages
    const messages = [];
    for (const log of logs) {
      if (log.type === 'json') {
        try {
          const parsed = JSON.parse(log.content);
          if (parsed.type !== 'system') {
            messages.push(parsed);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return NextResponse.json({
      attempt: {
        id: runningAttempt.id,
        prompt: runningAttempt.displayPrompt || runningAttempt.prompt,
        status: runningAttempt.status,
      },
      messages,
    });
  } catch (error) {
    console.error('Error fetching running attempt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch running attempt' },
      { status: 500 }
    );
  }
}
