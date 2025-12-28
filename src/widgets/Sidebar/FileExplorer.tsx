import React, { useMemo, useRef, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { FolderOpen, Search, X } from 'lucide-react';
import { FileItem, fuzzyMatch } from '../../entities/File';
import UploadFolderButton from '../../features/UploadFolderButton';
import { lastExpandedIdAtom, fileSearchQueryAtom, focusedFileIndexAtom } from '../../store/atoms';

interface FileExplorerProps {
  files: Record<string, string>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files }) => {
  const [searchQuery, setSearchQuery] = useAtom(fileSearchQueryAtom);
  const [focusedIndex, setFocusedIndex] = useAtom(focusedFileIndexAtom);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastShiftPressRef = useRef<number>(0);
  const fileListRef = useRef<HTMLUListElement>(null);

  // Canvas navigation atom
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  // 검색어로 필터링된 파일 목록 (Fuzzy Search)
  const filteredFiles = useMemo(() => {
    const sortedFiles = Object.keys(files).sort();

    if (!searchQuery.trim()) {
      return sortedFiles;
    }

    const query = searchQuery.trim();
    return sortedFiles.filter(fileName =>
      fuzzyMatch(fileName, query)
    );
  }, [files, searchQuery]);

  // 필터링된 파일이 변경되면 focusedIndex 리셋
  useEffect(() => {
    setFocusedIndex(0);
  }, [filteredFiles, setFocusedIndex]);

  // Focused 파일이 변경되면 카메라 이동
  useEffect(() => {
    if (filteredFiles.length > 0 && focusedIndex >= 0 && focusedIndex < filteredFiles.length) {
      const focusedFile = filteredFiles[focusedIndex];
      const fileRootId = `${focusedFile}::FILE_ROOT`;
      setLastExpandedId(fileRootId);
    }
  }, [focusedIndex, filteredFiles, setLastExpandedId]);

  // 검색 필드에서 키보드 네비게이션
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredFiles.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(Math.min(focusedIndex + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(Math.max(focusedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // FileItem의 handleClick will be triggered by clicking
      const focusedElement = fileListRef.current?.children[focusedIndex] as HTMLElement;
      focusedElement?.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  };

  // 우측 Shift 더블 탭으로 검색에 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 우측 Shift 키만 감지
      if (e.code === 'ShiftRight') {
        const now = Date.now();
        const timeSinceLastPress = now - lastShiftPressRef.current;

        // 500ms 이내에 두 번째 누름이면 포커스
        if (timeSinceLastPress < 500) {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select(); // 텍스트 전체 선택
          lastShiftPressRef.current = 0; // 리셋
        } else {
          lastShiftPressRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focused 파일을 화면에 표시 (스크롤)
  useEffect(() => {
    if (fileListRef.current && filteredFiles.length > 0) {
      const focusedElement = fileListRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex, filteredFiles.length]);

  return (
    <div className="flex-1 bg-[#0f172a] border-b border-vibe-border overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center justify-between bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-1">
          <FolderOpen className="w-2.5 h-2.5" />
          <span>Explorer</span>
        </div>
        <UploadFolderButton />
      </div>

      {/* Search Field */}
      <div className="px-2.5 py-1.5 border-b border-vibe-border/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search files... (Shift+Shift)"
            className="w-full bg-[#1e293b] text-slate-300 text-[11px] pl-6 pr-6 py-1 rounded border border-slate-700 focus:border-vibe-accent focus:outline-none placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              title="Clear search"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-1 text-[9px] text-slate-500">
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* File List */}
      <ul ref={fileListRef} className="flex-1 overflow-y-auto">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((fileName, index) => (
            <FileItem
              key={fileName}
              fileName={fileName}
              index={index}
            />
          ))
        ) : (
          <div className="px-3 py-6 text-[11px] text-slate-500 text-center">
            No files found matching "{searchQuery}"
          </div>
        )}
      </ul>
    </div>
  );
};

export default FileExplorer;
