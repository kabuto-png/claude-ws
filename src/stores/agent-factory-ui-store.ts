import { create } from 'zustand';

interface AgentFactoryUIState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

export const useAgentFactoryUIStore = create<AgentFactoryUIState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggleOpen: () => set((state) => ({ open: !state.open })),
}));
