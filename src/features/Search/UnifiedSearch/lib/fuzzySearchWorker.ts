/**
 * Fuzzy Search Web Worker
 * Performs expensive fuzzy matching in background thread
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import { getFileName } from '../../../shared/pathUtils';

// Worker용 경량 검색 아이템 (검색에 필요한 최소한의 정보만)
export interface SearchItem {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'symbol';
  filePath: string; // For file filtering
}

export interface FuzzyMatch {
  key: string;
  indices: number[][];
}

export interface FuzzySearchRequest {
  type: 'search';
  query: string;
  items: SearchItem[];
}

export interface FuzzySearchResponse {
  type: 'results';
  results: Array<{ id: string; matches?: FuzzyMatch[] }>;
}

// Fuse.js configuration for fuzzy search (name only)
// More strict settings to avoid results too different from query
const fuseOptions: IFuseOptions<SearchItem> = {
  keys: ['name'],           // Only search by name
  threshold: 0.2,           // Much stricter (0.4 → 0.2)
  location: 0,              // Search from the beginning of the string
  distance: 30,             // Shorter distance (100 → 30)
  minMatchCharLength: 2,    // Require at least 2 char matches (1 → 2)
  includeScore: true,       // Include match score in results
  includeMatches: true,     // Include match indices for highlighting
  useExtendedSearch: false, // Disable extended search syntax
  ignoreLocation: false,    // Give priority to matches at the start
  ignoreFieldNorm: false,   // Consider field length in scoring
  fieldNormWeight: 1.0,     // Prefer shorter names
  findAllMatches: false,    // Only find best matches
};

// Handle messages from main thread
self.onmessage = (event: MessageEvent<FuzzySearchRequest>) => {
  const { type, query, items } = event.data;

  if (type !== 'search') return;

  // Empty query returns empty results (main thread handles this)
  if (!query.trim()) {
    const response: FuzzySearchResponse = {
      type: 'results',
      results: [],
    };
    self.postMessage(response);
    return;
  }

  // Parse query: support "symbol/file" or "symbol file" syntax
  const parts = query.split(/[\/\s]+/).filter(p => p.trim());
  const symbolQuery = parts[0] || query;
  const fileFilter = parts[1] || null;

  // Apply file filter if specified
  let filteredItems = items;
  if (fileFilter) {
    const lowerFileFilter = fileFilter.toLowerCase();
    filteredItems = filteredItems.filter(item => {
      // Extract filename from path and check
      const fileName = getFileName(item.filePath).toLowerCase();
      return fileName.includes(lowerFileFilter);
    });
  }

  // Create Fuse instance and search with symbol query only
  const fuse = new Fuse(filteredItems, fuseOptions);
  const fuseResults = fuse.search(symbolQuery);

  // Extract only IDs and match indices (Main thread will fetch full data)
  // Use Fuse.js ordering as-is
  const results = fuseResults.map(result => {
    const matches: FuzzyMatch[] = result.matches?.map(match => ({
      key: match.key || '',
      indices: [...match.indices] // Copy to make mutable
    })) || [];

    return {
      id: result.item.id,
      matches: matches.length > 0 ? matches : undefined
    };
  });

  // Send results back to main thread
  const response: FuzzySearchResponse = {
    type: 'results',
    results,
  };
  self.postMessage(response);
};
