import { join } from 'path';
import { homedir } from 'os';

/**
 * Get the Claude home directory path
 * Uses CLAUDE_HOME_DIR from environment if set, otherwise defaults to ~/.claude
 */
export function getClaudeHomeDir(): string {
  const envDir = process.env.CLAUDE_HOME_DIR;
  if (envDir) {
    // Expand ~ to home directory if path starts with ~
    if (envDir.startsWith('~')) {
      return join(homedir(), envDir.slice(1));
    }
    return envDir;
  }
  return join(homedir(), '.claude');
}

/**
 * Get the Agent Factory directory path
 * Automatically resolves to CLAUDE_HOME_DIR/agent-factory
 * If CLAUDE_HOME_DIR is not set, uses ~/.claude/agent-factory
 */
export function getAgentFactoryDir(): string {
  return join(getClaudeHomeDir(), 'agent-factory');
}
