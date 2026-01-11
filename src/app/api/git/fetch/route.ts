import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT = 30000; // Longer timeout for network operations

// POST /api/git/fetch - Fetch from remote
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

    // Fetch from all remotes
    await execFileAsync(
      'git',
      ['fetch', '--all', '--prune'],
      {
        cwd: resolvedPath,
        timeout: GIT_TIMEOUT,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Fetched from all remotes',
    });
  } catch (error: unknown) {
    console.error('Error fetching:', error);
    const err = error as { message?: string; stderr?: string };

    return NextResponse.json(
      { error: err.stderr || err.message || 'Failed to fetch' },
      { status: 500 }
    );
  }
}
