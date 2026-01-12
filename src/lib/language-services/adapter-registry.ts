// Language adapter registry - manages language service adapters

import type { LanguageAdapter, SupportedLanguage } from './types';

/**
 * Registry for language adapters
 * Allows registering and retrieving adapters by language or file path
 */
class AdapterRegistry {
  private adapters: Map<string, LanguageAdapter> = new Map();
  private extensionMap: Map<string, string> = new Map();

  /**
   * Register a language adapter
   */
  register(adapter: LanguageAdapter): void {
    this.adapters.set(adapter.language, adapter);

    // Map extensions to language
    for (const ext of adapter.extensions) {
      this.extensionMap.set(ext.toLowerCase(), adapter.language);
    }
  }

  /**
   * Get adapter by language identifier
   */
  getAdapter(language: string): LanguageAdapter | null {
    return this.adapters.get(language) ?? null;
  }

  /**
   * Get adapter for a file path based on extension
   */
  getAdapterForFile(filePath: string): LanguageAdapter | null {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    const language = this.extensionMap.get(ext);

    if (!language) return null;
    return this.adapters.get(language) ?? null;
  }

  /**
   * Get adapter by language, or infer from file path
   */
  getAdapterForRequest(
    language: SupportedLanguage | null,
    filePath: string
  ): LanguageAdapter | null {
    // If language is specified, use it
    if (language) {
      const adapter = this.adapters.get(language);
      if (adapter) return adapter;
    }

    // Otherwise, infer from file path
    return this.getAdapterForFile(filePath);
  }

  /**
   * Check if a language is supported
   */
  isSupported(language: string): boolean {
    return this.adapters.has(language);
  }

  /**
   * Check if a file type is supported
   */
  isFileSupported(filePath: string): boolean {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    return this.extensionMap.has(ext);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }

  /**
   * Dispose all adapters
   */
  dispose(): void {
    for (const adapter of this.adapters.values()) {
      adapter.dispose?.();
    }
    this.adapters.clear();
    this.extensionMap.clear();
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();

// Export class for testing
export { AdapterRegistry };
