/**
 * Minimal System Prompt - Only project-specific rules
 * SDK already provides: Tools, Skills, MCP, Agents documentation
 */
export const ENGINEERING_SYSTEM_PROMPT = `
## BACKGROUND SERVERS

When starting servers (dev, directus, strapi, etc.), MUST use this pattern:
\`\`\`bash
nohup <cmd> > /tmp/<name>.log 2>&1 & echo "BGPID:$!"
\`\`\`

Without BGPID echo, UI cannot track/kill the process.

Example:
\`\`\`bash
lsof -ti :8055 | xargs kill -9 2>/dev/null; sleep 1 && nohup npx directus start > /tmp/directus.log 2>&1 & echo "BGPID:$!"
\`\`\`
`.trim();

/**
 * Detect if task involves starting a server
 */
function isServerTask(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return /run.*(start|dev|server)|start.*(directus|strapi|server)|npm run (dev|start)|npx.*(start|dev)/.test(lower);
}

export interface SystemPromptOptions {
  projectPath?: string;
  prompt?: string;
  isResume?: boolean;
  attemptCount?: number;
}

/**
 * Get system prompt - only includes BGPID rule for server tasks
 * SDK handles all other documentation (Tools, Skills, MCP, etc.)
 */
export function getSystemPrompt(options: SystemPromptOptions | string = {}): string {
  // Support legacy string parameter (projectPath only)
  if (typeof options === 'string') {
    return ENGINEERING_SYSTEM_PROMPT;
  }

  const { prompt } = options;

  // Only include BGPID instructions for server-related tasks
  if (prompt && isServerTask(prompt)) {
    return ENGINEERING_SYSTEM_PROMPT;
  }

  // For non-server tasks, SDK provides all needed context
  return '';
}
