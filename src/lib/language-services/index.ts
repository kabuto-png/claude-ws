// Language services index - exports and initialization

export * from './types';
export { adapterRegistry } from './adapter-registry';

// Import adapters
import { typescriptAdapter } from './adapters/typescript-adapter';
import { adapterRegistry } from './adapter-registry';

// Register all available adapters
export function initializeAdapters(): void {
  // TypeScript/JavaScript adapter
  adapterRegistry.register(typescriptAdapter);

  // Future: Register other adapters here
  // adapterRegistry.register(pythonAdapter);
  // adapterRegistry.register(goAdapter);
}

// Auto-initialize on module load
initializeAdapters();
