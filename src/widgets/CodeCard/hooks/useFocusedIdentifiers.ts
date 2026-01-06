/**
 * useFocusedIdentifiers Hook
 * Focused Variables 관리 로직
 *
 * Focus Mode의 identifier 관리 및 제거 로직을 Custom Hook으로 분리
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import { activeLocalVariablesAtom } from '@/features/Code/FocusMode/model/atoms';
import { fullNodeMapAtom } from '../../../app/model/atoms';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';
import type { CodeLine } from '../../../entities/CodeLine/model/types';
import { visibleNodeIdsAtom } from '../../PipelineCanvas/model/atoms';
import { pruneDetachedNodes } from '../../PipelineCanvas/utils';

export interface IdentifierMetadata {
  name: string;
  hoverInfo?: string;
  definedIn?: string;
}

export interface UseFocusedIdentifiersReturn {
  /** Metadata가 포함된 focused identifiers 목록 */
  identifiers: IdentifierMetadata[];
  /** Identifier 제거 함수 */
  removeIdentifier: (identifierName: string, definedIn?: string) => void;
  /** Focused identifiers가 있는지 여부 */
  hasFocusedIdentifiers: boolean;
}

/**
 * Focused Identifiers 관리 Hook
 *
 * @param node - CanvasNode
 * @param processedLines - 처리된 코드 라인 목록
 * @returns Focused identifiers 목록 및 제거 함수
 *
 * @example
 * const { identifiers, removeIdentifier } = useFocusedIdentifiers(node, processedLines);
 *
 * identifiers.forEach(id => (
 *   <span onClick={() => removeIdentifier(id.name, id.definedIn)}>
 *     {id.name}
 *   </span>
 * ))
 */
export function useFocusedIdentifiers(node: CanvasNode, processedLines: CodeLine[]): UseFocusedIdentifiersReturn {
  const activeLocalVariables = useAtomValue(activeLocalVariablesAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const [visibleNodeIds, setVisibleNodeIds] = useAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  // 이 노드의 focused identifiers
  const focusedVariables = activeLocalVariables.get(node.id);

  /**
   * 각 focused identifier의 metadata 추출
   *
   * processedLines의 segments에서 identifier를 찾아 metadata 추가
   */
  const identifiers = useMemo((): IdentifierMetadata[] => {
    if (!focusedVariables || focusedVariables.size === 0) {
      return [];
    }

    const metadata: IdentifierMetadata[] = [];

    focusedVariables.forEach((identifier) => {
      // Find first occurrence of this identifier in segments
      for (const line of processedLines) {
        const segment = line.segments.find((seg) => seg.text === identifier);
        if (segment) {
          metadata.push({
            name: identifier,
            hoverInfo: segment.hoverInfo,
            definedIn: segment.definedIn,
          });
          return; // Found, move to next identifier
        }
      }

      // If not found in segments, add without metadata
      metadata.push({
        name: identifier,
      });
    });

    return metadata;
  }, [focusedVariables, processedLines]);

  /**
   * Focused identifier 제거 핸들러
   *
   * - activeLocalVariables에서 제거
   * - 외부 노드인 경우 visibleNodeIds에서도 제거
   * - 고아 노드 정리 (pruneDetachedNodes)
   *
   * @param identifierName - 제거할 identifier 이름
   * @param definedIn - identifier가 정의된 노드 ID
   */
  const removeIdentifier = useCallback(
    (identifierName: string, definedIn?: string) => {
      const isExternal = !!definedIn;
      const isActive = definedIn && (visibleNodeIds.has(definedIn) || visibleNodeIds.has(definedIn.split('::')[0]));

      // 1. Focus에서 제거
      setActiveLocalVariables((prev: Map<string, Set<string>>) => {
        const next = new Map(prev);
        const nodeVars = new Set(next.get(node.id) || new Set());

        nodeVars.delete(identifierName);

        if (nodeVars.size > 0) {
          next.set(node.id, nodeVars);
        } else {
          next.delete(node.id);
        }

        return next;
      });

      // 2. 외부 노드이면서 활성화된 경우 노드 닫기
      if (isExternal && isActive && definedIn) {
        setVisibleNodeIds((prev: Set<string>) => {
          const next = new Set(prev);

          // 함수/변수 노드가 열려있으면 제거
          if (fullNodeMap.has(definedIn) && next.has(definedIn)) {
            next.delete(definedIn);
          }

          // 파일 노드가 열려있으면 제거
          const filePath = definedIn.split('::')[0];
          if (fullNodeMap.has(filePath) && next.has(filePath)) {
            next.delete(filePath);
          }

          return pruneDetachedNodes(next, fullNodeMap, null, null);
        });
      }
    },
    [node.id, visibleNodeIds, fullNodeMap, setActiveLocalVariables, setVisibleNodeIds]
  );

  return {
    identifiers,
    removeIdentifier,
    hasFocusedIdentifiers: identifiers.length > 0,
  };
}
