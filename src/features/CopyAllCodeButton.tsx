import { useAtomValue } from 'jotai';
import { Check as IconCheck, Copy as IconCopy } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { layoutNodesAtom } from '@/widgets/MainContents/PipelineCanvas/model/atoms';
import { fullNodeMapAtom } from '../app/model/atoms';

const CopyAllCodeButton: React.FC = () => {
  const layoutNodes = useAtomValue(layoutNodesAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const [isAllCopied, setIsAllCopied] = useState(false);

  const handleCopyAllCode = async () => {
    try {
      // Calculate dependency depth for each node (deeper = more dependencies)
      const getDepth = (nodeId: string, visited = new Set<string>()): number => {
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const node = fullNodeMap.get(nodeId);
        if (!node || node.dependencies.length === 0) return 0;

        const depths = node.dependencies.map((depId) => getDepth(depId, new Set(visited)));
        return 1 + Math.max(...depths, 0);
      };

      // Sort nodes by dependency depth (reverse: dependencies first, dependents last)
      const sortedNodes = [...layoutNodes].sort((a, b) => {
        const depthA = getDepth(a.id);
        const depthB = getDepth(b.id);
        if (depthA !== depthB) return depthA - depthB; // Shallower (fewer deps) first
        return a.filePath.localeCompare(b.filePath); // Same depth: sort by file path
      });

      // Simple format: Path -> Code
      let text = '# Code Context (Dependency Order)\n\n';
      text += `Total: ${sortedNodes.length} blocks\n\n`;
      text += '---\n\n';

      sortedNodes.forEach((node, index) => {
        // File path and position
        text += `## ${index + 1}. ${node.filePath}\n\n`;

        // Code block
        text += '```typescript\n';
        text += node.codeSnippet;
        text += '\n```\n\n';
      });

      await navigator.clipboard.writeText(text);
      setIsAllCopied(true);
      setTimeout(() => setIsAllCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy all code:', err);
    }
  };

  if (layoutNodes.length === 0) return null;

  return (
    <div className="absolute bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={handleCopyAllCode}
        className="bg-theme-panel/90 backdrop-blur px-4 py-2.5 rounded-lg border border-theme-border text-theme-text-primary hover:text-theme-text-accent hover:border-theme-text-accent flex items-center gap-2 text-sm shadow-xl transition-all font-medium group"
        title="Copy all visible code for AI analysis"
      >
        {isAllCopied ? (
          <>
            <IconCheck className="w-4 h-4 text-theme-success" />
            <span className="text-theme-success">Copied!</span>
          </>
        ) : (
          <>
            <IconCopy className="w-4 h-4 text-theme-purple group-hover:text-theme-purple/80" />
            <span>Copy All for AI</span>
            <span className="text-xs text-theme-text-tertiary bg-theme-canvas/50 px-1.5 py-0.5 rounded">
              {layoutNodes.length} nodes
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default CopyAllCodeButton;
