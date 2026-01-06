/**
 * Category Header Checkbox Component
 */

import { cn } from '@/components/lib/utils.ts';
import { Checkbox } from '@/components/ui/Checkbox.tsx';
import type { DeadCodeItem } from '../../DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';
import { useDeadCodeSelection } from '../lib/useDeadCodeSelection.ts';

export function CategoryCheckbox({ items }: { items: DeadCodeItem[] }) {
  const { toggleCategorySelection, isCategoryAllSelected, isCategorySomeSelected } = useDeadCodeSelection();

  if (items.length === 0) return null;

  const allSelected = isCategoryAllSelected(items);
  const someSelected = isCategorySomeSelected(items);

  return (
    <Checkbox
      checked={allSelected}
      className={cn(someSelected && 'data-[state=checked]:bg-warm-300/50')}
      onCheckedChange={() => toggleCategorySelection(items)}
    />
  );
}
