import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// GET /api/shells?projectId=xxx - List shells for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const shells = await db.query.shells.findMany({
      where: eq(schema.shells.projectId, projectId),
      orderBy: (shells, { desc }) => [desc(shells.createdAt)],
    });

    // Map to frontend format
    const shellInfos = shells.map((s) => ({
      shellId: s.id,
      projectId: s.projectId,
      attemptId: s.attemptId || '',
      command: s.command,
      pid: s.pid || 0,
      startedAt: s.createdAt,
      isRunning: s.status === 'running',
      exitCode: s.exitCode,
    }));

    return NextResponse.json(shellInfos);
  } catch (error) {
    console.error('Failed to fetch shells:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shells' },
      { status: 500 }
    );
  }
}
