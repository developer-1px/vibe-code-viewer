/**
 * Vue Template Section Component
 *
 * Module 노드에서 Vue template을 렌더링
 * CodeCardLine과 동일한 스타일 + 컴포넌트/변수 참조 지원
 */

import React, { useMemo } from 'react';
import { useSetAtom } from 'jotai';
import { visibleNodeIdsAtom, fullNodeMapAtom, lastExpandedIdAtom } from '../../../../store/atoms';
import { useAtomValue } from 'jotai';
import type { CanvasNode } from '../../../CanvasNode';

interface VueTemplateSectionProps {
  template: string;
  node: CanvasNode;
  scriptEndLine: number; // script 영역의 마지막 라인 번호
}

const VueTemplateSection: React.FC<VueTemplateSectionProps> = ({ template, node, scriptEndLine }) => {
  const setVisibleNodeIds = useSetAtom(visibleNodeIdsAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const setLastExpandedId = useSetAtom(lastExpandedIdAtom);

  // Template 라인별로 분리하고 참조 토큰 추출
  const templateLines = useMemo(() => {
    const lines = template.split('\n');

    return lines.map((lineText, idx) => {
      const lineNum = scriptEndLine + idx + 1;
      const segments: Array<{ text: string; nodeId?: string; isClickable: boolean }> = [];

      // 간단한 토큰 추출: PascalCase (컴포넌트) 또는 {{ variable }}
      let cursor = 0;

      // PascalCase 컴포넌트 찾기 (예: <UserCard>, <Sidebar>)
      const componentRegex = /<(\w+)/g;
      let match;

      const matches: Array<{ start: number; end: number; name: string; type: 'component' | 'variable' }> = [];

      // 컴포넌트 매칭
      while ((match = componentRegex.exec(lineText)) !== null) {
        const name = match[1];
        // PascalCase인지 확인
        if (name[0] === name[0].toUpperCase()) {
          matches.push({
            start: match.index + 1, // < 다음부터
            end: match.index + 1 + name.length,
            name,
            type: 'component'
          });
        }
      }

      // {{ variable }} 매칭
      const varRegex = /\{\{\s*(\w+)/g;
      while ((match = varRegex.exec(lineText)) !== null) {
        const name = match[1];
        matches.push({
          start: match.index + match[0].indexOf(name),
          end: match.index + match[0].indexOf(name) + name.length,
          name,
          type: 'variable'
        });
      }

      // v-for, v-if 등의 디렉티브에서 변수 추출
      const directiveRegex = /v-(?:for|if|show|model|bind)="(\w+)/g;
      while ((match = directiveRegex.exec(lineText)) !== null) {
        const name = match[1];
        matches.push({
          start: match.index + match[0].indexOf(name),
          end: match.index + match[0].indexOf(name) + name.length,
          name,
          type: 'variable'
        });
      }

      // 위치순 정렬
      matches.sort((a, b) => a.start - b.start);

      // Segment 생성
      cursor = 0;
      matches.forEach(({ start, end, name, type }) => {
        // 매치 이전 텍스트
        if (start > cursor) {
          segments.push({
            text: lineText.slice(cursor, start),
            isClickable: false
          });
        }

        // 매치된 토큰 - dependency에서 찾기
        const depId = node.dependencies.find(dep => dep.endsWith(`::${name}`));

        segments.push({
          text: name,
          nodeId: depId,
          isClickable: !!depId
        });

        cursor = end;
      });

      // 남은 텍스트
      if (cursor < lineText.length) {
        segments.push({
          text: lineText.slice(cursor),
          isClickable: false
        });
      }

      return { lineNum, segments };
    });
  }, [template, node.dependencies, scriptEndLine]);

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
            node.dependencies.forEach(depId => {
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
        <div
          key={idx}
          className="flex items-start"
        >
          {/* Line Number */}
          <div className="flex-shrink-0 w-12 px-2 py-0.5 text-right text-xs text-slate-600 select-none font-mono">
            {line.lineNum}
          </div>

          {/* Template Code with Clickable Tokens */}
          <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-5 overflow-x-auto whitespace-pre-wrap break-words">
            {line.segments.map((seg, segIdx) => {
              if (seg.isClickable && seg.nodeId) {
                return (
                  <span
                    key={segIdx}
                    onClick={(e) => handleTokenClick(seg.nodeId!, e)}
                    className="inline-block px-0.5 rounded transition-all duration-200 select-text cursor-pointer border bg-slate-800/50 border-slate-700 text-emerald-300 hover:bg-white/10 hover:border-emerald-500/50"
                  >
                    {seg.text}
                  </span>
                );
              }

              return (
                <span key={segIdx} className="text-slate-300 select-text">
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
