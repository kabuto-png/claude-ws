import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { CommitDetails, CommitFile } from '@/types';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT = 10000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectPath = searchParams.get('path');
  const hash = searchParams.get('hash');

  if (!projectPath || !hash) {
    return NextResponse.json(
      { error: 'path and hash parameters are required' },
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

  try {
    const { stdout: showOutput } = await execFileAsync(
      'git',
      ['show', '-s', '--format=%H|%h|%an|%ae|%aI|%ar|%s|%b', hash],
      { cwd: resolvedPath, timeout: GIT_TIMEOUT }
    );

    const parts = showOutput.trim().split('|');
    const [fullHash, shortHash, author, authorEmail, date, dateRelative, subject] = parts.slice(0, 7);
    const body = parts.slice(7).join('|').trim();

    const { stdout: statsOutput } = await execFileAsync(
      'git',
      ['diff-tree', '--no-commit-id', '--numstat', '-r', hash],
      { cwd: resolvedPath, timeout: GIT_TIMEOUT }
    );

    const { stdout: statusOutput } = await execFileAsync(
      'git',
      ['diff-tree', '--no-commit-id', '--name-status', '-r', hash],
      { cwd: resolvedPath, timeout: GIT_TIMEOUT }
    );

    const statusMap = new Map<string, string>();
    for (const line of statusOutput.trim().split('\n')) {
      const match = line.match(/^([AMDRC])\s+(.+)$/);
      if (match) statusMap.set(match[2], match[1]);
    }

    const files: CommitFile[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const line of statsOutput.trim().split('\n')) {
      const [addStr, delStr, filePath] = line.split('\t');
      if (!filePath) continue;

      const additions = addStr === '-' ? 0 : parseInt(addStr, 10) || 0;
      const deletions = delStr === '-' ? 0 : parseInt(delStr, 10) || 0;

      files.push({
        path: filePath,
        status: (statusMap.get(filePath) || 'M') as CommitFile['status'],
        additions,
        deletions,
      });

      totalAdditions += additions;
      totalDeletions += deletions;
    }

    const commitDetails: CommitDetails = {
      hash: fullHash,
      shortHash,
      author,
      authorEmail,
      date,
      dateRelative,
      subject,
      body,
      files,
      stats: {
        filesChanged: files.length,
        additions: totalAdditions,
        deletions: totalDeletions,
      },
    };

    return NextResponse.json(commitDetails);
  } catch (error: unknown) {
    console.error('Error getting commit details:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to get commit details' },
      { status: 500 }
    );
  }
}
