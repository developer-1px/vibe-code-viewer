/**
 * DeadCodeFileItem - Dead code items rendering for a file
 */
import { Checkbox } from '@/components/ui/Checkbox';
import { FileTreeItem } from '@/components/ide/FileTreeItem';
import { useAtom, useSetAtom } from 'jotai';
import { targetLineAtom, viewModeAtom } from '../../../store/atoms';
import { focusedIndexAtom } from '../../../features/DeadCodeAnalyzer/model/atoms';
import { useDeadCodeSelection } from '../../../features/DeadCodeSelection/lib/useDeadCodeSelection';
import { useOpenFile } from '../../../features/Files/lib/useOpenFile';
import { getFileIcon } from '../../FileExplorer/lib/getFileIcon';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';

export function DeadCodeFileItem({
  items,
  fileName,
  depth,
  globalItemIndex,
  itemRefs,
}: {
  items: DeadCodeItem[];
  fileName: string;
  depth: number;
  globalItemIndex: number;
  itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}) {
  const [focusedIndex, setFocusedIndex] = useAtom(focusedIndexAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const { openFile } = useOpenFile();
  const { toggleItemSelection, isItemSelected } = useDeadCodeSelection();

  const fileExtension = fileName.includes('.')
    ? '.' + fileName.split('.').pop()
    : undefined;
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
        const itemFocused = focusedIndex === deadCodeGlobalIndex;
        const isSelected = isItemSelected(item);

        return (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <FileTreeItem
                ref={(el) => {
                  if (el) {
                    itemRefs.current.set(deadCodeGlobalIndex, el);
                  }
                }}
                icon={fileIcon}
                label={`${fileName}:${item.line} - ${item.symbolName}`}
                focused={itemFocused}
                indent={depth}
                fileExtension={fileExtension}
                onFocus={() => setFocusedIndex(deadCodeGlobalIndex)}
                onDoubleClick={() => handleItemClick(item)}
              />
            </div>
            {item.from && (
              <span className="text-2xs text-text-tertiary truncate max-w-[150px] mr-2">
                from "{item.from}"
              </span>
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
}
