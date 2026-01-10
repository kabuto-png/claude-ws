'use client';

import {
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Palette,
  Globe,
  Settings,
  Database,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileIconProps {
  name: string;
  type: 'file' | 'directory';
  isExpanded?: boolean;
  className?: string;
}

// Map file extensions to icons
const EXTENSION_ICONS: Record<string, typeof File> = {
  // JavaScript/TypeScript
  '.js': FileCode,
  '.jsx': FileCode,
  '.ts': FileCode,
  '.tsx': FileCode,
  '.mjs': FileCode,
  '.cjs': FileCode,
  // Data
  '.json': FileJson,
  '.yaml': FileJson,
  '.yml': FileJson,
  '.toml': FileJson,
  // Styles
  '.css': Palette,
  '.scss': Palette,
  '.sass': Palette,
  '.less': Palette,
  // Markup
  '.html': Globe,
  '.htm': Globe,
  '.xml': Globe,
  '.svg': Globe,
  // Docs
  '.md': FileText,
  '.mdx': FileText,
  '.txt': FileText,
  // Images
  '.png': Image,
  '.jpg': Image,
  '.jpeg': Image,
  '.gif': Image,
  '.webp': Image,
  '.ico': Image,
  // Config
  '.env': Settings,
  '.gitignore': Settings,
  '.eslintrc': Settings,
  '.prettierrc': Settings,
  // Database
  '.sql': Database,
  '.db': Database,
  '.sqlite': Database,
};

// Special file names
const SPECIAL_FILES: Record<string, typeof File> = {
  'package.json': Package,
  'package-lock.json': Package,
  'pnpm-lock.yaml': Package,
  'yarn.lock': Package,
  'tsconfig.json': Settings,
  'next.config.js': Settings,
  'next.config.mjs': Settings,
  'next.config.ts': Settings,
  'tailwind.config.js': Palette,
  'tailwind.config.ts': Palette,
  'Dockerfile': Settings,
  'docker-compose.yml': Settings,
};

export function FileIcon({ name, type, isExpanded, className }: FileIconProps) {
  // Directory icons
  if (type === 'directory') {
    const Icon = isExpanded ? FolderOpen : Folder;
    return <Icon className={cn('size-4 text-amber-500', className)} />;
  }

  // Check special file names first
  if (SPECIAL_FILES[name]) {
    const Icon = SPECIAL_FILES[name];
    return <Icon className={cn('size-4 text-muted-foreground', className)} />;
  }

  // Check extension
  const ext = '.' + name.split('.').pop()?.toLowerCase();
  if (EXTENSION_ICONS[ext]) {
    const Icon = EXTENSION_ICONS[ext];
    return <Icon className={cn('size-4 text-muted-foreground', className)} />;
  }

  // Default file icon
  return <File className={cn('size-4 text-muted-foreground', className)} />;
}
