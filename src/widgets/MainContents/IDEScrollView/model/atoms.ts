/**
 * IDE Scroll View State
 * Tracks hovered file for right panel highlighting
 */

import { atom } from 'jotai';

/**
 * Currently hovered file path (via mouse hover)
 * Used to highlight the corresponding file in the right panel
 */
export const hoveredFilePathAtom = atom<string | null>(null);
// IDE 모드에서 현재 포커스된 노드 ID
export const focusedNodeIdAtom = atom<string | null>(null);
