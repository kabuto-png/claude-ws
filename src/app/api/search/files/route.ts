import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { fuzzyMatch } from '@/lib/fuzzy-match';

// Directories and files to exclude from search
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '__pycache__', '.cache'];
const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];

interface FileSearchResult {
  name: string;
  path: string;
  type: 'file' | 'directory';
  score: number;
  matches: number[];
}

/**
 * GET /api/search/files - Fuzzy search for files by name
 * Query params:
 *   - q: search query
 *   - basePath: project root path
 *   - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const basePath = searchParams.get('basePath');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!basePath) {
      return NextResponse.json(
        { error: 'basePath parameter is required' },
        { status: 400 }
      );
    }

    // Validate path exists
    const resolvedPath = path.resolve(basePath);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    // Collect all files recursively
    const allFiles: { name: string; path: string; type: 'file' | 'directory' }[] = [];
    collectFiles(resolvedPath, resolvedPath, allFiles);

    // If no query, return recent/all files up to limit
    if (!query.trim()) {
      return NextResponse.json({
        results: allFiles.slice(0, limit).map(f => ({ ...f, score: 0, matches: [] })),
        total: allFiles.length,
      });
    }

    // Fuzzy match and score all files
    const results: FileSearchResult[] = [];

    for (const file of allFiles) {
      // Match against filename and path
      const nameMatch = fuzzyMatch(query, file.name);
      const pathMatch = fuzzyMatch(query, file.path);

      // Take the better match
      const match = (nameMatch && pathMatch)
        ? (nameMatch.score >= pathMatch.score ? nameMatch : pathMatch)
        : (nameMatch || pathMatch);

      if (match) {
        results.push({
          ...file,
          score: match.score,
          matches: match.matches,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
}

/**
 * Recursively collect all files from directory
 */
function collectFiles(
  dirPath: string,
  basePath: string,
  results: { name: string; path: string; type: 'file' | 'directory' }[]
) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue;

      // Skip excluded directories
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) continue;

      // Skip excluded files
      if (entry.isFile() && EXCLUDED_FILES.includes(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      results.push({
        name: entry.name,
        path: relativePath,
        type: entry.isDirectory() ? 'directory' : 'file',
      });

      // Recurse into directories
      if (entry.isDirectory()) {
        collectFiles(fullPath, basePath, results);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.error(`Error reading ${dirPath}:`, error);
  }
}
