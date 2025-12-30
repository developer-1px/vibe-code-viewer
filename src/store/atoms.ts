
import { atom } from 'jotai';
import type { VariableNode, GraphData } from '../entities/SourceFileNode';
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
export const layoutTriggerAtom = atom(0); // 레이아웃 재계산 트리거 (숫자 증가)

// Canvas transform atom (from useD3Zoom)
export const transformAtom = atom({ k: 1, x: 0, y: 0 });

// Visibility and navigation atoms (read-write)
export const visibleNodeIdsAtom = atom(new Set<string>());
export const lastExpandedIdAtom = atom(null as string | null);

// Go to Definition - target line to highlight and scroll to
export const targetLineAtom = atom(null as { nodeId: string; lineNum: number } | null);

// File Explorer atoms
export const fileSearchQueryAtom = atom('');
export const focusedFileIndexAtom = atom(0);
export const collapsedFoldersAtom = atom(new Set<string>()); // 접힌 폴더들

// Unified Search atoms (Shift+Shift)
export interface SearchResult {
  id: string;
  type: 'file' | 'symbol';
  name: string;
  filePath: string;
  nodeType?: string; // For symbols: 'pure-function', 'state-ref', etc.
  nodeId?: string; // For navigation
  lineNumber?: number;
  score: number;
}

export const searchModalOpenAtom = atom(false);
export const searchQueryAtom = atom('');
export const searchResultsAtom = atom([] as SearchResult[]);
export const searchFocusedIndexAtom = atom(0);
export const searchModeAtom = atom<'all' | 'files' | 'symbols'>('all');

// Code Fold atoms - Re-export from feature
export { foldedLinesAtom } from '../features/CodeFold/model/atoms';

// Card Position atoms - Map<nodeId, {x: number, y: number}>
export const cardPositionsAtom = atom(new Map<string, {x: number, y: number}>());

// Focus Mode - Re-export from feature
export { activeLocalVariablesAtom } from '../features/FocusMode/model/atoms';

// Global Focus Management
export type FocusedPane = 'sidebar' | 'canvas' | 'search' | null;
export const focusedPaneAtom = atom<FocusedPane>('sidebar'); // Default to sidebar when it's open

