/**
 * PipelineCanvas Widget - Atoms
 * Canvas 노드 확장, 레이아웃, 변환, 가시성 관련 상태
 */
import { atom } from 'jotai';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';

// ============================================================================
// Node Expansion & Overlapping View
// ============================================================================

// 마지막으로 확장된 노드 ID (CodeViewer에서 사용)
export const lastExpandedIdAtom = atom(null as string | null);

// 중첩 표시를 위해 열린 파일들 (Canvas overlapping view)
export const openedFilesAtom = atom(new Set<string>());

// ============================================================================
// Canvas Layout (computed by useCanvasLayout)
// ============================================================================

// 레이아웃 계산된 Canvas 노드들
export const layoutNodesAtom = atom([] as CanvasNode[]);

// 노드 간 링크 정보
export const layoutLinksAtom = atom([] as { source: string; target: string }[]);

// ============================================================================
// Canvas Transform (Pan & Zoom from useD3Zoom)
// ============================================================================

// Canvas 변환 상태 (줌/팬)
export const transformAtom = atom({ k: 1, x: 0, y: 0 });

// ============================================================================
// Visibility & Navigation
// ============================================================================

// 화면에 표시되는 노드 ID들
export const visibleNodeIdsAtom = atom(new Set<string>());

// ============================================================================
// Card Position & Selection (FigJam-style)
// ============================================================================

// 각 카드의 위치 정보 (Map<nodeId, {x: number, y: number}>)
export const cardPositionsAtom = atom(new Map<string, { x: number; y: number }>());

// 선택된 노드 ID들 (FigJam-style 드래그)
export const selectedNodeIdsAtom = atom(new Set<string>());
