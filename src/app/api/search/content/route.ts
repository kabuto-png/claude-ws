import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Directories to exclude from content search
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '__pycache__', '.cache'];

// Binary file extensions to skip
const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.eot',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
  '.sqlite', '.db',
];

// Max file size to search (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ContentMatch {
  lineNumber: number;
  line: string;
  column: number;
  matchLength: number;
}

interface FileResult {
  file: string;
  matches: ContentMatch[];
}

/**
 * GET /api/search/content - Search file contents (grep-like)
 * Query params:
 *   - q: search query
 *   - basePath: project root path
 *   - caseSensitive: boolean (default false)
 *   - regex: boolean (default false)
 *   - wholeWord: boolean (default false)
 *   - limit: max results per file (default 100)
 *   - maxFiles: max files to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const basePath = searchParams.get('basePath');
    const caseSensitive = searchParams.get('caseSensitive') === 'true';
    const useRegex = searchParams.get('regex') === 'true';
    const wholeWord = searchParams.get('wholeWord') === 'true';
    const limitPerFile = parseInt(searchParams.get('limit') || '100', 10);
    const maxFiles = parseInt(searchParams.get('maxFiles') || '50', 10);

    if (!basePath) {
      return NextResponse.json(
        { error: 'basePath parameter is required' },
        { status: 400 }
      );
    }

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'q (query) parameter is required' },
        { status: 400 }
      );
    }

    // Validate path exists
    const resolvedPath = path.resolve(basePath);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    // Build search pattern
    let pattern: RegExp;
    try {
      let patternStr = useRegex ? query : escapeRegex(query);
      if (wholeWord) {
        patternStr = `\\b${patternStr}\\b`;
      }
      pattern = new RegExp(patternStr, caseSensitive ? 'g' : 'gi');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid regex pattern' },
        { status: 400 }
      );
    }

    // Collect and search files
    const results: FileResult[] = [];
    let totalMatches = 0;
    let filesSearched = 0;

    await searchDirectory(
      resolvedPath,
      resolvedPath,
      pattern,
      results,
      limitPerFile,
      maxFiles,
      (matches) => { totalMatches += matches; },
      () => { filesSearched++; }
    );

    return NextResponse.json({
      results,
      totalMatches,
      filesSearched,
      query,
    });
  } catch (error) {
    console.error('Error searching content:', error);
    return NextResponse.json(
      { error: 'Failed to search content' },
      { status: 500 }
    );
  }
}

/**
 * Recursively search directory for content matches
 */
async function searchDirectory(
  dirPath: string,
  basePath: string,
  pattern: RegExp,
  results: FileResult[],
  limitPerFile: number,
  maxFiles: number,
  onMatches: (count: number) => void,
  onFileSearched: () => void
): Promise<void> {
  // Stop if we have enough files
  if (results.length >= maxFiles) return;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxFiles) break;

      // Skip hidden files/dirs
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDED_DIRS.includes(entry.name)) continue;
        await searchDirectory(
          fullPath, basePath, pattern, results, limitPerFile, maxFiles, onMatches, onFileSearched
        );
      } else if (entry.isFile()) {
        // Skip binary files
        const ext = path.extname(entry.name).toLowerCase();
        if (BINARY_EXTENSIONS.includes(ext)) continue;

        // Skip large files
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > MAX_FILE_SIZE) continue;
        } catch {
          continue;
        }

        // Search file content
        const matches = await searchFile(fullPath, pattern, limitPerFile);
        onFileSearched();

        if (matches.length > 0) {
          const relativePath = path.relative(basePath, fullPath);
          results.push({ file: relativePath, matches });
          onMatches(matches.length);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

/**
 * Search a single file for pattern matches
 */
async function searchFile(
  filePath: string,
  pattern: RegExp,
  limit: number
): Promise<ContentMatch[]> {
  return new Promise((resolve) => {
    const matches: ContentMatch[] = [];

    try {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let lineNumber = 0;

      rl.on('line', (line) => {
        lineNumber++;
        if (matches.length >= limit) {
          rl.close();
          return;
        }

        // Reset regex lastIndex for global pattern
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null && matches.length < limit) {
          matches.push({
            lineNumber,
            line: line.length > 500 ? line.substring(0, 500) + '...' : line,
            column: match.index,
            matchLength: match[0].length,
          });

          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) break;
        }
      });

      rl.on('close', () => resolve(matches));
      rl.on('error', () => resolve(matches));

      fileStream.on('error', () => resolve(matches));
    } catch {
      resolve(matches);
    }
  });
}

/**
 * Escape special regex characters in string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
