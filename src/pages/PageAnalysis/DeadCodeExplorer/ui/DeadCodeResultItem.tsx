/**
 * DeadCodeResultItem - Individual dead code result item
 * Layout: [icon] symbolName ← | → fileName:lineNo [checkbox]
 */

import { useSetAtom } from 'jotai';
import { Code2, Component, FileBox, FunctionSquare, Import, Variable } from 'lucide-react';
import React from 'react';
import { Checkbox } from '@/components/ui/Checkbox.tsx';
import { useDeadCodeSelection } from '@/features/Code/CodeAnalyzer/DeadCodeSelection/lib/useDeadCodeSelection.ts';
import { targetLineAtom } from '@/features/File/Navigation/model/atoms.ts';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile.ts';
import { viewModeAtom } from '../../../../app/model/atoms.ts';
import type { DeadCodeItem } from '../../../../features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';

// Get icon for dead code kind
function getKindIcon(kind: DeadCodeItem['kind']) {
  switch (kind) {
    case 'import':
      return Import;
    case 'export':
      return FileBox;
    case 'function':
      return FunctionSquare;
    case 'variable':
      return Variable;
    case 'prop':
      return Component;
    case 'argument':
      return Code2;
    default:
      return FileBox;
  }
}

export const DeadCodeResultItem = React.forwardRef<
  HTMLDivElement,
  {
    item: DeadCodeItem;
    depth: number;
    focused?: boolean;
    onFocus?: () => void;
  }
>((props, ref) => {
  const { item, depth: _depth, focused, onFocus } = props;
  const setTargetLine = useSetAtom(targetLineAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const { openFile } = useOpenFile();
  const { toggleItemSelection, isItemSelected } = useDeadCodeSelection();

  const isSelected = isItemSelected(item);
  const fileName = item.filePath.split('/').pop() || item.filePath;
  const KindIcon = getKindIcon(item.kind);

  const handleItemClick = () => {
    openFile(item.filePath);
    setTargetLine({ nodeId: item.filePath, lineNum: item.line });
    setViewMode('ide');
  };

  return (
    <div
      ref={ref}
      className={`flex items-center justify-between gap-2 cursor-pointer py-0.5 px-2 ${
        focused ? 'bg-white/8 border-l-2 border-warm-300/50' : ''
      }`}
      onClick={onFocus}
      onDoubleClick={handleItemClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleItemClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Left side: Icon + Symbol name */}
      <div className="flex items-center gap-2 min-w-0">
        <KindIcon size={12} className="text-text-muted shrink-0" />
        <span className="text-2xs text-text-primary font-medium truncate">
          {item.symbolName}
          {item.componentName && <span className="text-text-tertiary ml-1">(in {item.componentName})</span>}
          {item.functionName && <span className="text-text-tertiary ml-1">(in {item.functionName})</span>}
        </span>
      </div>

      {/* Right side: File location + Checkbox */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-2xs text-text-tertiary">
          {fileName}:{item.line}
        </span>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleItemSelection(item)}
          className="border-border-hover"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
});

DeadCodeResultItem.displayName = 'DeadCodeResultItem';
