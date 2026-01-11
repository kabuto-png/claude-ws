'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Command, ImagePlus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { CommandSelector } from './command-selector';
import { FileDropZone } from './file-drop-zone';
import { AttachmentBar } from './attachment-bar';
import { useInteractiveCommandStore } from '@/stores/interactive-command-store';
import { useAttachmentStore } from '@/stores/attachment-store';
import { cn } from '@/lib/utils';

interface PromptInputProps {
  onSubmit: (prompt: string, displayPrompt?: string, fileIds?: string[]) => void;
  onCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  taskId?: string;
}

export function PromptInput({
  onSubmit,
  onCancel,
  disabled = false,
  placeholder = 'Describe what you want Claude to do... (type / for commands)',
  className,
  taskId,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openCommand } = useInteractiveCommandStore();

  // Attachment store
  const {
    getPendingFiles,
    addFiles,
    removeFile,
    clearFiles,
    retryUpload,
    getUploadedFileIds,
    hasUploadingFiles,
  } = useAttachmentStore();

  const pendingFiles = taskId ? getPendingFiles(taskId) : [];

  // Detect slash command input
  useEffect(() => {
    if (prompt.startsWith('/') && !selectedCommand) {
      setShowCommands(true);
      const filter = prompt.slice(1).split(' ')[0];
      setCommandFilter(filter);
    } else if (!prompt.startsWith('/')) {
      setShowCommands(false);
      setCommandFilter('');
    }
  }, [prompt, selectedCommand]);

  const handleFilesSelected = async (files: File[]) => {
    if (!taskId) return;
    try {
      await addFiles(taskId, files);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;

    // Check if files are still uploading
    if (taskId && hasUploadingFiles(taskId)) {
      toast.error('Please wait for files to finish uploading');
      return;
    }

    const originalPrompt = prompt.trim();
    let finalPrompt = originalPrompt;
    let displayPrompt: string | undefined;

    // If it's a command, process it
    if (selectedCommand || prompt.startsWith('/')) {
      const match = prompt.match(/^\/(\w+)(?::(\w+))?\s*(.*)/);
      if (match) {
        const [, cmdName, subCmd, args] = match;
        displayPrompt = originalPrompt;
        try {
          const res = await fetch(`/api/commands/${cmdName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subcommand: subCmd,
              arguments: args.trim(),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            finalPrompt = data.prompt;
          }
        } catch (error) {
          console.error('Failed to process command:', error);
        }
      }
    }

    // Get uploaded file IDs
    const fileIds = taskId ? getUploadedFileIds(taskId) : [];

    onSubmit(finalPrompt, displayPrompt, fileIds.length > 0 ? fileIds : undefined);

    // Clear state
    setPrompt('');
    setSelectedCommand(null);
    setShowCommands(false);
    if (taskId) {
      clearFiles(taskId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Escape')) {
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }

    if (e.key === 'Escape' && showCommands) {
      e.preventDefault();
      setShowCommands(false);
      setPrompt('');
    }
  };

  const handleCommandSelect = (command: string, isInteractive?: boolean) => {
    if (isInteractive && taskId) {
      setShowCommands(false);
      setPrompt('');

      switch (command) {
        case 'rewind':
          openCommand({ type: 'rewind', taskId });
          break;
        case 'model':
          openCommand({ type: 'model', currentModel: 'claude-sonnet-4-20250514' });
          break;
        case 'config':
          openCommand({ type: 'config' });
          break;
        case 'clear':
          openCommand({ type: 'clear', taskId });
          break;
        case 'compact':
          openCommand({ type: 'compact', taskId });
          break;
        default:
          const cmdText = `/${command} `;
          setPrompt(cmdText);
          setSelectedCommand(command);
          textareaRef.current?.focus();
      }
      return;
    }

    const cmdText = `/${command} `;
    setPrompt(cmdText);
    setSelectedCommand(command);
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const handleCommandClose = () => {
    setShowCommands(false);
    if (prompt === '/' || (prompt.startsWith('/') && !prompt.includes(' '))) {
      setPrompt('');
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <FileDropZone
      onFilesSelected={handleFilesSelected}
      disabled={disabled}
      className={cn('relative flex flex-col', className)}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Command Selector */}
        <CommandSelector
          isOpen={showCommands}
          onSelect={handleCommandSelect}
          onClose={handleCommandClose}
          filter={commandFilter}
        />

        {/* Attachment Bar */}
        {taskId && pendingFiles.length > 0 && (
          <AttachmentBar
            files={pendingFiles}
            onRemove={(tempId) => removeFile(taskId, tempId)}
            onRetry={(tempId) => retryUpload(taskId, tempId)}
            onAddFiles={openFilePicker}
          />
        )}

        {/* Input area */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'min-h-24 resize-none pr-10',
              selectedCommand && 'border-primary'
            )}
          />
          {selectedCommand && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                <Command className="size-3" />
                {selectedCommand}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Type <kbd className="px-1 bg-muted rounded">/</kbd> for commands
            <span className="mx-2">·</span>
            <kbd className="px-1 bg-muted rounded">
              {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
            </kbd>
            +<kbd className="px-1 bg-muted rounded">Enter</kbd> to send
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openFilePicker}
              disabled={disabled}
              title="Attach images & files"
              className="size-8"
            >
              <ImagePlus className="size-4" />
            </Button>
            {disabled && onCancel ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={onCancel}
              >
                <Square className="size-4" />
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={disabled || !prompt.trim()} size="sm">
                {disabled ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Hidden file input for Paperclip button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt,.md,.ts,.tsx,.js,.jsx,.json,.css,.html"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFilesSelected(files);
          }
          e.target.value = '';
        }}
        disabled={disabled}
      />
    </FileDropZone>
  );
}
