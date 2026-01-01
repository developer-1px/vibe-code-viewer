/**
 * CanvasCodeCard - Canvas 내에서 위치를 가진 CodeCard 래퍼
 * 위치 계산 및 offset 적용, 선택 및 드래그 기능
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { CanvasNode } from '../../entities/CanvasNode/model/types';
import CodeCard from '../CodeCard/CodeCard';
import { cardPositionsAtom, selectedNodeIdsAtom, transformAtom, focusedPaneAtom } from '../../store/atoms';

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

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialOffsets = useRef(new Map<string, {x: number, y: number}>());

  // Handle card selection
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('[CanvasCodeCard] mouseDown on:', node.id);

    // Set focus to canvas
    setFocusedPane('canvas');

    // Prevent if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON') {
      console.log('[CanvasCodeCard] Ignoring click on interactive element:', target.tagName);
      return;
    }

    e.stopPropagation();

    // Determine nodes to drag BEFORE updating selection
    let nodesToDrag: Set<string>;

    if (e.metaKey || e.ctrlKey) {
      // Multi-select: if already selected, keep all selected nodes for dragging
      nodesToDrag = selectedNodeIds.has(node.id) ? new Set(selectedNodeIds) : new Set([node.id]);

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
        nodesToDrag = new Set(selectedNodeIds);
        console.log('[CanvasCodeCard] Dragging all selected nodes');
      } else {
        nodesToDrag = new Set([node.id]);
        console.log('[CanvasCodeCard] Single selecting:', node.id);
        setSelectedNodeIds(new Set([node.id]));
      }
    }

    // Start dragging
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    // Store initial offsets for all nodes to drag
    initialOffsets.current = new Map();
    nodesToDrag.forEach(nodeId => {
      const pos = cardPositions.get(nodeId) || { x: 0, y: 0 };
      initialOffsets.current.set(nodeId, pos);
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartPos.current.x) / transform.k;
      const dy = (e.clientY - dragStartPos.current.y) / transform.k;

      // Update positions for nodes we stored in initialOffsets
      const newPositions = new Map(cardPositions);

      initialOffsets.current.forEach((initial, nodeId) => {
        newPositions.set(nodeId, {
          x: initial.x + dx,
          y: initial.y + dy
        });
      });

      setCardPositions(newPositions);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, cardPositions, setCardPositions, transform.k]);

  // GPU 가속을 위해 transform 사용 (left/top 대신)
  const style = useMemo(() => ({
    transform: `translate(${node.x + offset.x}px, ${node.y + offset.y}px)`,
    zIndex: isSelected ? 30 : 20
  }), [node.x, node.y, offset.x, offset.y, isSelected]);

  return (
    <div
      className={`canvas-code-card absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={style}
      onMouseDown={handleMouseDown}
    >
      <div className={`${isSelected ? 'ring-1 ring-blue-400/40 rounded-lg' : ''}`}>
        <CodeCard node={node} />
      </div>
    </div>
  );
};
