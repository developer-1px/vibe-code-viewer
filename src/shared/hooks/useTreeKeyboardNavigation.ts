/**
 * useTreeKeyboardNavigation - 트리 구조 키보드 네비게이션 공통 로직
 * AppSidebar와 DeadCodePanel에서 재사용
 *
 * Note: Auto-scroll은 TreeView의 useTreeState에서 처리됩니다.
 */
import { useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

const TREE_HOTKEYS = {
  ARROW_DOWN: 'arrowdown',
  ARROW_UP: 'arrowup',
  ENTER: 'enter',
  ARROW_RIGHT: 'arrowright',
  ARROW_LEFT: 'arrowleft',
  ESCAPE: 'escape',
} as const;

export interface TreeNavigationItem {
  id: string; // 고유 ID
  parentId: string | null; // 부모 ID
  type: 'folder' | 'file' | 'dead-code-item' | string;
  path: string;
  filePath?: string;
}

export interface UseTreeKeyboardNavigationProps<T extends TreeNavigationItem> {
  flatItemList: T[];
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onItemAction: (item: T) => void; // Enter 키나 더블 클릭 시 실행할 액션
  onFolderFocus?: (folderPath: string) => void; // Folder Focus Mode - 폴더를 Root로 설정
  onExitFocus?: () => void; // Folder Focus Mode 종료 (Escape)
}

export function useTreeKeyboardNavigation<T extends TreeNavigationItem>({
  flatItemList,
  collapsedFolders,
  onToggleFolder,
  onItemAction,
  onFolderFocus,
  onExitFocus,
}: UseTreeKeyboardNavigationProps<T>) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Keyboard navigation handler
  const containerRef = useHotkeys(
    Object.values(TREE_HOTKEYS),
    (e, { hotkey }) => {
      if (flatItemList.length === 0) return;

      e.preventDefault();
      const item = flatItemList[focusedIndex];

      if (!item) {
        console.warn('[useTreeKeyboardNavigation] No item at focusedIndex:', focusedIndex);
        return;
      }

      switch (hotkey) {
        case TREE_HOTKEYS.ARROW_DOWN:
          setFocusedIndex((prev) => Math.min(prev + 1, flatItemList.length - 1));
          break;
        case TREE_HOTKEYS.ARROW_UP:
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case TREE_HOTKEYS.ENTER:
          if (item.type === 'folder') {
            // Folder Focus Mode가 활성화되어 있으면 폴더 포커스, 아니면 토글
            if (onFolderFocus) {
              onFolderFocus(item.path);
            } else {
              onToggleFolder(item.path);
            }
          } else {
            // Handle file or any other item type
            onItemAction(item);
          }
          break;
        case TREE_HOTKEYS.ESCAPE:
          // Folder Focus Mode 종료
          if (onExitFocus) {
            onExitFocus();
          }
          break;
        case TREE_HOTKEYS.ARROW_RIGHT:
          if (item.type === 'folder') {
            // If folder is collapsed, expand it
            if (collapsedFolders.has(item.path)) {
              console.log('[useTreeKeyboardNavigation] Arrow Right - Expanding folder:', item.path);
              onToggleFolder(item.path);
            }
            // If folder is already open, move to first child
            else {
              console.log('[useTreeKeyboardNavigation] Arrow Right - Moving to first child of:', item.path);
              if (focusedIndex + 1 < flatItemList.length) {
                setFocusedIndex(focusedIndex + 1);
              }
            }
          } else {
            // For files/items, move to next item
            console.log('[useTreeKeyboardNavigation] Arrow Right - Moving to next item');
            if (focusedIndex + 1 < flatItemList.length) {
              setFocusedIndex(focusedIndex + 1);
            }
          }
          break;
        case TREE_HOTKEYS.ARROW_LEFT:
          if (item.type === 'folder') {
            // If folder is open, collapse it
            if (!collapsedFolders.has(item.path)) {
              console.log('[useTreeKeyboardNavigation] Arrow Left - Collapsing folder:', item.path);
              onToggleFolder(item.path);
            }
            // If folder is already collapsed, move to parent folder
            else {
              console.log('[useTreeKeyboardNavigation] Arrow Left - Moving to parent folder from collapsed folder');
              // ✅ ID 기반 부모 찾기
              if (item.parentId) {
                const parentIndex = flatItemList.findIndex(i => i.id === item.parentId);
                if (parentIndex !== -1) {
                  setFocusedIndex(parentIndex);
                }
              }
            }
          } else {
            // For files/items, move to parent folder
            console.log('[useTreeKeyboardNavigation] Arrow Left - Moving to parent folder from file/item');
            // ✅ ID 기반 부모 찾기
            if (item.parentId) {
              const parentIndex = flatItemList.findIndex(i => i.id === item.parentId);
              if (parentIndex !== -1) {
                setFocusedIndex(parentIndex);
              }
            }
          }
          break;
      }
    },
    {},
    [flatItemList, focusedIndex, onItemAction, collapsedFolders, onToggleFolder, onFolderFocus, onExitFocus]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    itemRefs,
    containerRef,
  };
}
