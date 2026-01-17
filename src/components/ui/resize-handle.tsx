'use client';

import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type HandlePosition = 'left' | 'right';

interface ResizeHandleProps {
  position: HandlePosition;
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing?: boolean;
  className?: string;
}

export function ResizeHandle({
  position,
  onMouseDown,
  isResizing,
  className,
}: ResizeHandleProps) {
  return (
    <div
      className={cn(
        'absolute top-0 h-full w-2 cursor-col-resize z-20',
        'hover:bg-primary/20 active:bg-primary/30 transition-colors',
        'flex items-center justify-center group',
        position === 'left' ? 'left-0' : 'right-0',
        isResizing && 'bg-primary/30',
        className
      )}
      onMouseDown={onMouseDown}
    >
      <GripVertical
        className={cn(
          'size-4 text-muted-foreground/50 transition-opacity',
          isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      />
    </div>
  );
}
