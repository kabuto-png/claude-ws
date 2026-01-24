import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

// Get project root directory (two levels up from src/lib/)
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

/**
 * Get the data directory path
 * Uses DATA_DIR from environment if set, otherwise defaults to {project}/data
 */
export function getDataDir(): string {
  return process.env.DATA_DIR || join(PROJECT_ROOT, 'data');
}

/**
 * Get the Agent Factory directory path
 * Uses DATA_DIR/agent-factory if DATA_DIR is set, otherwise {project}/data/agent-factory
 */
export function getAgentFactoryDir(): string {
  return join(getDataDir(), 'agent-factory');
}

/**
 * Get the global Claude directory path (~/.claude)
 * This is where globally installed plugins are stored
 */
export function getGlobalClaudeDir(): string {
  return join(homedir(), '.claude');
}
