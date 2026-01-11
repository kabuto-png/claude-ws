import type { ProcessedFile } from './file-processor';

// Build prompt with @file references for Claude CLI
export function buildPromptWithFiles(
  prompt: string,
  files: ProcessedFile[]
): string {
  if (files.length === 0) {
    return prompt;
  }

  // Build @file references for Claude CLI
  // Claude CLI uses @"/absolute/path/to/file" syntax
  const fileRefs = files.map((f) => `@"${f.absolutePath}"`).join(' ');

  // Prepend file references to prompt
  // Claude will process files before the text prompt
  return `${fileRefs}\n\n${prompt}`;
}

// Build prompt with descriptive file references
export function buildPromptWithFilesDescriptive(
  prompt: string,
  files: ProcessedFile[]
): string {
  if (files.length === 0) {
    return prompt;
  }

  const fileSection = files
    .map((f) => `- ${f.originalName} (${formatMimeType(f.mimeType)}): @"${f.absolutePath}"`)
    .join('\n');

  return `${prompt}\n\nAttached files:\n${fileSection}`;
}

// Get a human-readable description of the MIME type
function formatMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'PDF';
  }
  if (mimeType.includes('typescript')) {
    return 'TypeScript';
  }
  if (mimeType.includes('javascript')) {
    return 'JavaScript';
  }
  if (mimeType === 'application/json') {
    return 'JSON';
  }
  if (mimeType === 'text/markdown') {
    return 'Markdown';
  }
  if (mimeType === 'text/plain') {
    return 'text';
  }
  return 'file';
}
