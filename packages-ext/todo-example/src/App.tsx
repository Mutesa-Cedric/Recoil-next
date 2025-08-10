import './App.css';
import { TodoList } from './components/Todo/TodoList';
import { RecoilRoot } from 'recoil-next';
import React from 'react';

function App(): React.ReactElement {
  return (
    <RecoilRoot {...({} as any)}>
      <div className="todo-container">
        <TodoList />
      </div>
    </RecoilRoot>
  );
}

export default App;