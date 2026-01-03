/**
 * DeadCodePanel - Dead Code Analyzer Panel
 * 사용되지 않는 코드를 정적 분석으로 찾아서 보여줍니다
 */

import * as React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Package,
  FunctionSquare,
  Box,
  Loader2,
  Sparkles,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { cn } from '@/lib/utils';
import {
  graphDataAtom,
  deadCodeResultsAtom,
  selectedDeadCodeItemsAtom,
  deadCodePanelOpenAtom,
  targetLineAtom,
  viewModeAtom,
} from '../../store/atoms';
import { analyzeDeadCode, type DeadCodeItem } from '../../shared/deadCodeAnalyzer';
import { RefactoringPromptDialog } from '../../features/RefactoringPrompt/RefactoringPromptDialog';
import { useOpenFile } from '../../features/Files/lib/useOpenFile';
import type { FolderNode } from '../AppSidebar/model/types';
import { DeadCodeTreeRenderer } from './ui/DeadCodeTreeRenderer';

export interface DeadCodePanelProps {
  className?: string;
}

interface CategoryState {
  unusedExports: boolean;
  unusedImports: boolean;
  deadFunctions: boolean;
  unusedVariables: boolean;
}

/**
 * Build nested folder tree from flat dead code items
 * Compatible with FolderNode structure used in FileTreeRenderer
 */
function buildDeadCodeTree(items: DeadCodeItem[]): FolderNode[] {
  const rootChildren: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  // Group items by file path
  const fileMap = new Map<string, DeadCodeItem[]>();
  items.forEach(item => {
    const existing = fileMap.get(item.filePath) || [];
    existing.push(item);
    fileMap.set(item.filePath, existing);
  });

  // Build nested tree
  fileMap.forEach((fileItems, filePath) => {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];

    // Create file node
    const fileNode: FolderNode = {
      type: 'file',
      name: fileName,
      path: filePath,
      filePath: filePath
    };

    // If no folders (root file), add to root
    if (parts.length === 1) {
      rootChildren.push(fileNode);
      return;
    }

    // Build folder hierarchy
    let currentParent: FolderNode[] = rootChildren;
    let currentPath = '';

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      // Find or create folder at current level
      let folder = currentParent.find(n => n.type === 'folder' && n.name === folderName);

      if (!folder) {
        folder = {
          type: 'folder',
          name: folderName,
          path: currentPath,
          children: []
        };
        currentParent.push(folder);
        folderMap.set(currentPath, folder);
      }

      // Move to next level
      currentParent = folder.children!;
    }

    // Add file to deepest folder
    currentParent.push(fileNode);
  });

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: FolderNode[]): FolderNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    nodes.forEach(node => {
      if (node.type === 'folder' && node.children) {
        sortNodes(node.children);
      }
    });

    return nodes;
  };

  return sortNodes(rootChildren);
}

/**
 * DeadCodePanel - Dead code 분석 결과 표시 패널
 */
export function DeadCodePanel({ className }: DeadCodePanelProps) {
  const graphData = useAtomValue(graphDataAtom);
  const [deadCodeResults, setDeadCodeResults] = useAtom(deadCodeResultsAtom);
  const [selectedItems, setSelectedItems] = useAtom(selectedDeadCodeItemsAtom);
  const setDeadCodePanelOpen = useSetAtom(deadCodePanelOpenAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [expandedCategories, setExpandedCategories] = React.useState<CategoryState>({
    unusedExports: true,
    unusedImports: true,
    deadFunctions: true,
    unusedVariables: true,
  });
  const [collapsedFolders, setCollapsedFolders] = React.useState<Set<string>>(new Set());
  const [showPromptDialog, setShowPromptDialog] = React.useState(false);
  const [copiedAll, setCopiedAll] = React.useState(false);
  const { openFile } = useOpenFile();

  // Analyze dead code on mount
  React.useEffect(() => {
    if (graphData && !deadCodeResults) {
      setIsAnalyzing(true);
      // Run analysis in next tick to avoid blocking UI
      setTimeout(() => {
        const results = analyzeDeadCode(graphData);
        setDeadCodeResults(results);
        setIsAnalyzing(false);
      }, 0);
    }
  }, [graphData, deadCodeResults, setDeadCodeResults]);

  const toggleCategory = (category: keyof CategoryState) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const getItemKey = (item: DeadCodeItem): string => {
    return `${item.filePath}:${item.line}:${item.symbolName}`;
  };

  const handleItemClick = (item: DeadCodeItem) => {
    // Open file in IDE and scroll to line
    openFile(item.filePath);
    setTargetLine({ nodeId: item.filePath, lineNum: item.line });
    setViewMode('ide');
    // Don't close panel, just switch to IDE view
  };

  const toggleItemSelection = (item: DeadCodeItem) => {
    const key = getItemKey(item);
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const toggleCategorySelection = (items: DeadCodeItem[]) => {
    const allSelected = items.every(item => selectedItems.has(getItemKey(item)));
    const newSelected = new Set(selectedItems);

    if (allSelected) {
      // Deselect all in this category
      items.forEach(item => newSelected.delete(getItemKey(item)));
    } else {
      // Select all in this category
      items.forEach(item => newSelected.add(getItemKey(item)));
    }

    setSelectedItems(newSelected);
  };

  const handleCopyAllPrompt = async () => {
    if (!deadCodeResults) return;

    // Generate prompt from all items
    const { generateRefactoringPrompt } = await import('../../features/RefactoringPrompt/lib/promptGenerator');

    // Select all items
    const allItems = [
      ...deadCodeResults.unusedExports,
      ...deadCodeResults.unusedImports,
      ...deadCodeResults.deadFunctions,
      ...deadCodeResults.unusedVariables,
    ];
    const allKeys = new Set(allItems.map(getItemKey));

    const prompt = generateRefactoringPrompt(allKeys, deadCodeResults);

    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'unusedImports':
        return <Package size={14} className="text-emerald-300" />; // 가장 안전 - 초록
      case 'unusedVariables':
        return <Box size={14} className="text-cyan-300" />; // 안전 - 청록
      case 'deadFunctions':
        return <FunctionSquare size={14} className="text-amber-300" />; // 주의 - 노랑
      case 'unusedExports':
        return <Package size={14} className="text-orange-400" />; // 위험 - 주황/빨강
      default:
        return <AlertTriangle size={14} className="text-text-muted" />;
    }
  };

  const renderCategory = (
    title: string,
    items: DeadCodeItem[],
    categoryKey: keyof CategoryState
  ) => {
    const isExpanded = expandedCategories[categoryKey];
    const allSelected = items.length > 0 && items.every(item => selectedItems.has(getItemKey(item)));
    const someSelected = items.some(item => selectedItems.has(getItemKey(item))) && !allSelected;

    // Build tree structure from items
    const tree = buildDeadCodeTree(items);

    return (
      <div className="rounded overflow-hidden">
        {/* Category Header */}
        <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 transition-colors border-b border-border-DEFAULT">
          <button
            onClick={() => toggleCategory(categoryKey)}
            className="flex items-center gap-1.5 flex-1"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-text-muted shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-text-muted shrink-0" />
            )}
            {renderCategoryIcon(categoryKey)}
            <span className="text-xs text-text-primary font-medium">{title}</span>
            <span className="text-xs text-text-muted">({items.length})</span>
          </button>

          {items.length > 0 && (
            <Checkbox
              checked={allSelected}
              className={cn(someSelected && 'data-[state=checked]:bg-warm-300/50')}
              onCheckedChange={() => toggleCategorySelection(items)}
            />
          )}
        </div>

        {/* Category Items - Tree View */}
        {isExpanded && items.length > 0 && (
          <div className="mt-0.5">
            <DeadCodeTreeRenderer
              fileTree={tree}
              collapsedFolders={collapsedFolders}
              deadCodeItems={items}
              selectedItems={selectedItems}
              onFileClick={(filePath, line) => {
                const item = items.find(i => i.filePath === filePath && i.line === line);
                if (item) handleItemClick(item);
              }}
              onToggleFolder={toggleFolder}
              onToggleSelection={toggleItemSelection}
              getItemKey={getItemKey}
            />
          </div>
        )}

        {isExpanded && items.length === 0 && (
          <div className="px-4 py-3 text-xs text-text-muted text-center">
            No issues found
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex h-full flex-col bg-bg-surface border-r border-border-DEFAULT', className)}>
      {/* Header */}
      <div className="p-3 space-y-2 border-b border-border-DEFAULT">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-warm-300" />
            <span className="text-xs font-medium text-text-primary uppercase tracking-wide">
              Dead Code Analyzer
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setDeadCodePanelOpen(false)}
          >
            <X size={14} />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 justify-center text-xs gap-2"
            onClick={() => {
              setIsAnalyzing(true);
              setDeadCodeResults(null);
              setSelectedItems(new Set());
              setTimeout(() => {
                if (graphData) {
                  const results = analyzeDeadCode(graphData);
                  setDeadCodeResults(results);
                }
                setIsAnalyzing(false);
              }, 0);
            }}
            disabled={isAnalyzing || !graphData}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                Re-analyze
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-8 flex-1 justify-center text-xs gap-2"
            onClick={handleCopyAllPrompt}
            disabled={!deadCodeResults || deadCodeResults.totalCount === 0}
          >
            {copiedAll ? (
              <>
                <Check size={14} className="text-emerald-300" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy All Prompt
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="px-3 py-2 text-xs text-text-muted border-b border-border-DEFAULT">
        {isAnalyzing ? (
          <span>Analyzing project for dead code...</span>
        ) : deadCodeResults ? (
          <div className="space-y-1">
            <div>
              Total issues: <span className="text-warm-300 font-medium">{deadCodeResults.totalCount}</span>
            </div>
            <div className="text-2xs">
              Selected: <span className="text-warm-300">{selectedItems.size}</span> items
            </div>
          </div>
        ) : (
          <span>No analysis results yet</span>
        )}
      </div>

      {/* Results List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {deadCodeResults && !isAnalyzing && (
            <>
              {/* 삭제해도 안전한 순서대로 정렬 */}
              {renderCategory('Unused Imports', deadCodeResults.unusedImports, 'unusedImports')}
              {renderCategory('Unused Variables', deadCodeResults.unusedVariables, 'unusedVariables')}
              {renderCategory('Dead Functions', deadCodeResults.deadFunctions, 'deadFunctions')}
              {renderCategory('Unused Exports', deadCodeResults.unusedExports, 'unusedExports')}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Generate Prompt Button */}
      {deadCodeResults && selectedItems.size > 0 && (
        <div className="p-3 border-t border-border-DEFAULT">
          <Button
            variant="default"
            size="sm"
            className="w-full justify-center gap-2"
            onClick={() => setShowPromptDialog(true)}
          >
            <Sparkles size={14} />
            Generate AI Refactoring Prompt ({selectedItems.size})
          </Button>
        </div>
      )}

      {/* Refactoring Prompt Dialog */}
      {deadCodeResults && (
        <RefactoringPromptDialog
          open={showPromptDialog}
          onOpenChange={setShowPromptDialog}
          selectedItemKeys={selectedItems}
          deadCodeResults={deadCodeResults}
        />
      )}
    </div>
  );
}
