/**
 * DeadCodeAnalyzer - Atoms
 */
import { atom } from 'jotai';
import type { DeadCodeResults } from '../../../../../shared/deadCodeAnalyzer.ts';
import type { CategoryState } from './types.ts';

// ============================================================================
// Analysis State
// ============================================================================

// 분석 중 상태
export const isAnalyzingAtom = atom(false);

// 분석 결과
export const deadCodeResultsAtom = atom<DeadCodeResults | null>(null);

// ============================================================================
// UI State
// ============================================================================

// 카테고리 펼침/접힘 상태 (기본: 모두 접힘)
export const expandedCategoriesAtom = atom<CategoryState>({
  unusedExports: false,
  unusedImports: false,
  deadFunctions: false,
  unusedVariables: false,
  unusedProps: false,
  unusedArguments: false,
});

// 폴더 접힘 상태
export const collapsedFoldersAtom = atom<Set<string>>(new Set());

// 키보드 네비게이션 포커스 인덱스
export const focusedIndexAtom = atom(0);

// ============================================================================
// Selection State
// ============================================================================

// 선택된 dead code 항목들 (filePath:line:symbolName)
export const selectedDeadCodeItemsAtom = atom(new Set<string>());
