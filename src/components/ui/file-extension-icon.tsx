'use client';

import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// CDN URL for vscode-icons SVG files
const ICONS_CDN_BASE = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons';

interface FileExtensionIconProps {
  /** File name or path (e.g., "index.tsx", "package.json") */
  name: string;
  /** Type: file or directory */
  type?: 'file' | 'directory';
  /** Whether directory is expanded (only used for directories) */
  isExpanded?: boolean;
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function FileExtensionIcon({
  name,
  type = 'file',
  isExpanded = false,
  size = 16,
  className,
}: FileExtensionIconProps) {
  // Get icon name from vscode-icons-js
  let iconName: string | undefined;

  if (type === 'directory') {
    iconName = isExpanded
      ? getIconForOpenFolder(name)
      : getIconForFolder(name);
  } else {
    iconName = getIconForFile(name);
  }

  // Fallback to default icons if not found
  if (!iconName) {
    iconName = type === 'directory'
      ? (isExpanded ? 'default_folder_opened.svg' : 'default_folder.svg')
      : 'default_file.svg';
  }

  const iconUrl = `${ICONS_CDN_BASE}/${iconName}`;

  return (
    <div
      className={cn('shrink-0 flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconUrl}
        alt={name}
        width={size}
        height={size}
        className="object-contain"
        unoptimized // SVG files don't need optimization
      />
    </div>
  );
}
