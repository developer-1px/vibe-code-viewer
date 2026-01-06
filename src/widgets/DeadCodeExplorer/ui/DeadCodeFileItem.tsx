/**
 * DeadCodeFileItem - Dead code items rendering for a file
 */

import { useSetAtom } from 'jotai';
import React from 'react';
import { FileTreeItem } from '@/components/ide/FileTreeItem';
import { Checkbox } from '@/components/ui/Checkbox';
import { useDeadCodeSelection } from '@/features/Code/CodeAnalyzer/DeadCodeSelection/lib/useDeadCodeSelection';
import { targetLineAtom } from '@/features/File/Navigation/model/atoms';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { viewModeAtom } from '../../../app/model/atoms';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';
import { getFileIcon } from '../../FileExplorer/lib/getFileIcon';

export const DeadCodeFileItem = React.forwardRef<
  HTMLDivElement,
  {
    items: DeadCodeItem[];
    fileName: string;
    depth: number;
    focused?: boolean;
    globalItemIndex: number;
    itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    onFocus?: () => void;
  }
>((props, ref) => {
  const { items, fileName, depth, focused, globalItemIndex, itemRefs, onFocus } = props;
  const setTargetLine = useSetAtom(targetLineAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const { openFile } = useOpenFile();
  const { toggleItemSelection, isItemSelected } = useDeadCodeSelection();

  const fileExtension = fileName.includes('.') ? `.${fileName.split('.').pop()}` : undefined;
  const fileIcon = getFileIcon(fileName);

  const handleItemClick = (item: DeadCodeItem) => {
    openFile(item.filePath);
    setTargetLine({ nodeId: item.filePath, lineNum: item.line });
    setViewMode('ide');
  };

  return (
    <div>
      {items.map((item, idx) => {
        const deadCodeGlobalIndex = globalItemIndex + idx;
        const itemFocused = idx === 0 ? focused : false; // Only first item gets TreeView focus
        const isSelected = isItemSelected(item);

        return (
          <div key={idx} className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <FileTreeItem
                ref={(el) => {
                  // Only attach TreeView ref to first item
                  if (idx === 0) {
                    if (typeof ref === 'function') {
                      ref(el);
                    } else if (ref) {
                      ref.current = el;
                    }
                  }
                  if (el) {
                    itemRefs.current.set(deadCodeGlobalIndex, el);
                  }
                }}
                icon={fileIcon}
                label={`${fileName}:${item.line} - ${item.symbolName}`}
                focused={itemFocused}
                indent={depth}
                fileExtension={fileExtension}
                onFocus={idx === 0 ? onFocus : undefined}
                onDoubleClick={() => handleItemClick(item)}
              />
            </div>
            {item.from && (
              <span className="text-2xs text-text-tertiary truncate max-w-[150px] mr-2">from "{item.from}"</span>
            )}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItemSelection(item)}
              className="shrink-0 mr-2 border-border-hover"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      })}
    </div>
  );
});
