import { create } from 'zustand';

interface RunningTasksStore {
  runningTaskIds: Set<string>;
  completedTaskIds: Set<string>;
  addRunningTask: (taskId: string) => void;
  removeRunningTask: (taskId: string) => void;
  markTaskCompleted: (taskId: string) => void;
  clearTaskCompleted: (taskId: string) => void;
  isTaskRunning: (taskId: string) => boolean;
  isTaskCompleted: (taskId: string) => boolean;
}

export const useRunningTasksStore = create<RunningTasksStore>((set, get) => ({
  runningTaskIds: new Set<string>(),
  completedTaskIds: new Set<string>(),

  addRunningTask: (taskId) => {
    set((state) => {
      const newSet = new Set(state.runningTaskIds);
      newSet.add(taskId);
      return { runningTaskIds: newSet };
    });
  },

  removeRunningTask: (taskId) => {
    set((state) => {
      const newSet = new Set(state.runningTaskIds);
      newSet.delete(taskId);
      return { runningTaskIds: newSet };
    });
  },

  markTaskCompleted: (taskId) => {
    set((state) => {
      const newSet = new Set(state.completedTaskIds);
      newSet.add(taskId);
      return { completedTaskIds: newSet };
    });
  },

  clearTaskCompleted: (taskId) => {
    set((state) => {
      const newSet = new Set(state.completedTaskIds);
      newSet.delete(taskId);
      return { completedTaskIds: newSet };
    });
  },

  isTaskRunning: (taskId) => {
    return get().runningTaskIds.has(taskId);
  },

  isTaskCompleted: (taskId) => {
    return get().completedTaskIds.has(taskId);
  },
}));
