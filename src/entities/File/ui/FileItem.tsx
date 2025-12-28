import React from 'react';
import { FileText, Star } from 'lucide-react';

interface FileItemProps {
  fileName: string;
  isActive: boolean;
  isEntry: boolean;
  onFileClick: (fileName: string) => void;
  onSetEntryFile: (fileName: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  fileName,
  isActive,
  isEntry,
  onFileClick,
  onSetEntryFile
}) => {
  const handleDoubleClick = () => {
    onSetEntryFile(fileName);
  };

  return (
    <li
      className={`
        px-4 py-1.5 text-xs font-mono cursor-pointer flex items-center gap-2 border-l-2 transition-colors group
        ${isActive
          ? 'bg-vibe-accent/10 text-vibe-accent border-vibe-accent'
          : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'}
      `}
    >
      {/* Star icon - Entry file indicator / Set entry button */}
      {isEntry ? (
        <span title="Entry file" className="flex-shrink-0 flex items-center">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        </span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetEntryFile(fileName);
          }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Set as entry file"
        >
          <Star className="w-3 h-3 text-slate-500 hover:text-yellow-500 transition-colors" />
        </button>
      )}

      {/* File name with icon - Single click to open, Double click to set as entry */}
      <div
        onClick={() => onFileClick(fileName)}
        onDoubleClick={handleDoubleClick}
        className="flex items-center gap-2 flex-1 min-w-0"
        title="Double-click to set as entry file"
      >
        <FileText className="w-3 h-3 opacity-70 flex-shrink-0" />
        <span className="flex-1 truncate">{fileName}</span>
      </div>
    </li>
  );
};

export default FileItem;
