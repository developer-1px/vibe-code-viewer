/**
 * CanvasCodeCard - Canvas 내에서 위치를 가진 CodeCard 래퍼
 * 위치 계산 및 offset 적용을 담당
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import type { CanvasNode } from '../../entities/CanvasNode';
import CodeCard from '../CodeCard/CodeCard';
import { cardPositionsAtom } from '../../store/atoms';

interface CanvasCodeCardProps {
  node: CanvasNode;
}

export const CanvasCodeCard: React.FC<CanvasCodeCardProps> = ({ node }) => {
  const cardPositions = useAtomValue(cardPositionsAtom);
  const offset = cardPositions.get(node.id) || { x: 0, y: 0 };

  return (
    <div
      key={node.visualId}
      className="absolute transition-all duration-500 ease-in-out"
      style={{
        left: node.x + offset.x,
        top: node.y + offset.y,
        zIndex: 20
      }}
    >
      <CodeCard node={node} />
    </div>
  );
};
