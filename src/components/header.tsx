'use client';

import { Settings, Plus, Search, FolderOpen, PanelLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjectStore } from '@/stores/project-store';
import { useTaskStore } from '@/stores/task-store';
import { useSidebarStore } from '@/stores/sidebar-store';

interface HeaderProps {
  onCreateTask: () => void;
  onOpenSettings: () => void;
}

export function Header({ onCreateTask, onOpenSettings }: HeaderProps) {
  const { currentProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const { isOpen: sidebarOpen, toggleSidebar } = useSidebarStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Claude Kanban" width={32} height={32} />
          <span className="font-mono text-base font-bold tracking-tight">
            CLAUDE-KANBAN
          </span>
        </div>

        {/* Sidebar toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={sidebarOpen ? 'secondary' : 'ghost'}
                size="icon"
                onClick={toggleSidebar}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle sidebar (⌘B)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-8 h-9 w-full"
            />
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Project info */}
        {currentProject && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="h-4 w-4" />
            <span className="max-w-[200px] truncate">{currentProject.name}</span>
            <span className="text-xs">({tasks.length} tasks)</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateTask}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create new task (⌘N)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenSettings}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
