import React from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: FolderNode[];
  filePath?: string;
}

interface FolderItemViewProps {
  node: FolderNode;
  depth: number;
  isCollapsed: boolean;
  isFocused: boolean;
  onFolderClick: (path: string) => void;
  onFolderFocus: (path: string) => void;
  renderChildren: (depth: number) => React.ReactNode;
}

const FolderItemView: React.FC<FolderItemViewProps> = ({
  node,
  depth,
  isCollapsed,
  isFocused,
  onFolderClick,
  onFolderFocus,
  renderChildren
}) => {
  const paddingLeft = depth * 12 + 8;

  const handleClick = () => {
    // Single click - update focus
    onFolderFocus(node.path);
  };

  const handleDoubleClick = () => {
    // Double click - toggle folder
    onFolderClick(node.path);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent folder focus
    onFolderClick(node.path); // Toggle immediately
  };

  return (
    <div>
      {/* Folder Header */}
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex items-center gap-1 py-0.5 px-2 text-[11px] cursor-pointer transition-colors group ${
          isFocused
            ? 'text-theme-text-primary bg-theme-active border-l-2 border-theme-border-strong'
            : 'text-theme-text-secondary border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* Chevron toggle button - separate clickable area */}
        <button
          type="button"
          onClick={handleChevronClick}
          className="flex items-center justify-center w-3 h-3 hover:bg-theme-hover rounded-sm transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 text-theme-text-tertiary" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5 flex-shrink-0 text-theme-text-tertiary" />
          )}
        </button>
        {isCollapsed ? (
          <Folder className={`w-2.5 h-2.5 flex-shrink-0 ${isFocused ? 'text-theme-amber' : 'text-theme-amber/70'}`} />
        ) : (
          <FolderOpen className={`w-2.5 h-2.5 flex-shrink-0 ${isFocused ? 'text-theme-amber' : 'text-theme-amber/70'}`} />
        )}
        <span className="truncate font-medium">{node.name}</span>
        {node.children && (
          <span className="text-theme-text-tertiary text-[9px] ml-auto">({node.children.length})</span>
        )}
      </div>

      {/* Folder Children */}
      {renderChildren(depth + 1)}
    </div>
  );
};

export default FolderItemView;
