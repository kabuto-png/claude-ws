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
    const socketInstance = io({
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('Attempt stream socket connected:', socketInstance.id);
      setIsConnected(true);
      setCurrentAttemptId((currentId) => {
        if (currentId) {
          socketInstance.emit('attempt:subscribe', { attemptId: currentId });
          fetch(`/api/attempts/${currentId}/status`)
            .then(res => res.json())
            .then(data => {
              if (data.status && data.status !== 'running') {
                setIsRunning(false);
                if (currentTaskIdRef.current) removeRunningTask(currentTaskIdRef.current);
              }
            })
            .catch(() => { });
        }
        return currentId;
      });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('task:started', (data: { taskId: string }) => {
      addRunningTask(data.taskId);
    });

    socketInstance.on('task:finished', (data: { taskId: string; status: string }) => {
      removeRunningTask(data.taskId);
      if (data.status === 'completed') markTaskCompleted(data.taskId);
    });

    socketInstance.on('output:json', (data: { attemptId: string; data: ClaudeOutput }) => {
      const { attemptId, data: output } = data;

      if (output.type === 'result') {
        setIsRunning(false);
        if (currentTaskIdRef.current) removeRunningTask(currentTaskIdRef.current);
      }

      setMessages((prev) => {
        const newMessages = [...prev];

        // --- 1. Tool Use Merging ---
        // Match by id (if present) or tool_name (if streaming without id)
        if (output.type === 'tool_use') {
          const index = newMessages.findLastIndex(
            (m) => m.type === 'tool_use' &&
              (m as any)._attemptId === attemptId &&
              (m.id === output.id || (m.tool_name === output.tool_name && !m.id))
          );

          if (index >= 0) {
            newMessages[index] = { ...output, _attemptId: attemptId, _msgId: (newMessages[index] as any)._msgId } as any;
            return newMessages;
          }
          return [...prev, { ...output, _attemptId: attemptId, _msgId: Math.random().toString(36) } as any];
        }

        // --- 2. Assistant Message Merging ---
        // Resilience against partial snapshots: only update if the new content is "more complete"
        if (output.type === 'assistant') {
          const index = newMessages.findLastIndex(
            (m) => m.type === 'assistant' && (m as any)._attemptId === attemptId
          );

          const incomingContent = output.message?.content || [];

          if (index >= 0) {
            const existing = { ...newMessages[index] };
            const mergedContent = [...(existing.message?.content || [])];

            incomingContent.forEach((newBlock, i) => {
              if (i < mergedContent.length) {
                const oldBlock = mergedContent[i];
                if (newBlock.type === oldBlock.type) {
                  // For text/thinking, keep the longer one (snapshot vs chunk resilience)
                  if (newBlock.type === 'text') {
                    if ((newBlock.text?.length || 0) >= (oldBlock.text?.length || 0)) {
                      mergedContent[i] = newBlock;
                    }
                  } else if (newBlock.type === 'thinking') {
                    if ((newBlock.thinking?.length || 0) >= (oldBlock.thinking?.length || 0)) {
                      mergedContent[i] = newBlock;
                    }
                  } else {
                    mergedContent[i] = newBlock;
                  }
                } else {
                  mergedContent[i] = newBlock;
                }
              } else {
                mergedContent.push(newBlock);
              }
            });

            existing.message = { ...output.message, content: mergedContent };
            newMessages[index] = { ...existing, _attemptId: attemptId } as any;
            return newMessages;
          }
          return [...prev, { ...output, _attemptId: attemptId, _msgId: Math.random().toString(36) } as any];
        }

        // --- 3. Stream Event Handling ---
        if (output.type === 'stream_event' && output.event) {
          const event = output.event;
          const index = newMessages.findLastIndex(
            (m) => m.type === 'assistant' && (m as any)._attemptId === attemptId
          );

          if (index >= 0) {
            const existing = { ...newMessages[index] };
            const content = [...(existing.message?.content || [])];
            const i = event.index ?? (content.length > 0 ? content.length - 1 : 0);

            if (!content[i]) {
              content[i] = event.content_block || { type: (event.delta?.type || 'text') as any };
            }

            if (event.delta) {
              const block = { ...content[i] };
              if (event.delta.text) {
                if (block.type === 'text') block.text = (block.text || '') + event.delta.text;
                if (block.type === 'thinking') block.thinking = (block.thinking || '') + event.delta.text;
              }
              content[i] = block;
            }

            existing.message = { ...existing.message, content };
            newMessages[index] = existing;
            return newMessages;
          }

          // Initial assistant message from stream event if snapshot hasn't arrived
          const newAssistant: ClaudeOutput = { type: 'assistant', message: { content: [] } };
          (newAssistant as any)._attemptId = attemptId;
          (newAssistant as any)._msgId = Math.random().toString(36);

          if (event.content_block) {
            newAssistant.message!.content = [event.content_block];
          } else if (event.delta) {
            const block: any = { type: event.delta.type || 'text' };
            if (event.delta.text) {
              if (block.type === 'text') block.text = event.delta.text;
              if (block.type === 'thinking') block.thinking = event.delta.text;
            }
            newAssistant.message!.content = [block];
          }
          return [...prev, newAssistant];
        }

        // --- 4. Tool Result Extraction (User message) ---
        if (output.type === 'user' && output.message?.content) {
          const currentNewMessages = [...newMessages];
          let updated = false;
          for (const block of output.message.content) {
            if (block.type === 'tool_result') {
              updated = true;
              const toolUseId = (block as any).tool_use_id;
              const existingIndex = currentNewMessages.findIndex(
                (m) => m.type === 'tool_result' && m.tool_data?.tool_use_id === toolUseId
              );
              const resultMsg: ClaudeOutput = {
                type: 'tool_result',
                tool_data: { tool_use_id: toolUseId },
                result: (block as any).content || '',
                is_error: (block as any).is_error || false,
                _attemptId: attemptId,
                _msgId: Math.random().toString(36)
              } as any;

              if (existingIndex >= 0) currentNewMessages[existingIndex] = resultMsg;
              else currentNewMessages.push(resultMsg);
            }
          }
          if (updated) return currentNewMessages;
        }

        // --- 5. Default Append ---
        return [...prev, { ...output, _attemptId: attemptId, _msgId: Math.random().toString(36) } as any];
      });
    });

    socketInstance.on('attempt:finished', (data: WsAttemptFinished) => {
      setCurrentAttemptId((currentId) => {
        if (data.attemptId === currentId) {
          setIsRunning(false);
          if (currentTaskIdRef.current) {
            removeRunningTask(currentTaskIdRef.current);
            if (data.status === 'completed') markTaskCompleted(currentTaskIdRef.current);
          }
          if (currentTaskIdRef.current && data.status === 'completed') {
            onCompleteRef.current?.(currentTaskIdRef.current);
          }
        }
        return currentId;
      });
    });

    socketInstance.on('error', (data: { message: string }) => {
      setIsRunning(false);
      if (currentTaskIdRef.current) removeRunningTask(currentTaskIdRef.current);
    });

    socketInstance.on('question:ask', (data: any) => {
      setActiveQuestion({ attemptId: data.attemptId, toolUseId: data.toolUseId, questions: data.questions });
    });

    return () => {
      socketInstance.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!taskId || !isConnected) return;
    const checkRunningAttempt = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/running-attempt`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.attempt && data.attempt.status === 'running') {
          currentTaskIdRef.current = taskId;
          setCurrentAttemptId(data.attempt.id);
          setCurrentPrompt(data.attempt.prompt);
          setMessages((data.messages || []).map((m: any) => ({ ...m, _attemptId: data.attempt.id, _msgId: Math.random().toString(36) })));
          setIsRunning(true);
          addRunningTask(taskId);
          socketRef.current?.emit('attempt:subscribe', { attemptId: data.attempt.id });
        }
      } catch (error) { }
    };
    checkRunningAttempt();
  }, [taskId, isConnected]);

  const startAttempt = useCallback((taskId: string, prompt: string, displayPrompt?: string, fileIds?: string[]) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;
    currentTaskIdRef.current = taskId;
    setMessages([]);
    setCurrentPrompt(displayPrompt || prompt);
    setIsRunning(true);
    addRunningTask(taskId);
    socket.once('attempt:started', (data: any) => {
      setCurrentAttemptId(data.attemptId);
      socket.emit('attempt:subscribe', { attemptId: data.attemptId });
    });
    socket.emit('attempt:start', { taskId, prompt, displayPrompt, fileIds });
  }, [isConnected]);

  const answerQuestion = useCallback((answer: string) => {
    const socket = socketRef.current;
    if (!socket || !activeQuestion) return;
    socket.once('attempt:started', (data: any) => {
      setCurrentAttemptId(data.attemptId);
      setIsRunning(true);
      socket.emit('attempt:subscribe', { attemptId: data.attemptId });
    });
    socket.emit('question:answer', { attemptId: activeQuestion.attemptId, answer });
    setActiveQuestion(null);
  }, [activeQuestion]);

  const cancelQuestion = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !activeQuestion) return;
    socket.emit('question:answer', { attemptId: activeQuestion.attemptId, answer: '\x1b' });
    setActiveQuestion(null);
  }, [activeQuestion]);

  const cancelAttempt = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !currentAttemptId) return;
    socket.emit('attempt:cancel', { attemptId: currentAttemptId });
    setIsRunning(false);
    setActiveQuestion(null);
    if (currentTaskIdRef.current) removeRunningTask(currentTaskIdRef.current);
  }, [currentAttemptId]);

  return { messages, isConnected, startAttempt, cancelAttempt, currentAttemptId, currentPrompt, isRunning, activeQuestion, answerQuestion, cancelQuestion };
}
