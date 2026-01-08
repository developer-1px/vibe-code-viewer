/**
 * ContentSearch Atoms
 * State management for content search feature
 * Note: View visibility is controlled by viewModeAtom ('contentSearch')
 */

import { atom } from 'jotai';
import type { ContentSearchOptions, ContentSearchResult } from './types';

// Search query
export const contentSearchQueryAtom = atom<string>('');

// Search results
export const contentSearchResultsAtom = atom<ContentSearchResult[]>([]);

// Search options
export const contentSearchOptionsAtom = atom<ContentSearchOptions>({
  caseSensitive: false,
  useRegex: false,
  wholeWord: false,
});

// Loading state
export const contentSearchLoadingAtom = atom<boolean>(false);
