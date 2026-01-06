/**
 * UnifiedSearch - Type Definitions
 */

// Search result item
export interface SearchResult {
  id: string;
  type: 'file' | 'folder' | 'symbol';
  name: string;
  filePath: string;
  nodeType?: string; // For symbols: 'pure-function', 'state-ref', etc.
  nodeId?: string; // For navigation
  lineNumber?: number;
  score: number;
  matchType?: 'fuzzy'; // Match type for visual indication (always fuzzy)
  matches?: Array<{
    // Fuzzy match indices for highlighting
    key: string; // Which field matched (name, filePath, etc.)
    indices: number[][]; // [start, end] pairs for highlighting
  }>;
  // Enriched metadata
  typeInfo?: string; // TypeScript type information from Language Service
  codeSnippet?: string; // First line of code snippet
  usageCount?: number; // Number of places this symbol is used
  isExported?: boolean; // Whether symbol is exported
}

// Search mode
export type SearchMode = 'all' | 'files' | 'symbols';
