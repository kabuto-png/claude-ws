'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAgentFactoryStore } from '@/stores/agent-factory-store';
import { Component, CreateComponentDTO, UpdateComponentDTO } from '@/types/agent-factory';

interface ComponentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component?: Component;
}

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ComponentFormDialog({
  open,
  onOpenChange,
  component,
}: ComponentFormDialogProps) {
  const { createComponent, updateComponent, error } = useAgentFactoryStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<'skill' | 'command' | 'agent'>('skill');
  const [description, setDescription] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [storageType, setStorageType] = useState<'local' | 'imported' | 'external'>('local');

  // Generate preview path for new components
  const previewPath = useMemo(() => {
    if (component) return sourcePath;
    if (!name) return '~/.claude/agent-factory/...';
    const slug = toKebabCase(name);
    if (type === 'skill') {
      return `~/.claude/agent-factory/skills/${slug}/SKILL.md`;
    } else if (type === 'command') {
      return `~/.claude/agent-factory/commands/${slug}.md`;
    } else {
      return `~/.claude/agent-factory/agents/${slug}.md`;
    }
  }, [name, type, component]);

  useEffect(() => {
    if (component) {
      setName(component.name);
      // Skip setting type for agent_set as this form doesn't support it
      if (component.type !== 'agent_set') {
        setType(component.type as 'skill' | 'command' | 'agent');
      }
      setDescription(component.description || '');
      setSourcePath(component.sourcePath || '');
      setStorageType(component.storageType);
    } else {
      setName('');
      setType('skill');
      setDescription('');
      setSourcePath('');
      setStorageType('local');
    }
  }, [component, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (component) {
        const data: UpdateComponentDTO = {
          name: name.trim(),
          description: description.trim() || undefined,
          sourcePath: sourcePath.trim(),
        };
        await updateComponent(component.id, data);
      } else {
        const data: CreateComponentDTO = {
          type,
          name: name.trim(),
          description: description.trim() || undefined,
          storageType,
        };
        await createComponent(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {component ? 'Edit Component' : 'Create New Component'}
          </DialogTitle>
          <DialogDescription>
            {component
              ? 'Update the component details below.'
              : 'Add a new component to the Agent Factory registry.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Component Type (only for new components) */}
          {!component && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'skill' | 'command' | 'agent')}
                className="w-full border rounded-md p-2 bg-background"
                disabled={isSubmitting}
              >
                <option value="skill">Skill</option>
                <option value="command">Command</option>
                <option value="agent">Agent</option>
              </select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Component name"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the component"
              disabled={isSubmitting}
            />
          </div>

          {/* Source Path - show for editing, read-only preview for new */}
          {component ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Path *</label>
              <Input
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="/path/to/component"
                disabled={isSubmitting}
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Path</label>
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded border">
                {previewPath}
              </div>
              <p className="text-xs text-muted-foreground">Path will be auto-generated based on component type and name</p>
            </div>
          )}

          {/* Storage Type (only for new components) */}
          {!component && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Storage Type</label>
              <select
                value={storageType}
                onChange={(e) => setStorageType(e.target.value as 'local' | 'imported' | 'external')}
                className="w-full border rounded-md p-2 bg-background"
                disabled={isSubmitting}
              >
                <option value="local">Local</option>
                <option value="imported">Imported</option>
                <option value="external">External</option>
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : component ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
