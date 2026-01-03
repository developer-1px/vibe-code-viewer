/**
 * IDEScrollView - 선택된 파일들을 세로 스크롤로 한번에 볼 수 있는 뷰
 * Dead Code Panel에서 체크한 파일들을 나열해서 보여줌
 */

import React, { useMemo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectedDeadCodeItemsAtom, deadCodeResultsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import { fullNodeMapAtom, filesAtom } from '../../app/model/atoms';
import { getItemKey } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/categoryUtils';
import FileSection from './ui/FileSection';
import FileNavPanel from './ui/FileNavPanel';
import { useScrollNavigation } from './lib/useScrollNavigation';
import type { DeadCodeItem } from '../../shared/deadCodeAnalyzer';

const IDEScrollView = () => {
  const selectedItems = useAtomValue(selectedDeadCodeItemsAtom);
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const files = useAtomValue(filesAtom);

  // 스크롤 네비게이션 훅

  // 선택된 항목들에서 파일 경로 추출 및 정렬
  const selectedFilePaths = useMemo(() => {
    if (!deadCodeResults || selectedItems.size === 0) {
      return [];
    }

    // 모든 카테고리의 아이템을 하나의 배열로 합치기
    const allItems: DeadCodeItem[] = [
      ...deadCodeResults.unusedExports,
      ...deadCodeResults.unusedImports,
      ...deadCodeResults.deadFunctions,
      ...deadCodeResults.unusedVariables,
      ...deadCodeResults.unusedProps,
      ...deadCodeResults.unusedArguments,
    ];

    // 선택된 항목들만 필터링
    const selectedDeadCodeItems = allItems.filter(item =>
      selectedItems.has(getItemKey(item))
    );

    // 파일 경로 추출 및 중복 제거
    const filePathsSet = new Set<string>();
    selectedDeadCodeItems.forEach(item => {
      filePathsSet.add(item.filePath);
    });

    // 알파벳순 정렬
    return Array.from(filePathsSet).sort();
  }, [selectedItems, deadCodeResults]);

  // 각 파일에 대한 선택된 라인 번호 추출
  const selectedLinesByFile = useMemo(() => {
    if (!deadCodeResults || selectedItems.size === 0) {
      return new Map<string, Set<number>>();
    }

    const allItems: DeadCodeItem[] = [
      ...deadCodeResults.unusedExports,
      ...deadCodeResults.unusedImports,
      ...deadCodeResults.deadFunctions,
      ...deadCodeResults.unusedVariables,
      ...deadCodeResults.unusedProps,
      ...deadCodeResults.unusedArguments,
    ];

    const linesByFile = new Map<string, Set<number>>();

    allItems
      .filter(item => selectedItems.has(getItemKey(item)))
      .forEach(item => {
        if (!linesByFile.has(item.filePath)) {
          linesByFile.set(item.filePath, new Set<number>());
        }
        linesByFile.get(item.filePath)!.add(item.line);
      });

    return linesByFile;
  }, [selectedItems, deadCodeResults]);

  // useScrollNavigation 훅 사용
  const { currentFilePath, registerSection, scrollToFile } = useScrollNavigation(selectedFilePaths);

  // 선택된 항목이 없을 때
  if (selectedFilePaths.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-elevated text-text-tertiary">
        <p className="text-sm">Select dead code items to view files here</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-bg-elevated">
      {/* 좌측: 스크롤 가능한 파일 뷰 */}
      <div id="scroll-view-container" className="flex-1 overflow-y-auto">
        {selectedFilePaths.map((filePath) => {
          const node = fullNodeMap.get(filePath);
          if (!node) return null;

          const highlightedLines = selectedLinesByFile.get(filePath) || new Set<number>();

          return (
            <FileSection
              key={filePath}
              ref={(el) => registerSection(filePath, el)}
              node={node}
              files={files}
              highlightedLines={highlightedLines}
            />
          );
        })}
      </div>

      {/* 우측: 파일 네비게이션 패널 */}
      <FileNavPanel
        filePaths={selectedFilePaths}
        currentFilePath={currentFilePath}
        onFileClick={scrollToFile}
      />
    </div>
  );
};

export default IDEScrollView;
