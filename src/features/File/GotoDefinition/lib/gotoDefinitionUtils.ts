/**
 * Go to Definition 유틸리티
 * Cmd+Click 시 정의 위치로 스크롤 이동
 */

import type { SourceFileNode } from '../../../../entities/SourceFileNode/model/types.ts';

export interface DefinitionLocation {
  nodeId: string;
  lineNum: number;
}

/**
 * 주어진 nodeId(파일 경로)에서 정의 위치를 찾음
 *
 * @param tokenId - 찾을 심볼의 nodeId (파일 경로)
 * @param fullNodeMap - 전체 노드 맵
 * @returns 정의 위치 (nodeId, lineNum) 또는 null
 */
export function findDefinitionLocation(
  tokenId: string,
  fullNodeMap: Map<string, SourceFileNode>
): DefinitionLocation | null {
  const targetNode = fullNodeMap.get(tokenId);

  if (!targetNode) {
    console.warn('[GotoDefinition] Node not found:', tokenId);
    return null;
  }

  // 파일 노드(module)인 경우 첫 번째 줄로 이동
  if (targetNode.type === 'module') {
    return {
      nodeId: targetNode.id,
      lineNum: targetNode.startLine || 1,
    };
  }

  // 다른 타입의 노드는 해당 노드의 startLine으로 이동
  return {
    nodeId: targetNode.id,
    lineNum: targetNode.startLine || 1,
  };
}

/**
 * Cmd 또는 Ctrl 키가 눌렸는지 확인
 *
 * @param e - 마우스 이벤트
 * @returns Cmd(Mac) 또는 Ctrl(Win/Linux) 키 눌림 여부
 */
export function isModifierKeyPressed(e: React.MouseEvent): boolean {
  return e.metaKey || e.ctrlKey;
}
