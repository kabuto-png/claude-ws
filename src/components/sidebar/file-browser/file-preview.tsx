'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeBlock } from '@/components/claude/code-block';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useActiveProject } from '@/hooks/use-active-project';

interface FileContent {
  content: string | null;
  language: string | null;
  size: number;
  isBinary: boolean;
  mimeType: string;
}

export function FilePreview() {
  const activeProject = useActiveProject();
  const { previewFile, closePreview } = useSidebarStore();

  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFile || !activeProject?.path) {
      setContent(null);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/files/content?basePath=${encodeURIComponent(activeProject.path)}&path=${encodeURIComponent(previewFile)}`
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
  }, [previewFile, activeProject?.path]);

  if (!previewFile) return null;

  const fileName = previewFile.split('/').pop() || previewFile;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button variant="ghost" size="icon" className="size-7" onClick={closePreview}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <div className="text-xs text-muted-foreground truncate">{previewFile}</div>
        </div>
        {content && (
          <div className="text-xs text-muted-foreground">
            {formatFileSize(content.size)}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading && (
          <div className="flex items-center justify-center h-full py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-destructive">
            <AlertCircle className="size-8 mb-2" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {content && !loading && !error && (
          <>
            {content.isBinary ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                <File className="size-12 mb-2" />
                <span className="text-sm">Binary file ({content.mimeType})</span>
                <span className="text-xs">{formatFileSize(content.size)}</span>
              </div>
            ) : content.content ? (
              <div className="p-2">
                <CodeBlock code={content.content} language={content.language || undefined} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full py-8 text-muted-foreground text-sm">
                Empty file
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
