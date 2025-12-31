/**
 * Search Service - Fuzzy search with Web Worker
 * Performs fuzzy matching in background thread for performance
 */

import type { SearchResult } from '../model/types';
import type { FuzzySearchRequest, FuzzySearchResponse } from './fuzzySearchWorker';

// Lazy-load Web Worker
let fuzzyWorker: Worker | null = null;

function getFuzzyWorker(): Worker {
  if (!fuzzyWorker) {
    fuzzyWorker = new Worker(
      new URL('./fuzzySearchWorker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return fuzzyWorker;
}

/**
 * Perform fuzzy search in Web Worker (background thread)
 * Returns a Promise that resolves with fuzzy search results
 *
 * Worker receives lightweight data (id, name, type) and returns IDs + matches
 * Main thread merges with original data to preserve all fields (codeSnippet, etc.)
 */
export function searchResultsFuzzy(
  query: string,
  allResults: SearchResult[],
): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    // Empty query returns empty results immediately
    if (!query.trim()) {
      resolve([]);
      return;
    }

    // Create lookup map for fast access to original data
    const resultMap = new Map(allResults.map(item => [item.id, item]));

    // Send only lightweight data to worker (id, name, type, filePath)
    const lightweightItems = allResults.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      filePath: item.filePath
    }));

    const worker = getFuzzyWorker();

    // Listen for results from worker
    const handleMessage = (event: MessageEvent<FuzzySearchResponse>) => {
      if (event.data.type === 'results') {
        worker.removeEventListener('message', handleMessage);

        // Merge worker results (id + matches) with original data
        const results: SearchResult[] = event.data.results
          .map(workerResult => {
            const originalData = resultMap.get(workerResult.id);
            if (!originalData) return null;

            return {
              ...originalData,  // Full original data (includes codeSnippet!)
              score: 50,
              matchType: 'fuzzy' as const,
              matches: workerResult.matches,
            } as SearchResult;
          })
          .filter((item): item is SearchResult => item !== null);

        // Sort by type priority: file → export → definition → usage
        results.sort((a, b) => {
          // Get type priority (lower = higher priority)
          const getPriority = (item: SearchResult): number => {
            if (item.type === 'file' || item.type === 'folder') return 0; // file/folder first
            if (item.nodeType === 'usage') return 3; // usage last
            if (item.isExported) return 1; // exported symbols second
            return 2; // normal definitions third
          };

          const priorityA = getPriority(a);
          const priorityB = getPriority(b);

          // Primary sort: type priority
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // Secondary sort: keep Fuse.js order (already sorted by relevance)
          return 0;
        });

        resolve(results);
      }
    };

    worker.addEventListener('message', handleMessage);

    // Send search request to worker
    const request: FuzzySearchRequest = {
      type: 'search',
      query,
      items: lightweightItems,
    };

    worker.postMessage(request);
  });
}

/**
 * Cleanup worker on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (fuzzyWorker) {
      fuzzyWorker.terminate();
      fuzzyWorker = null;
    }
  });
}
