import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { GitDiff } from '@/types';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT = 10000;

// GET /api/git/show-file-diff?path=/project/path&hash=abc123&file=src/file.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectPath = searchParams.get('path');
  const hash = searchParams.get('hash');
  const filePath = searchParams.get('file');

  if (!projectPath || !hash || !filePath) {
    return NextResponse.json(
      { error: 'path, hash, and file parameters are required' },
      { status: 400 }
    );
  }

  if (!/^[a-f0-9]{7,40}$/.test(hash)) {
    return NextResponse.json(
      { error: 'Invalid commit hash format' },
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

  // Validate file path doesn't escape project directory
  const resolvedFile = path.resolve(resolvedPath, filePath);
  if (!resolvedFile.startsWith(resolvedPath)) {
    return NextResponse.json(
      { error: 'Invalid file path' },
      { status: 403 }
    );
  }

  try {
    // Get the diff for a specific file in a commit
    // git show <hash> -- <file> shows the diff for that file in that commit
    const { stdout } = await execFileAsync(
      'git',
      ['show', hash, '--', filePath],
      {
        cwd: resolvedPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
        timeout: GIT_TIMEOUT,
      }
    );

    // Count additions and deletions
    const { additions, deletions } = countDiffStats(stdout);

    const result: GitDiff = {
      diff: stdout,
      additions,
      deletions,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error getting commit file diff:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to get commit file diff' },
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
    if (line.startsWith('new file')) continue;
    if (line.startsWith('deleted file')) continue;

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
