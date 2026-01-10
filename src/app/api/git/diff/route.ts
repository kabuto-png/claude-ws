import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { GitDiff } from '@/types';

const execFileAsync = promisify(execFile);

// Timeout for git commands (5 seconds)
const GIT_TIMEOUT = 5000;

// GET /api/git/diff?path=/project/path&file=src/file.ts&staged=true
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectPath = searchParams.get('path');
    const filePath = searchParams.get('file');
    const staged = searchParams.get('staged') === 'true';

    if (!projectPath) {
      return NextResponse.json(
        { error: 'path parameter is required' },
        { status: 400 }
      );
    }

    // Validate project path exists and is a directory
    const resolvedPath = path.resolve(projectPath);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      );
    }

    // Build git diff args (safe array, no shell injection)
    const args = ['diff'];
    if (staged) {
      args.push('--cached');
    }
    if (filePath) {
      // Validate file path doesn't escape project directory
      const resolvedFile = path.resolve(resolvedPath, filePath);
      if (!resolvedFile.startsWith(resolvedPath)) {
        return NextResponse.json(
          { error: 'Invalid file path' },
          { status: 403 }
        );
      }
      args.push('--', filePath);
    }

    const { stdout } = await execFileAsync('git', args, {
      cwd: resolvedPath,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      timeout: GIT_TIMEOUT,
    });

    // Count additions and deletions
    const { additions, deletions } = countDiffStats(stdout);

    const result: GitDiff = {
      diff: stdout,
      additions,
      deletions,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };

    // Check if not a git repository
    if (err.message?.includes('not a git repository')) {
      return NextResponse.json(
        { error: 'Not a git repository' },
        { status: 400 }
      );
    }

    // Timeout error
    if (err.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Git command timed out' },
        { status: 504 }
      );
    }

    console.error('Error getting git diff:', error);
    return NextResponse.json(
      { error: 'Failed to get git diff' },
      { status: 500 }
    );
  }
}

function countDiffStats(diff: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;

  const lines = diff.split('\n');
  for (const line of lines) {
    // Skip diff headers
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('@@')) continue;
    if (line.startsWith('diff ')) continue;
    if (line.startsWith('index ')) continue;

    // Count additions (lines starting with +)
    if (line.startsWith('+')) {
      additions++;
    }
    // Count deletions (lines starting with -)
    else if (line.startsWith('-')) {
      deletions++;
    }
  }

  return { additions, deletions };
}
