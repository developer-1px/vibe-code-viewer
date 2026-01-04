/**
 * CodeDocView - 주석 기반 문서 뷰
 * 주석을 본문으로, 코드를 스니펫으로 변환한 읽기 전용 문서
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import { openedTabsAtom } from '@/features/File/OpenFiles/model/atoms';
import { fullNodeMapAtom, documentModeAtom } from '../../app/model/atoms';
import { Sidebar } from '../../components/ide/Sidebar';
import { getFileName } from '../../shared/pathUtils';
import { getFileIcon } from '../FileExplorer/lib/getFileIcon';
import CodeDocFileSection from './ui/CodeDocFileSection';

const CodeDocView = () => {
  const openedTabs = useAtomValue(openedTabsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const documentMode = useAtomValue(documentModeAtom);

  // 표시할 파일이 없을 때
  if (openedTabs.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-elevated text-text-tertiary">
        <p className="text-sm">
          No files open. Use search (Shift+Shift) or click a file in the sidebar to open.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-bg-elevated">
      {/* 좌측: 스크롤 가능한 문서 뷰 */}
      <div
        id="codedoc-view-container"
        className="flex-1 overflow-y-auto bg-bg-elevated"
        data-doc-mode={documentMode}
      >
        <div className="max-w-4xl mx-auto py-8">
          {openedTabs.map((filePath) => {
            const node = fullNodeMap.get(filePath);
            if (!node) return null;

            return (
              <CodeDocFileSection
                key={filePath}
                node={node}
              />
            );
          })}
        </div>
      </div>

      {/* 우측: 파일 네비게이션 사이드바 */}
      <Sidebar side="right" resizable defaultWidth={192} minWidth={150} maxWidth={400}>
        <Sidebar.Header>
          <span className="text-xs font-medium text-text-secondary">Documents ({openedTabs.length})</span>
        </Sidebar.Header>
        <div className="flex flex-col overflow-y-auto">
          {openedTabs.map((filePath) => {
            const fileName = getFileName(filePath);
            const FileIconComponent = getFileIcon(fileName);

            return (
              <div
                key={filePath}
                className="flex items-center gap-2 px-3 py-2 border-l-2 border-transparent"
              >
                <FileIconComponent
                  size={12}
                  className="shrink-0 text-text-tertiary"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs truncate text-text-secondary">
                    {fileName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Sidebar>
    </div>
  );
};

export default CodeDocView;
