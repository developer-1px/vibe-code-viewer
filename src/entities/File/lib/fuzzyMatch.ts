/**
 * Fuzzy matching utilities for file search
 */

/**
 * Fuzzy match - checks if query characters appear in order in text
 */
export const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
};

/**
 * Get indices of fuzzy matched characters for highlighting
 */
export const getFuzzyMatchIndices = (text: string, query: string): number[] => {
  if (!query.trim()) return [];

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const indices: number[] = [];

  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      indices.push(i);
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length ? indices : [];
};

/**
 * Split file path into name and folder
 */
export const splitFilePath = (filePath: string) => {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) {
    return { name: filePath, folder: '' };
  }
  return {
    name: filePath.slice(lastSlash + 1),
    folder: filePath.slice(0, lastSlash)
  };
};
