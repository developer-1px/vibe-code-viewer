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
    <div className="px-2.5 py-1.5 border-b border-vibe-border/50 bg-black/20">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and symbols... (Shift+Shift)"
          className="w-full bg-[#1e293b] text-slate-300 text-[11px] pl-6 pr-2 py-1 rounded border border-slate-700 focus:border-vibe-accent focus:outline-none placeholder-slate-500 font-mono"
        />
      </div>
    </div>
  );
};
