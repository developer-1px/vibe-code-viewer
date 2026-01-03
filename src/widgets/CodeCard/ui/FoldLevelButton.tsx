/**
 * FoldLevelButton Component
 * Code Folding 레벨 토글 버튼
 *
 * CodeCardHeader의 Fold 버튼을 별도 컴포넌트로 분리
 */

import React from 'react';
import { Maximize as IconMaximize, AlignJustify as IconCompact, Minimize as IconMinimize } from 'lucide-react';
import type { FoldLevel } from '../hooks/useFoldLevel';

export interface FoldLevelButtonProps {
  /** 현재 Fold 레벨 */
  currentLevel: FoldLevel;
  /** 토글 핸들러 */
  onToggle: (e: React.MouseEvent) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * Fold Level에 따른 Icon 반환
 */
function getFoldIcon(level: FoldLevel) {
  if (level === 2) return <IconMinimize className="w-3.5 h-3.5" />;
  if (level === 1) return <IconCompact className="w-3.5 h-3.5" />;
  return <IconMaximize className="w-3.5 h-3.5" />;
}

/**
 * Fold Level에 따른 Tooltip 텍스트 반환
 */
function getFoldTooltip(level: FoldLevel): string {
  if (level === 2) return 'Minimal - 다 접기 → Compact';
  if (level === 1) return 'Compact - 최상위 블록만 펼침 → Maximize';
  return 'Maximize - Import만 접기 → Minimal';
}

/**
 * Code Folding 레벨 토글 버튼
 *
 * @example
 * const { currentLevel, toggleLevel, canFold } = useFoldLevel(node, processedLines);
 *
 * <FoldLevelButton
 *   currentLevel={currentLevel}
 *   onToggle={toggleLevel}
 *   disabled={!canFold}
 * />
 */
export function FoldLevelButton({ currentLevel, onToggle, disabled = false }: FoldLevelButtonProps) {
  if (disabled) return null;

  return (
    <button
      onClick={onToggle}
      className="p-1 rounded transition-colors text-slate-400 hover:bg-white/10 hover:text-slate-200"
      title={getFoldTooltip(currentLevel)}
    >
      {getFoldIcon(currentLevel)}
    </button>
  );
}
