/**
 * Usage Command Handler - Extracts context usage from SDK result messages
 *
 * Since /context command doesn't work with Agent SDK, we calculate context
 * usage from the cache_read_input_tokens in usage data.
 */

export interface UsageCommandResult {
  contextUsed: number;
  contextLimit: number;
  contextPercentage: number;
  baselineContext: number; // cache_read_input_tokens from first turn
}

/**
 * Calculate context usage from SDK usage data
 *
 * The SDK doesn't support /context command, but we can infer context size from:
 * - cache_read_input_tokens: The baseline context (system prompt, tools, skills, etc.)
 * - input_tokens: User message tokens
 * - output_tokens (accumulated): Assistant response tokens
 *
 * Context = baseline + accumulated outputs
 */
export function calculateContextFromUsage(
  inputTokens: number,
  cacheReadTokens: number,
  accumulatedOutputTokens: number,
  contextWindow: number = 200000
): UsageCommandResult {
  // On first turn, cache_read_input_tokens represents the baseline context
  const baselineContext = cacheReadTokens;

  // Context used = baseline + all accumulated assistant outputs
  // (User messages are tiny compared to baseline, outputs grow over time)
  const contextUsed = baselineContext + accumulatedOutputTokens;

  const contextPercentage = Math.round((contextUsed / contextWindow) * 100);

  return {
    contextUsed,
    contextLimit: contextWindow,
    contextPercentage,
    baselineContext,
  };
}
