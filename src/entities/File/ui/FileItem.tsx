import React, { useMemo, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { FileJson as IconFileJson, FileCode as IconFileCode, Component as IconComponent } from 'lucide-react';
import type { FileItemProps } from '../model/types';
import { getFuzzyMatchIndices, splitFilePath } from '../lib/fuzzyMatch';
import { entryFileAtom, lastExpandedIdAtom, fileSearchQueryAtom, focusedFileIndexAtom } from '../../../store/atoms';

// 확장자에 따른 아이콘 반환
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'vue':
      return { Icon: IconComponent, color: 'text-emerald-400' };
    case 'tsx':
    case 'jsx':
      return { Icon: IconComponent, color: 'text-blue-400' };
    case 'ts':
    case 'js':
      return { Icon: IconFileCode, color: 'text-yellow-400' };
    case 'json':
      return { Icon: IconFileJson, color: 'text-orange-400' };
    default:
      return { Icon: IconFileCode, color: 'text-slate-400' };
  }
};

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

  // 파일 아이콘
  const { Icon: FileIcon, color: iconColor } = useMemo(() => getFileIcon(fileName), [fileName]);

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
      {/* File icon based on extension */}
      <FileIcon className={`w-2.5 h-2.5 flex-shrink-0 opacity-40 ${isEntry ? 'text-vibe-accent opacity-70' : iconColor}`} />

      {/* File name */}
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

    </li>
  );
};

export default FileItem;
