/**
 * Focus Mode - State Management
 * Local variable focus 상태 관리
 */

import { atom } from 'jotai';

/**
 * Active local variables per node
 * Map<nodeId, Set<variableName>>
 */
export const activeLocalVariablesAtom = atom<Map<string, Set<string>>>(new Map());
