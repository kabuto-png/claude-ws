import { create } from 'zustand';
import { Task, TaskStatus } from '@/types';

interface TaskStore {
  tasks: Task[];
  selectedTaskId: string | null;
  selectedTask: Task | null;
  isCreatingTask: boolean;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  deleteTasksByStatus: (status: TaskStatus) => Promise<void>;
  selectTask: (id: string | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setCreatingTask: (isCreating: boolean) => void;

  // API calls
  fetchTasks: (projectIds: string[]) => Promise<void>;
  createTask: (projectId: string, title: string, description: string | null) => Promise<void>;
  reorderTasks: (taskId: string, newStatus: TaskStatus, newPosition: number) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  selectedTask: null,
  isCreatingTask: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    ),
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id),
  })),

  deleteTasksByStatus: async (status: TaskStatus) => {
    const tasksToDelete = get().tasks.filter((task) => task.status === status);

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== status),
    }));

    try {
      // Delete all tasks with the given status
      await Promise.all(
        tasksToDelete.map((task) =>
          fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
        )
      );
    } catch (error) {
      console.error('Error deleting tasks by status:', error);
      // Revert on failure
      set((state) => ({
        tasks: [...state.tasks, ...tasksToDelete],
      }));
      throw error;
    }
  },

  selectTask: (id) => {
    const task = id ? get().tasks.find((t) => t.id === id) || null : null;
    set({ selectedTaskId: id, selectedTask: task });
  },

  setSelectedTask: (task) => set({ selectedTask: task }),

  setCreatingTask: (isCreating) => set({ isCreatingTask: isCreating }),

  fetchTasks: async (projectIds: string[]) => {
    try {
      // Build query string based on projectIds
      const query = projectIds.length > 0
        ? `?projectIds=${projectIds.join(',')}`
        : ''; // Empty = fetch all tasks
      const res = await fetch(`/api/tasks${query}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const tasks = await res.json();
      set({ tasks });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  },

  createTask: async (projectId: string, title: string, description: string | null) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title, description }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const task = await res.json();

      // If task was updated (existing task with same title), update it in store
      if (task.updated) {
        get().updateTask(task.id, { description: task.description });
      } else {
        get().addTask(task);
      }

      get().setCreatingTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  reorderTasks: async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
    const oldTasks = get().tasks;

    // Optimistic update
    const task = oldTasks.find((t) => t.id === taskId);
    if (!task) return;

    const tasksInNewColumn = oldTasks
      .filter((t) => t.status === newStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    tasksInNewColumn.splice(newPosition, 0, { ...task, status: newStatus });

    const updatedTasks = oldTasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, position: newPosition };
      }
      const idx = tasksInNewColumn.findIndex((nt) => nt.id === t.id);
      if (idx >= 0 && t.status === newStatus) {
        return { ...t, position: idx };
      }
      return t;
    });

    set({ tasks: updatedTasks });

    try {
      const res = await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus, position: newPosition }),
      });
      if (!res.ok) {
        // Revert on failure
        set({ tasks: oldTasks });
        throw new Error('Failed to reorder tasks');
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      set({ tasks: oldTasks });
    }
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update task status');
      const updatedTask = await res.json();

      // Update task in list
      get().updateTask(taskId, { status });

      // Update selectedTask if it's the same task
      const selected = get().selectedTask;
      if (selected?.id === taskId) {
        set({ selectedTask: { ...selected, status } });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  },
}));
