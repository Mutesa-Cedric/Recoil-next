/**
 * TypeScript port of useSelectionHooks.tsx
 * Recoil DevTools browser extension.
 */
import type {SetterOrUpdater} from 'recoil';

import {atom, useRecoilState} from 'recoil';

const FilterAtom = atom({
  key: 'filter-atom',
  default: '',
});

export const useFilter = (): [string, SetterOrUpdater<string>] => {
  return useRecoilState<string>(FilterAtom);
};

const SelectecTransactionAtom = atom({
  key: 'selected-tx',
  default: 0,
});

export const useSelectedTransaction = (): [number, SetterOrUpdater<number>] => {
  return useRecoilState<number>(SelectecTransactionAtom);
};
