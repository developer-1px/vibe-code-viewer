/**
 * DeadCodeList - List of all categories
 */

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/ScrollArea.tsx';
import { buildDeadCodeTree } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/buildDeadCodeTree.ts';
import {
  collapsedFoldersAtom,
  deadCodeResultsAtom,
  isAnalyzingAtom,
} from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms.ts';
import { useCategoryIndices } from '../lib/useCategoryIndices.ts';
import { DeadCodeCategory } from './DeadCodeCategory.tsx';

export function DeadCodeList({ itemRefs }: { itemRefs: React.MutableRefObject<Map<number, HTMLDivElement>> }) {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const isAnalyzing = useAtomValue(isAnalyzingAtom);
  const _collapsedFolders = useAtomValue(collapsedFoldersAtom);
  const categories = useCategoryIndices();

  // Build combined flat list for all categories
  const allCategoryItems = useMemo(() => {
    if (!deadCodeResults) return [];
    return [
      ...deadCodeResults.unusedImports,
      ...deadCodeResults.unusedVariables,
      ...deadCodeResults.deadFunctions,
      ...deadCodeResults.unusedExports,
    ];
  }, [deadCodeResults]);

  const _allCategoryTree = useMemo(() => buildDeadCodeTree(allCategoryItems), [allCategoryItems]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-2">
        {deadCodeResults &&
          !isAnalyzing &&
          categories.map(({ title, items, key, startIndex }) => (
            <DeadCodeCategory
              key={key}
              title={title}
              items={items}
              categoryKey={key}
              startIndex={startIndex}
              itemRefs={itemRefs}
            />
          ))}
      </div>
    </ScrollArea>
  );
}
