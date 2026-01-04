/**
 * CodeDocView - 주석 기반 문서 뷰 (완전 재작성)
 * sample/App.tsx 기반, 기존 tsParser 사용
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { openedTabsAtom, activeTabAtom } from '@/features/File/OpenFiles/model/atoms';
import { fullNodeMapAtom } from '../../app/model/atoms';
import { convertToDocData } from './lib/tsAdapter';
import { DocViewer } from './ui/DocViewer';
import type { DocData } from './model/types';

type LayoutMode = 'linear' | 'split';

const CodeDocView = () => {
  const openedTabs = useAtomValue(openedTabsAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('linear');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 열린 모든 탭의 DocData 생성
  const allDocData: Array<{ filePath: string; docData: DocData }> = useMemo(() => {
    return openedTabs
      .map((filePath) => {
        const node = fullNodeMap.get(filePath);
        if (!node) return null;

        try {
          return { filePath, docData: convertToDocData(node) };
        } catch (error) {
          console.error(`Failed to convert ${filePath} to DocData:`, error);
          return null;
        }
      })
      .filter((item): item is { filePath: string; docData: DocData } => item !== null);
  }, [openedTabs, fullNodeMap]);

  // ==========================================
  // UI 반응 로직: activeTab 변경에 따른 스크롤
  // ==========================================
  // Feature 레이어의 activeTabAtom이 변경되면,
  // Widget은 해당 문서로 스크롤하여 시각적 피드백 제공
  useEffect(() => {
    if (activeTab && scrollContainerRef.current) {
      const targetElement = document.getElementById(`doc-${activeTab}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeTab]);

  // 파일이 없을 때
  if (allDocData.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-elevated text-text-tertiary">
        <div className="text-center">
          <div className="mb-4 text-4xl font-serif text-gray-300">📄</div>
          <p className="text-sm">
            No files open. Use search (Shift+Shift) or click a file in the sidebar to open.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-bg-elevated overflow-hidden">
      {/* Top Control Bar */}
      <div className="absolute top-6 right-8 z-50 print:hidden">
        <button
          onClick={() => setLayoutMode((prev) => (prev === 'linear' ? 'split' : 'linear'))}
          className="p-2 rounded-lg bg-bg-deep border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
          title={layoutMode === 'linear' ? 'Annotated Layout' : 'Standard Layout'}
        >
          {layoutMode === 'linear' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          )}
        </button>
      </div>

      {/* Content Area - Centered */}
      <div ref={scrollContainerRef} className="absolute inset-0 flex items-start justify-center overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-7xl p-6 md:p-12">
          {allDocData.map(({ filePath, docData }, index) => (
            <div
              key={filePath}
              id={`doc-${filePath}`}
              className={`mx-auto shadow-sm min-h-[900px] transition-all duration-300 ${
                layoutMode === 'split' ? 'max-w-full' : 'max-w-4xl bg-white border border-gray-200 px-12 py-16'
              } ${index > 0 ? 'mt-12' : ''}`}
            >
              <DocViewer data={docData} layout={layoutMode} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CodeDocView;
