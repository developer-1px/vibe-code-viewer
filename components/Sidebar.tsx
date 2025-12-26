import React, { useEffect, useState, useRef } from 'react';
import { Box, Code2, Eraser, FileCode, FolderOpen, FileText, Upload, Star } from 'lucide-react';
import { DEFAULT_FILES, DEFAULT_ENTRY_FILE } from '../constants';

interface SidebarProps {
  files: Record<string, string>;
  activeFile: string;
  entryFile: string;
  onFileChange: (fileName: string, content: string) => void;
  onSelectFile: (fileName: string) => void;
  onReset: () => void;
  onFolderUpload: (files: Record<string, string>) => void;
  onEntryFileChange: (fileName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFile,
  entryFile,
  onFileChange,
  onSelectFile,
  onReset,
  onFolderUpload,
  onEntryFileChange
}) => {
  const [localCode, setLocalCode] = useState(files[activeFile] || '');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const uploadedFiles: Record<string, string> = {};

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Only process .vue, .ts, .js files
      if (file.name.endsWith('.vue') || file.name.endsWith('.ts') || file.name.endsWith('.js')) {
        try {
          const content = await file.text();
          // Use webkitRelativePath for folder structure
          const path = file.webkitRelativePath || file.name;
          uploadedFiles[path] = content;
        } catch (err) {
          console.error(`Error reading file ${file.name}:`, err);
        }
      }
    }

    if (Object.keys(uploadedFiles).length > 0) {
      onFolderUpload(uploadedFiles);
    } else {
      alert('No .vue, .ts, or .js files found in the selected folder.');
    }
  };

  // Sync local code when active file changes
  useEffect(() => {
    setLocalCode(files[activeFile] || '');
  }, [activeFile, files]);

  // Debounce logic
  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      if (files[activeFile] !== localCode) {
          onFileChange(activeFile, localCode);
      }
      setIsTyping(false);
    }, 800); 

    return () => clearTimeout(handler);
  }, [localCode, activeFile]); // files dependency removed to avoid loop, we check equality

  const sortedFiles = Object.keys(files).sort();

  return (
    <div className="w-[400px] bg-vibe-panel border-r border-vibe-border flex flex-col h-full select-none shadow-xl z-20">
      <div className="p-4 border-b border-vibe-border bg-[#162032]">
        <h1 className="font-bold text-slate-100 flex items-center gap-2 mb-1">
            <Box className="w-5 h-5 text-vibe-accent" />
            Vibe Coder
        </h1>
        <p className="text-xs text-slate-500">Project Logic Visualization</p>
      </div>
      
      {/* File Explorer */}
      <div className="bg-[#0f172a] border-b border-vibe-border max-h-64 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  <span>Explorer</span>
              </div>
              <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-vibe-accent/10 text-vibe-accent hover:bg-vibe-accent/20 transition-colors"
                  title="Upload Vue project folder"
              >
                  <Upload className="w-3 h-3" />
                  Upload
              </button>
              <input
                  ref={fileInputRef}
                  type="file"
                  // @ts-ignore - webkitdirectory is not in standard HTML types
                  webkitdirectory=""
                  multiple
                  className="hidden"
                  onChange={handleFolderSelect}
              />
          </div>
          <ul>
              {sortedFiles.map(fileName => {
                  const isEntry = fileName === entryFile;
                  return (
                      <li
                        key={fileName}
                        className={`
                            px-4 py-1.5 text-xs font-mono cursor-pointer flex items-center gap-2 border-l-2 transition-colors group
                            ${activeFile === fileName
                                ? 'bg-vibe-accent/10 text-vibe-accent border-vibe-accent'
                                : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'}
                        `}
                      >
                          <div onClick={() => onSelectFile(fileName)} className="flex items-center gap-2 flex-1">
                              <FileText className="w-3 h-3 opacity-70" />
                              <span className="flex-1 truncate">{fileName}</span>
                          </div>
                          {isEntry && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" title="Entry file" />
                          )}
                          {!isEntry && fileName.endsWith('.vue') && (
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      onEntryFileChange(fileName);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-opacity"
                                  title="Set as entry file"
                              >
                                  <Star className="w-2.5 h-2.5" />
                              </button>
                          )}
                      </li>
                  );
              })}
          </ul>
      </div>

      <div className="flex-1 relative group flex flex-col min-h-0">
        <div className="px-4 py-1 bg-[#162032] text-[10px] text-slate-500 font-mono border-b border-white/5 truncate">
            {activeFile}
        </div>
        <textarea 
            className="flex-1 w-full bg-[#0b1221] text-xs font-mono text-slate-300 p-4 resize-none focus:outline-none focus:ring-1 focus:ring-vibe-accent/50 leading-relaxed scrollbar-hide selection:bg-vibe-accent/30"
            value={localCode}
            spellCheck={false}
            onChange={(e) => setLocalCode(e.target.value)}
        />
        
        {/* Status Indicator */}
        <div className="absolute bottom-4 right-4 pointer-events-none transition-opacity duration-300">
            {isTyping ? (
                 <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/20 animate-pulse">
                    Typing...
                 </span>
            ) : (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">
                    Synced
                 </span>
            )}
        </div>
      </div>

      <div className="p-3 border-t border-vibe-border bg-[#162032] flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileCode className="w-3 h-3" />
            <span>Vue 3 / TS Project</span>
        </div>
        <button 
            onClick={onReset}
            className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
            title="Reset to sample code"
        >
            <Eraser className="w-3 h-3" />
            Reset
        </button>
      </div>
    </div>
  );
};

export default Sidebar;