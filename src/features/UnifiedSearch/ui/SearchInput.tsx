/**
 * Search Input Component
 */

import React, { useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { searchQueryAtom } from '../../../store/atoms';
import { Search } from 'lucide-react';

export const SearchInput: React.FC = () => {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <div className="px-2.5 py-1.5 border-b border-theme-border/50 bg-theme-background/20">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-theme-text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and symbols... (Shift+Shift)"
          className="w-full bg-theme-canvas text-theme-text-primary text-[11px] pl-6 pr-2 py-1 rounded border border-theme-border focus:border-theme-text-accent focus:outline-none placeholder-theme-text-tertiary font-mono"
        />
      </div>
    </div>
  );
};
