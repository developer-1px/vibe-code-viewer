/**
 * Get initial collapsed folders state
 * Root level folders are open, others are collapsed
 */
export function getInitialCollapsedFolders(files: Record<string, string>): Set<string> {
  const allFolders = new Set<string>();

  Object.keys(files).forEach((filePath) => {
    const parts = filePath.split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join('/');
      // 루트 레벨 폴더(depth 0)는 제외, 그 이하만 접어둠
      if (i > 0) {
        allFolders.add(folderPath);
      }
    }
  });

  return allFolders;
}
