'use client';

import { useEffect, useState, useCallback } from 'react';

interface LongPressOptions {
  /** Delay in milliseconds before triggering long press (default: 500ms) */
  delay?: number;
  /** Callback function triggered when long press occurs */
  onLongPress?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export function useLongPress({ delay = 500, onLongPress }: LongPressOptions = {}) {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (startLongPress && onLongPress) {
      timer = setTimeout(() => {
        // Trigger context menu event for long press
        onLongPress(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }) as unknown as React.TouchEvent);
      }, delay);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [startLongPress, delay, onLongPress]);

  const start = useCallback(() => {
    setStartLongPress(true);
  }, []);

  const clear = useCallback(() => {
    setStartLongPress(false);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent default context menu on mobile
      start();
    },
    onTouchEnd: clear,
  };
}
