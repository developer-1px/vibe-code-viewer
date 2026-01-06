/**
 * Category Indices Hook
 * Calculates start index for each category in the global flatItemList
 */

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { buildDeadCodeTree } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/buildDeadCodeTree';
import { collapsedFoldersAtom, deadCodeResultsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import type { CategoryKey } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/types';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';
import { getDeadCodeFlatList } from './getDeadCodeFlatList';

interface CategoryInfo {
  title: string;
  items: DeadCodeItem[];
  key: CategoryKey;
  startIndex: number;
}

export function useCategoryIndices(): CategoryInfo[] {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const collapsedFolders = useAtomValue(collapsedFoldersAtom);

  return useMemo(() => {
    if (!deadCodeResults) return [];

    let currentStartIndex = 0;
    const categories: CategoryInfo[] = [
      { title: 'Unused Imports', items: deadCodeResults.unusedImports, key: 'unusedImports', startIndex: 0 },
      { title: 'Unused Variables', items: deadCodeResults.unusedVariables, key: 'unusedVariables', startIndex: 0 },
      { title: 'Dead Functions', items: deadCodeResults.deadFunctions, key: 'deadFunctions', startIndex: 0 },
      { title: 'Unused Arguments', items: deadCodeResults.unusedArguments, key: 'unusedArguments', startIndex: 0 },
      { title: 'Unused Props', items: deadCodeResults.unusedProps, key: 'unusedProps', startIndex: 0 },
      { title: 'Unused Exports', items: deadCodeResults.unusedExports, key: 'unusedExports', startIndex: 0 },
    ];

    return categories.map(({ title, items, key }) => {
      const categoryStartIndex = currentStartIndex;

      // Count how many items this category contributes to flatItemList
      const tree = buildDeadCodeTree(items);
      const categoryFlatItems = getDeadCodeFlatList(tree, collapsedFolders, items);
      const categoryItemCount = categoryFlatItems.length;

      // Advance start index for next category
      currentStartIndex += categoryItemCount;

      return {
        title,
        items,
        key,
        startIndex: categoryStartIndex,
      };
    });
  }, [deadCodeResults, collapsedFolders]);
}
