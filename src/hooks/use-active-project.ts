import { useProjectStore } from '@/stores/project-store';
import type { Project } from '@/types';

/**
 * Hook to get active project with proper reactivity.
 * Returns the active project for sidebar context:
 * - If single project selected, returns that project
 * - If activeProjectId is set (multi-select mode), returns that project
 * - Otherwise returns null
 */
export function useActiveProject(): Project | null {
  return useProjectStore((state) => {
    // When single project selected, use that
    if (state.selectedProjectIds.length === 1) {
      return state.projects.find(p => p.id === state.selectedProjectIds[0]) || null;
    }
    // Otherwise use activeProjectId (for multi-select with explicit selection)
    if (state.activeProjectId) {
      return state.projects.find(p => p.id === state.activeProjectId) || null;
    }
    return null;
  });
}
