/**
 * CodeFold feature atoms
 */

import { atom } from 'jotai';

// Code Fold atoms - Map<nodeId, Set<lineNumber>>
export const foldedLinesAtom = atom(new Map<string, Set<number>>());
