import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  filesAtom,
  activeFileAtom,
  entryFileAtom,
  isSidebarOpenAtom,
  graphDataAtom,
  parseErrorAtom,
  layoutNodesAtom,
  layoutLinksAtom,
  fullNodeMapAtom,
  templateRootIdAtom,
  transformAtom,
  visibleNodeIdsAtom,
  lastExpandedIdAtom,
  foldedLinesAtom,
  targetLineAtom
} from '../../store/atoms';

const JotaiDevTools = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAtom, setSelectedAtom] = useState<string | null>(null);

  // Read all atoms
  const files = useAtomValue(filesAtom);
  const activeFile = useAtomValue(activeFileAtom);
  const entryFile = useAtomValue(entryFileAtom);
  const isSidebarOpen = useAtomValue(isSidebarOpenAtom);
  const graphData = useAtomValue(graphDataAtom);
  const parseError = useAtomValue(parseErrorAtom);
  const layoutNodes = useAtomValue(layoutNodesAtom);
  const layoutLinks = useAtomValue(layoutLinksAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const templateRootId = useAtomValue(templateRootIdAtom);
  const transform = useAtomValue(transformAtom);
  const visibleNodeIds = useAtomValue(visibleNodeIdsAtom);
  const lastExpandedId = useAtomValue(lastExpandedIdAtom);
  const foldedLines = useAtomValue(foldedLinesAtom);
  const targetLine = useAtomValue(targetLineAtom);

  const atoms = [
    { name: 'filesAtom', value: files, type: 'Record<string, string>' },
    { name: 'activeFileAtom', value: activeFile, type: 'string | null' },
    { name: 'entryFileAtom', value: entryFile, type: 'string' },
    { name: 'isSidebarOpenAtom', value: isSidebarOpen, type: 'boolean' },
    { name: 'graphDataAtom', value: graphData, type: 'GraphData | null' },
    { name: 'parseErrorAtom', value: parseError, type: 'string | null' },
    { name: 'layoutNodesAtom', value: layoutNodes, type: 'CanvasNode[]' },
    { name: 'layoutLinksAtom', value: layoutLinks, type: 'Link[]' },
    { name: 'fullNodeMapAtom', value: fullNodeMap, type: 'Map<string, VariableNode>' },
    { name: 'templateRootIdAtom', value: templateRootId, type: 'string | null' },
    { name: 'transformAtom', value: transform, type: 'Transform' },
    { name: 'visibleNodeIdsAtom', value: visibleNodeIds, type: 'Set<string>' },
    { name: 'lastExpandedIdAtom', value: lastExpandedId, type: 'string | null' },
    { name: 'foldedLinesAtom', value: foldedLines, type: 'Map<string, Set<number>>' },
    { name: 'targetLineAtom', value: targetLine, type: '{ nodeId: string; lineNum: number } | null' }
  ];

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return String(value);
    if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
      return JSON.stringify(value);
    }
    if (value instanceof Set) {
      return `Set(${value.size}) [${Array.from(value).slice(0, 3).join(', ')}${value.size > 3 ? '...' : ''}]`;
    }
    if (value instanceof Map) {
      return `Map(${value.size}) {${Array.from(value.keys()).slice(0, 2).join(', ')}${value.size > 2 ? '...' : ''}}`;
    }
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return `Object {${keys.slice(0, 2).join(', ')}${keys.length > 2 ? '...' : ''}}`;
    }
    return String(value);
  };

  const formatDetailedValue = (value: any): string => {
    if (value === null || value === undefined) return String(value);
    if (value instanceof Set) {
      return JSON.stringify(Array.from(value), null, 2);
    }
    if (value instanceof Map) {
      return JSON.stringify(Object.fromEntries(value), null, 2);
    }
    return JSON.stringify(value, null, 2);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[9999] px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono rounded shadow-lg transition-colors"
        title="Open Jotai DevTools"
      >
        DevTools
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] w-96 max-h-[80vh] bg-slate-900 border border-purple-500/30 rounded-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/30 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
          <h3 className="text-sm font-bold text-purple-300 font-mono">Jotai DevTools</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Atom List */}
      <div className="flex-1 overflow-y-auto p-2">
        {atoms.map((atom) => (
          <div
            key={atom.name}
            className={`mb-2 rounded border transition-colors ${
              selectedAtom === atom.name
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <button
              onClick={() => setSelectedAtom(selectedAtom === atom.name ? null : atom.name)}
              className="w-full px-3 py-2 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-semibold text-purple-300 truncate">
                    {atom.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {atom.type}
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                  {formatValue(atom.value)}
                </div>
              </div>
            </button>

            {/* Expanded View */}
            {selectedAtom === atom.name && (
              <div className="px-3 pb-3 border-t border-slate-700 mt-2 pt-2">
                <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto bg-slate-950 p-2 rounded max-h-60 overflow-y-auto">
                  {formatDetailedValue(atom.value)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-purple-500/30 bg-slate-950 text-[10px] font-mono text-slate-500">
        <div className="flex justify-between">
          <span>Atoms: {atoms.length}</span>
          <span>Nodes: {layoutNodes.length}</span>
          <span>Visible: {visibleNodeIds.size}</span>
        </div>
      </div>
    </div>
  );
};

export default JotaiDevTools;
