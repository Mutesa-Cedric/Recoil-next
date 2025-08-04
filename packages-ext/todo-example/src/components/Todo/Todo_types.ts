// TypeScript port of Todo_types.js

export interface TodoItem {
  id: number;
  text: string;
  isComplete: boolean;
}

export type TodoFilterType = 'Show All' | 'Show Completed' | 'Show Uncompleted';

export interface TodoStats {
  totalNum: number;
  totalCompletedNum: number;
  totalUncompletedNum: number;
  percentCompleted: number;
}