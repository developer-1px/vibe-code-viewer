/**
 * Vue Template Section Component
 *
 * Module 노드에서 Vue template을 렌더링
 * CodeCardLine과 동일한 스타일 + 컴포넌트/변수 참조 지원
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { useMemo } from 'react';
import { extractTemplateComponents, extractTemplateVariables } from '@/shared/tsParser/utils/vueTemplateParser';
import { lastExpandedIdAtom, visibleNodeIdsAtom } from '@/widgets/MainContents/PipelineCanvas/model/atoms';
import { filesAtom, fullNodeMapAtom } from '../../../app/model/atoms';
import { useEditorTheme } from '../../../app/theme/EditorThemeProvider';
import type { CanvasNode } from '../../../entities/CanvasNode/model/types';

const VueTemplateSection = ({
  template,
  node,
  scriptEndLine,
}: {
  template: string;
  node: CanvasNode;
  scriptEndLine: number; // script 영역의 마지막 라인 번호
}) => {
  const theme = useEditorTheme();
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);
  const files = useAtomValue(filesAtom);

  // AST 기반 template 토큰 추출
  const templateLines = useMemo(() => {
    const lines = template.split('\n');

    // Vue 파일 전체 컨텐츠에서 AST 추출
    const fullContent = files[node.filePath];
    if (!fullContent) {
      // Fallback: 단순 텍스트 렌더링
      return lines.map((lineText, idx) => ({
        lineNum: scriptEndLine + idx + 1,
        segments: [{ text: lineText, isClickable: false }],
      }));
    }

    // AST 기반 컴포넌트 및 변수 추출
    const components = extractTemplateComponents(fullContent, node.filePath);
    const variables = extractTemplateVariables(fullContent, node.filePath);

    // 라인별 토큰 맵 생성
    const tokensByLine = new Map<number, Array<{ start: number; end: number; name: string; nodeId?: string }>>();

    // 컴포넌트 토큰 추가
    components.forEach((comp) => {
      const depId = node.dependencies.find((dep) => dep.endsWith(`::${comp.name}`));
      if (depId) {
        if (!tokensByLine.has(comp.line)) {
          tokensByLine.set(comp.line, []);
        }
        tokensByLine.get(comp.line)?.push({
          start: comp.column - 1, // column은 1-based
          end: comp.column - 1 + comp.name.length,
          name: comp.name,
          nodeId: depId,
        });
      }
    });

    // 변수 토큰 추가 (아직 dependencies 연결 안 함, 추후 확장 가능)
    variables.forEach((variable) => {
      const depId = node.dependencies.find((dep) => dep.endsWith(`::${variable.name}`));
      if (depId) {
        if (!tokensByLine.has(variable.line)) {
          tokensByLine.set(variable.line, []);
        }
        tokensByLine.get(variable.line)?.push({
          start: variable.column - 1,
          end: variable.column - 1 + variable.name.length,
          name: variable.name,
          nodeId: depId,
        });
      }
    });

    // 라인별 segment 생성
    return lines.map((lineText, idx) => {
      const lineNum = scriptEndLine + idx + 1;
      const tokens = tokensByLine.get(lineNum) || [];

      // 토큰 위치순 정렬
      tokens.sort((a, b) => a.start - b.start);

      const segments: Array<{ text: string; nodeId?: string; isClickable: boolean }> = [];
      let cursor = 0;

      tokens.forEach((token) => {
        // 토큰 이전 텍스트
        if (token.start > cursor) {
          segments.push({
            text: lineText.slice(cursor, token.start),
            isClickable: false,
          });
        }

        // 토큰
        segments.push({
          text: token.name,
          nodeId: token.nodeId,
          isClickable: !!token.nodeId,
        });

        cursor = token.end;
      });

      // 남은 텍스트
      if (cursor < lineText.length) {
        segments.push({
          text: lineText.slice(cursor),
          isClickable: false,
        });
      }

      return { lineNum, segments };
    });
  }, [template, node.dependencies, node.filePath, scriptEndLine, files]);

  const handleTokenClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!fullNodeMap.has(nodeId)) return;

    const forceExpand = e.metaKey || e.ctrlKey;

    setVisibleNodeIds((prev: Set<string>) => {
      const next = new Set(prev);

      if (next.has(nodeId) && !forceExpand) {
        // Fold
        next.delete(nodeId);
      } else {
        // Expand recursively
        const expandRecursive = (id: string) => {
          if (next.has(id)) return;
          next.add(id);

          const node = fullNodeMap.get(id);
          if (node && node.type !== 'template') {
            node.dependencies.forEach((depId) => {
              if (fullNodeMap.has(depId)) {
                expandRecursive(depId);
              }
            });
          }
        };

        expandRecursive(nodeId);
      }
      return next;
    });

    setLastExpandedId(nodeId);
  };

  return (
    <div className="flex flex-col">
      {templateLines.map((line, idx) => (
        <div key={idx} className="flex items-start">
          {/* Line Number */}
          <div
            className={`flex-shrink-0 ${theme.dimensions.lineNumberWidth} ${theme.spacing.lineNumberX} ${theme.spacing.lineY} text-right ${theme.typography.fontSize} ${theme.colors.lineNumber.text} ${theme.typography.fontFamily}`}
          >
            {line.lineNum}
          </div>

          {/* Template Code with Clickable Tokens */}
          <div
            className={`flex-1 ${theme.spacing.lineX} ${theme.spacing.lineY} ${theme.typography.fontFamily} ${theme.typography.fontSize} ${theme.typography.lineHeight} overflow-x-auto whitespace-pre-wrap break-words select-text`}
          >
            {line.segments.map((seg, segIdx) => {
              if (seg.isClickable && seg.nodeId) {
                return (
                  <span
                    key={segIdx}
                    onClick={(e) => handleTokenClick(seg.nodeId!, e)}
                    className={`inline-block px-0.5 rounded transition-all duration-200 select-text cursor-pointer border ${theme.colors.template.clickable.bg} ${theme.colors.template.clickable.border} ${theme.colors.template.clickable.text} ${theme.colors.template.clickable.hoverBg} ${theme.colors.template.clickable.hoverBorder}`}
                  >
                    {seg.text}
                  </span>
                );
              }

              return (
                <span key={segIdx} className={`${theme.colors.template.text} select-text`}>
                  {seg.text}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VueTemplateSection;
