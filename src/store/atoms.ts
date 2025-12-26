import { atom } from 'jotai';
import type { VariableNode } from '../entities/VariableNode';
import type { CanvasNode } from '../entities/CanvasNode';
import { DEFAULT_FILES, DEFAULT_ENTRY_FILE } from '../constants';

// File management atoms
export const filesAtom = atom<Record<string, string>>(DEFAULT_FILES);
export const activeFileAtom = atom<string>(DEFAULT_ENTRY_FILE);
export const entryFileAtom = atom<string>(DEFAULT_ENTRY_FILE);
export const isSidebarOpenAtom = atom<boolean>(true);

// Canvas layout atoms (write-only from PipelineCanvas)
export const layoutNodesAtom = atom([] as CanvasNode[]);
export const fullNodeMapAtom = atom(new Map<string, VariableNode>());
export const templateRootIdAtom = atom(null as string | null);

// Visibility and navigation atoms (read-write)
export const visibleNodeIdsAtom = atom(new Set<string>());
export const lastExpandedIdAtom = atom(null as string | null);
