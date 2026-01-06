/**
 * CodeCardHeader Component (Refactored)
 *
 * 리팩토링 전: 278 lines, 11 atoms, 56 conditionals
 * 리팩토링 후: ~90 lines, 단순화된 로직
 *
 * 변경사항:
 * - useFoldLevel: Fold 레벨 계산 및 토글 로직 분리
 * - useFocusedIdentifiers: Focused identifiers 관리 로직 분리
 * - getNodeIcon: Switch문 → 객체 매핑으로 변경
 * - FoldLevelButton: Fold 버튼 컴포넌트 분리
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import { deadCodeResultsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import { focusedNodeIdAtom } from '@/widgets/MainContents/IDEScrollView/model/atoms.ts';
import { filesAtom, viewModeAtom } from '../../../app/model/atoms';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import { renderCodeLinesDirect } from '../../CodeViewer/core/renderer/renderCodeLinesDirect';
import { renderVueFile } from '../../CodeViewer/core/renderer/renderVueFile';
import { useFocusedIdentifiers } from '../hooks/useFocusedIdentifiers';
// Custom Hooks
import { useFoldLevel } from '../hooks/useFoldLevel';
import { getNodeDisplayLabel, getNodeShortPath, getNodeTypeLabel } from '../lib/nodeDisplay';
// Utilities
import { getNodeIcon } from '../lib/nodeIcons';
// Components
import { FoldLevelButton } from './FoldLevelButton';

const CodeCardHeader = ({ node }: { node: CanvasNode }) => {
  // Atoms
  const files = useAtomValue(filesAtom);
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const setFocusedNodeId = useSetAtom(focusedNodeIdAtom);

  // Process code lines to extract metadata
  const processedLines = useMemo(() => {
    if (node.filePath.endsWith('.vue')) {
      return renderVueFile(node, files);
    }
    return renderCodeLinesDirect(node, files, deadCodeResults);
  }, [node, files, deadCodeResults]);

  // Custom Hooks - 복잡한 로직 캡슐화
  const { currentLevel, toggleLevel, canFold } = useFoldLevel(node, processedLines);
  const { identifiers: _identifiers, removeIdentifier: _removeIdentifier } = useFocusedIdentifiers(
    node,
    processedLines
  );

  // Node Icon 정보
  const iconConfig = getNodeIcon(node.type);

  // Display labels
  const displayLabel = getNodeDisplayLabel(node);
  const typeLabel = getNodeTypeLabel(node);
  const shortPath = getNodeShortPath(node);

  // Handle double-click to enter IDE view mode
  const handleDoubleClick = useCallback(() => {
    setViewMode('ide');
    setFocusedNodeId(node.id);
  }, [setViewMode, setFocusedNodeId, node.id]);

  return (
    <div
      className="px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20 cursor-pointer"
      onDoubleClick={handleDoubleClick}
      title="더블클릭하여 IDE 뷰로 전환"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Fold Level Toggle Button */}
        <FoldLevelButton currentLevel={currentLevel} onToggle={toggleLevel} disabled={!canFold} />

        {/* Node Icon */}
        <iconConfig.Icon className={`w-4 h-4 ${iconConfig.color}`} />

        {/* Node Label & Path */}
        <div className="flex flex-col">
          <span className="font-bold text-xs text-slate-100 truncate max-w-[300px]">{displayLabel}</span>
          <span className="text-[9px] text-slate-500 font-mono truncate max-w-[300px]">{shortPath}</span>
        </div>
      </div>

      {/* Node Type Badge */}
      <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono ml-2">
        {typeLabel}
      </span>
    </div>
  );
};

export default CodeCardHeader;
