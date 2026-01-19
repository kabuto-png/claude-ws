'use client';

import { getIconForFile } from 'vscode-icons-js';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// CDN URL for vscode-icons SVG files
const ICONS_CDN_BASE = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons';

// Custom icon overrides for files where vscode-icons-js returns outdated/incorrect icons
const ICON_OVERRIDES: Record<string, string> = {
  '.vercelignore': 'file_type_vercel.svg',
  'vercel.json': 'file_type_vercel.svg',
  '.nowignore': 'file_type_vercel.svg',
  'now.json': 'file_type_vercel.svg',
  '.env': 'file_type_dotenv.svg',
  '.env.local': 'file_type_dotenv.svg',
  '.env.development': 'file_type_dotenv.svg',
  '.env.production': 'file_type_dotenv.svg',
  '.env.test': 'file_type_dotenv.svg',
  '.env.example': 'file_type_dotenv.svg',
};

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

// Custom folder icon SVG component with theme-appropriate colors
function FolderIcon({ isOpen, size }: { isOpen: boolean; size: number }) {
  if (isOpen) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 6C3 4.89543 3.89543 4 5 4H9.58579C9.851 4 10.1054 4.10536 10.2929 4.29289L12 6H19C20.1046 6 21 6.89543 21 8V10H4V6Z"
          className="fill-muted-foreground/70"
        />
        <path
          d="M3.08579 20C2.50661 20 2.07553 19.4519 2.21115 18.8889L4.21115 10.8889C4.30772 10.4875 4.66625 10.2 5.08579 10.2H21.5C22.0792 10.2 22.5103 10.7481 22.3746 11.3111L20.7887 18.1111C20.6922 18.5125 20.3337 18.8 19.914 18.8L3.91421 20H3.08579Z"
          className="fill-muted-foreground/60"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 6C3 4.89543 3.89543 4 5 4H9.58579C9.851 4 10.1054 4.10536 10.2929 4.29289L12.7071 6.70711C12.8946 6.89464 13.149 7 13.4142 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
        className="fill-muted-foreground/70"
      />
      <path
        d="M3 6C3 4.89543 3.89543 4 5 4H9.58579C9.851 4 10.1054 4.10536 10.2929 4.29289L12 6H19C20.1046 6 21 6.89543 21 8V9H3V6Z"
        className="fill-muted-foreground/80"
      />
    </svg>
  );
}

export function FileExtensionIcon({
  name,
  type = 'file',
  isExpanded = false,
  size = 16,
  className,
}: FileExtensionIconProps) {
  // Use custom folder icons for directories
  if (type === 'directory') {
    return (
      <div
        className={cn('shrink-0 flex items-center justify-center', className)}
        style={{ width: size, height: size }}
      >
        <FolderIcon isOpen={isExpanded} size={size} />
      </div>
    );
  }

  // Get icon name from vscode-icons-js for files
  // First check custom overrides, then fall back to vscode-icons-js
  const fileName = name.split('/').pop() || name;
  let iconName: string | undefined = ICON_OVERRIDES[fileName] || getIconForFile(name);

  // Fallback to default file icon if not found
  if (!iconName) {
    iconName = 'default_file.svg';
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
