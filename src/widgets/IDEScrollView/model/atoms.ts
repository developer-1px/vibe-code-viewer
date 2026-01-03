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
