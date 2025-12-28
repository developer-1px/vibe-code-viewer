
import { atom } from 'jotai';
import type { VariableNode, GraphData } from '../entities/VariableNode';
import type { CanvasNode } from '../entities/CanvasNode';
import { DEFAULT_FILES, DEFAULT_ENTRY_FILE } from '../constants';

// File management atoms
export const filesAtom = atom<Record<string, string>>(DEFAULT_FILES);
export const activeFileAtom = atom<string>(DEFAULT_ENTRY_FILE);
export const entryFileAtom = atom<string>(DEFAULT_ENTRY_FILE);
export const isSidebarOpenAtom = atom<boolean>(true);

// Graph data atom (parsed project data)
export const graphDataAtom = atom(null as GraphData | null);
export const parseErrorAtom = atom(null as string | null);

// Canvas layout atoms (write-only from PipelineCanvas)
export const layoutNodesAtom = atom([] as CanvasNode[]);
export const layoutLinksAtom = atom([] as {source: string, target: string}[]);
export const fullNodeMapAtom = atom(new Map<string, VariableNode>());
export const templateRootIdAtom = atom(null as string | null);

// Canvas transform atom (from useD3Zoom)
export const transformAtom = atom({ k: 1, x: 0, y: 0 });

// Visibility and navigation atoms (read-write)
export const visibleNodeIdsAtom = atom(new Set<string>());
export const lastExpandedIdAtom = atom(null as string | null);

// File Explorer atoms
export const fileSearchQueryAtom = atom('');
export const focusedFileIndexAtom = atom(0);
