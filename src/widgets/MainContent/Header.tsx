
import React, { useMemo } from 'react';
import { Box as IconBox, AlertCircle as IconAlertCircle, FileCode, X } from 'lucide-react';
import { useAtomValue, useSetAtom } from 'jotai';
import { openedFilesAtom, selectedNodeIdsAtom, layoutNodesAtom, parseErrorAtom } from '../../store/atoms';

const Header: React.FC = () => {
  const parseError = useAtomValue(parseErrorAtom);
  const openedFiles = useAtomValue(openedFilesAtom);
  const setOpenedFiles = useSetAtom(openedFilesAtom);
  const setSelectedNodeIds = useSetAtom(selectedNodeIdsAtom);
  const layoutNodes = useAtomValue(layoutNodesAtom);

  // Extract filenames from paths and pair with full paths
  const fileItems = useMemo(() => {
    return Array.from(openedFiles).map(path => ({
      path,
      name: path.split('/').pop() || path
    }));
  }, [openedFiles]);

  // Handle file chip click - select all nodes from this file
  const handleFileClick = (filePath: string) => {
    const fileNodes = layoutNodes.filter(node => node.filePath === filePath);
    const nodeIds = new Set(fileNodes.map(node => node.id));
    setSelectedNodeIds(nodeIds);
  };

  // Handle file remove
  const handleRemoveFile = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    const newOpenedFiles = new Set(openedFiles);
    newOpenedFiles.delete(filePath);
    setOpenedFiles(newOpenedFiles);
  };

  return (
    <header className="h-10 bg-vibe-panel border-b border-vibe-border flex items-center px-4 relative z-50 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <IconBox className="w-4 h-4 text-vibe-accent" />
          Teo's Devtools
        </h1>

        <span className="text-xs text-slate-500">Project Logic Visualization</span>
      </div>

      {/* Center - Opened Files */}
      {fileItems.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-vibe-accent flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            {fileItems.map((file) => (
              <button
                key={file.path}
                onClick={() => handleFileClick(file.path)}
                className="group flex items-center gap-1 px-2 py-0.5 bg-vibe-accent/10 hover:bg-vibe-accent/20 border border-vibe-accent/20 hover:border-vibe-accent/40 rounded text-[11px] font-medium text-slate-300 hover:text-slate-100 transition-all"
                title={file.path}
              >
                <span>{file.name}</span>
                <X
                  className="w-3 h-3 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveFile(e, file.path)}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center text-xs ml-auto">
        {parseError ? (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] border border-red-500/20 flex items-center gap-1">
            <IconAlertCircle className="w-3 h-3" />
            Syntax Error
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-vibe-accent/10 text-vibe-accent rounded text-[10px] border border-vibe-accent/20">
            Project Analysis Active
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
