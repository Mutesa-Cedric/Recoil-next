/**
 * ID generators and key types.
 */

export type NodeKey = string;
export type StateID = number & { readonly __state: unique symbol };
export type StoreID = number & { readonly __store: unique symbol };
export type ComponentID = number & { readonly __component: unique symbol };

let nextTreeStateVersion = 0;
export const getNextTreeStateVersion = (): StateID => (nextTreeStateVersion++ as StateID);

let nextStoreID = 0;
export const getNextStoreID = (): StoreID => (nextStoreID++ as StoreID);

let nextComponentID = 0;
export const getNextComponentID = (): ComponentID => (nextComponentID++ as ComponentID); 