/**
 * DeadCodeFolderItem - Folder rendering in category tree
 */

import { Folder, FolderOpen } from 'lucide-react';
import React from 'react';
import { FileTreeItem } from '@/components/ide/FileTreeItem';

export const DeadCodeFolderItem = React.forwardRef<
  HTMLDivElement,
  {
    name: string;
    depth: number;
    isCollapsed: boolean;
    focused?: boolean;
    globalItemIndex: number;
    itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    onFocus?: () => void;
    onDoubleClick: () => void;
  }
>((props, ref) => {
  const { name, depth, isCollapsed, focused, globalItemIndex, itemRefs, onFocus, onDoubleClick } = props;
  const icon = isCollapsed ? Folder : FolderOpen;

  return (
    <FileTreeItem
      ref={(el) => {
        // Combine TreeView ref with itemRefs map
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
        if (el) {
          itemRefs.current.set(globalItemIndex, el);
        }
      }}
      icon={icon}
      label={name}
      isFolder
      isOpen={!isCollapsed}
      focused={focused}
      indent={depth}
      onFocus={onFocus}
      onDoubleClick={onDoubleClick}
    />
  );
});
