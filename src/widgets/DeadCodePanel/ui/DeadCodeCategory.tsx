/**
 * DeadCodeCategory - Category section with collapsible tree
 */
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAtom } from 'jotai';
import { collapsedFoldersAtom, expandedCategoriesAtom } from '../../../features/DeadCodeAnalyzer/model/atoms';
import { buildDeadCodeTree } from '../../../features/DeadCodeAnalyzer/lib/buildDeadCodeTree';
import { renderCategoryIcon } from '../../../features/DeadCodeAnalyzer/lib/categoryUtils';
import { CategoryCheckbox } from '../../../features/DeadCodeSelection/ui/CategoryCheckbox';
import { FileTreeRenderer } from '../../AppSidebar/ui/FileTreeRenderer';
import { DeadCodeFolderItem } from './DeadCodeFolderItem';
import { DeadCodeFileItem } from './DeadCodeFileItem';
import { getDeadCodeFlatList } from '../lib/getDeadCodeFlatList';
import type { CategoryKey } from '../../../features/DeadCodeAnalyzer/model/types';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';
import { useMemo } from 'react';

export function DeadCodeCategory({
  title,
  items,
  categoryKey,
  startIndex,
  flatItemList,
  itemRefs,
}: {
  title: string;
  items: DeadCodeItem[];
  categoryKey: CategoryKey;
  startIndex: number;
  flatItemList: any[];
  itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}) {
  const [expandedCategories, setExpandedCategories] = useAtom(expandedCategoriesAtom);
  const [collapsedFolders, setCollapsedFolders] = useAtom(collapsedFoldersAtom);

  const isExpanded = expandedCategories[categoryKey];

  const toggleCategory = () => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => {
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
        <button
          onClick={toggleCategory}
          className="flex items-center gap-1.5 flex-1"
        >
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
          <FileTreeRenderer
            fileTree={tree}
            collapsedFolders={collapsedFolders}
            flatItemList={flatItemList}
            focusedIndex={0}
            itemRefs={itemRefs}
            onFocusChange={() => {}}
            onToggleFolder={toggleFolder}
            getNodeType={(node) => node.type}
            getNodePath={(node) => node.path}
          >
            {({ node, depth, isCollapsed, itemIndex, handleDoubleClick }) => {
              const globalItemIndex = startIndex + itemIndex;

              // Folder rendering
              if (node.type === 'folder') {
                return (
                  <DeadCodeFolderItem
                    name={node.name}
                    depth={depth}
                    isCollapsed={isCollapsed}
                    globalItemIndex={globalItemIndex}
                    itemRefs={itemRefs}
                    onDoubleClick={handleDoubleClick}
                  />
                );
              }

              // File (dead code items) rendering
              const itemsByFile = items.filter(i => i.filePath === node.filePath);

              return (
                <DeadCodeFileItem
                  items={itemsByFile}
                  fileName={node.name}
                  depth={depth}
                  globalItemIndex={globalItemIndex}
                  itemRefs={itemRefs}
                />
              );
            }}
          </FileTreeRenderer>
        </div>
      )}

      {isExpanded && items.length === 0 && (
        <div className="px-4 py-3 text-xs text-text-muted text-center">
          No issues found
        </div>
      )}
    </div>
  );
}
