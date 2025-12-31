/**
 * FocusedIdentifiers - Focus mode의 active identifier 목록 표시
 * CodeCardReferences와 유사한 스타일
 */

import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { CanvasNode } from '../../../entities/CanvasNode';
import { activeLocalVariablesAtom, filesAtom } from '../../../store/atoms';
import { FocusedIdentifierItem } from './FocusedIdentifierItem';
import { renderCodeLinesDirect } from '../../../entities/CodeRenderer/lib/renderCodeLinesDirect';
import { renderVueFile } from '../../../entities/CodeRenderer/lib/renderVueFile';

interface FocusedIdentifiersProps {
  node: CanvasNode;
}

export interface IdentifierMetadata {
  name: string;
  hoverInfo?: string;
  kinds: string[];
}

export const FocusedIdentifiers: React.FC<FocusedIdentifiersProps> = ({ node }) => {
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);
  const files = useAtomValue(filesAtom);
  const focusedVariables = activeLocalVariables.get(node.id);

  // Process code lines to extract metadata (always call hooks)
  const processedLines = useMemo(() => {
    if (node.filePath.endsWith('.vue')) {
      return renderVueFile(node, files);
    }
    return renderCodeLinesDirect(node, files);
  }, [node, files]);

  // Extract metadata for each focused identifier
  const identifiersWithMetadata = useMemo(() => {
    if (!focusedVariables || focusedVariables.size === 0) {
      return [];
    }

    const metadata: IdentifierMetadata[] = [];

    focusedVariables.forEach((identifier) => {
      // Find first occurrence of this identifier in segments
      for (const line of processedLines) {
        const segment = line.segments.find(seg => seg.text === identifier);
        if (segment) {
          metadata.push({
            name: identifier,
            hoverInfo: segment.hoverInfo,
            kinds: segment.kinds
          });
          return; // Found, move to next identifier
        }
      }

      // If not found in segments, add without metadata
      metadata.push({
        name: identifier,
        kinds: []
      });
    });

    return metadata;
  }, [focusedVariables, processedLines]);

  // No focused variables - don't render
  if (identifiersWithMetadata.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 bg-[#0d1526] border-y border-white/5 py-2">
      <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        Focused Identifiers
      </div>
      {identifiersWithMetadata.map((metadata) => (
        <FocusedIdentifierItem
          key={metadata.name}
          metadata={metadata}
          nodeId={node.id}
        />
      ))}
    </div>
  );
};
