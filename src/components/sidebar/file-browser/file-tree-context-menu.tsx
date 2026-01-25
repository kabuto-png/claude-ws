'use client';

import { useState } from 'react';
import { Trash, Download, Copy } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { FileEntry } from '@/types';

interface FileTreeContextMenuProps {
  /** File or folder entry to show context menu for */
  entry: FileEntry;
  /** Root path of the project (for path validation) */
  rootPath: string;
  /** Callback when file is deleted successfully */
  onDelete?: () => void;
  /** Child element that triggers the context menu */
  children: React.ReactNode;
}

export function FileTreeContextMenu({
  entry,
  rootPath,
  onDelete,
  children,
}: FileTreeContextMenuProps) {
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fullPath = `${rootPath}/${entry.path}`;

  /**
   * Handle file/folder deletion with confirmation
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/files/operations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath, rootPath }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      toast.success(
    `${entry.type === 'directory' ? 'Folder' : 'File'} deleted`
      );
      setDeleteDialog(false);
      onDelete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle file/folder download as ZIP
   */
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/files/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath, rootPath }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entry.name}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }

      toast.success('Download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Copy absolute file path to clipboard
   */
  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(fullPath);
      toast.success('Path copied to clipboard');
    } catch {
      toast.error('Failed to copy path');
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleDownload} disabled={isDownloading}>
            <Download className="mr-2 size-4" />
            Download
            {isDownloading && <span className="ml-auto text-xs">...</span>}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyPath}>
            <Copy className="mr-2 size-4" />
            Copy Path
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 size-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {entry.type === 'directory' ? 'Folder' : 'File'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{entry.name}</strong>
              {entry.type === 'directory' && ' and all its contents'}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
