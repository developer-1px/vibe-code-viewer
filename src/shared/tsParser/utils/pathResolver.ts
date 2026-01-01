/**
 * 경로 해결 유틸리티
 *
 * Import 경로를 실제 파일 경로로 해결
 */

/**
 * Import 경로를 실제 파일 경로로 해결
 */
export function resolvePath(
  currentFile: string,
  importPath: string,
  files: Record<string, string>
): string | null {
  // 1. Alias 처리
  let resolvedPath = importPath;

  // @/ → src/
  if (importPath.startsWith('@/')) {
    resolvedPath = importPath.replace('@/', 'src/');
  }

  // ~/ → src/
  if (importPath.startsWith('~/')) {
    resolvedPath = importPath.replace('~/', 'src/');
  }

  // ~~/ → src/
  if (importPath.startsWith('~~/')) {
    resolvedPath = importPath.replace('~~/', 'src/');
  }

  // 2. 상대 경로 처리
  if (importPath.startsWith('.')) {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    resolvedPath = resolveRelativePath(currentDir, importPath);
  }

  // 3. node_modules 경로는 null (외부 모듈)
  if (!resolvedPath.startsWith('src/') && !resolvedPath.startsWith('examples/')) {
    return null;
  }

  // 4. 파일 확장자 추가 시도
  const resolved = findFileWithExtension(resolvedPath, files);

  return resolved;
}

/**
 * 상대 경로 해결
 */
function resolveRelativePath(currentDir: string, relativePath: string): string {
  const parts = currentDir.split('/').filter((p) => p !== '');
  const importParts = relativePath.split('/').filter((p) => p !== '');

  for (const part of importParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  return parts.join('/');
}

/**
 * 확장자를 추가하여 파일 찾기
 */
function findFileWithExtension(
  basePath: string,
  files: Record<string, string>
): string | null {
  // 정확한 파일이 있으면 그대로 반환
  if (files[basePath]) {
    return basePath;
  }

  // 확장자 시도
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const withExt = basePath + ext;
    if (files[withExt]) {
      return withExt;
    }
  }

  // index 파일 시도
  const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  for (const ext of indexExtensions) {
    const withIndex = basePath + ext;
    if (files[withIndex]) {
      return withIndex;
    }
  }

  // 파일명 fallback (파일명만으로 검색)
  const fileName = basePath.split('/').pop();
  if (fileName) {
    for (const filePath of Object.keys(files)) {
      if (filePath.endsWith(`/${fileName}`)) {
        return filePath;
      }
    }
  }

  return null;
}
