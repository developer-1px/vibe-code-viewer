/**
 * ContentSearch Types
 * Types for file content search results
 */

export interface ContentSearchResult {
  filePath: string;
  fileName: string;
  matches: ContentMatch[];
  totalMatches: number;
}

export interface ContentMatch {
  line: number;
  column: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

export interface ContentSearchOptions {
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
}
