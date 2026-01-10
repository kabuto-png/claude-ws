import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SidebarTab = 'files' | 'git';

interface SidebarState {
  isOpen: boolean;
  activeTab: SidebarTab;
  expandedFolders: Set<string>;
  selectedFile: string | null;
  previewFile: string | null;
  sidebarWidth: number;
}

interface SidebarActions {
  toggleSidebar: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: SidebarTab) => void;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  setSelectedFile: (path: string | null) => void;
  setPreviewFile: (path: string | null) => void;
  closePreview: () => void;
  setSidebarWidth: (width: number) => void;
}

type SidebarStore = SidebarState & SidebarActions;

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      // Initial state
      isOpen: false,
      activeTab: 'files',
      expandedFolders: new Set<string>(),
      selectedFile: null,
      previewFile: null,
      sidebarWidth: 280,

      // Actions
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),

      setIsOpen: (isOpen) => set({ isOpen }),

      setActiveTab: (activeTab) => set({ activeTab }),

      toggleFolder: (path) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          if (newExpanded.has(path)) {
            newExpanded.delete(path);
          } else {
            newExpanded.add(path);
          }
          return { expandedFolders: newExpanded };
        }),

      expandFolder: (path) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          newExpanded.add(path);
          return { expandedFolders: newExpanded };
        }),

      collapseFolder: (path) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          newExpanded.delete(path);
          return { expandedFolders: newExpanded };
        }),

      setSelectedFile: (selectedFile) => set({ selectedFile }),

      setPreviewFile: (previewFile) => set({ previewFile }),

      closePreview: () => set({ previewFile: null }),

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
    }),
    {
      name: 'sidebar-store',
      partialize: (state) => ({
        isOpen: state.isOpen,
        activeTab: state.activeTab,
        sidebarWidth: state.sidebarWidth,
        // Don't persist expandedFolders - causes issues when file structure changes
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SidebarState>),
        // Always start with empty expandedFolders
        expandedFolders: new Set<string>(),
      }),
    }
  )
);
