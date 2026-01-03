/**
 * useGotoDefinition Hook
 * Cmd+Click 시 정의로 스크롤 이동하는 커스텀 훅
 * Canvas 모드와 IDE 모드 모두 지원
 */

import { useAtomValue } from 'jotai';
import { fullNodeMapAtom } from '../../../app/model/atoms';
import { findDefinitionLocation, isModifierKeyPressed, type DefinitionLocation } from './gotoDefinitionUtils';
import { useOpenFile } from '../../Files/lib/useOpenFile';

export function useGotoDefinition() {
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const { openFile } = useOpenFile();

  /**
   * 정의 위치로 이동하는 내부 로직
   * - 파일이 이미 열려있으면: 해당 탭으로 전환 + 라인 스크롤
   * - 파일이 안 열려있으면: 새 탭 열기 + 라인 스크롤
   *
   * @param location - 정의 위치
   */
  const navigateToLocation = (location: DefinitionLocation) => {
    // useOpenFile hook을 사용하여 파일 열기 및 스크롤 처리
    // 내부적으로 viewMode에 따라 IDE/Canvas 모드를 자동 분기
    openFile(location.nodeId, {
      lineNumber: location.lineNum
    });
  };

  /**
   * Cmd+Click 핸들러 (tokenId 기반)
   *
   * @param e - 마우스 이벤트
   * @param tokenId - 이동할 대상 토큰의 nodeId
   * @returns 처리 여부 (true면 기본 클릭 동작 방지)
   */
  const handleGotoDefinition = (e: React.MouseEvent, tokenId: string): boolean => {
    // Cmd(Mac) 또는 Ctrl(Win) 키가 눌렸는지 확인
    if (!isModifierKeyPressed(e)) {
      return false; // 일반 클릭은 기존 동작 수행
    }

    e.preventDefault();
    e.stopPropagation();

    // 정의 위치 찾기
    const location = findDefinitionLocation(tokenId, fullNodeMap);

    if (!location) {
      console.warn('[GotoDefinition] Definition not found for:', tokenId);
      return true;
    }

    navigateToLocation(location);
    return true; // 처리됨 (기본 동작 방지)
  };

  /**
   * Cmd+Click 핸들러 (definitionLocation 직접 제공)
   *
   * @param e - 마우스 이벤트
   * @param definitionLocation - 정의 위치 (filePath, line)
   * @returns 처리 여부 (true면 기본 클릭 동작 방지)
   */
  const handleGotoDefinitionByLocation = (
    e: React.MouseEvent,
    definitionLocation: { filePath: string; line: number }
  ): boolean => {
    // Cmd(Mac) 또는 Ctrl(Win) 키가 눌렸는지 확인
    if (!isModifierKeyPressed(e)) {
      return false; // 일반 클릭은 기존 동작 수행
    }

    e.preventDefault();
    e.stopPropagation();

    const { filePath, line } = definitionLocation;

    // Find all nodes from the target file
    const nodesInFile = Array.from(fullNodeMap.values()).filter(
      n => n.filePath === filePath
    );

    // Find the node that contains this line
    let targetNode = nodesInFile.find(n => n.startLine === line);

    if (!targetNode) {
      targetNode = nodesInFile.find(
        n =>
          n.startLine !== undefined &&
          line >= n.startLine
      );
    }

    if (!targetNode) {
      // Fallback: open file node
      targetNode = fullNodeMap.get(filePath);
    }

    if (!targetNode) {
      // 노드를 찾지 못해도 파일 열기 시도
      // 파일이 이미 열려있으면 해당 탭으로 전환 + 스크롤
      // 안 열려있으면 새 탭으로 열고 + 스크롤
      openFile(filePath, { lineNumber: line });
      return true;
    }

    navigateToLocation({
      nodeId: targetNode.id,
      lineNum: line
    });

    return true; // 처리됨 (기본 동작 방지)
  };

  return { handleGotoDefinition, handleGotoDefinitionByLocation };
}
