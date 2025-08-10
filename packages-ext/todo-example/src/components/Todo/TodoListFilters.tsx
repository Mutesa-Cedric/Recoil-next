// TypeScript port of TodoListFilters.jsx

import { todoListFilterState } from './Todo_state';
import { TodoFilterType } from './Todo_types';
import React, { ChangeEvent } from 'react';
import { useRecoilState } from 'recoil-next';

export const TodoListFilters: React.FC = () => {
  const [filter, setFilter] = useRecoilState(todoListFilterState);

  const updateFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setFilter(value as TodoFilterType);
  };

  return (
    <>
      Filter:
      <select value={filter} onChange={updateFilter}>
        <option value="Show All">All</option>
        <option value="Show Completed">Completed</option>
        <option value="Show Uncompleted">Uncompleted</option>
      </select>
    </>
  );
};