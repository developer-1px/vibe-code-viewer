/**
 * useOpenFile Hook
 * 파일 열기 로직 통합 관리
 * View Mode (IDE/Canvas)에 따라 자동으로 분기 처리
 */

import { useSetAtom, useAtomValue } from 'jotai';
import { viewModeAtom, focusedPaneAtom } from '../../../../app/model/atoms.ts';
import { targetLineAtom } from '@/features/File/Navigation/model/atoms.ts';
import { activeLocalVariablesAtom } from '@/features/Code/FocusMode/model/atoms.ts';
import { openedTabsAtom, activeTabAtom } from '../model/atoms.ts';
import { openedFilesAtom } from '../../../../widgets/PipelineCanvas/model/atoms.ts';

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
  const setViewMode = useSetAtom(viewModeAtom);

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
    const actualFilePath = filePath.includes('::')
      ? filePath.split('::')[0]
      : filePath;

    if (viewMode === 'ide' || viewMode === 'codeDoc') {

      // IDE/CodeDoc 모드: 탭으로 열기
      // 1. 이미 열려있는 파일이면 탭 추가하지 않음 (기존 탭 유지)
      // 2. 안 열려있는 파일이면 현재 활성 탭 바로 다음에 새 탭 추가
      setOpenedTabs((prev) => {
        if (prev.includes(actualFilePath)) {
          return prev; // 이미 열려있으면 탭 추가 안 함
        }
        // 현재 활성 탭의 위치를 찾아서 그 다음에 삽입
        const activeIndex = activeTab ? prev.indexOf(activeTab) : -1;
        const insertIndex = activeIndex >= 0 ? activeIndex + 1 : prev.length;
        return [
          ...prev.slice(0, insertIndex),
          actualFilePath,
          ...prev.slice(insertIndex)
        ];
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

  return { openFile };
}
