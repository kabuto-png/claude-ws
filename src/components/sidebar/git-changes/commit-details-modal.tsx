'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Copy, Check, FileIcon, FilePlus, FileMinus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CommitDetails, CommitFile } from '@/types';

const FILE_STATUS_CONFIG = {
  A: { icon: FilePlus, color: 'text-green-500' },
  M: { icon: FileIcon, color: 'text-yellow-500' },
  D: { icon: FileMinus, color: 'text-red-500' },
  R: { icon: FileIcon, color: 'text-blue-500' },
  C: { icon: FileIcon, color: 'text-purple-500' },
} as const;

interface CommitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitHash: string | null;
  projectPath: string;
}

export function CommitDetailsModal({
  open,
  onOpenChange,
  commitHash,
  projectPath,
}: CommitDetailsModalProps) {
  const [details, setDetails] = useState<CommitDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!commitHash) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/git/show?path=${encodeURIComponent(projectPath)}&hash=${commitHash}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch commit details');
      }
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [commitHash, projectPath]);

  useEffect(() => {
    if (!open || !commitHash) {
      setDetails(null);
      setError(null);
      setLoading(false);
      return;
    }
    fetchDetails();
  }, [open, commitHash, projectPath, fetchDetails]);

  async function copyHash() {
    if (!details?.hash) return;

    try {
      await navigator.clipboard.writeText(details.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy hash:', err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base">Commit Details</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="px-6 py-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={fetchDetails}
                className="mt-2 text-xs text-destructive hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {details && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {details.shortHash}
              </code>
              <button
                onClick={copyHash}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Copy full hash"
              >
                {copied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="space-y-1 mb-4">
              <div className="text-sm">
                <span className="font-medium">{details.author}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  &lt;{details.authorEmail}&gt;
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {details.dateRelative} ({new Date(details.date).toLocaleString()})
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-sm mb-2">{details.subject}</h3>
              {details.body && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                  {details.body}
                </pre>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">
                  Files Changed ({details.stats.filesChanged})
                </h4>
                <div className="text-xs text-muted-foreground">
                  <span className="text-green-500">+{details.stats.additions}</span>
                  {' / '}
                  <span className="text-red-500">-{details.stats.deletions}</span>
                </div>
              </div>

              <div className="space-y-1">
                {details.files.map((file, idx) => (
                  <FileItem key={idx} file={file} />
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FileItem({ file }: { file: CommitFile }) {
  const config = FILE_STATUS_CONFIG[file.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 transition-colors">
      <Icon className={cn('size-3.5 shrink-0', config.color)} />
      <span className="text-xs font-mono flex-1 truncate" title={file.path}>
        {file.path}
      </span>
      {file.status !== 'D' && (
        <div className="flex items-center gap-1.5 text-[10px] shrink-0">
          {file.additions > 0 && (
            <span className="text-green-500">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-red-500">-{file.deletions}</span>
          )}
        </div>
      )}
    </div>
  );
}
