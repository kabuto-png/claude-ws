// API route for resolving symbol definitions

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { adapterRegistry, initializeAdapters, getLanguageFromPath } from '@/lib/language-services';
import type { SupportedLanguage, DefinitionResult } from '@/lib/language-services';

// Ensure adapters are initialized
initializeAdapters();

// Request body type
interface DefinitionRequest {
  basePath: string;
  filePath: string;
  symbol: string;
  line: number;
  column: number;
  language?: SupportedLanguage | null;
  fileContent?: string;
}

/**
 * Validate path is within basePath (security - prevent directory traversal)
 */
function isPathWithinBase(basePath: string, filePath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedFile = path.resolve(basePath, filePath);
  return resolvedFile.startsWith(resolvedBase);
}

/**
 * POST /api/language/definition
 *
 * Resolve symbol definition location
 *
 * Request body:
 * - basePath: Project root path
 * - filePath: Current file path relative to basePath
 * - symbol: Symbol name to look up
 * - line: Line number (1-indexed)
 * - column: Column number (0-indexed)
 * - language?: Optional language hint
 * - fileContent?: Optional file content (avoids re-reading)
 *
 * Response:
 * - found: boolean
 * - definition?: { filePath, line, column, symbol, kind }
 * - preview?: { content, startLine, endLine, language }
 * - error?: string
 */
export async function POST(request: NextRequest): Promise<NextResponse<DefinitionResult>> {
  try {
    const body = await request.json() as DefinitionRequest;
    const { basePath, filePath, symbol, line, column, language, fileContent } = body;

    // Validate required fields
    if (!basePath || !filePath || !symbol || typeof line !== 'number' || typeof column !== 'number') {
      return NextResponse.json(
        { found: false, error: 'Missing required fields: basePath, filePath, symbol, line, column' },
        { status: 400 }
      );
    }

    // Security: Validate basePath exists
    if (!fs.existsSync(basePath)) {
      return NextResponse.json(
        { found: false, error: 'Invalid basePath' },
        { status: 400 }
      );
    }

    // Security: Validate filePath is within basePath
    if (!isPathWithinBase(basePath, filePath)) {
      return NextResponse.json(
        { found: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Get language from hint or infer from file
    const lang = language ?? getLanguageFromPath(filePath);

    // Get appropriate adapter
    const adapter = adapterRegistry.getAdapterForRequest(lang, filePath);

    if (!adapter) {
      return NextResponse.json(
        { found: false, error: `No language adapter available for ${filePath}` },
        { status: 400 }
      );
    }

    // Check adapter availability
    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      return NextResponse.json(
        { found: false, error: `Language adapter for ${adapter.displayName} is not available` },
        { status: 503 }
      );
    }

    // Resolve definition
    const result = await adapter.resolveDefinition({
      basePath,
      filePath,
      symbol,
      line,
      column,
      fileContent,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Definition resolution error:', error);
    return NextResponse.json(
      { found: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/language/definition
 *
 * Check if definition resolution is available for a file type
 *
 * Query params:
 * - filePath: File path to check
 *
 * Response:
 * - supported: boolean
 * - language: string | null
 * - adapter: string | null
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('filePath');

  if (!filePath) {
    return NextResponse.json(
      { supported: false, language: null, adapter: null, supportedExtensions: adapterRegistry.getSupportedExtensions() }
    );
  }

  const language = getLanguageFromPath(filePath);
  const adapter = adapterRegistry.getAdapterForFile(filePath);

  return NextResponse.json({
    supported: !!adapter,
    language,
    adapter: adapter?.displayName ?? null,
    supportedExtensions: adapterRegistry.getSupportedExtensions(),
  });
}
