// TypeScript port of TodoItem.jsx

import {TodoItem as TodoItemType} from './Todo_types';
import {todoListState} from './Todo_state';
import React, {ChangeEvent} from 'react';
import {useRecoilState} from 'recoil-next';

interface TodoItemProps {
  item: TodoItemType;
  index: number;
}

export const TodoItem: React.FC<TodoItemProps> = ({item, index}) => {
  const [todoList, setTodoList] = useRecoilState(todoListState);

  const editItemText = (event: ChangeEvent<HTMLInputElement>) => {
    const {value} = event.target;
    const newList = replaceItemAtIndex(todoList, index, {
      ...item,
      text: value,
    });

    setTodoList(newList);
  };

  const toggleItemCompletion = () => {
    const newList = replaceItemAtIndex(todoList, index, {
      ...item,
      isComplete: !item.isComplete,
    });

    setTodoList(newList);
  };

  const deleteItem = () => {
    const newList = removeItemAtIndex(todoList, index);
    setTodoList(newList);
  };

  return (
    <div>
      <input type="text" value={item.text} onChange={editItemText} />
      <input
        type="checkbox"
        checked={item.isComplete}
        onChange={toggleItemCompletion}
      />
      <button onClick={deleteItem}>X</button>
    </div>
  );
};

function replaceItemAtIndex<T>(arr: T[], index: number, newValue: T): T[] {
  return [...arr.slice(0, index), newValue, ...arr.slice(index + 1)];
}

function removeItemAtIndex<T>(arr: T[], index: number): T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1)];
}
