/**
 * useOpenFile Hook
 * 파일 열기 로직 통합 관리
 * View Mode (IDE/Canvas)에 따라 자동으로 분기 처리
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { activeLocalVariablesAtom } from '@/features/Code/FocusMode/model/atoms.ts';
import { targetLineAtom } from '@/features/File/Navigation/model/atoms.ts';
import { focusedPaneAtom, viewModeAtom } from '../../../../app/model/atoms.ts';
import { openedFilesAtom } from '../../../../widgets/PipelineCanvas/model/atoms.ts';
import { activeTabAtom, openedTabsAtom } from '../model/atoms.ts';

export interface OpenFileOptions {
  /** 스크롤할 라인 번호 */
  lineNumber?: number;
  /** Focus mode로 활성화할 심볼 이름 */
  focusSymbol?: string;
  /** 파일 열린 후 포커스할 pane */
  focusPane?: 'sidebar' | 'canvas' | null;
}

export function useOpenFile() {
  const viewMode = useAtomValue(viewModeAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const setOpenedTabs = useSetAtom(openedTabsAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const setOpenedFiles = useSetAtom(openedFilesAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const setActiveLocalVariables = useSetAtom(activeLocalVariablesAtom);
  const setFocusedPane = useSetAtom(focusedPaneAtom);
  const _setViewMode = useSetAtom(viewModeAtom);

  /**
   * 파일 열기
   * View Mode에 따라 자동으로 탭/캔버스로 열림
   *
   * @param filePath - 열 파일 경로 (nodeId 형식도 허용: "src/App.tsx::AppContent" -> "src/App.tsx")
   * @param options - 추가 옵션 (lineNumber, focusSymbol, focusPane)
   */
  const openFile = (filePath: string, options: OpenFileOptions = {}) => {
    const { lineNumber, focusSymbol, focusPane } = options;

    // nodeId 형식 ("src/App.tsx::AppContent")이면 파일 경로만 추출
    const actualFilePath = filePath.includes('::') ? filePath.split('::')[0] : filePath;

    // IDE/CodeDoc 모드: 탭으로 열기
    // 1. 이미 열려있는 파일이면 탭 추가하지 않음 (기존 탭 유지)
    // 2. 안 열려있는 파일이면 현재 활성 탭 바로 다음에 새 탭 추가
    if (viewMode === 'ide' || viewMode === 'codeDoc') {
      setOpenedTabs((prev) => {
        // 이미 열려있으면 탭 추가 안 함
        if (prev.includes(actualFilePath)) {
          return prev;
        }

        // 현재 활성 탭의 위치를 찾아서 그 다음에 삽입
        const activeIndex = activeTab ? prev.indexOf(activeTab) : -1;
        const insertIndex = activeIndex >= 0 ? activeIndex + 1 : prev.length;
        return [...prev.slice(0, insertIndex), actualFilePath, ...prev.slice(insertIndex)];
      });

      // 활성 탭으로 설정 (이미 열려있든 새로 열든, 해당 탭으로 전환)
      // activeTab 변경 시 IDEScrollView에서 자동으로 스크롤됨
      setActiveTab(actualFilePath);
    } else {
      // Canvas 모드: openedFiles에 추가
      setOpenedFiles((prev) => new Set([...prev, actualFilePath]));
    }

    // Focus mode 활성화 (심볼이 지정된 경우)
    if (focusSymbol) {
      setActiveLocalVariables((prev: Map<string, Set<string>>) => {
        const next = new Map(prev);
        const fileVars = new Set(next.get(actualFilePath) || new Set());
        fileVars.add(focusSymbol);
        next.set(actualFilePath, fileVars);
        return next;
      });
    }

    // 라인 스크롤 (라인 번호가 지정된 경우)
    if (lineNumber !== undefined) {
      setTargetLine({ nodeId: actualFilePath, lineNum: lineNumber });

      // 2초 후 하이라이트 제거
      setTimeout(() => {
        setTargetLine(null);
      }, 2000);
    }

    // Pane 포커스 (지정된 경우)
    if (focusPane) {
      setFocusedPane(focusPane);
    }
  };

  /**
   * 파일 닫기
   * 현재 활성화된 파일을 닫고, 다음 탭으로 이동
   *
   * @param filePath - 닫을 파일 경로 (지정 안 하면 현재 activeTab 닫기)
   */
  const closeFile = (filePath?: string) => {
    const targetFilePath = filePath || activeTab;
    if (!targetFilePath) return;

    // IDE/CodeDoc 모드: 탭에서 제거
    if (viewMode === 'ide' || viewMode === 'codeDoc') {
      setOpenedTabs((prev) => {
        const filtered = prev.filter((tab) => tab !== targetFilePath);

        // 닫은 탭이 현재 활성 탭이면 다음 탭으로 이동
        if (activeTab === targetFilePath && filtered.length > 0) {
          const closedIndex = prev.indexOf(targetFilePath);
          // 닫은 탭의 다음 탭으로 이동 (없으면 이전 탭)
          const nextTab = filtered[Math.min(closedIndex, filtered.length - 1)];
          setActiveTab(nextTab);
        } else if (filtered.length === 0) {
          // 마지막 탭을 닫으면 activeTab null
          setActiveTab(null);
        }

        return filtered;
      });
    } else {
      // Canvas 모드: openedFiles에서 제거
      setOpenedFiles((prev) => {
        const next = new Set(prev);
        next.delete(targetFilePath);
        return next;
      });
    }

    // Focus mode 해제
    setActiveLocalVariables((prev: Map<string, Set<string>>) => {
      const next = new Map(prev);
      next.delete(targetFilePath);
      return next;
    });
  };

  return { openFile, closeFile };
}
