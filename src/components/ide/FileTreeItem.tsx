import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/components/lib/utils';
import { Indicator } from '@/components/ui/Indicator';

export interface FileTreeItemProps {
  icon: LucideIcon | React.ComponentType;
  label: string;
  active?: boolean;
  opened?: boolean; // File is in openedTabs (Workspace)
  focused?: boolean; // Keyboard navigation focus (different from active)
  isFolder?: boolean;
  isOpen?: boolean;
  indent?: number;
  onClick?: () => void;
  onFocus?: () => void; // Single click - update focus
  onDoubleClick?: () => void; // Double click - open file or toggle folder
  fileExtension?: string; // File extension for icon coloring (.ts, .vue, .json, etc.)
}

export const FileTreeItem = React.forwardRef<HTMLDivElement, FileTreeItemProps>(
  (
    {
      icon: Icon,
      label,
      active,
      opened,
      focused,
      isFolder,
      isOpen,
      indent = 0,
      onClick,
      onFocus,
      onDoubleClick,
      fileExtension,
    },
    ref
  ) => {
    const handleClick = (_e: React.MouseEvent) => {
      // Single click - update focus
      if (onFocus) {
        onFocus();
      }
      // Also call onClick for backwards compatibility
      if (onClick) {
        onClick();
      }
    };

    const handleDoubleClick = (_e: React.MouseEvent) => {
      // Double click - open file or toggle folder
      if (onDoubleClick) {
        onDoubleClick();
      }
    };

    const handleChevronClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Chevron click - immediately toggle folder
      if (isFolder && onDoubleClick) {
        onDoubleClick();
      }
    };

    // File icon color based on extension
    const getFileIconColor = (ext?: string) => {
      if (!ext) return 'text-text-muted';

      switch (ext.toLowerCase()) {
        case '.ts':
        case '.tsx':
          return 'text-[#4A90E2]'; // TypeScript blue (brighter)
        case '.js':
        case '.jsx':
          return 'text-[#f7df1e]'; // JavaScript yellow
        case '.vue':
          return 'text-[#42b883]'; // Vue green
        case '.json':
          return 'text-[#f59e0b]'; // JSON orange
        case '.css':
        case '.scss':
        case '.sass':
          return 'text-[#a78bfa]'; // CSS purple
        case '.html':
          return 'text-[#e34c26]'; // HTML red
        case '.md':
          return 'text-[#60a5fa]'; // Markdown blue
        default:
          return 'text-text-muted';
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group flex flex-nowrap h-[var(--limn-file-item-height)] items-center gap-1 border-l-2 px-2 text-xs cursor-pointer',
          active
            ? 'border-transparent text-text-primary'
            : focused
              ? 'border-warm-300/50 bg-white/8 text-text-primary'
              : 'border-transparent text-text-secondary'
        )}
        style={{
          paddingLeft: `calc(12px + ${indent} * var(--limn-indent) + ${isFolder ? '0px' : '15px'})`,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isFolder && (
          <div onClick={handleChevronClick} className="shrink-0 cursor-pointer">
            {isOpen ? (
              <ChevronDown size={11} className="text-text-secondary" />
            ) : (
              <ChevronRight size={11} className="text-text-secondary" />
            )}
          </div>
        )}
        {typeof Icon === 'function' && Icon.prototype === undefined ? (
          // React component (Lineicons)
          <div className={cn('shrink-0', isFolder ? 'text-warm-300/80' : getFileIconColor(fileExtension))}>
            <Icon />
          </div>
        ) : (
          // LucideIcon
          <Icon
            size={13}
            strokeWidth={1.5}
            className={cn('shrink-0', isFolder ? 'text-warm-300/80' : getFileIconColor(fileExtension))}
          />
        )}
        <span className="flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{label}</span>
        {opened && !isFolder && (
          <Indicator variant="warning" className={cn('h-1 w-1 shrink-0', active && 'animate-pulse')} />
        )}
      </div>
    );
  }
);
FileTreeItem.displayName = 'FileTreeItem';
