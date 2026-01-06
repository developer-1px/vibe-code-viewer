import { useAtomValue, useSetAtom } from 'jotai';
import { FileCode, AlertCircle as IconAlertCircle, Box as IconBox, Settings, X } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { parseErrorAtom } from '../../app/model/atoms';
import { type ThemeName, useTheme } from '../../app/theme/ThemeProvider';
import { getFileName } from '../../shared/pathUtils';
import { layoutNodesAtom, openedFilesAtom, selectedNodeIdsAtom } from '../PipelineCanvas/model/atoms';

const Header: React.FC = () => {
  const parseError = useAtomValue(parseErrorAtom);
  const openedFiles = useAtomValue(openedFilesAtom);
  const setOpenedFiles = useSetAtom(openedFilesAtom);
  const setSelectedNodeIds = useSetAtom(selectedNodeIdsAtom);
  const layoutNodes = useAtomValue(layoutNodesAtom);
  const { themeName, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Extract filenames from paths and pair with full paths
  const fileItems = useMemo(() => {
    return Array.from(openedFiles).map((path) => ({
      path,
      name: getFileName(path),
    }));
  }, [openedFiles]);

  // Handle file chip click - select all nodes from this file
  const handleFileClick = (filePath: string) => {
    const fileNodes = layoutNodes.filter((node) => node.filePath === filePath);
    const nodeIds = new Set(fileNodes.map((node) => node.id));
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
    <header className="h-10 bg-theme-header border-b border-theme-border flex items-center px-4 relative z-50 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-sm text-theme-text-primary flex items-center gap-2">
          <IconBox className="w-4 h-4 text-theme-text-accent" />
          Teo's IDE
        </h1>

        <span className="text-xs text-theme-text-secondary">Project Logic Visualization</span>
      </div>

      {/* Center - Opened OpenFiles */}
      {fileItems.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-theme-text-accent flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            {fileItems.map((file) => (
              <button
                key={file.path}
                onClick={() => handleFileClick(file.path)}
                className="group flex items-center gap-1 px-2 py-0.5 bg-theme-active hover:bg-theme-focus border border-theme-border hover:border-theme-border-strong rounded text-[11px] font-medium text-theme-text-secondary hover:text-theme-text-primary transition-all"
                title={file.path}
              >
                <span>{file.name}</span>
                <X
                  className="w-3 h-3 text-theme-text-tertiary hover:text-theme-error opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveFile(e, file.path)}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center text-xs ml-auto">
        {parseError ? (
          <span className="px-2 py-0.5 bg-theme-error/10 text-theme-error rounded text-2xs border border-theme-error/20 flex items-center gap-1">
            <IconAlertCircle className="w-3 h-3" />
            Syntax Error
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-theme-success/10 text-theme-success rounded text-2xs border border-theme-success/20">
            Project Analysis Active
          </span>
        )}

        {/* Theme Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-1.5 hover:bg-theme-hover rounded transition-colors"
            title="Theme Settings"
          >
            <Settings className="w-4 h-4 text-theme-text-secondary hover:text-theme-text-primary" />
          </button>

          {/* Theme Menu Dropdown */}
          {showThemeMenu && (
            <div className="absolute right-0 top-full mt-1 bg-theme-panel border border-theme-border rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden">
              <div className="px-3 py-2 border-b border-theme-border">
                <div className="text-xs font-semibold text-theme-text-primary">Code Theme</div>
              </div>
              <div className="py-1">
                {(['default', 'jetbrains', 'vscode'] as ThemeName[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => {
                      setTheme(theme);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      themeName === theme
                        ? 'bg-theme-active text-theme-text-accent font-medium'
                        : 'text-theme-text-secondary hover:bg-theme-hover hover:text-theme-text-primary'
                    }`}
                  >
                    {theme === 'default' && 'Figma Dark'}
                    {theme === 'jetbrains' && 'JetBrains New UI'}
                    {theme === 'vscode' && 'VSCode Dark+'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
