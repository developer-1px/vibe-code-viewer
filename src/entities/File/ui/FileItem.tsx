import React, { useMemo, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { FileText, Star } from 'lucide-react';
import type { FileItemProps } from '../model/types';
import { getFuzzyMatchIndices, splitFilePath } from '../lib/fuzzyMatch';
import { entryFileAtom, lastExpandedIdAtom, fileSearchQueryAtom, focusedFileIndexAtom } from '../../../store/atoms';

const FileItem: React.FC<FileItemProps> = ({ fileName, index }) => {
  // Atoms
  const entryFile = useAtomValue(entryFileAtom);
  const setEntryFile = useSetAtom(entryFileAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const searchQuery = useAtomValue(fileSearchQueryAtom);
  const focusedIndex = useAtomValue(focusedFileIndexAtom);
  const setFocusedIndex = useSetAtom(focusedFileIndexAtom);

  // Computed values
  const isEntry = fileName === entryFile;
  const isFocused = index === focusedIndex;
  // 파일명과 폴더 경로 분리
  const { name, folder } = useMemo(() => splitFilePath(fileName), [fileName]);

  // 검색어 하이라이트를 위한 파일명 분리 (Fuzzy)
  const highlightedName = useMemo(() => {
    const matchIndices = getFuzzyMatchIndices(name, searchQuery);
    if (matchIndices.length === 0) return [{ text: name, isHighlight: false }];

    const matchSet = new Set(matchIndices);
    return name.split('').map((char, index) => ({
      text: char,
      isHighlight: matchSet.has(index)
    }));
  }, [name, searchQuery]);

  // 폴더 경로도 하이라이트 (Fuzzy)
  const highlightedFolder = useMemo(() => {
    if (!folder) return [{ text: '', isHighlight: false }];

    const matchIndices = getFuzzyMatchIndices(folder, searchQuery);
    if (matchIndices.length === 0) return [{ text: folder, isHighlight: false }];

    const matchSet = new Set(matchIndices);
    return folder.split('').map((char, index) => ({
      text: char,
      isHighlight: matchSet.has(index)
    }));
  }, [folder, searchQuery]);

  // Handlers
  const handleClick = useCallback(() => {
    if (isEntry) {
      // 이미 엔트리 파일이면 해당 노드로 이동
      const fileRootId = `${fileName}::FILE_ROOT`;
      setLastExpandedId(fileRootId);
    } else {
      // 엔트리 파일이 아니면 엔트리로 설정
      setEntryFile(fileName);
    }
  }, [isEntry, fileName, setEntryFile, setLastExpandedId]);

  const handleMouseEnter = useCallback(() => {
    setFocusedIndex(index);
  }, [index, setFocusedIndex]);

  return (
    <li
      data-file-index={index}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`
        px-3 py-1 text-[11px] font-mono cursor-pointer flex items-center gap-2 border-l-2 transition-colors group
        ${isEntry
          ? 'bg-vibe-accent/10 text-vibe-accent border-vibe-accent'
          : isFocused
          ? 'bg-blue-500/10 text-slate-200 border-blue-500'
          : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'}
      `}
    >
      {/* Star icon - Entry file indicator */}
      <span title={isEntry ? "Entry file - Click to navigate" : "Click to set as entry file"} className="flex-shrink-0 flex items-center">
        <Star className={`w-2.5 h-2.5 ${isEntry ? 'text-yellow-500 fill-yellow-500' : 'text-slate-500 group-hover:text-yellow-500'} transition-colors`} />
      </span>

      {/* File name with icon (왼쪽) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <FileText className={`w-2.5 h-2.5 opacity-70 flex-shrink-0 ${isEntry ? 'text-vibe-accent' : ''}`} />
        <span className={`font-medium ${isEntry ? 'text-vibe-accent' : isFocused ? 'text-slate-100' : 'text-slate-200'}`}>
          {highlightedName.map((part, i) => (
            part.isHighlight ? (
              <mark key={i} className="bg-yellow-400/30 text-yellow-200">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            )
          ))}
        </span>
      </div>

      {/* Folder path (오른쪽) */}
      {folder && (
        <span className="ml-auto text-[10px] text-slate-500 truncate">
          {highlightedFolder.map((part, i) => (
            part.isHighlight ? (
              <mark key={i} className="bg-yellow-400/30 text-yellow-200">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            )
          ))}
        </span>
      )}
    </li>
  );
};

export default FileItem;
