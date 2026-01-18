'use client';

import { FileExtensionIcon } from '@/components/ui/file-extension-icon';

interface FileIconProps {
  name: string;
  type: 'file' | 'directory';
  isExpanded?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function FileIcon({ name, type, isExpanded, className, size = 'md' }: FileIconProps) {
  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <FileExtensionIcon
      name={name}
      type={type}
      isExpanded={isExpanded}
      size={iconSize}
      className={className}
    />
  );
}
