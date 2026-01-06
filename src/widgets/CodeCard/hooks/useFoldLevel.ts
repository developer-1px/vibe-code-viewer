/**
 * useFoldLevel Hook
 * Code Folding 레벨 계산 및 토글 로직
 *
 * 복잡한 Fold Level 계산 로직을 Custom Hook으로 분리하여
 * CodeCardHeader의 복잡도를 낮춥니다.
 */

import { useAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import { getFoldableLinesByMaxDepth, getFoldableLinesExcludingDepth } from '@/features/Code/CodeFold/lib/foldUtils';
import { foldedLinesAtom } from '@/features/Code/CodeFold/model/atoms';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import type { CodeLine } from '../../../entities/CodeLine/model/types';

export type FoldLevel = 0 | 1 | 2;

export interface UseFoldLevelReturn {
  /** 현재 Fold 레벨 (0: import만, 1: compact, 2: minimal) */
  currentLevel: FoldLevel;
  /** Fold 레벨 토글 함수 (2 → 1 → 0 → 2 순환) */
  toggleLevel: (e: React.MouseEvent) => void;
  /** Fold 기능 사용 가능 여부 */
  canFold: boolean;
}

/**
 * Code Folding 레벨 관리 Hook
 *
 * @param node - CanvasNode
 * @param processedLines - 처리된 코드 라인 목록
 * @returns Fold 레벨 및 토글 함수
 *
 * @example
 * const { currentLevel, toggleLevel, canFold } = useFoldLevel(node, processedLines);
 *
 * // Fold 버튼에서 사용
 * <button onClick={toggleLevel} disabled={!canFold}>
 *   {currentLevel === 2 ? 'Minimal' : currentLevel === 1 ? 'Compact' : 'Maximize'}
 * </button>
 */
export function useFoldLevel(node: CanvasNode, processedLines: CodeLine[]): UseFoldLevelReturn {
  const [foldedLinesMap, setFoldedLinesMap] = useAtom(foldedLinesAtom);

  // 현재 노드의 접힌 라인들
  const foldedLines = foldedLinesMap.get(node.id) || new Set<number>();

  // Fold 가능 여부 (코드가 있어야 함)
  const canFold = processedLines.length > 0;

  /**
   * 현재 Fold 레벨 계산
   *
   * Level 2 (Minimal): 모든 foldable 라인이 접혀있음
   * Level 1 (Compact): depth 2를 제외한 모든 라인이 접혀있음
   * Level 0 (Maximize): depth 1 (import)만 접혀있음
   */
  const currentLevel = useMemo((): FoldLevel => {
    if (!canFold) return 0;

    // 각 depth별 foldable 라인 추출
    const allFoldableLines = getFoldableLinesByMaxDepth(processedLines, 999);
    const depth1Lines = getFoldableLinesByMaxDepth(processedLines, 1); // import only
    const depth2ExcludedLines = getFoldableLinesExcludingDepth(processedLines, 2);

    // 실제로 접혀있는 라인 수 계산
    const allFoldedCount = allFoldableLines.filter((line) => foldedLines.has(line)).length;
    const depth1FoldedCount = depth1Lines.filter((line) => foldedLines.has(line)).length;
    const depth2ExcludedFoldedCount = depth2ExcludedLines.filter((line) => foldedLines.has(line)).length;

    console.log(
      `[${node.label}] Fold counts:`,
      `all: ${allFoldedCount}/${allFoldableLines.length},`,
      `depth1: ${depth1FoldedCount}/${depth1Lines.length},`,
      `excludeDepth2: ${depth2ExcludedFoldedCount}/${depth2ExcludedLines.length}`
    );

    // Level 2 (Minimal): 모든 foldable 라인이 접혀있음
    if (allFoldedCount === allFoldableLines.length && allFoldableLines.length > 0) {
      return 2;
    }

    // Level 1 (Compact): depth 2를 제외한 모든 라인이 접혀있음
    if (depth2ExcludedFoldedCount === depth2ExcludedLines.length && depth2ExcludedLines.length > 0) {
      return 1;
    }

    // Level 0 (Maximize): depth 1 (import)만 접혀있음
    if (depth1FoldedCount === depth1Lines.length && depth1Lines.length > 0 && allFoldedCount === depth1FoldedCount) {
      return 0;
    }

    // 부분적으로 접힘 - 기본값 0
    return 0;
  }, [processedLines, foldedLines, node.label, canFold]);

  /**
   * Fold 레벨 토글 (순환: 2 → 1 → 0 → 2)
   *
   * Level 0 (Maximize): import만 접기
   * Level 1 (Compact): depth 2만 펼치고 나머지 접기
   * Level 2 (Minimal): 모든 foldable 라인 접기
   */
  const toggleLevel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canFold) return;

      // 다음 레벨 계산 (순환)
      const nextLevel = currentLevel === 2 ? 1 : currentLevel === 1 ? 0 : 2;
      console.log(`[${node.label}] Cycling fold level: ${currentLevel} → ${nextLevel}`);

      setFoldedLinesMap((prev) => {
        const next = new Map(prev);

        if (nextLevel === 0) {
          // Level 0 (Maximize): import만 접기
          const linesToFold = getFoldableLinesByMaxDepth(processedLines, 1);
          console.log(`[${node.label}] Level 0: Fold imports only:`, linesToFold);
          const nodeFolds = new Set<number>();
          linesToFold.forEach((lineNum) => nodeFolds.add(lineNum));
          next.set(node.id, nodeFolds);
        } else if (nextLevel === 1) {
          // Level 1 (Compact): depth 2만 펼치고 나머지 접기
          const linesToFold = getFoldableLinesExcludingDepth(processedLines, 2);
          console.log(`[${node.label}] Level 1: Fold all except depth 2:`, linesToFold);
          const nodeFolds = new Set<number>();
          linesToFold.forEach((lineNum) => nodeFolds.add(lineNum));
          next.set(node.id, nodeFolds);
        } else if (nextLevel === 2) {
          // Level 2 (Minimal): 모든 foldable 라인 접기
          const linesToFold = getFoldableLinesByMaxDepth(processedLines, 999);
          console.log(`[${node.label}] Level 2: Fold all:`, linesToFold);
          const nodeFolds = new Set<number>();
          linesToFold.forEach((lineNum) => nodeFolds.add(lineNum));
          next.set(node.id, nodeFolds);
        }

        console.log(`[${node.label}] New fold state size:`, next.get(node.id)?.size);
        return next;
      });
    },
    [currentLevel, canFold, node.id, node.label, processedLines, setFoldedLinesMap]
  );

  return {
    currentLevel,
    toggleLevel,
    canFold,
  };
}
