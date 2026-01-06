/**
 * DeadCodeCategory - Category section with collapsible tree
 * Renders each dead code item as individual node
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { FileTreeItem } from '@/components/ide/FileTreeItem';
import { Checkbox } from '@/components/ui/Checkbox';
import { buildDeadCodeTree } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/buildDeadCodeTree';
import { renderCategoryIcon } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/categoryUtils';
import {
  collapsedFoldersAtom,
  expandedCategoriesAtom,
} from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import type { CategoryKey } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/types';
import { useDeadCodeSelection } from '@/features/Code/CodeAnalyzer/DeadCodeSelection/lib/useDeadCodeSelection';
import { CategoryCheckbox } from '@/features/Code/CodeAnalyzer/DeadCodeSelection/ui/CategoryCheckbox';
import { targetLineAtom } from '@/features/File/Navigation/model/atoms';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import { filesAtom, viewModeAtom } from '../../../app/model/atoms';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';
import { TreeView } from '../../../shared/ui/TreeView/TreeView';
import { getFileIcon } from '../../FileExplorer/lib/getFileIcon';
import { DeadCodeFolderItem } from './DeadCodeFolderItem';

export function DeadCodeCategory({
  title,
  items,
  categoryKey,
  startIndex,
  itemRefs,
}: {
  title: string;
  items: DeadCodeItem[];
  categoryKey: CategoryKey;
  startIndex: number;
  itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}) {
  const [expandedCategories, setExpandedCategories] = useAtom(expandedCategoriesAtom);
  const [collapsedFolders, setCollapsedFolders] = useAtom(collapsedFoldersAtom);
  const files = useAtomValue(filesAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const { openFile } = useOpenFile();
  const { toggleItemSelection, isItemSelected } = useDeadCodeSelection();

  const isExpanded = expandedCategories[categoryKey];

  const handleItemClick = (item: DeadCodeItem) => {
    openFile(item.filePath);
    setTargetLine({ nodeId: item.filePath, lineNum: item.line });
    setViewMode('ide');
  };

  const toggleCategory = () => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const tree = useMemo(() => buildDeadCodeTree(items), [items]);

  return (
    <div className="rounded overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 transition-colors border-b border-border-DEFAULT">
        <button onClick={toggleCategory} className="flex items-center gap-1.5 flex-1">
          {isExpanded ? (
            <ChevronDown size={14} className="text-text-muted shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-text-muted shrink-0" />
          )}
          {renderCategoryIcon(categoryKey)}
          <span className="text-xs text-text-primary font-medium">{title}</span>
          <span className="text-xs text-text-muted">({items.length})</span>
        </button>

        <CategoryCheckbox items={items} />
      </div>

      {/* Category Items - Tree View */}
      {isExpanded && items.length > 0 && (
        <div className="mt-0.5">
          <TreeView
            data={tree}
            getNodeType={(node) => node.type}
            getNodePath={(node) => node.path}
            collapsedPaths={collapsedFolders}
            onToggleCollapse={toggleFolder}
          >
            {({ node, depth, isFocused, isCollapsed, itemRef, handleFocus, handleToggle }) => {
              // Folder rendering
              if (node.type === 'folder') {
                return (
                  <DeadCodeFolderItem
                    ref={itemRef}
                    name={node.name}
                    depth={depth}
                    isCollapsed={isCollapsed}
                    focused={isFocused}
                    globalItemIndex={0}
                    itemRefs={itemRefs}
                    onFocus={handleFocus}
                    onDoubleClick={handleToggle}
                  />
                );
              }

              // Dead code item rendering (each line is individual node)
              if (node.type === 'dead-code-item' && node.deadCodeItem) {
                const item = node.deadCodeItem;
                const isSelected = isItemSelected(item);

                // Extract filename and line number
                const fileName = item.filePath.split('/').pop() || item.filePath;
                const displayLabel = `${fileName}:${item.line}`;

                // Get code snippet
                const fileContent = files[item.filePath] || '';
                const lines = fileContent.split('\n');
                const fullLine = lines[item.line - 1] || '';

                // Extract code snippet
                let codeSnippet = fullLine.trim();
                if (item.kind === 'import') {
                  const importMatch = fullLine.match(/import\s+(?:type\s+)?(\{[^}]+\}|\w+)/);
                  if (importMatch) {
                    codeSnippet = importMatch[1].trim();
                  }
                }

                const fileIcon = getFileIcon(item.filePath);

                return (
                  <div
                    ref={itemRef}
                    className={`flex items-center gap-2 cursor-pointer ${
                      isFocused ? 'bg-white/8 border-l-2 border-warm-300/50' : ''
                    }`}
                    onClick={handleFocus}
                    onDoubleClick={() => handleItemClick(item)}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <FileTreeItem
                        icon={fileIcon}
                        label={displayLabel}
                        focused={false}
                        indent={depth}
                        onFocus={handleFocus}
                        onDoubleClick={() => handleItemClick(item)}
                      />
                      {codeSnippet && (
                        <span className="text-2xs text-text-tertiary truncate flex-1 font-mono">{codeSnippet}</span>
                      )}
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItemSelection(item)}
                      className="shrink-0 mr-2 border-border-hover"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              }

              return null;
            }}
          </TreeView>
        </div>
      )}

      {isExpanded && items.length === 0 && (
        <div className="px-4 py-3 text-xs text-text-muted text-center">No issues found</div>
      )}
    </div>
  );
}
