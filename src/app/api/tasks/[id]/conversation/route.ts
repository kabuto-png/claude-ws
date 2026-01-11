import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import type { ClaudeOutput, AttemptFile } from '@/types';

interface ConversationTurn {
  type: 'user' | 'assistant';
  prompt?: string;
  messages: ClaudeOutput[];
  attemptId: string;
  timestamp: number;
  files?: AttemptFile[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    // Get all attempts for this task, ordered by creation time
    const attempts = await db.query.attempts.findMany({
      where: eq(schema.attempts.taskId, taskId),
      orderBy: [asc(schema.attempts.createdAt)],
    });

    const turns: ConversationTurn[] = [];

    for (const attempt of attempts) {
      // Get files attached to this attempt
      const files = await db.query.attemptFiles.findMany({
        where: eq(schema.attemptFiles.attemptId, attempt.id),
        orderBy: [asc(schema.attemptFiles.createdAt)],
      });

      // Add user turn (show displayPrompt if available, otherwise fall back to prompt)
      turns.push({
        type: 'user',
        prompt: attempt.displayPrompt || attempt.prompt,
        messages: [],
        attemptId: attempt.id,
        timestamp: attempt.createdAt,
        files: files.length > 0 ? files : undefined,
      });

      // Get all JSON logs for this attempt
      const logs = await db.query.attemptLogs.findMany({
        where: eq(schema.attemptLogs.attemptId, attempt.id),
        orderBy: [asc(schema.attemptLogs.createdAt)],
      });

      // Parse JSON logs into messages
      // Collect ALL content blocks from ALL assistant messages
      // Tool_use blocks are deduped by id, text blocks by content hash
      // This ensures we capture all tools even if final message doesn't include them
      const allContentBlocks: import('@/types').ClaudeContentBlock[] = [];
      const seenToolIds = new Set<string>(); // Dedupe tool_use by id
      const seenTextHashes = new Set<string>(); // Dedupe text by content
      const toolResultMap = new Map<string, ClaudeOutput>();

      for (const log of logs) {
        if (log.type === 'json') {
          try {
            const parsed = JSON.parse(log.content) as ClaudeOutput;
            if (parsed.type === 'system') continue;

            // Collect content blocks from assistant messages
            if (parsed.type === 'assistant' && parsed.message?.content) {
              for (const block of parsed.message.content) {
                if (block.type === 'tool_use' && block.id) {
                  // Dedupe tool_use by id
                  if (!seenToolIds.has(block.id)) {
                    allContentBlocks.push(block);
                    seenToolIds.add(block.id);
                  }
                } else if (block.type === 'text' && block.text) {
                  // Dedupe text by content (first 100 chars as hash)
                  const textHash = block.text.substring(0, 100);
                  if (!seenTextHashes.has(textHash)) {
                    allContentBlocks.push(block);
                    seenTextHashes.add(textHash);
                  }
                } else if (block.type === 'thinking' && block.thinking) {
                  // Dedupe thinking by content
                  const thinkHash = block.thinking.substring(0, 100);
                  if (!seenTextHashes.has('think:' + thinkHash)) {
                    allContentBlocks.push(block);
                    seenTextHashes.add('think:' + thinkHash);
                  }
                }
              }
            }
            // Extract tool_result from user messages
            else if (parsed.type === 'user' && parsed.message?.content) {
              for (const block of parsed.message.content) {
                if (block.type === 'tool_result') {
                  const toolUseId = (block as { tool_use_id?: string }).tool_use_id;
                  if (toolUseId) {
                    toolResultMap.set(toolUseId, {
                      type: 'tool_result',
                      tool_data: { tool_use_id: toolUseId },
                      result: (block as { content?: string }).content || '',
                      is_error: (block as { is_error?: boolean }).is_error || false,
                    });
                  }
                }
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Build merged assistant message with all collected blocks
      const toolResultMessages = Array.from(toolResultMap.values());
      const mergedAssistantMessage: ClaudeOutput | null = allContentBlocks.length > 0
        ? { type: 'assistant', message: { content: allContentBlocks } }
        : null;

      const messages: ClaudeOutput[] = [
        ...toolResultMessages,
        ...(mergedAssistantMessage ? [mergedAssistantMessage] : []),
      ];

      // Add assistant turn if there are messages
      if (messages.length > 0) {
        turns.push({
          type: 'assistant',
          messages,
          attemptId: attempt.id,
          timestamp: attempt.createdAt,
        });
      }
    }

    return NextResponse.json({ turns });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
