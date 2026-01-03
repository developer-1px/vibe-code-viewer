/**
 * FileNavPanel - 우측 파일 네비게이션 패널
 * 파일 목록 표시 및 스크롤 네비게이션
 */

import React from 'react';
import { getFileName } from '../../../shared/pathUtils';
import { getFileIcon } from '../../FileExplorer/lib/getFileIcon';

const FileNavPanel = ({
  filePaths,
  currentFilePath,
  onFileClick,
}: {
  filePaths: string[];
  currentFilePath: string | null;
  onFileClick: (filePath: string) => void;
}) => {

  return (
    <div className="w-48 border-l border-border-DEFAULT bg-bg-elevated overflow-y-auto">
      {/* 헤더 */}
      <div className="sticky top-0 bg-bg-elevated border-b border-border-DEFAULT px-3 py-2 z-10">
        <span className="text-xs font-medium text-text-secondary">Files ({filePaths.length})</span>
      </div>

      {/* 파일 목록 */}
      <div className="flex flex-col">
        {filePaths.map((filePath) => {
          const fileName = getFileName(filePath);
          const isActive = filePath === currentFilePath;
          const FileIconComponent = getFileIcon(fileName);

          return (
            <button
              key={filePath}
              onClick={() => onFileClick(filePath)}
              className={`
                flex items-center gap-2 px-3 py-2 text-left transition-colors
                hover:bg-bg-hover
                ${isActive ? 'bg-warm-500/10 border-l-2 border-warm-300' : 'border-l-2 border-transparent'}
              `}
            >
              <FileIconComponent
                size={12}
                className={`shrink-0 ${isActive ? 'text-warm-300' : 'text-text-tertiary'}`}
              />
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs truncate ${
                    isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                  }`}
                >
                  {fileName}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FileNavPanel;
