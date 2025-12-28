// TypeScript port of TodoList.jsx

import {filteredTodoListState} from './Todo_state';
import {TodoItem} from './TodoItem';
import {TodoItemCreator} from './TodoItemCreator';
import {TodoListFilters} from './TodoListFilters';
import {TodoListStats} from './TodoListStats';
import React from 'react';
import {useRecoilValue} from 'recoil-next';

export const TodoList: React.FC = () => {
  const todoList = useRecoilValue(filteredTodoListState);

  return (
    <>
      <TodoListStats />
      <TodoListFilters />
      <TodoItemCreator />

      {todoList.map((todoItem, index) => (
        <TodoItem key={todoItem.id} item={todoItem} index={index} />
      ))}
    </>
  );
};
