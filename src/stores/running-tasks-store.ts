import { create } from 'zustand';

interface RunningTasksStore {
  runningTaskIds: Set<string>;
  addRunningTask: (taskId: string) => void;
  removeRunningTask: (taskId: string) => void;
  isTaskRunning: (taskId: string) => boolean;
}

export const useRunningTasksStore = create<RunningTasksStore>((set, get) => ({
  runningTaskIds: new Set<string>(),

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

  isTaskRunning: (taskId) => {
    return get().runningTaskIds.has(taskId);
  },
}));
