/**
 * Category Header Checkbox Component
 */
import { Checkbox } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils';
import type { DeadCodeItem } from '../../../shared/deadCodeAnalyzer';
import { useDeadCodeSelection } from '../lib/useDeadCodeSelection';

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
