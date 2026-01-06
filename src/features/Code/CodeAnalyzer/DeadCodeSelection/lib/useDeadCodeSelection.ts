/**
 * Dead Code Selection Hook
 */
import { useAtom } from 'jotai';
import { getItemKey } from '../../DeadCodeAnalyzer/lib/categoryUtils.tsx';
import type { DeadCodeItem } from '../../DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';
import { selectedDeadCodeItemsAtom } from '../../DeadCodeAnalyzer/model/atoms.ts';

export function useDeadCodeSelection() {
  const [selectedItems, setSelectedItems] = useAtom(selectedDeadCodeItemsAtom);

  const toggleItemSelection = (item: DeadCodeItem) => {
    const key = getItemKey(item);
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const toggleCategorySelection = (items: DeadCodeItem[]) => {
    const allSelected = items.every((item) => selectedItems.has(getItemKey(item)));
    const newSelected = new Set(selectedItems);

    if (allSelected) {
      // Deselect all in this category
      items.forEach((item) => {
        newSelected.delete(getItemKey(item));
      });
    } else {
      // Select all in this category
      items.forEach((item) => {
        newSelected.add(getItemKey(item));
      });
    }

    setSelectedItems(newSelected);
  };

  const isItemSelected = (item: DeadCodeItem) => {
    return selectedItems.has(getItemKey(item));
  };

  const isCategoryAllSelected = (items: DeadCodeItem[]) => {
    return items.length > 0 && items.every((item) => selectedItems.has(getItemKey(item)));
  };

  const isCategorySomeSelected = (items: DeadCodeItem[]) => {
    const allSelected = isCategoryAllSelected(items);
    return items.some((item) => selectedItems.has(getItemKey(item))) && !allSelected;
  };

  return {
    selectedItems,
    toggleItemSelection,
    toggleCategorySelection,
    isItemSelected,
    isCategoryAllSelected,
    isCategorySomeSelected,
  };
}
