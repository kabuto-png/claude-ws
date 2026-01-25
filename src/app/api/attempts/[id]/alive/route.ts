import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '@/lib/agent-manager';

// GET /api/attempts/[id]/alive - Check if an attempt has an active agent process
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if this attempt has an active agent or pending question
    const hasAgent = agentManager.isRunning(id);
    const hasPendingQuestion = agentManager.hasPendingQuestion(id);
    const isAlive = hasAgent || hasPendingQuestion;

    return NextResponse.json({
      attemptId: id,
      alive: isAlive,
      hasAgent,
      hasPendingQuestion
    });
  } catch (error) {
    console.error('Error checking attempt status:', error);
    return NextResponse.json(
      { error: 'Failed to check attempt status' },
      { status: 500 }
    );
  }
}
