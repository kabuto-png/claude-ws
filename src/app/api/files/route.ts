import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { FileEntry } from '@/types';

// Directories to exclude from file tree
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];
const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];

// GET /api/files - List directory tree
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const basePath = searchParams.get('path');
    const depth = parseInt(searchParams.get('depth') || '10', 10);
    const showHidden = searchParams.get('showHidden') === 'true';

    if (!basePath) {
      return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
    }

    // Resolve and validate path
    const resolvedPath = path.resolve(basePath);

    // Validate path exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    // Build file tree recursively
    const entries = buildFileTree(resolvedPath, resolvedPath, depth, showHidden);

    return NextResponse.json(
      { entries, basePath: resolvedPath },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    );
  }
}

function buildFileTree(
  dirPath: string,
  basePath: string,
  maxDepth: number,
  showHidden: boolean,
  currentDepth: number = 0
): FileEntry[] {
  if (currentDepth >= maxDepth) return [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    for (const entry of entries) {
      // Skip hidden files unless showHidden is true
      if (!showHidden && entry.name.startsWith('.')) continue;

      // Skip excluded directories
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) continue;

      // Skip excluded files
      if (entry.isFile() && EXCLUDED_FILES.includes(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        const children = buildFileTree(fullPath, basePath, maxDepth, showHidden, currentDepth + 1);
        result.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: children.length > 0 ? children : undefined,
        });
      } else {
        const stats = fs.statSync(fullPath);
        result.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
        });
      }
    }

    // Sort: directories first, then alphabetically
    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}
