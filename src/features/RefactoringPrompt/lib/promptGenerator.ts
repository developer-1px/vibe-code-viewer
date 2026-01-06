/**
 * Prompt Generator for AI Refactoring
 * 선택된 dead code items를 기반으로 AI에게 보낼 프롬프트를 자동 생성합니다
 */

import type { DeadCodeItem, DeadCodeResults } from '../../Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';

export interface RefactoringPrompt {
  prompt: string;
  itemCount: number;
  categories: {
    unusedExports: number;
    unusedImports: number;
    deadFunctions: number;
    unusedVariables: number;
  };
}

/**
 * Generate AI refactoring prompt from selected dead code items
 */
export function generateRefactoringPrompt(
  selectedItemKeys: Set<string>,
  deadCodeResults: DeadCodeResults
): RefactoringPrompt {
  // Parse selected items
  const selectedItems: DeadCodeItem[] = [];
  const categories = {
    unusedExports: 0,
    unusedImports: 0,
    deadFunctions: 0,
    unusedVariables: 0,
  };

  // Collect selected items from all categories
  [
    ...deadCodeResults.unusedExports,
    ...deadCodeResults.unusedImports,
    ...deadCodeResults.deadFunctions,
    ...deadCodeResults.unusedVariables,
  ].forEach((item) => {
    const key = `${item.filePath}:${item.line}:${item.symbolName}`;
    if (selectedItemKeys.has(key)) {
      selectedItems.push(item);
      categories[item.category]++;
    }
  });

  // Sort items by file path and line number
  selectedItems.sort((a, b) => {
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    return a.line - b.line;
  });

  // Generate prompt
  const promptLines: string[] = [];

  promptLines.push('다음 Dead Code들을 리팩토링해주세요:');
  promptLines.push('');

  // Each item in one line: @filepath:lineNo `symbolName`
  selectedItems.forEach((item) => {
    promptLines.push(`@${item.filePath}:${item.line} \`${item.symbolName}\``);
  });

  promptLines.push('');
  promptLines.push('위 항목들을 제거하거나 리팩토링해주세요.');
  promptLines.push('코드가 깨지지 않도록 주의해서 작업해주세요.');

  return {
    prompt: promptLines.join('\n'),
    itemCount: selectedItems.length,
    categories,
  };
}
