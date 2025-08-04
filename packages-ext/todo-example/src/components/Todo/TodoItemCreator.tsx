// TypeScript port of TodoItemCreator.jsx

import { todoListState } from './Todo_state';
import React, { useState, ChangeEvent } from 'react';
import { useSetRecoilState } from 'recoil';

export const TodoItemCreator: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const setTodoList = useSetRecoilState(todoListState);

  const addItem = () => {
    setTodoList((oldTodoList) => [
      ...oldTodoList,
      {
        id: getId(),
        text: inputValue,
        isComplete: false,
      },
    ]);
    setInputValue('');
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setInputValue(value);
  };

  return (
    <div>
      <input type="text" value={inputValue} onChange={onChange} />
      <button onClick={addItem}>Add</button>
    </div>
  );
};

// utility for creating unique Id
let id = 0;
function getId(): number {
  return id++;
}