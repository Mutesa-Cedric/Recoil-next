// TypeScript port of Todo_state.js

import { atom, selector } from 'recoil';
import { TodoItem, TodoFilterType, TodoStats } from './Todo_types';

export const todoListState = atom<TodoItem[]>({
  key: 'todoListState',
  default: [],
});

export const todoListFilterState = atom<TodoFilterType>({
  key: 'todoListFilterState',
  default: 'Show All',
});

export const filteredTodoListState = selector<TodoItem[]>({
  key: 'filteredTodoListState',
  get: ({ get }) => {
    const filter = get(todoListFilterState);
    const list = get(todoListState);

    switch (filter) {
      case 'Show Completed':
        return list.filter((item) => item.isComplete);
      case 'Show Uncompleted':
        return list.filter((item) => !item.isComplete);
      default:
        return list;
    }
  },
});

export const todoListStatsState = selector<TodoStats>({
  key: 'todoListStatsState',
  get: ({ get }) => {
    const todoList = get(todoListState);
    const totalNum = todoList.length;
    const totalCompletedNum = todoList.filter((item) => item.isComplete).length;
    const totalUncompletedNum = totalNum - totalCompletedNum;
    const percentCompleted =
      totalNum === 0 ? 0 : (totalCompletedNum / totalNum) * 100;

    return {
      totalNum,
      totalCompletedNum,
      totalUncompletedNum,
      percentCompleted,
    };
  },
});