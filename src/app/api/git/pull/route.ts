import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT = 60000; // Longer timeout for pull

// POST /api/git/pull - Pull from remote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    const resolvedPath = path.resolve(projectPath);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      );
    }

    // Pull with rebase
    const { stdout } = await execFileAsync(
      'git',
      ['pull', '--rebase'],
      {
        cwd: resolvedPath,
        timeout: GIT_TIMEOUT,
      }
    );

    return NextResponse.json({
      success: true,
      message: stdout.trim() || 'Pull successful',
    });
  } catch (error: unknown) {
    console.error('Error pulling:', error);
    const err = error as { message?: string; stderr?: string };

    // Check for common errors
    if (err.stderr?.includes('CONFLICT') || err.message?.includes('CONFLICT')) {
      return NextResponse.json(
        { error: 'Merge conflict detected. Please resolve conflicts manually.' },
        { status: 409 }
      );
    }

    if (err.stderr?.includes('no tracking information') || err.message?.includes('no tracking information')) {
      return NextResponse.json(
        { error: 'No upstream branch configured' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.stderr || err.message || 'Failed to pull' },
      { status: 500 }
    );
  }
}
