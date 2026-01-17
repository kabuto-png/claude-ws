import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT = 10000; // Longer timeout for commit

// POST /api/git/commit - Create a commit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, message, title, description } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Support both old format (message) and new format (title + description)
    const commitTitle = title || message;
    const commitDescription = description || '';

    if (!commitTitle || typeof commitTitle !== 'string' || !commitTitle.trim()) {
      return NextResponse.json(
        { error: 'Commit message is required' },
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

    // Build commit message: title + blank line + description (if provided)
    const fullMessage = commitDescription.trim()
      ? `${commitTitle.trim()}\n\n${commitDescription.trim()}`
      : commitTitle.trim();

    // Create commit
    const { stdout } = await execFileAsync(
      'git',
      ['commit', '-m', fullMessage],
      {
        cwd: resolvedPath,
        timeout: GIT_TIMEOUT,
      }
    );

    // Extract commit hash from output
    const hashMatch = stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const hash = hashMatch ? hashMatch[1] : null;

    return NextResponse.json({
      success: true,
      hash,
      message: fullMessage,
      title: commitTitle.trim(),
      description: commitDescription.trim(),
    });
  } catch (error: unknown) {
    console.error('Error creating commit:', error);
    const err = error as { message?: string; stderr?: string };

    // Check for nothing to commit
    if (err.message?.includes('nothing to commit') || err.stderr?.includes('nothing to commit')) {
      return NextResponse.json(
        { error: 'Nothing to commit' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to create commit' },
      { status: 500 }
    );
  }
}
