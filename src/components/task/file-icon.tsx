'use client';

import { FileExtensionIcon } from '@/components/ui/file-extension-icon';

// MIME type to extension mapping
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/bmp': 'bmp',
  'application/json': 'json',
  'application/pdf': 'pdf',
  'application/xml': 'xml',
  'application/zip': 'zip',
  'application/gzip': 'gz',
  'application/x-tar': 'tar',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'text/typescript': 'ts',
  'text/markdown': 'md',
  'text/xml': 'xml',
  'text/csv': 'csv',
  'application/javascript': 'js',
  'application/typescript': 'ts',
  'application/x-typescript': 'ts',
};

interface FileIconProps {
  mimeType: string;
  className?: string;
  /** File name for better extension detection */
  fileName?: string;
}

function getExtensionFromMime(mimeType: string): string {
  // Direct mapping
  if (mimeType in MIME_TO_EXT) {
    return MIME_TO_EXT[mimeType];
  }

  // Fallback patterns
  if (mimeType.startsWith('image/')) {
    return mimeType.split('/')[1] || 'image';
  }
  if (mimeType.startsWith('video/')) {
    return mimeType.split('/')[1] || 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return mimeType.split('/')[1] || 'audio';
  }
  if (mimeType.includes('typescript')) {
    return 'ts';
  }
  if (mimeType.includes('javascript')) {
    return 'js';
  }

  return 'txt';
}

export function FileIcon({ mimeType, className, fileName }: FileIconProps) {
  // Use fileName if provided, otherwise derive from mimeType
  const name = fileName || `file.${getExtensionFromMime(mimeType)}`;

  return (
    <FileExtensionIcon
      name={name}
      type="file"
      size={24}
      className={className}
    />
  );
}
