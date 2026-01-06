/**
 * CanvasCodeCard - Canvas 내에서 위치를 가진 CodeCard 래퍼
 * 위치 계산 및 offset 적용, 선택 및 드래그 기능
 */

import { useDrag } from '@use-gesture/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { useMemo, useRef } from 'react';
import { focusedPaneAtom } from '../../../app/model/atoms.ts';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types.ts';
import CodeCard from '../../CodeCard/CodeCard.tsx';
import { cardPositionsAtom, selectedNodeIdsAtom, transformAtom } from './model/atoms.ts';

interface CanvasCodeCardProps {
  node: CanvasNode;
}

export const CanvasCodeCard: React.FC<CanvasCodeCardProps> = ({ node }) => {
  const [cardPositions, setCardPositions] = useAtom(cardPositionsAtom);
  const [selectedNodeIds, setSelectedNodeIds] = useAtom(selectedNodeIdsAtom);
  const transform = useAtomValue(transformAtom);
  const setFocusedPane = useSetAtom(focusedPaneAtom);

  const offset = cardPositions.get(node.id) || { x: 0, y: 0 };
  const isSelected = selectedNodeIds.has(node.id);

  const initialOffsets = useRef(new Map<string, { x: number; y: number }>());
  const nodesToDrag = useRef<Set<string>>(new Set());

  // useDrag 훅을 사용한 드래그 처리
  const bind = useDrag(({ movement: [mx, my], first, event, memo }) => {
    // Prevent if clicking on interactive elements
    const target = event?.target as HTMLElement;
    if (target?.tagName === 'A' || target?.tagName === 'BUTTON') {
      console.log('[CanvasCodeCard] Ignoring click on interactive element:', target.tagName);
      return memo;
    }

    if (first) {
      console.log('[CanvasCodeCard] mouseDown on:', node.id);
      setFocusedPane('canvas');

      // Determine nodes to drag BEFORE updating selection
      const metaKey = (event as MouseEvent)?.metaKey || (event as MouseEvent)?.ctrlKey;

      if (metaKey) {
        // Multi-select: if already selected, keep all selected nodes for dragging
        nodesToDrag.current = selectedNodeIds.has(node.id) ? new Set(selectedNodeIds) : new Set([node.id]);

        // Toggle selection
        const newSelected = new Set(selectedNodeIds);
        if (newSelected.has(node.id)) {
          newSelected.delete(node.id);
          console.log('[CanvasCodeCard] Deselecting:', node.id);
        } else {
          newSelected.add(node.id);
          console.log('[CanvasCodeCard] Adding to selection:', node.id);
        }
        setSelectedNodeIds(newSelected);
      } else {
        // Single selection: if this node is already in selection, drag all selected
        if (selectedNodeIds.has(node.id) && selectedNodeIds.size > 1) {
          nodesToDrag.current = new Set(selectedNodeIds);
          console.log('[CanvasCodeCard] Dragging all selected nodes');
        } else {
          nodesToDrag.current = new Set([node.id]);
          console.log('[CanvasCodeCard] Single selecting:', node.id);
          setSelectedNodeIds(new Set([node.id]));
        }
      }

      // Store initial offsets for all nodes to drag
      initialOffsets.current = new Map();
      nodesToDrag.current.forEach((nodeId) => {
        const pos = cardPositions.get(nodeId) || { x: 0, y: 0 };
        initialOffsets.current.set(nodeId, pos);
      });

      return true; // memo for subsequent drag events
    }

    // Calculate movement with zoom consideration
    const dx = mx / transform.k;
    const dy = my / transform.k;

    // Update positions for nodes we stored in initialOffsets
    const newPositions = new Map(cardPositions);

    initialOffsets.current.forEach((initial, nodeId) => {
      newPositions.set(nodeId, {
        x: initial.x + dx,
        y: initial.y + dy,
      });
    });

    setCardPositions(newPositions);

    return memo;
  });

  // GPU 가속을 위해 transform 사용 (left/top 대신)
  const style = useMemo(
    () => ({
      transform: `translate(${node.x + offset.x}px, ${node.y + offset.y}px)`,
      zIndex: isSelected ? 30 : 20,
    }),
    [node.x, node.y, offset.x, offset.y, isSelected]
  );

  return (
    <div {...bind()} className="canvas-code-card absolute cursor-grab active:cursor-grabbing touch-none" style={style}>
      <div className={`${isSelected ? 'ring-1 ring-blue-400/40 rounded-lg' : ''}`}>
        <CodeCard node={node} />
      </div>
    </div>
  );
};
