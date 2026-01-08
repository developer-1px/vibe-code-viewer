/**
 * Content Search Logic
 * Grep-style search across all files
 */

import { getFileName } from '../../../../shared/pathUtils';
import type { ContentMatch, ContentSearchOptions, ContentSearchResult } from '../model/types';

const MAX_MATCHES_PER_FILE = 100;
const MAX_TOTAL_RESULTS = 500;

/**
 * Search for query in all files
 */
export function searchInContent(
  files: Record<string, string>,
  query: string,
  options: ContentSearchOptions
): ContentSearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const results: ContentSearchResult[] = [];
  let totalResultCount = 0;

  for (const [filePath, content] of Object.entries(files)) {
    if (totalResultCount >= MAX_TOTAL_RESULTS) {
      break;
    }

    const matches = searchInFile(content, query, options);

    if (matches.length > 0) {
      results.push({
        filePath,
        fileName: getFileName(filePath),
        matches: matches.slice(0, MAX_MATCHES_PER_FILE),
        totalMatches: matches.length,
      });
      totalResultCount += matches.length;
    }
  }

  return results;
}

/**
 * Search for query in a single file
 */
function searchInFile(content: string, query: string, options: ContentSearchOptions): ContentMatch[] {
  const matches: ContentMatch[] = [];
  const lines = content.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineText = lines[lineIndex];
    const lineMatches = findMatchesInLine(lineText, query, lineIndex + 1, options);
    matches.push(...lineMatches);
  }

  return matches;
}

/**
 * Find all matches in a single line
 */
function findMatchesInLine(
  lineText: string,
  query: string,
  lineNumber: number,
  options: ContentSearchOptions
): ContentMatch[] {
  const matches: ContentMatch[] = [];

  if (options.useRegex) {
    // Regex search
    try {
      const flags = options.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(query, flags);
      let match: RegExpExecArray | null = regex.exec(lineText);

      while (match !== null) {
        matches.push({
          line: lineNumber,
          column: match.index + 1,
          text: lineText,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        });
        match = regex.exec(lineText);
      }
    } catch (_e) {
      // Invalid regex, skip
      return [];
    }
  } else {
    // Plain text search
    const searchText = options.caseSensitive ? lineText : lineText.toLowerCase();
    const searchQuery = options.caseSensitive ? query : query.toLowerCase();

    if (options.wholeWord) {
      // Whole word search
      const wordRegex = new RegExp(`\\b${escapeRegex(searchQuery)}\\b`, options.caseSensitive ? 'g' : 'gi');
      let match: RegExpExecArray | null = wordRegex.exec(lineText);

      while (match !== null) {
        matches.push({
          line: lineNumber,
          column: match.index + 1,
          text: lineText,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        });
        match = wordRegex.exec(lineText);
      }
    } else {
      // Plain substring search
      let startIndex = 0;
      let matchIndex = searchText.indexOf(searchQuery, startIndex);

      while (matchIndex !== -1) {
        matches.push({
          line: lineNumber,
          column: matchIndex + 1,
          text: lineText,
          matchStart: matchIndex,
          matchEnd: matchIndex + searchQuery.length,
        });
        startIndex = matchIndex + 1;
        matchIndex = searchText.indexOf(searchQuery, startIndex);
      }
    }
  }

  return matches;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
