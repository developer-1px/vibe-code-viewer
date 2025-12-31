/**
 * Search Service - Dual-mode search (basic + fuzzy)
 * Basic search executes immediately on main thread
 * Fuzzy search runs in Web Worker for performance
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
 * Calculate search score for a candidate string against a query
 * Higher score = better match
 */
function calculateScore(query: string, candidate: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();

  // Exact match (case-insensitive)
  if (lowerCandidate === lowerQuery) {
    return 100;
  }

  // Start match (case-insensitive)
  if (lowerCandidate.startsWith(lowerQuery)) {
    return 80;
  }

  // Camel case match (e.g., "uls" matches "useLocalStorage")
  if (matchesCamelCase(query, candidate)) {
    return 60;
  }

  // Substring match (case-insensitive)
  if (lowerCandidate.includes(lowerQuery)) {
    return 40;
  }

  // No match
  return 0;
}

/**
 * Check if query matches camel case acronym of candidate
 * e.g., "uls" matches "useLocalStorage"
 */
function matchesCamelCase(query: string, candidate: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Extract camel case capitals (and first letter)
  const acronym = candidate
    .split('')
    .filter((char, idx) => {
      // Include first character
      if (idx === 0) return true;
      // Include uppercase letters
      if (char === char.toUpperCase() && char !== char.toLowerCase()) return true;
      return false;
    })
    .join('')
    .toLowerCase();

  return acronym.startsWith(lowerQuery);
}

/**
 * Search through results and return scored, filtered, and sorted matches
 */
export function searchResults(
  query: string,
  allResults: SearchResult[],
  maxResults: number = 50
): SearchResult[] {
  // Empty query returns all results (limited)
  if (!query.trim()) {
    return allResults.slice(0, maxResults);
  }

  // Score all results
  const scored = allResults.map((result) => {
    // Score against name
    const nameScore = calculateScore(query, result.name);

    // Score against file path (for files/folders)
    const pathScore = (result.type === 'file' || result.type === 'folder')
      ? calculateScore(query, result.filePath)
      : 0;

    // Use the higher score
    const finalScore = Math.max(nameScore, pathScore);

    return {
      ...result,
      score: finalScore,
      matchType: 'basic' as const, // Mark as basic match
    };
  });

  // Filter by score > 0
  const filtered = scored.filter((result) => result.score > 0);

  // Sort by score (descending)
  filtered.sort((a, b) => {
    // Primary sort: score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary sort: name (alphabetical)
    return a.name.localeCompare(b.name);
  });

  // Limit results
  return filtered.slice(0, maxResults);
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
            };
          })
          .filter((item): item is SearchResult => item !== null);

        // Boost priority: files matching query without extension
        const queryLower = query.toLowerCase();
        results.sort((a, b) => {
          // Check if file name (without extension) matches query exactly
          const isFileA = a.type === 'file';
          const isFileB = b.type === 'file';

          if (isFileA) {
            const nameWithoutExt = a.name.replace(/\.[^/.]+$/, '').toLowerCase();
            const exactMatchA = nameWithoutExt === queryLower ? 1 : 0;

            if (isFileB) {
              const nameWithoutExtB = b.name.replace(/\.[^/.]+$/, '').toLowerCase();
              const exactMatchB = nameWithoutExtB === queryLower ? 1 : 0;

              // Both files: exact match first
              if (exactMatchA !== exactMatchB) return exactMatchB - exactMatchA;
            } else {
              // A is file, B is not: exact match file wins
              if (exactMatchA) return -1;
            }
          } else if (isFileB) {
            const nameWithoutExtB = b.name.replace(/\.[^/.]+$/, '').toLowerCase();
            const exactMatchB = nameWithoutExtB === queryLower ? 1 : 0;
            // B is file, A is not: exact match file wins
            if (exactMatchB) return 1;
          }

          // Keep Fuse.js order
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
