/**
 * DeadCodeCategoryHeader - Category header with toggle and checkbox
 */

import { useAtom } from 'jotai';
import { ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';
import { renderCategoryIcon } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/categoryUtils.tsx';
import { expandedCategoriesAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms.ts';
import type { CategoryKey } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/types.ts';
import { CategoryCheckbox } from '@/features/Code/CodeAnalyzer/DeadCodeSelection/ui/CategoryCheckbox.tsx';
import type { DeadCodeItem } from '../../../../features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';

export const DeadCodeCategoryHeader = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    items: DeadCodeItem[];
    categoryKey: CategoryKey;
    focused?: boolean;
    onFocus?: () => void;
  }
>((props, ref) => {
  const { title, items, categoryKey, focused, onFocus } = props;
  const [expandedCategories, setExpandedCategories] = useAtom(expandedCategoriesAtom);

  const isExpanded = expandedCategories[categoryKey];

  const toggleCategory = () => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 transition-colors border-b border-border-DEFAULT ${
        focused ? 'bg-white/8' : ''
      }`}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFocus?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleCategory();
        }}
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
  );
});

DeadCodeCategoryHeader.displayName = 'DeadCodeCategoryHeader';
