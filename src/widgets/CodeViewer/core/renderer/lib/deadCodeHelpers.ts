/**
 * Dead code 분석 헬퍼
 */

// Development mode flag (Vite injects this at build time)
const __DEV__ = import.meta.env.DEV;

interface DeadCodeResults {
  unusedImports: Array<{ filePath: string; symbolName: string; category?: string }>;
  unusedExports: Array<{ filePath: string; symbolName: string; category?: string }>;
  deadFunctions: Array<{ filePath: string; symbolName: string; category?: string }>;
  unusedVariables: Array<{ filePath: string; symbolName: string; category?: string }>;
}

/**
 * Dead identifiers 추출 (VSCode처럼 muted 처리할 대상)
 */
export const extractDeadIdentifiers = (
  deadCodeResults: DeadCodeResults | null | undefined,
  filePath: string
): Set<string> => {
  const deadIdentifiers = new Set<string>();

  if (!deadCodeResults) {
    return deadIdentifiers;
  }

  [
    ...deadCodeResults.unusedImports,
    ...deadCodeResults.unusedExports,
    ...deadCodeResults.deadFunctions,
    ...deadCodeResults.unusedVariables,
  ]
    .filter((item) => item.filePath === filePath)
    .forEach((item) => {
      deadIdentifiers.add(item.symbolName);
      if (__DEV__) {
        console.log(`[extractDeadIdentifiers] ${filePath} - DEAD: ${item.symbolName} (${item.category})`);
      }
    });

  if (__DEV__) {
    console.log(`[extractDeadIdentifiers] ${filePath} - Total dead identifiers:`, deadIdentifiers.size);
  }

  return deadIdentifiers;
};
