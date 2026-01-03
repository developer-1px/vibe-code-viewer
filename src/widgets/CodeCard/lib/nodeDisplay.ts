/**
 * Node Display Utilities
 * Node 표시 관련 유틸리티 함수들
 */

import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import { getFileName } from '../../../shared/pathUtils';

/**
 * Node의 표시 레이블 반환
 *
 * - Module 타입: 파일명 (확장자 포함)
 * - 그 외: node.label 그대로
 *
 * @param node - CanvasNode
 * @returns 표시할 레이블 문자열
 *
 * @example
 * // Module node
 * getNodeDisplayLabel({ type: 'module', filePath: 'src/App.tsx', label: 'App' })
 * // → 'App.tsx'
 *
 * // Function node
 * getNodeDisplayLabel({ type: 'function', label: 'handleClick' })
 * // → 'handleClick'
 */
export function getNodeDisplayLabel(node: CanvasNode): string {
  if (node.type === 'module' && node.filePath) {
    const fileName = getFileName(node.filePath);
    return fileName || node.label;
  }
  return node.label;
}

/**
 * Node의 타입 레이블 반환
 *
 * - Template 노드이면서 컴포넌트 형태인 경우: 'component'
 * - 그 외: node.type 그대로
 *
 * @param node - CanvasNode
 * @returns 표시할 타입 문자열
 *
 * @example
 * // Template component
 * getNodeTypeLabel({
 *   type: 'template',
 *   id: 'App.tsx::MyComponent::TEMPLATE'
 * })
 * // → 'component'
 *
 * // Regular function
 * getNodeTypeLabel({ type: 'function', id: 'utils.ts::helper' })
 * // → 'function'
 */
export function getNodeTypeLabel(node: CanvasNode): string {
  // Template 노드이면서 컴포넌트 형태인지 확인
  const isTemplateComponent =
    node.type === 'template' &&
    node.id.includes('::') &&
    !node.id.endsWith('::TEMPLATE_ROOT') &&
    !node.id.endsWith('::JSX_ROOT') &&
    !node.id.endsWith('::FILE_ROOT');

  return isTemplateComponent ? 'component' : node.type;
}

/**
 * Node의 파일 경로를 축약된 형태로 반환
 *
 * - 'src/' prefix 제거
 * - 없으면 빈 문자열
 *
 * @param node - CanvasNode
 * @returns 축약된 파일 경로
 *
 * @example
 * getNodeShortPath({ filePath: 'src/components/Button.tsx' })
 * // → 'components/Button.tsx'
 *
 * getNodeShortPath({ filePath: undefined })
 * // → ''
 */
export function getNodeShortPath(node: CanvasNode): string {
  if (!node.filePath) return '';
  return node.filePath.replace('src/', '');
}
