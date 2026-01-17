'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ResizeDirection = 'left' | 'right';

interface UseResizableOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  direction: ResizeDirection; // 'left' = resize from left edge, 'right' = resize from right edge
  storageKey?: string;
  onWidthChange?: (width: number) => void;
}

interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  setWidth: (width: number) => void;
}

export function useResizable({
  initialWidth,
  minWidth,
  maxWidth,
  direction,
  storageKey,
  onWidthChange,
}: UseResizableOptions): UseResizableReturn {
  const [width, setWidthState] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Load saved width from storage
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        setWidthState(parsed);
      }
    }
  }, [storageKey, minWidth, maxWidth]);

  // Save width to storage and notify callback
  useEffect(() => {
    if (isResizing) return;
    if (storageKey) {
      localStorage.setItem(storageKey, String(width));
    }
    onWidthChange?.(width);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, isResizing, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsResizing(true);
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      let newWidth: number;

      if (direction === 'right') {
        // For left sidebar - dragging right increases width
        newWidth = startWidthRef.current + deltaX;
      } else {
        // For right panels - dragging left increases width
        newWidth = startWidthRef.current - deltaX;
      }

      newWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
      setWidthState(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, minWidth, maxWidth]);

  const setWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
    setWidthState(clampedWidth);
  }, [minWidth, maxWidth]);

  return {
    width,
    isResizing,
    handleMouseDown,
    setWidth,
  };
}
