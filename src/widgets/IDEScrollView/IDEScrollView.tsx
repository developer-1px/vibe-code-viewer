/**
 * IDEScrollView - 파일들을 세로 스크롤로 한번에 볼 수 있는 통합 뷰
 *
 * 두 가지 모드 지원:
 * 1. Dead Code 모드: Dead Code Panel에서 선택한 파일들 표시
 * 2. Tabs 모드: 열린 탭들의 파일 표시 (IDEView 대체)
 */

import React, { useMemo, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { selectedDeadCodeItemsAtom, deadCodeResultsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import { openedTabsAtom, activeTabAtom } from '@/features/File/OpenFiles/model/atoms';
import { fullNodeMapAtom, filesAtom } from '../../app/model/atoms';
import { getItemKey } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/categoryUtils';
import FileSection from './ui/FileSection';
import { Sidebar } from '../../components/ide/Sidebar';
import { getFileName } from '../../shared/pathUtils';
import { getFileIcon } from '../FileExplorer/lib/getFileIcon';
import { useScrollNavigation } from './lib/useScrollNavigation';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import type { DeadCodeItem } from '../../shared/deadCodeAnalyzer';
import { hoveredFilePathAtom } from './model/atoms';

const IDEScrollView = () => {
  const selectedItems = useAtomValue(selectedDeadCodeItemsAtom);
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const openedTabs = useAtomValue(openedTabsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const files = useAtomValue(filesAtom);
  const hoveredFilePath = useAtomValue(hoveredFilePathAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const { openFile } = useOpenFile();

  // 모드 결정: Dead Code 선택이 있으면 Dead Code 모드, 없으면 Tabs 모드
  const isDeadCodeMode = selectedItems.size > 0 && deadCodeResults;

  // 표시할 파일 경로 결정 (Dead Code 모드 또는 Tabs 모드)
  const displayFilePaths = useMemo(() => {
    if (isDeadCodeMode) {
      // Dead Code 모드: 선택된 항목들에서 파일 경로 추출
      const allItems: DeadCodeItem[] = [
        ...deadCodeResults!.unusedExports,
        ...deadCodeResults!.unusedImports,
        ...deadCodeResults!.deadFunctions,
        ...deadCodeResults!.unusedVariables,
        ...deadCodeResults!.unusedProps,
        ...deadCodeResults!.unusedArguments,
      ];

      const selectedDeadCodeItems = allItems.filter(item =>
        selectedItems.has(getItemKey(item))
      );

      const filePathsSet = new Set<string>();
      selectedDeadCodeItems.forEach(item => {
        filePathsSet.add(item.filePath);
      });

      return Array.from(filePathsSet).sort();
    } else {
      // Tabs 모드: 열린 탭들의 파일 경로 (IDEView 대체)
      return openedTabs;
    }
  }, [isDeadCodeMode, selectedItems, deadCodeResults, openedTabs]);

  // 각 파일에 대한 하이라이트할 라인 번호 추출 (Dead Code 모드에서만)
  const highlightedLinesByFile = useMemo(() => {
    if (!isDeadCodeMode) {
      // Tabs 모드: 하이라이트 없음
      return new Map<string, Set<number>>();
    }

    // Dead Code 모드: 선택된 항목의 라인 번호
    const allItems: DeadCodeItem[] = [
      ...deadCodeResults!.unusedExports,
      ...deadCodeResults!.unusedImports,
      ...deadCodeResults!.deadFunctions,
      ...deadCodeResults!.unusedVariables,
      ...deadCodeResults!.unusedProps,
      ...deadCodeResults!.unusedArguments,
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
  }, [isDeadCodeMode, selectedItems, deadCodeResults]);

  // useScrollNavigation 훅 사용
  const { currentFilePath, registerSection, scrollToFile } = useScrollNavigation(displayFilePaths);

  // activeTab 변경 감지 - 파일 열 때 자동 스크롤
  useEffect(() => {
    if (activeTab && displayFilePaths.includes(activeTab)) {
      scrollToFile(activeTab);
    }
  }, [activeTab, scrollToFile, displayFilePaths]);

  // 표시할 파일이 없을 때
  if (displayFilePaths.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-elevated text-text-tertiary">
        <p className="text-sm">
          {isDeadCodeMode
            ? 'Select dead code items to view files here'
            : 'No files open. Use search (Shift+Shift) or click a file in the sidebar to open.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-bg-elevated">
      {/* 좌측: 스크롤 가능한 파일 뷰 */}
      <div id="scroll-view-container" className="flex-1 overflow-y-auto">
        {displayFilePaths.map((filePath) => {
          const node = fullNodeMap.get(filePath);
          if (!node) return null;

          const highlightedLines = highlightedLinesByFile.get(filePath) || new Set<number>();

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

      {/* 우측: 파일 네비게이션 사이드바 */}
      <Sidebar side="right" resizable defaultWidth={192} minWidth={150} maxWidth={400}>
        <Sidebar.Header>
          <span className="text-xs font-medium text-text-secondary">Files ({displayFilePaths.length})</span>
        </Sidebar.Header>
        <div className="flex flex-col overflow-y-auto">
          {displayFilePaths.map((filePath) => {
            const fileName = getFileName(filePath);
            const isActive = filePath === currentFilePath || filePath === hoveredFilePath;
            const FileIconComponent = getFileIcon(fileName);

            return (
              <button
                key={filePath}
                onClick={() => openFile(filePath)}
                className={`
                  flex items-center gap-2 px-3 py-2 text-left transition-colors
                  hover:bg-bg-hover
                  ${isActive ? 'bg-warm-500/10 border-l-2 border-warm-300' : 'border-l-2 border-transparent'}
                `}
              >
                <FileIconComponent
                  size={12}
                  className={`shrink-0 ${isActive ? 'text-warm-300' : 'text-text-tertiary'}`}
                />
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs truncate ${
                      isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {fileName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Sidebar>
    </div>
  );
};

export default IDEScrollView;
