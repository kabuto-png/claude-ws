'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClaudeOutput, WsAttemptFinished } from '@/types';
import { useRunningTasksStore } from '@/stores/running-tasks-store';

interface UseAttemptStreamOptions {
  taskId?: string;
  onComplete?: (taskId: string) => void;
}

// Question types for AskUserQuestion
interface QuestionOption {
  label: string;
  description: string;
}

interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

interface ActiveQuestion {
  attemptId: string;
  toolUseId: string;
  questions: Question[];
}

interface UseAttemptStreamResult {
  messages: ClaudeOutput[];
  isConnected: boolean;
  startAttempt: (taskId: string, prompt: string, displayPrompt?: string, fileIds?: string[]) => void;
  cancelAttempt: () => void;
  currentAttemptId: string | null;
  currentPrompt: string | null;
  isRunning: boolean;
  activeQuestion: ActiveQuestion | null;
  answerQuestion: (answer: string) => void;
  cancelQuestion: () => void;
}

export function useAttemptStream(
  options?: UseAttemptStreamOptions
): UseAttemptStreamResult {
  const taskId = options?.taskId;
  const onCompleteRef = useRef(options?.onComplete);
  const socketRef = useRef<Socket | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ClaudeOutput[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const { addRunningTask, removeRunningTask, markTaskCompleted } = useRunningTasksStore();

  // Keep callback ref updated
  onCompleteRef.current = options?.onComplete;

  useEffect(() => {
    // Use default Socket.io path (no custom path)
    const socketInstance = io({
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('Attempt stream socket connected:', socketInstance.id);
      setIsConnected(true);
      // Re-subscribe to current attempt room on reconnect and check status
      setCurrentAttemptId((currentId) => {
        if (currentId) {
          console.log('[useAttemptStream] Re-subscribing to attempt on reconnect:', currentId);
          socketInstance.emit('attempt:subscribe', { attemptId: currentId });
          // Also check if attempt is still running (might have finished while disconnected)
          fetch(`/api/attempts/${currentId}/status`)
            .then(res => res.json())
            .then(data => {
              if (data.status && data.status !== 'running') {
                console.log('[useAttemptStream] Attempt finished while disconnected:', data.status);
                setIsRunning(false);
                if (currentTaskIdRef.current) {
                  removeRunningTask(currentTaskIdRef.current);
                }
              }
            })
            .catch(() => {}); // Ignore errors
        }
        return currentId;
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('Attempt stream socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });

    // Global: Listen for any task starting (for green dot indicator on cards)
    socketInstance.on('task:started', (data: { taskId: string }) => {
      console.log('[useAttemptStream] Global: Task started:', data.taskId);
      addRunningTask(data.taskId);
    });

    // Global: Listen for any task finishing (for green tick indicator on cards)
    socketInstance.on('task:finished', (data: { taskId: string; status: string }) => {
      console.log('[useAttemptStream] Global: Task finished:', data.taskId, data.status);
      removeRunningTask(data.taskId);
      if (data.status === 'completed') {
        markTaskCompleted(data.taskId);
      }
    });

    // Listen for JSON output from Claude
    socketInstance.on('output:json', (data: { attemptId: string; data: ClaudeOutput }) => {
      console.log('[useAttemptStream] Received output:json', data.attemptId, data.data?.type);
      setCurrentAttemptId((currentId) => {
        if (data.attemptId === currentId) {
          // Check for 'result' type which indicates completion
          if (data.data.type === 'result') {
            console.log('[useAttemptStream] Received result message, stopping');
            setIsRunning(false);
            if (currentTaskIdRef.current) {
              removeRunningTask(currentTaskIdRef.current);
            }
          }

          setMessages((prev) => {
            // For 'assistant' messages, replace last one (accumulated content)
            // We render tool_use directly from assistant.content to preserve order
            if (data.data.type === 'assistant') {
              const lastAssistantIndex = prev.findLastIndex((m) => m.type === 'assistant');
              if (lastAssistantIndex >= 0) {
                const newMessages = [...prev];
                newMessages[lastAssistantIndex] = data.data;
                return newMessages;
              }
              return [...prev, data.data];
            }

            // For 'user' messages with tool_result content, extract and add as tool_result
            if (data.data.type === 'user' && data.data.message?.content) {
              const newMessages = [...prev];
              for (const block of data.data.message.content) {
                if (block.type === 'tool_result') {
                  const toolUseId = (block as { tool_use_id?: string }).tool_use_id;
                  // Check if we already have this result
                  const existingIndex = newMessages.findIndex(
                    (m) => m.type === 'tool_result' && m.tool_data?.tool_use_id === toolUseId
                  );
                  const resultMsg: ClaudeOutput = {
                    type: 'tool_result',
                    tool_data: { tool_use_id: toolUseId },
                    result: (block as { content?: string }).content || '',
                    is_error: (block as { is_error?: boolean }).is_error || false,
                  };
                  if (existingIndex >= 0) {
                    newMessages[existingIndex] = resultMsg;
                  } else {
                    newMessages.push(resultMsg);
                  }
                }
              }
              return newMessages;
            }

            // For other message types, just append
            return [...prev, data.data];
          });
        }
        return currentId;
      });
    });

    // Listen for raw output
    socketInstance.on('output:raw', (data: { attemptId: string; content: string }) => {
      console.log('Received output:raw', data.attemptId);
    });

    // Listen for stderr
    socketInstance.on('output:stderr', (data: { attemptId: string; content: string }) => {
      console.log('Received output:stderr', data.content);
    });

    // Listen for attempt finished
    socketInstance.on('attempt:finished', (data: WsAttemptFinished) => {
      console.log('Attempt finished:', data);
      setCurrentAttemptId((currentId) => {
        if (data.attemptId === currentId) {
          setIsRunning(false);
          if (currentTaskIdRef.current) {
            removeRunningTask(currentTaskIdRef.current);
            if (data.status === 'completed') {
              markTaskCompleted(currentTaskIdRef.current);
            }
          }
          // Call onComplete callback with taskId
          if (currentTaskIdRef.current && data.status === 'completed') {
            onCompleteRef.current?.(currentTaskIdRef.current);
          }
        }
        return currentId;
      });
    });

    // Listen for errors
    socketInstance.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
      setIsRunning(false);
      if (currentTaskIdRef.current) {
        removeRunningTask(currentTaskIdRef.current);
      }
    });

    // Listen for AskUserQuestion
    socketInstance.on(
      'question:ask',
      (data: { attemptId: string; toolUseId: string; questions: Question[] }) => {
        console.log('[useAttemptStream] Received question:ask', data);
        setActiveQuestion({
          attemptId: data.attemptId,
          toolUseId: data.toolUseId,
          questions: data.questions,
        });
      }
    );

    return () => {
      socketInstance.close();
      socketRef.current = null;
    };
  }, []);

  // Check for running attempt when taskId changes or socket connects
  useEffect(() => {
    if (!taskId || !isConnected) return;

    const checkRunningAttempt = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/running-attempt`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.attempt) {
          if (data.attempt.status === 'running') {
            console.log('[useAttemptStream] Found running attempt:', data.attempt.id);

            // Check if messages contain a 'result' type (indicates completion)
            const hasResultMessage = (data.messages || []).some(
              (msg: ClaudeOutput) => msg.type === 'result'
            );

            if (hasResultMessage) {
              // Attempt actually finished but status wasn't updated - fix it
              console.log('[useAttemptStream] Attempt has result message, marking as not running');
              setIsRunning(false);
              removeRunningTask(taskId);
              // Also verify with status endpoint
              fetch(`/api/attempts/${data.attempt.id}/status`)
                .then(r => r.json())
                .then(s => {
                  if (s.status !== 'running') {
                    console.log('[useAttemptStream] Status confirmed not running:', s.status);
                  }
                })
                .catch(() => {});
              return;
            }

            currentTaskIdRef.current = taskId;
            setCurrentAttemptId(data.attempt.id);
            setCurrentPrompt(data.attempt.prompt);
            setMessages(data.messages || []);
            setIsRunning(true);
            addRunningTask(taskId);

            // Subscribe to this attempt's output
            socketRef.current?.emit('attempt:subscribe', { attemptId: data.attempt.id });

            // Double-check status after a short delay (in case process exited but status not updated)
            setTimeout(async () => {
              try {
                const statusRes = await fetch(`/api/attempts/${data.attempt.id}/status`);
                const statusData = await statusRes.json();
                if (statusData.status && statusData.status !== 'running') {
                  console.log('[useAttemptStream] Delayed status check: not running', statusData.status);
                  setIsRunning(false);
                  removeRunningTask(taskId);
                }
              } catch {}
            }, 2000);
          } else {
            // Attempt is no longer running - ensure UI reflects this
            console.log('[useAttemptStream] Attempt not running, status:', data.attempt.status);
            setIsRunning(false);
            removeRunningTask(taskId);
          }
        } else {
          // No running attempt
          setIsRunning(false);
          removeRunningTask(taskId);
        }
      } catch (error) {
        console.error('Failed to check running attempt:', error);
      }
    };

    checkRunningAttempt();
  }, [taskId, isConnected, removeRunningTask, addRunningTask, markTaskCompleted]);

  const startAttempt = useCallback(
    (taskId: string, prompt: string, displayPrompt?: string, fileIds?: string[]) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) {
        console.error('Socket not connected, cannot start attempt');
        return;
      }

      console.log('Starting attempt for task:', taskId, fileIds ? `with ${fileIds.length} files` : '');
      currentTaskIdRef.current = taskId;
      setMessages([]);
      setCurrentPrompt(displayPrompt || prompt);
      setIsRunning(true);
      addRunningTask(taskId);

      // Listen for the new attempt ID
      socket.once('attempt:started', (data: { attemptId: string; taskId: string }) => {
        console.log('Attempt started:', data.attemptId);
        setCurrentAttemptId(data.attemptId);
        // Subscribe to this attempt's output
        socket.emit('attempt:subscribe', { attemptId: data.attemptId });
      });

      socket.emit('attempt:start', { taskId, prompt, displayPrompt, fileIds });
    },
    [isConnected, addRunningTask, markTaskCompleted]
  );

  // Answer a question from AskUserQuestion
  const answerQuestion = useCallback(
    (answer: string) => {
      const socket = socketRef.current;
      if (!socket || !activeQuestion) return;

      console.log('[useAttemptStream] Sending answer:', answer);
      socket.emit('question:answer', {
        attemptId: activeQuestion.attemptId,
        answer,
      });
      setActiveQuestion(null);
    },
    [activeQuestion]
  );

  // Cancel/dismiss a question (sends empty or escape)
  const cancelQuestion = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !activeQuestion) return;

    // Send escape key to cancel
    socket.emit('question:answer', {
      attemptId: activeQuestion.attemptId,
      answer: '\x1b', // Escape character
    });
    setActiveQuestion(null);
  }, [activeQuestion]);

  // Cancel/stop the current running attempt
  const cancelAttempt = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !currentAttemptId) return;

    console.log('[useAttemptStream] Cancelling attempt:', currentAttemptId);
    socket.emit('attempt:cancel', { attemptId: currentAttemptId });
    setIsRunning(false);
    setActiveQuestion(null);
    if (currentTaskIdRef.current) {
      removeRunningTask(currentTaskIdRef.current);
    }
  }, [currentAttemptId, removeRunningTask]);

  return {
    messages,
    isConnected,
    startAttempt,
    cancelAttempt,
    currentAttemptId,
    currentPrompt,
    isRunning,
    activeQuestion,
    answerQuestion,
    cancelQuestion,
  };
}
