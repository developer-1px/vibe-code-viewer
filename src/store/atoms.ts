import { atom } from 'jotai';
import { CanvasNode, VariableNode } from '../entities/VariableNode';

// Canvas layout atoms (write-only from PipelineCanvas)
export const layoutNodesAtom = atom<CanvasNode[]>([]);
export const fullNodeMapAtom = atom<Map<string, VariableNode>>(new Map());
export const entryFileAtom = atom('');
export const templateRootIdAtom = atom<string | null>(null);

// Visibility and navigation atoms (read-write)
export const visibleNodeIdsAtom = atom<Set<string>>(new Set());
export const lastExpandedIdAtom = atom<string | null>(null);
