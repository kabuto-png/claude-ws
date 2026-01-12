import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { processManager } from './src/lib/process-manager';
import { db, schema } from './src/lib/db';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AttemptStatus, ClaudeOutput } from './src/types';
import { processAttachments } from './src/lib/file-processor';
import { buildPromptWithFiles } from './src/lib/prompt-builder';
import { createSnapshot } from './src/lib/git-snapshot';

// Track session IDs for attempts (in-memory for current running attempts)
const attemptSessionIds = new Map<string, string>();

// Track git commit hashes for attempts (before Claude makes changes)
const attemptGitCommits = new Map<string, string>();

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, turbopack: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: dev ? '*' : false,
    },
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Start new attempt
    socket.on(
      'attempt:start',
      async (data: { taskId: string; prompt: string; displayPrompt?: string; fileIds?: string[] }) => {
        const { taskId, prompt, displayPrompt, fileIds = [] } = data;

        try {
          // Get task and project info
          const task = await db.query.tasks.findFirst({
            where: eq(schema.tasks.id, taskId),
          });

          if (!task) {
            socket.emit('error', { message: 'Task not found' });
            return;
          }

          const project = await db.query.projects.findFirst({
            where: eq(schema.projects.id, task.projectId),
          });

          if (!project) {
            socket.emit('error', { message: 'Project not found' });
            return;
          }

          // Get the last completed attempt's session_id for conversation continuation
          const lastAttempt = await db.query.attempts.findFirst({
            where: eq(schema.attempts.taskId, taskId),
            orderBy: [desc(schema.attempts.createdAt)],
          });
          const previousSessionId = lastAttempt?.sessionId ?? undefined;

          // Create attempt record
          const attemptId = nanoid();
          await db.insert(schema.attempts).values({
            id: attemptId,
            taskId,
            prompt,
            displayPrompt: displayPrompt || null,
            status: 'running',
          });

          // Process file attachments if any
          let filePaths: string[] = [];
          if (fileIds.length > 0) {
            console.log(`[Server] Processing ${fileIds.length} file attachments for attempt ${attemptId}`);
            const processedFiles = await processAttachments(attemptId, fileIds);
            filePaths = processedFiles.map(f => f.absolutePath);
            console.log(`[Server] Processed ${processedFiles.length} files`);
          }

          // Update task status to in_progress if it was todo
          if (task.status === 'todo') {
            await db
              .update(schema.tasks)
              .set({ status: 'in_progress', updatedAt: Date.now() })
              .where(eq(schema.tasks.id, taskId));
          }

          // Create git snapshot before Claude makes changes
          const gitCommitHash = createSnapshot(project.path, attemptId, prompt);
          if (gitCommitHash) {
            attemptGitCommits.set(attemptId, gitCommitHash);
          }

          // Join attempt room
          socket.join(`attempt:${attemptId}`);

          // Spawn Claude Code process with session resumption and file paths
          processManager.spawn(attemptId, project.path, prompt, previousSessionId, filePaths.length > 0 ? filePaths : undefined);
          console.log(`[Server] Spawned attempt ${attemptId}${previousSessionId ? ` (resuming session ${previousSessionId})` : ''}${filePaths.length > 0 ? ` with ${filePaths.length} files` : ''}`);

          socket.emit('attempt:started', { attemptId, taskId });
          // Global event for all clients to track running tasks
          io.emit('task:started', { taskId });
        } catch (error) {
          console.error('Error starting attempt:', error);
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    // Cancel/kill attempt
    socket.on('attempt:cancel', async (data: { attemptId: string }) => {
      const { attemptId } = data;
      const killed = processManager.kill(attemptId);

      if (killed) {
        // Get attempt to retrieve taskId for global event
        const attempt = await db.query.attempts.findFirst({
          where: eq(schema.attempts.id, attemptId),
        });

        await db
          .update(schema.attempts)
          .set({ status: 'cancelled', completedAt: Date.now() })
          .where(eq(schema.attempts.id, attemptId));

        io.to(`attempt:${attemptId}`).emit('attempt:finished', {
          attemptId,
          status: 'cancelled',
          code: null,
        });

        // Global event for all clients to track cancelled tasks
        if (attempt?.taskId) {
          io.emit('task:finished', { taskId: attempt.taskId, status: 'cancelled' });
        }
      }
    });

    // Subscribe to attempt logs
    socket.on('attempt:subscribe', (data: { attemptId: string }) => {
      socket.join(`attempt:${data.attemptId}`);
    });

    // Unsubscribe from attempt logs
    socket.on('attempt:unsubscribe', (data: { attemptId: string }) => {
      socket.leave(`attempt:${data.attemptId}`);
    });

    // Handle AskUserQuestion response - start a new attempt with --resume
    socket.on(
      'question:answer',
      async (data: { attemptId: string; answer: string }) => {
        const { attemptId, answer } = data;
        console.log(`[Server] Received answer for ${attemptId}: ${answer}`);

        // First try to send to stdin if process is still running
        const sent = processManager.sendInput(attemptId, answer);
        if (sent) {
          console.log(`[Server] Sent answer to running process ${attemptId}`);
          return;
        }

        // Process not running - start a new attempt with --resume
        console.log(`[Server] Process not running, starting continuation attempt`);

        try {
          // Get the original attempt to find taskId and sessionId
          const originalAttempt = await db.query.attempts.findFirst({
            where: eq(schema.attempts.id, attemptId),
          });

          if (!originalAttempt || !originalAttempt.sessionId) {
            console.error(`[Server] Original attempt or session not found for ${attemptId}`);
            socket.emit('error', { message: 'Session not found' });
            return;
          }

          // Get task and project info
          const task = await db.query.tasks.findFirst({
            where: eq(schema.tasks.id, originalAttempt.taskId),
          });

          if (!task) {
            socket.emit('error', { message: 'Task not found' });
            return;
          }

          const project = await db.query.projects.findFirst({
            where: eq(schema.projects.id, task.projectId),
          });

          if (!project) {
            socket.emit('error', { message: 'Project not found' });
            return;
          }

          // Create new attempt with the answer as prompt
          const newAttemptId = nanoid();
          await db.insert(schema.attempts).values({
            id: newAttemptId,
            taskId: originalAttempt.taskId,
            prompt: answer,
            displayPrompt: `Answer: ${answer}`,
            status: 'running',
          });

          // Join new attempt room
          socket.join(`attempt:${newAttemptId}`);

          // Spawn Claude with --resume using original session
          processManager.spawn(newAttemptId, project.path, answer, originalAttempt.sessionId);
          console.log(`[Server] Started continuation attempt ${newAttemptId} with session ${originalAttempt.sessionId}`);

          socket.emit('attempt:started', { attemptId: newAttemptId, taskId: originalAttempt.taskId });
          io.emit('task:started', { taskId: originalAttempt.taskId });
        } catch (error) {
          console.error(`[Server] Error starting continuation:`, error);
          socket.emit('error', { message: 'Failed to continue conversation' });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Forward ProcessManager events to WebSocket clients
  processManager.on('json', async ({ attemptId, data }) => {
    // Extract session_id from system message and store it
    if (data.type === 'system' && data.session_id) {
      attemptSessionIds.set(attemptId, data.session_id);
      console.log(`[Server] Captured session_id for ${attemptId}: ${data.session_id}`);

      // Store session_id in the attempt record
      await db
        .update(schema.attempts)
        .set({ sessionId: data.session_id })
        .where(eq(schema.attempts.id, attemptId));
    }

    // Detect AskUserQuestion tool_use and emit special event
    if (data.type === 'assistant' && data.message?.content) {
      for (const block of data.message.content) {
        if (block.type === 'tool_use' && block.name === 'AskUserQuestion') {
          console.log(`[Server] AskUserQuestion detected for ${attemptId}`);
          io.to(`attempt:${attemptId}`).emit('question:ask', {
            attemptId,
            toolUseId: block.id,
            questions: (block.input as { questions: unknown[] }).questions,
          });
        }
      }
    }

    // Save to database
    await db.insert(schema.attemptLogs).values({
      attemptId,
      type: 'json',
      content: JSON.stringify(data),
    });

    // Forward to subscribers
    io.to(`attempt:${attemptId}`).emit('output:json', { attemptId, data });
  });

  processManager.on('raw', async ({ attemptId, content }) => {
    await db.insert(schema.attemptLogs).values({
      attemptId,
      type: 'stdout',
      content,
    });

    io.to(`attempt:${attemptId}`).emit('output:raw', { attemptId, content });
  });

  processManager.on('stderr', async ({ attemptId, content }) => {
    await db.insert(schema.attemptLogs).values({
      attemptId,
      type: 'stderr',
      content,
    });

    io.to(`attempt:${attemptId}`).emit('output:stderr', { attemptId, content });
  });

  processManager.on('exit', async ({ attemptId, code }) => {
    const status: AttemptStatus = code === 0 ? 'completed' : 'failed';

    // Get attempt to retrieve taskId for global event
    const attempt = await db.query.attempts.findFirst({
      where: eq(schema.attempts.id, attemptId),
    });

    await db
      .update(schema.attempts)
      .set({ status, completedAt: Date.now() })
      .where(eq(schema.attempts.id, attemptId));

    // Create checkpoint on successful completion
    if (code === 0) {
      try {
        const attempt = await db.query.attempts.findFirst({
          where: eq(schema.attempts.id, attemptId),
        });

        if (attempt?.sessionId) {
          // Count messages in this attempt
          const logs = await db.query.attemptLogs.findMany({
            where: eq(schema.attemptLogs.attemptId, attemptId),
          });

          // Extract summary from last assistant message
          const summary = extractSummary(logs);

          // Get git commit hash from before this attempt
          const gitCommitHash = attemptGitCommits.get(attemptId) || null;

          await db.insert(schema.checkpoints).values({
            id: nanoid(),
            taskId: attempt.taskId,
            attemptId,
            sessionId: attempt.sessionId,
            gitCommitHash,
            messageCount: logs.filter((l) => l.type === 'json').length,
            summary,
          });

          console.log(`[Server] Created checkpoint for attempt ${attemptId}${gitCommitHash ? ` (git: ${gitCommitHash.substring(0, 7)})` : ''}`);
        }
      } catch (error) {
        console.error(`[Server] Failed to create checkpoint for ${attemptId}:`, error);
      }
    }

    // Clean up in-memory tracking
    attemptSessionIds.delete(attemptId);
    attemptGitCommits.delete(attemptId);

    console.log(`[Server] Emitting attempt:finished for ${attemptId} with status ${status}`);
    io.to(`attempt:${attemptId}`).emit('attempt:finished', {
      attemptId,
      status,
      code,
    });

    // Global event for all clients to track completed tasks
    if (attempt?.taskId) {
      io.emit('task:finished', { taskId: attempt.taskId, status });
    }
  });

  // Extract summary from last assistant message
  function extractSummary(logs: { type: string; content: string }[]): string {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].type === 'json') {
        try {
          const data = JSON.parse(logs[i].content);
          if (data.type === 'assistant' && data.message?.content) {
            const text = data.message.content
              .filter((b: { type: string }) => b.type === 'text')
              .map((b: { text: string }) => b.text)
              .join(' ');
            return text.substring(0, 100) + (text.length > 100 ? '...' : '');
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    return '';
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n> ${signal} received, shutting down gracefully...`);

    // Kill all Claude processes first
    processManager.killAll();
    console.log('> Killed all Claude processes');

    // Close all socket connections
    io.close(() => {
      console.log('> Socket.io closed');
    });

    // Close HTTP server
    httpServer.close(() => {
      console.log('> HTTP server closed');
      process.exit(0);
    });

    // Force exit after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('> Forced exit after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
});
