import { useAtomValue } from 'jotai';
import { ChevronDown, ChevronRight, Folder, GripVertical } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { graphDataAtom } from '@/app/model/atoms';
import { FileIcon } from '@/entities/SourceFileNode/ui/FileIcon';
import { analyzeDependencies, type DependencyItem } from '@/shared/dependencyAnalyzer';
import { EntityItem } from './EntityItem';
import { RelatedPanelItem } from './RelatedPanelItem';

export interface RelatedPanelProps {
  /** 현재 파일 경로 (이 파일의 의존성을 분석) */
  currentFilePath: string | null;
}

/**
 * RelatedPanel - 파일 의존성 탐색 뷰
 *
 * 현재 파일이 import하는 모든 파일을 재귀적으로 찾아서 토폴로지 정렬하여 표시
 * - Local Files: 프로젝트 내 파일들 (토폴로지 순서)
 * - NPM Modules: 외부 패키지들 (접기 가능)
 */
export function RelatedPanel({ currentFilePath }: RelatedPanelProps) {
  const graphData = useAtomValue(graphDataAtom);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [entitiesSectionCollapsed, setEntitiesSectionCollapsed] = useState(false); // ENTITIES 섹션 기본 펼쳐진 상태
  const [entityFileCollapseStates, setEntityFileCollapseStates] = useState<Map<string, boolean>>(new Map()); // 파일별 접기/펼치기
  const [localFilesSectionCollapsed, setLocalFilesSectionCollapsed] = useState(false); // LOCAL FILES 섹션 기본 펼쳐진 상태
  const [localFilesFolderCollapseStates, setLocalFilesFolderCollapseStates] = useState<Map<string, boolean>>(new Map()); // LOCAL FILES 폴더별 접기/펼치기
  const [npmSectionCollapsed, setNpmSectionCollapsed] = useState(true); // NPM 섹션 기본 접힌 상태
  const [importedBySectionCollapsed, setImportedBySectionCollapsed] = useState(false); // IMPORTED BY 섹션
  const [importedByFolderCollapseStates, setImportedByFolderCollapseStates] = useState<Map<string, boolean>>(new Map()); // IMPORTED BY 폴더별 접기/펼치기
  const resizeRef = useRef<HTMLDivElement>(null);

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 800;

  // 의존성 분석
  const dependencies = useMemo(() => {
    return analyzeDependencies(currentFilePath, graphData);
  }, [currentFilePath, graphData]);

  // Direct import 경로 추출 (현재 파일이 직접 import하는 파일들)
  const directImportPaths = useMemo(() => {
    if (!currentFilePath) return new Set<string>();
    const currentNode = graphData.nodes.find((n) => n.filePath === currentFilePath);
    if (!currentNode || !currentNode.dependencies) return new Set<string>();
    return new Set(currentNode.dependencies);
  }, [currentFilePath, graphData]);

  // Direct import 폴더 경로 추출 (LOCAL FILES용)
  const directLocalFolders = useMemo(() => {
    const folders = new Set<string>();
    directImportPaths.forEach((filePath) => {
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      folders.add(folderPath);
    });
    return folders;
  }, [directImportPaths]);

  // Direct imported by 파일 경로 (현재 파일을 직접 import하는 파일들)
  const directImportedByPaths = useMemo(() => {
    return new Set(dependencies.importedBy.map((item) => item.filePath));
  }, [dependencies.importedBy]);

  // Direct imported by 폴더 경로
  const directImportedByFolders = useMemo(() => {
    const folders = new Set<string>();
    directImportedByPaths.forEach((filePath) => {
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      folders.add(folderPath);
    });
    return folders;
  }, [directImportedByPaths]);

  // 파일별 그룹핑 헬퍼 함수
  const groupByFilePath = useCallback((items: DependencyItem[]) => {
    const groups = new Map<string, DependencyItem[]>();
    items.forEach((item) => {
      if (!groups.has(item.filePath)) {
        groups.set(item.filePath, []);
      }
      groups.get(item.filePath)!.push(item);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  // 폴더별 그룹핑 헬퍼 함수
  const groupByFolder = useCallback((items: DependencyItem[]) => {
    const groups = new Map<string, DependencyItem[]>();
    items.forEach((item) => {
      const folderPath = item.filePath.substring(0, item.filePath.lastIndexOf('/'));
      if (!groups.has(folderPath)) {
        groups.set(folderPath, []);
      }
      groups.get(folderPath)!.push(item);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  // Entities를 파일별로 그룹핑
  const entitiesGroupedByFile = useMemo(() => {
    return groupByFilePath(dependencies.entities);
  }, [dependencies.entities]);

  // Local Files를 폴더별로 그룹핑
  const localFilesGroupedByFolder = useMemo(() => {
    return groupByFolder(dependencies.localFiles);
  }, [dependencies.localFiles]);

  // Imported By (Direct + Indirect) 통합하여 폴더별로 그룹핑
  const importedByGroupedByFolder = useMemo(() => {
    const allImportedBy = [...dependencies.importedBy, ...dependencies.importedByIndirect];
    return groupByFolder(allImportedBy);
  }, [dependencies.importedBy, dependencies.importedByIndirect]);

  // 파일별 collapse toggle
  const toggleFileCollapse = (filePath: string) => {
    setEntityFileCollapseStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(filePath, !prev.get(filePath));
      return newMap;
    });
  };

  // 폴더별 collapse toggle 함수들
  const toggleLocalFilesFolder = (folderPath: string) => {
    setLocalFilesFolderCollapseStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(folderPath, !prev.get(folderPath));
      return newMap;
    });
  };

  const toggleImportedByFolder = (folderPath: string) => {
    setImportedByFolderCollapseStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(folderPath, !prev.get(folderPath));
      return newMap;
    });
  };

  // Resize logic (DefinitionPanel과 동일)
  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const containerRect = resizeRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  return (
    <div
      ref={resizeRef}
      className="border-l border-border-DEFAULT bg-bg-elevated flex flex-col flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group transition-colors ${
          isResizing ? 'bg-warm-300/60' : 'hover:bg-warm-300/30'
        }`}
        onMouseDown={handleResizeStart}
        style={{ zIndex: 10 }}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-12 rounded-r bg-bg-elevated/80 opacity-0 group-hover:opacity-100 transition-opacity border border-l-0 border-border-DEFAULT">
          <GripVertical size={12} className="text-warm-300" />
        </div>
      </div>

      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-border-DEFAULT px-2 flex-shrink-0">
        <span className="text-2xs font-medium text-text-tertiary normal-case">Related Files</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {!currentFilePath ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">No file selected</div>
        ) : dependencies.localFiles.length === 0 &&
          dependencies.npmModules.length === 0 &&
          dependencies.entities.length === 0 &&
          dependencies.importedBy.length === 0 &&
          dependencies.importedByIndirect.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            No dependencies found
          </div>
        ) : (
          <>
            {/* NPM Modules Section (Collapsible) */}
            {dependencies.npmModules.length > 0 && (
              <div>
                <div
                  className="flex items-center gap-1 px-2 py-1 text-3xs font-semibold text-text-faint uppercase tracking-label cursor-pointer hover:bg-bg-deep/50 transition-colors"
                  onClick={() => setNpmSectionCollapsed(!npmSectionCollapsed)}
                >
                  {npmSectionCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span>NPM Modules ({dependencies.npmModules.length})</span>
                </div>
                {!npmSectionCollapsed &&
                  dependencies.npmModules.map((item, idx) => (
                    <RelatedPanelItem key={`npm-${item.filePath}-${idx}`} item={item} depth={0} />
                  ))}
              </div>
            )}

            {/* Local Files Section - Folder/File Flat Structure */}
            {dependencies.localFiles.length > 0 && (
              <div className="mb-2">
                <div
                  className="flex items-center gap-1 px-2 py-1 text-3xs font-semibold text-text-faint uppercase tracking-label cursor-pointer hover:bg-bg-deep/50 transition-colors"
                  onClick={() => setLocalFilesSectionCollapsed(!localFilesSectionCollapsed)}
                >
                  {localFilesSectionCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span>Local Files ({dependencies.localFiles.length})</span>
                </div>
                {!localFilesSectionCollapsed &&
                  localFilesGroupedByFolder.map(([folderPath, files]) => {
                    const displayFolder = folderPath.includes('src/') ? folderPath.split('src/')[1] : folderPath;
                    const isCollapsed = localFilesFolderCollapseStates.get(folderPath) ?? true;
                    const isDirect = directLocalFolders.has(folderPath);

                    return (
                      <div key={folderPath} className="mb-0.5">
                        {/* Folder header */}
                        <div
                          className="flex items-center gap-2 px-2 py-0.5 text-2xs text-text-tertiary cursor-pointer hover:bg-bg-deep/30 transition-colors"
                          onClick={() => toggleLocalFilesFolder(folderPath)}
                          title={folderPath}
                        >
                          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          <Folder
                            size={11}
                            className={`shrink-0 ${isDirect ? 'text-blue-400' : 'text-text-tertiary'}`}
                          />
                          <span className="font-medium truncate font-mono">
                            {displayFolder} <span className="text-3xs text-text-faint">({files.length})</span>
                          </span>
                        </div>

                        {/* File list (flat) */}
                        {!isCollapsed &&
                          files.map((item, idx) => (
                            <RelatedPanelItem key={`local-${item.filePath}-${idx}`} item={item} depth={0} />
                          ))}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Imported By Section (역방향 의존성) */}
            {(dependencies.importedBy.length > 0 || dependencies.importedByIndirect.length > 0) && (
              <div className="mb-2">
                {/* Main IMPORTED BY Header */}
                <div
                  className="flex items-center gap-1 px-2 py-1 text-3xs font-semibold text-text-faint uppercase tracking-label cursor-pointer hover:bg-bg-deep/50 transition-colors"
                  onClick={() => setImportedBySectionCollapsed(!importedBySectionCollapsed)}
                >
                  {importedBySectionCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span>IMPORTED BY ({dependencies.importedBy.length + dependencies.importedByIndirect.length})</span>
                </div>

                {!importedBySectionCollapsed && (
                  <>
                    {/* Folder/File Structure */}
                    {importedByGroupedByFolder.map(([folderPath, files]) => {
                      const displayFolder = folderPath.includes('src/') ? folderPath.split('src/')[1] : folderPath;
                      const isCollapsed = importedByFolderCollapseStates.get(folderPath) ?? true;
                      const isDirect = directImportedByFolders.has(folderPath);

                      return (
                        <div key={folderPath} className="mb-0.5">
                          {/* Folder header */}
                          <div
                            className="flex items-center gap-2 px-2 py-0.5 text-2xs text-text-tertiary cursor-pointer hover:bg-bg-deep/30 transition-colors"
                            onClick={() => toggleImportedByFolder(folderPath)}
                            title={folderPath}
                          >
                            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                            <Folder
                              size={11}
                              className={`shrink-0 ${isDirect ? 'text-blue-400' : 'text-text-tertiary'}`}
                            />
                            <span className="font-medium truncate font-mono">
                              {displayFolder} <span className="text-3xs text-text-faint">({files.length})</span>
                            </span>
                          </div>

                          {/* File list (flat) */}
                          {!isCollapsed &&
                            files.map((item, idx) => (
                              <RelatedPanelItem key={`importedby-${item.filePath}-${idx}`} item={item} depth={0} />
                            ))}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
