'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Search, RefreshCw, RotateCcw } from 'lucide-react';
import { useAgentFactoryStore } from '@/stores/agent-factory-store';
import { DiscoveredComponent, Component } from '@/types/agent-factory';
import { ComponentDetailDialog } from './component-detail-dialog';

interface DiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiscoveredWithStatus extends DiscoveredComponent {
  status: 'new' | 'update' | 'current';
  existingComponent?: {
    id: string;
    sourcePath: string | null;
    updatedAt: number;
  };
}

interface CompareResponse {
  components: DiscoveredWithStatus[];
}

// Memoized component item to prevent unnecessary re-renders
interface DiscoveredItemProps {
  component: DiscoveredWithStatus;
  isSelected: boolean;
  isProcessing: boolean;
  onToggle: (component: DiscoveredWithStatus) => void;
  onImport: (component: DiscoveredWithStatus) => void;
  onClick: (component: DiscoveredWithStatus, e: React.MouseEvent) => void;
}

const DiscoveredItem = memo(function DiscoveredItem({
  component,
  isSelected,
  isProcessing,
  onToggle,
  onImport,
  onClick
}: DiscoveredItemProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'skill':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'command':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'agent':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">New</span>;
      case 'update':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Update</span>;
      case 'current':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Current</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:border-primary/50 ${
        component.status === 'current'
          ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 opacity-60'
          : component.status === 'update'
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      }`}
      onClick={(e) => onClick(component, e)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(component)}
        disabled={component.status === 'current' || isProcessing}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(component.type)}`}>
            {component.type}
          </span>
          <span className="font-medium">{component.name}</span>
          {getStatusBadge(component.status)}
        </div>
        {component.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {component.description}
          </p>
        )}
        <code className="text-xs text-muted-foreground block mt-1">
          {component.sourcePath}
        </code>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onImport(component);
        }}
        disabled={component.status === 'current' || isProcessing}
      >
        {isProcessing ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : component.status === 'current' ? (
          'Current'
        ) : component.status === 'update' ? (
          <>
            <RotateCcw className="w-3 h-3 mr-1" />
            Update
          </>
        ) : (
          'Import'
        )}
      </Button>
    </div>
  );
});

export function DiscoveryDialog({ open, onOpenChange }: DiscoveryDialogProps) {
  const { components, discovering, discoverComponents, importComponent, fetchComponents } = useAgentFactoryStore();
  const [discovered, setDiscovered] = useState<DiscoveredWithStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detailComponent, setDetailComponent] = useState<DiscoveredWithStatus | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (open && !scanned) {
      setSelectedIds(new Set());
      setDiscovered([]);
      setScanned(false);
      setScanning(false);
    }
  }, [open]);

  // Memoize filter counts to prevent recalculation on every render
  const { newCount, updateCount, currentCount, needsAction } = useMemo(() => ({
    newCount: discovered.filter((c) => c.status === 'new').length,
    updateCount: discovered.filter((c) => c.status === 'update').length,
    currentCount: discovered.filter((c) => c.status === 'current').length,
    needsAction: discovered.filter((c) => c.status !== 'current').length,
  }), [discovered]);

  // Memoize handlers to prevent recreation on every render
  const handleScan = useCallback(async () => {
    setScanning(true);
    setDiscovered([]);
    setScanned(false);
    try {
      const results = await discoverComponents();
      const withStatus = await checkComponentStatus(results);
      setDiscovered(withStatus);
      setScanned(true);
    } catch (error) {
      console.error('Failed to scan components:', error);
    } finally {
      setScanning(false);
    }
  }, [discoverComponents]);

  const checkComponentStatus = async (discoveredComponents: DiscoveredComponent[]): Promise<DiscoveredWithStatus[]> => {
    try {
      const res = await fetch('/api/agent-factory/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discovered: discoveredComponents }),
      });
      if (!res.ok) {
        throw new Error('Failed to compare components');
      }
      const data: CompareResponse = await res.json();
      return data.components;
    } catch (error) {
      console.error('Failed to compare components:', error);
      // Fallback: mark all as new
      return discoveredComponents.map((c) => ({ ...c, status: 'new' as const }));
    }
  };

  const toggleSelection = useCallback((component: DiscoveredWithStatus) => {
    const key = `${component.type}-${component.name}`;
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
      return newSelected;
    });
  }, []);

  const isSelected = useCallback((component: DiscoveredWithStatus) => {
    return selectedIds.has(`${component.type}-${component.name}`);
  }, [selectedIds]);

  const isProcessing = useCallback((component: DiscoveredWithStatus) => {
    return processingIds.has(`${component.type}-${component.name}`);
  }, [processingIds]);

  const handleDetailClick = useCallback((component: DiscoveredWithStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailComponent(component);
    setDetailOpen(true);
  }, []);

  const handleImportSelected = useCallback(async () => {
    setImporting(true);
    try {
      for (const component of discovered) {
        if (isSelected(component)) {
          const key = `${component.type}-${component.name}`;
          setProcessingIds((prev) => new Set(prev).add(key));
          try {
            if (component.status === 'update' && component.existingComponent) {
              // Delete old and import new
              await fetch(`/api/agent-factory/components/${component.existingComponent.id}`, {
                method: 'DELETE',
              });
            }
            await importComponent(component);
          } catch (error) {
            console.error(`Failed to import ${component.name}:`, error);
          }
          setProcessingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }
      }
      await fetchComponents();
      // Refresh status after import
      const results = await discoverComponents();
      const withStatus = await checkComponentStatus(results);
      setDiscovered(withStatus);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to import components:', error);
    } finally {
      setImporting(false);
    }
  }, [discovered, isSelected, discoverComponents, checkComponentStatus, importComponent, fetchComponents]);

  const handleImportAll = useCallback(async () => {
    // Select all components that need action (new or update)
    const allToImport = new Set(
      discovered
        .filter((c) => c.status !== 'current')
        .map((c) => `${c.type}-${c.name}`)
    );
    setSelectedIds(allToImport);
    await handleImportSelected();
  }, [discovered, handleImportSelected]);

  const handleImportSingle = useCallback(async (component: DiscoveredWithStatus) => {
    const key = `${component.type}-${component.name}`;
    setProcessingIds((prev) => new Set(prev).add(key));
    try {
      if (component.status === 'update' && component.existingComponent) {
        // Delete old and import new
        await fetch(`/api/agent-factory/components/${component.existingComponent.id}`, {
          method: 'DELETE',
        });
      }
      await importComponent(component);
      await fetchComponents();
      // Update status
      setDiscovered((prev) => prev.map((c) => {
        if (c.type === component.type && c.name === component.name) {
          const existing = components.find(
            (comp) => comp.type === component.type && comp.name === component.name && comp.storageType === 'imported'
          );
          return {
            ...c, status: 'current' as const, existingComponent: existing ? {
              id: existing.id,
              sourcePath: existing.sourcePath ?? null,
              updatedAt: existing.updatedAt,
            } : undefined
          };
        }
        return c;
      }));
    } catch (error) {
      console.error(`Failed to import ${component.name}:`, error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [components, importComponent, fetchComponents]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Package className="w-6 h-6" />
              Discover Components
            </DialogTitle>
            <DialogDescription>
              Scan your filesystem for existing Claude components and import them into Agent Factory.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {!scanned ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="mb-4">Click the Scan button to search for components</p>
                <Button onClick={handleScan} disabled={scanning}>
                  {scanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Scan
                    </>
                  )}
                </Button>
              </div>
            ) : scanning ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                Scanning for components...
              </div>
            ) : discovered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No components found /skills, /commands, or /agents</p>
                <Button variant="outline" onClick={handleScan} disabled={scanning}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rescan
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1 text-sm text-muted-foreground">
                  <span>{discovered.length} components found</span>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {newCount} new
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      {updateCount} updates
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      {currentCount} current
                    </span>
                  </div>
                </div>
                {discovered.map((component) => (
                  <DiscoveredItem
                    key={`${component.type}-${component.name}`}
                    component={component}
                    isSelected={isSelected(component)}
                    isProcessing={isProcessing(component)}
                    onToggle={toggleSelection}
                    onImport={handleImportSingle}
                    onClick={handleDetailClick}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : scanned && `${needsAction} need action`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {scanned && discovered.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleScan}
                    disabled={scanning}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Rescan
                  </Button>
                  {needsAction > 0 && (
                    <Button
                      onClick={handleImportAll}
                      disabled={importing || scanning}
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import All ({needsAction})
                        </>
                      )}
                    </Button>
                  )}
                  {selectedIds.size > 0 && (
                    <Button
                      onClick={handleImportSelected}
                      disabled={importing || scanning}
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import ${selectedIds.size} Selected`
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {detailComponent && (
        <ComponentDetailDialog
          component={detailComponent}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </>
  );
}
