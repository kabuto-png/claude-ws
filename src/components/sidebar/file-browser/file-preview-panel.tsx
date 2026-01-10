'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, AlertCircle, File, Copy, Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeBlock } from '@/components/claude/code-block';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useProjectStore } from '@/stores/project-store';
import { cn } from '@/lib/utils';

interface FileContent {
  content: string | null;
  language: string | null;
  size: number;
  isBinary: boolean;
  mimeType: string;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 560;

export function FilePreviewPanel() {
  const { currentProject } = useProjectStore();
  const { previewFile, closePreview } = useSidebarStore();

  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const panelLeft = panelRef.current.getBoundingClientRect().left;
      const newWidth = e.clientX - panelLeft;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!previewFile || !currentProject?.path) {
      setContent(null);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/files/content?basePath=${encodeURIComponent(currentProject.path)}&path=${encodeURIComponent(previewFile)}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch file');
        }
        const data = await res.json();
        setContent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [previewFile, currentProject?.path]);

  const handleCopy = async () => {
    if (content?.content) {
      await navigator.clipboard.writeText(content.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!previewFile) return null;

  const fileName = previewFile.split('/').pop() || previewFile;

  return (
    <div
      ref={panelRef}
      className={cn(
        'h-full bg-background border-r flex flex-col flex-1',
        'animate-in slide-in-from-left duration-200',
        isResizing && 'select-none'
      )}
      style={{ minWidth: `${width}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <h2 className="text-base font-semibold truncate">{fileName}</h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {previewFile}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {content && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(content.size)}
            </span>
          )}
          {content?.content && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              title="Copy content"
            >
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={closePreview}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-destructive">
            <AlertCircle className="size-10 mb-3" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {content && !loading && !error && (
          <>
            {content.isBinary ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <File className="size-16 mb-3" />
                <span className="text-base">Binary file</span>
                <span className="text-sm">{content.mimeType}</span>
                <span className="text-xs mt-1">{formatFileSize(content.size)}</span>
              </div>
            ) : content.content ? (
              <div className="p-4">
                <CodeBlock
                  code={content.content}
                  language={content.language || undefined}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                Empty file
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Resize handle */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-1.5 cursor-col-resize',
          'hover:bg-primary/20 active:bg-primary/30 transition-colors',
          'flex items-center justify-center group'
        )}
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="size-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
