// --- Path Utilities ---

export const normalizePath = (path: string) => path.replace(/\\/g, '/');

export const resolvePath = (currentFile: string, importPath: string): string | null => {
  // Handle Alias (~~) - Common in Nuxt
  if (importPath.startsWith('~~/')) {
    return normalizePath(importPath.replace('~~/', 'src/'));
  }
  // Handle Alias (~)
  if (importPath.startsWith('~/')) {
    // Assume ~ maps to src/ (which we treat as root for simplicity in this flat map, or specifically to 'src/')
    return normalizePath(importPath.replace('~/', 'src/'));
  }
  if (importPath.startsWith('@/')) {
    return normalizePath(importPath.replace('@/', 'src/'));
  }

  // Handle Relative
  if (importPath.startsWith('.')) {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    const parts = currentDir.split('/').filter(Boolean);
    const importParts = importPath.split('/');

    for (const part of importParts) {
      if (part === '.') continue;
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    
    const resolved = parts.join('/');
    return resolved;
  }

  return importPath; // Absolute or External
};

export const findFileInProject = (files: Record<string, string>, resolvedPath: string): string | null => {
    // Try exact match
    if (files[resolvedPath]) return resolvedPath;
    // Try extensions
    if (files[resolvedPath + '.ts']) return resolvedPath + '.ts';
    if (files[resolvedPath + '.vue']) return resolvedPath + '.vue';
    if (files[resolvedPath + '.js']) return resolvedPath + '.js';
    // Try index
    if (files[resolvedPath + '/index.ts']) return resolvedPath + '/index.ts';

    return null;
};

/**
 * Fallback: Find file by filename when path resolution fails
 * Useful when alias configuration is unknown
 */
export const findFileByName = (files: Record<string, string>, importPath: string): string | null => {
    // Extract filename from import path
    // e.g., "@/components/Button.vue" -> "Button.vue"
    // e.g., "~/utils/helper" -> "helper"
    const pathParts = importPath.split('/');
    let fileName = pathParts[pathParts.length - 1];

    // If no extension, try common extensions
    const extensions = fileName.includes('.') ? [''] : ['.vue', '.ts', '.js'];

    for (const ext of extensions) {
        const searchName = fileName + ext;

        // Search through all files for matching filename
        const matchingFiles = Object.keys(files).filter(filePath => {
            const filePathParts = filePath.split('/');
            const actualFileName = filePathParts[filePathParts.length - 1];
            return actualFileName === searchName;
        });

        if (matchingFiles.length === 1) {
            // Exact single match found
            return matchingFiles[0];
        } else if (matchingFiles.length > 1) {
            // Multiple matches - try to pick the best one
            // Prefer files with shorter paths (likely closer to root)
            matchingFiles.sort((a, b) => a.length - b.length);
            console.warn(`Multiple files found for "${searchName}":`, matchingFiles, '- using first match:', matchingFiles[0]);
            return matchingFiles[0];
        }
    }

    return null;
};
