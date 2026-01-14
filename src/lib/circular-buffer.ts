/**
 * Circular Buffer - Fixed-size buffer that overwrites oldest entries
 *
 * Used for shell log storage to prevent unbounded memory growth.
 * When buffer is full, oldest entries are dropped automatically.
 */

export interface LogEntry {
  type: 'stdout' | 'stderr';
  content: string;
  timestamp: number;
}

export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Buffer full, advance head (drop oldest)
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % this.capacity;
      result.push(this.buffer[idx]);
    }
    return result;
  }

  getLast(n: number): T[] {
    const items = this.toArray();
    return items.slice(-n);
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}

// Convenience type for log buffers
export type LogBuffer = CircularBuffer<LogEntry>;

// Factory function
export function createLogBuffer(capacity: number = 1000): LogBuffer {
  return new CircularBuffer<LogEntry>(capacity);
}
