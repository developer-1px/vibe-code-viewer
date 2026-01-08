/**
 * RelatedFilesView - Shows files related to the active file
 * Displays dependencies (imports) and dependents (imported by) in separate sections
 */

import { useAtomValue } from 'jotai';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filesAtom, fullNodeMapAtom } from '@/entities/AppView/model/atoms';
import { getDependencies, getDependents } from '@/entities/SourceFileNode/lib/getters';
import { activeTabAtom } from '@/features/File/OpenFiles/model/atoms';
import { resolvePath } from '@/shared/tsParser/utils/pathResolver';
import { FileExplorer } from '../FileExplorer/FileExplorer';

export function RelatedFilesView({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const files = useAtomValue(filesAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const activeTab = useAtomValue(activeTabAtom);

  const [isDependenciesCollapsed, setIsDependenciesCollapsed] = useState(false);
  const [isDependentsCollapsed, setIsDependentsCollapsed] = useState(false);

  // Calculate dependencies and dependents for active file
  const { dependencies, dependents } = useMemo(() => {
    if (!activeTab || !fullNodeMap.has(activeTab)) {
      return { dependencies: [], dependents: [] };
    }

    const node = fullNodeMap.get(activeTab);
    if (!node || node.type !== 'file') {
      return { dependencies: [], dependents: [] };
    }

    const deps = getDependencies(node, files, resolvePath);
    const dependentsFiles = getDependents(activeTab, fullNodeMap, files, resolvePath);

    return {
      dependencies: deps,
      dependents: dependentsFiles,
    };
  }, [activeTab, fullNodeMap, files]);

  // Filter files to only include dependencies
  const dependenciesFiles = useMemo(() => {
    const filtered: Record<string, string> = {};
    dependencies.forEach((filePath) => {
      if (files[filePath]) {
        filtered[filePath] = files[filePath];
      }
    });
    return filtered;
  }, [dependencies, files]);

  // Filter files to only include dependents
  const dependentsFilesRecord = useMemo(() => {
    const filtered: Record<string, string> = {};
    dependents.forEach((filePath) => {
      if (files[filePath]) {
        filtered[filePath] = files[filePath];
      }
    });
    return filtered;
  }, [dependents, files]);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center px-3 py-6 text-xs text-text-secondary text-center">
        Open a file to see related files
      </div>
    );
  }

  if (dependencies.length === 0 && dependents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-3 py-6 text-xs text-text-secondary text-center">
        No related files found
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Dependencies Section */}
      {dependencies.length > 0 && (
        <div className={isDependenciesCollapsed ? '' : 'flex-1 flex flex-col overflow-hidden'}>
          <button
            onClick={() => setIsDependenciesCollapsed(!isDependenciesCollapsed)}
            className="flex w-full h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0 hover:bg-bg-deep transition-colors"
          >
            <span className="text-2xs font-medium text-text-tertiary normal-case">
              Dependencies ({dependencies.length})
            </span>
            {isDependenciesCollapsed ? (
              <ChevronRight className="w-3 h-3 text-text-muted" />
            ) : (
              <ChevronDown className="w-3 h-3 text-text-muted" />
            )}
          </button>
          {!isDependenciesCollapsed && (
            <div className="flex-1 overflow-hidden">
              <FileExplorer containerRef={containerRef} filteredFiles={dependenciesFiles} />
            </div>
          )}
        </div>
      )}

      {/* Dependents Section */}
      {dependents.length > 0 && (
        <div className={isDependentsCollapsed ? '' : 'flex-1 flex flex-col overflow-hidden'}>
          <button
            onClick={() => setIsDependentsCollapsed(!isDependentsCollapsed)}
            className="flex w-full h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0 hover:bg-bg-deep transition-colors"
          >
            <span className="text-2xs font-medium text-text-tertiary normal-case">
              Dependents ({dependents.length})
            </span>
            {isDependentsCollapsed ? (
              <ChevronRight className="w-3 h-3 text-text-muted" />
            ) : (
              <ChevronDown className="w-3 h-3 text-text-muted" />
            )}
          </button>
          {!isDependentsCollapsed && (
            <div className="flex-1 overflow-hidden">
              <FileExplorer containerRef={containerRef} filteredFiles={dependentsFilesRecord} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
