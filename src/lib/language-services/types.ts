// Types for language services and Go to Definition feature

/**
 * Information about a symbol at a specific position in the editor
 */
export interface SymbolInfo {
  /** The symbol text (e.g., "useState", "MyComponent") */
  text: string;
  /** Start position in the document */
  from: number;
  /** End position in the document */
  to: number;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
}

/**
 * Result of a definition lookup
 */
export interface DefinitionResult {
  /** Whether a definition was found */
  found: boolean;
  /** Definition information if found */
  definition?: {
    /** File path relative to project root (or absolute for node_modules) */
    filePath: string;
    /** Line number (1-indexed) */
    line: number;
    /** Column number (0-indexed) */
    column: number;
    /** End line for multi-line definitions */
    endLine?: number;
    /** End column */
    endColumn?: number;
    /** Symbol name */
    symbol: string;
    /** Symbol kind */
    kind: SymbolKind;
  };
  /** Code preview for popup */
  preview?: {
    /** Preview code content */
    content: string;
    /** Start line of preview */
    startLine: number;
    /** End line of preview */
    endLine: number;
    /** Language for syntax highlighting */
    language: string;
  };
  /** Error message if not found */
  error?: string;
}

/**
 * Kind of symbol definition
 */
export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'const'
  | 'let'
  | 'enum'
  | 'module'
  | 'property'
  | 'method'
  | 'parameter'
  | 'import'
  | 'export'
  | 'unknown';

/**
 * Parameters for resolving a definition
 */
export interface ResolveParams {
  /** Project root path */
  basePath: string;
  /** Current file path relative to basePath */
  filePath: string;
  /** Symbol to look up */
  symbol: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
  /** Optional file content (to avoid re-reading) */
  fileContent?: string;
}

/**
 * Language adapter interface - each language implements this
 */
export interface LanguageAdapter {
  /** Language identifier (e.g., "typescript", "python") */
  readonly language: string;
  /** File extensions this adapter handles */
  readonly extensions: readonly string[];
  /** Display name for the language */
  readonly displayName: string;
  /** Whether this adapter is available (e.g., has required CLI tools) */
  isAvailable(): Promise<boolean>;
  /** Resolve a definition */
  resolveDefinition(params: ResolveParams): Promise<DefinitionResult>;
  /** Optional: Clean up resources */
  dispose?(): void;
}

/**
 * Supported languages enum
 */
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'typescriptreact'
  | 'javascriptreact'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'cpp'
  | 'c';

/**
 * Map of file extensions to language identifiers
 */
export const EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.h': 'cpp',
  '.hpp': 'cpp',
};

/**
 * Map of language identifiers to CodeMirror language names
 */
export const LANGUAGE_TO_CODEMIRROR: Record<SupportedLanguage, string> = {
  typescript: 'typescript',
  typescriptreact: 'typescript',
  javascript: 'javascript',
  javascriptreact: 'javascript',
  python: 'python',
  go: 'go',
  rust: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'cpp',
};

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(ext: string): SupportedLanguage | null {
  return EXTENSION_TO_LANGUAGE[ext.toLowerCase()] ?? null;
}

/**
 * Get language from file path
 */
export function getLanguageFromPath(filePath: string): SupportedLanguage | null {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return getLanguageFromExtension(ext);
}
