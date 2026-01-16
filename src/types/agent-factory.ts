// Agent Factory types for component management

export type ComponentType = 'skill' | 'command' | 'agent' | 'agent_set';
export type StorageType = 'local' | 'imported' | 'external';
export type DependencyType = 'python' | 'npm' | 'system' | 'skill' | 'agent';

export interface Component {
  id: string;
  type: ComponentType;
  name: string;
  description?: string | null;
  sourcePath?: string | null; // null for agent_set
  storageType: StorageType;
  agentSetPath?: string | null; // For agent sets: path to the agent set folder
  metadata?: string | null; // JSON string
  createdAt: number;
  updatedAt: number;
}

export interface ComponentFile {
  type: ComponentType;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: ComponentFile[];
  content?: string; // For file editing
}

// File tree entry for explorer UI (recursive structure)
export interface ComponentFileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: ComponentFileEntry[];
  size?: number;
  mimeType?: string;
  gitStatus?: 'M' | 'A' | 'D' | 'U' | 'R'; // Optional git status
}

export interface ComponentDependency {
  id: string;
  componentId: string;
  dependencyType: DependencyType;
  spec: string;
  componentDependencyId?: string | null; // For skill/agent deps
  installed: boolean;
  createdAt: number;
}

export interface DependencyNode {
  dependency: ComponentDependency;
  component?: Component; // For skill/agent deps
  children: DependencyNode[];
  circular?: boolean;
}

export interface DiscoveredComponent {
  type: ComponentType;
  name: string;
  description?: string;
  sourcePath: string;
  metadata?: Record<string, unknown>;
}

export interface CreateComponentDTO {
  type: ComponentType;
  name: string;
  description?: string;
  sourcePath?: string; // Auto-generated if not provided
  storageType?: StorageType;
  metadata?: Record<string, unknown>;
}

export interface UpdateComponentDTO {
  name?: string;
  description?: string;
  sourcePath?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateDependencyDTO {
  componentId: string;
  dependencyType: DependencyType;
  spec: string;
  componentDependencyId?: string;
}
