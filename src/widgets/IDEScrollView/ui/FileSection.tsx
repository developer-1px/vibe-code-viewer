/**
 * FileSection - 개별 파일 섹션 (헤더 + CodeViewer)
 * 스크롤 뷰에서 하나의 파일을 표시하는 단위
 */

import React, { useMemo, forwardRef, useEffect, useState, useTransition } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import type { CodeLine } from '../../CodeViewer/core/types';
import { deadCodeResultsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import { activeTabAtom } from '@/features/File/OpenFiles/model/atoms';
import { hoveredFilePathAtom } from '../model/atoms';
import { renderCodeLinesDirect } from '../../CodeViewer/core/renderer/renderCodeLinesDirect';
import { renderVueFile } from '../../CodeViewer/core/renderer/renderVueFile';
import { renderPlaintext } from '../../CodeViewer/core/renderer/renderPlaintext';
import { getWorkerPool } from '../../../shared/workerPool';
import CodeViewer from '../../CodeViewer/CodeViewer';
import { getFileName } from '../../../shared/pathUtils';
import { getFileIcon } from '../../FileExplorer/lib/getFileIcon';

// Module-level cache for processedLines (Phase 1 performance optimization)
// Key: `${filePath}|${deadCodeResultsVersion}`
const processedLinesCache = new Map<string, CodeLine[]>();
let deadCodeResultsVersion = 0;

// Cache invalidation helper
export const invalidateProcessedLinesCache = () => {
  processedLinesCache.clear();
  deadCodeResultsVersion++;
};

const FileSection = forwardRef<HTMLDivElement, {
  node: SourceFileNode;
  files: Record<string, string>;
  highlightedLines: Set<number>;
}>(({ node, files, highlightedLines }, ref) => {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const hoveredFilePath = useAtomValue(hoveredFilePathAtom);
  const setHoveredFilePath = useSetAtom(hoveredFilePathAtom);
  const fileName = getFileName(node.filePath);
  const FileIconComponent = getFileIcon(fileName);
  const [isPending, startTransition] = useTransition();

  // Check if this file section is active (via activeTab or hover)
  const isActive = activeTab === node.filePath || hoveredFilePath === node.filePath;

  // Invalidate cache when deadCodeResults changes
  useEffect(() => {
    deadCodeResultsVersion++;
  }, [deadCodeResults]);

  // Phase A + B: Progressive Rendering with Stale-While-Revalidate
  // 1단계: Plaintext 즉시 표시 (파싱 없음, 초고속)
  // 2단계: 백그라운드에서 Rich 파싱 → 캐시 저장 → 교체
  const cacheKey = `${node.filePath}|${deadCodeResultsVersion}`;
  const [processedLines, setProcessedLines] = useState<CodeLine[]>(() => {
    // 캐시에 rich 버전 있으면 즉시 사용
    const cached = processedLinesCache.get(cacheKey);
    if (cached) return cached;

    // 캐시 없으면 plaintext로 즉시 렌더링 (파싱 0ms)
    return renderPlaintext(node, files);
  });

  // 백그라운드에서 Rich 파싱 및 캐시 갱신
  useEffect(() => {
    const cached = processedLinesCache.get(cacheKey);
    if (cached) {
      // 캐시 hit - 즉시 반영
      setProcessedLines(cached);
      return;
    }

    // Phase C: Web Worker를 사용한 백그라운드 파싱
    // 메인 스레드 차단 없이 AST 파싱 수행
    const USE_WORKER = false; // TODO: Worker 파서가 완성되면 true로 변경

    if (USE_WORKER) {
      const workerPool = getWorkerPool();
      const content = files[node.filePath] || node.codeSnippet || '';

      console.log(`[Phase C] Worker parsing started: ${node.filePath}`);
      workerPool.parse(
        {
          filePath: node.filePath,
          content,
          files,
          deadCodeResults,
        },
        (richLines, parseTime) => {
          console.log(`[Phase C] Worker parsing done: ${node.filePath} (${parseTime.toFixed(2)}ms)`);
          processedLinesCache.set(cacheKey, richLines);
          setProcessedLines(richLines);
        }
      );
    } else {
      // Fallback: Main thread에서 파싱 (startTransition으로 우선순위 낮춤)
      startTransition(() => {
        console.log(`[Phase B] Main thread parsing started: ${node.filePath}`);
        const startTime = performance.now();

        const richLines = node.filePath.endsWith('.vue')
          ? renderVueFile(node, files)
          : renderCodeLinesDirect(node, files, deadCodeResults);

        const parseTime = performance.now() - startTime;
        console.log(`[Phase B] Main thread parsing done: ${node.filePath} (${parseTime.toFixed(2)}ms)`);

        processedLinesCache.set(cacheKey, richLines);
        setProcessedLines(richLines);
      });
    }
  }, [cacheKey, node, files, deadCodeResults]);

  return (
    <div
      ref={ref}
      id={`file-section-${node.filePath}`}
      className={`
        border-b border-border-DEFAULT mb-8 transition-all duration-200 ease-in-out
        ${!isActive ? 'grayscale opacity-50' : ''}
      `}
      onMouseEnter={() => setHoveredFilePath(node.filePath)}
      onMouseLeave={() => setHoveredFilePath(null)}
    >
      {/* 파일 헤더 */}
      <div className="sticky top-0 z-10 bg-bg-elevated border-b border-border-hover px-4 py-2 flex items-center gap-2 shadow-sm">
        <FileIconComponent size={14} className="text-text-secondary" />
        <span className="text-xs font-medium text-text-primary">{node.filePath}</span>
      </div>

      {/* 코드 뷰어 */}
      <CodeViewer
        processedLines={processedLines}
        node={node}
        highlightedLines={highlightedLines}
      />
    </div>
  );
});

FileSection.displayName = 'FileSection';

export default FileSection;
