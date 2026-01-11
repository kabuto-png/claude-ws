import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT = 60000; // Longer timeout for push

// POST /api/git/push - Push to remote
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

    // Push to origin
    const { stdout, stderr } = await execFileAsync(
      'git',
      ['push'],
      {
        cwd: resolvedPath,
        timeout: GIT_TIMEOUT,
      }
    );

    return NextResponse.json({
      success: true,
      message: stdout.trim() || stderr.trim() || 'Push successful',
    });
  } catch (error: unknown) {
    console.error('Error pushing:', error);
    const err = error as { message?: string; stderr?: string };

    // Check for common errors
    if (err.stderr?.includes('rejected') || err.message?.includes('rejected')) {
      return NextResponse.json(
        { error: 'Push rejected. Pull changes first or force push.' },
        { status: 409 }
      );
    }

    if (err.stderr?.includes('no upstream') || err.message?.includes('no upstream')) {
      return NextResponse.json(
        { error: 'No upstream branch. Use "git push -u origin <branch>" first.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.stderr || err.message || 'Failed to push' },
      { status: 500 }
    );
  }
}
