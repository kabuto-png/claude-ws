import { create } from 'zustand';
import type { Component, CreateComponentDTO, UpdateComponentDTO, DiscoveredComponent } from '@/types/agent-factory';

interface AgentFactoryState {
  components: Component[];
  loading: boolean;
  error: string | null;
  discovered: DiscoveredComponent[];
  discovering: boolean;
}

interface AgentFactoryActions {
  // Component CRUD
  fetchComponents: (type?: 'skill' | 'command' | 'agent') => Promise<void>;
  createComponent: (data: CreateComponentDTO) => Promise<Component>;
  updateComponent: (id: string, data: UpdateComponentDTO) => Promise<void>;
  deleteComponent: (id: string) => Promise<void>;

  // Discovery
  discoverComponents: () => Promise<DiscoveredComponent[]>;
  importComponent: (discovered: DiscoveredComponent) => Promise<Component>;
}

type AgentFactoryStore = AgentFactoryState & AgentFactoryActions;

export const useAgentFactoryStore = create<AgentFactoryStore>()((set, get) => ({
  // Initial state
  components: [],
  loading: true,
  error: null,
  discovered: [],
  discovering: false,

  // Fetch all components or filter by type
  fetchComponents: async (type) => {
    set({ loading: true, error: null });
    try {
      const url = type ? `/api/agent-factory/components?type=${type}` : '/api/agent-factory/components';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch components');
      const data = await res.json();
      set({ components: data.components, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch components',
        loading: false,
      });
    }
  },

  // Create new component
  createComponent: async (data) => {
    set({ error: null });
    try {
      const res = await fetch('/api/agent-factory/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create component');
      }
      const result = await res.json();
      const newComponents = [...get().components, result.component];
      set({ components: newComponents });
      return result.component;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create component';
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  // Update component
  updateComponent: async (id, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/agent-factory/components/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update component');
      }
      const result = await res.json();
      const updatedComponents = get().components.map((c) =>
        c.id === id ? result.component : c
      );
      set({ components: updatedComponents });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update component',
      });
      throw error;
    }
  },

  // Delete component
  deleteComponent: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/agent-factory/components/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete component');
      }
      const updatedComponents = get().components.filter((c) => c.id !== id);
      set({ components: updatedComponents });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete component',
      });
      throw error;
    }
  },

  // Discover components from filesystem
  discoverComponents: async () => {
    set({ discovering: true, error: null });
    try {
      const res = await fetch('/api/agent-factory/discover', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to discover components');
      const data = await res.json();
      set({ discovered: data.discovered, discovering: false });
      return data.discovered;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to discover components',
        discovering: false,
      });
      return [];
    }
  },

  // Import discovered component
  importComponent: async (discovered) => {
    set({ error: null });
    try {
      const res = await fetch('/api/agent-factory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discovered),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import component');
      }
      const result = await res.json();
      const newComponents = [...get().components, result.component];
      set({ components: newComponents });
      return result.component;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import component';
      set({ error: errorMsg });
      throw error;
    }
  },
}));
