import mermaid from 'mermaid';
import React, { useEffect, useRef, useState } from 'react';
import { BlockType, type DocData, type SymbolDetail } from '../model/types';

// We rely on the global `hljs` from CDN being available
declare const hljs: any;

interface DocViewerProps {
  data: DocData;
  layout: 'linear' | 'split';
}

const getStartLine = (lineStr?: string): number => {
  if (!lineStr) return 1;
  const match = lineStr.match(/L?(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

// --- Minimal Icons Component ---
const Icon = ({ name, className = 'w-4 h-4' }: { name: string; className?: string }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    package: (
      <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    ),
    layers: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    function: (
      <>
        <path d="M19 3v18H5V3h14z" />
        <path d="M9 15l3-3 3 3" />
        <path d="M12 9v6" />
      </>
    ),
    interface: (
      <>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </>
    ),
    class: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
    branch: (
      <>
        <path d="M6 3v12" strokeDasharray="4 4" />
        <circle cx="6" cy="18" r="3" />
        <path d="M9 18h9l-3-3m3 3l-3 3" />
      </>
    ),
    tag: (
      <>
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <path d="M7 7h.01" />
      </>
    ),
    info: <circle cx="12" cy="12" r="10" />,
    arrowDown: <path d="m6 9 6 6 6-6" />,
    arrowUp: <path d="m18 15-6-6-6 6" />,
    flow: <path d="M22 7M2 7l10-5 10 5-10 5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    testSuite: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    testCase: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    testHook: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

// --- Rich Text Parser Component ---
const RichText: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');

  // 들여쓰기 수준과 타입을 가진 리스트 항목 구조
  interface ListItem {
    type: 'ul' | 'ol';
    indent: number;
    content: string;
    lineIdx: number;
  }

  interface ParsedLine {
    type: 'list' | 'header' | 'paragraph' | 'empty';
    data: ListItem | string;
    lineIdx: number;
  }

  // 1단계: 모든 라인을 파싱
  const parsedLines: ParsedLine[] = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      parsedLines.push({ type: 'empty', data: '', lineIdx: idx });
      return;
    }

    // 들여쓰기 수준 계산 (스페이스 2개 = 1 레벨)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;

    // Bullets: "- " or "* "
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    // Numbers: "1. " or "1) "
    const numberMatch = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      parsedLines.push({
        type: 'list',
        data: { type: 'ul', indent, content: bulletMatch[1], lineIdx: idx },
        lineIdx: idx,
      });
    } else if (numberMatch) {
      parsedLines.push({
        type: 'list',
        data: { type: 'ol', indent, content: numberMatch[1], lineIdx: idx },
        lineIdx: idx,
      });
    } else if (trimmed.endsWith(':') && trimmed.length < 50 && !bulletMatch && !numberMatch) {
      // ✅ 헤더는 리스트가 아닐 때만 인식
      parsedLines.push({ type: 'header', data: trimmed, lineIdx: idx });
    } else {
      parsedLines.push({ type: 'paragraph', data: trimmed, lineIdx: idx });
    }
  });

  // 🔍 디버깅: 파싱 결과 출력
  if (content.includes('데이터 모델')) {
    console.log(
      '[RichText Debug] Parsed lines:',
      parsedLines.map((p) => ({
        type: p.type,
        data: typeof p.data === 'string' ? p.data : (p.data as ListItem).content,
        line: p.lineIdx,
      }))
    );
  }

  // 2단계: 재귀적으로 nested list 렌더링
  const renderListItems = (items: ListItem[], startIdx: number, parentIndent: number): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let i = startIdx;

    while (i < items.length) {
      const item = items[i];

      // 상위 레벨로 돌아감
      if (item.indent < parentIndent) {
        break;
      }

      // 같은 레벨 항목 처리
      if (item.indent === parentIndent) {
        // 다음 항목들 중 더 깊은 indent가 있는지 확인 (nested list)
        const nextIdx = i + 1;
        let hasNested = false;
        const nestedItems: ListItem[] = [];

        if (nextIdx < items.length && items[nextIdx].indent > parentIndent) {
          hasNested = true;
          // 같은 nested group 수집
          let j = nextIdx;
          while (j < items.length && items[j].indent > parentIndent) {
            nestedItems.push(items[j]);
            j++;
          }
          i = j - 1; // 외부 루프에서 i++되므로 j-1
        }

        result.push(
          <li key={`li-${item.lineIdx}`} className="pl-1 leading-7">
            {item.content}
            {hasNested && <RenderNestedList items={nestedItems} parentIndent={parentIndent} />}
          </li>
        );
      }

      i++;
    }

    return result;
  };

  // Nested list를 타입별로 그룹화해서 렌더링
  const RenderNestedList: React.FC<{ items: ListItem[]; parentIndent: number }> = ({ items, parentIndent }) => {
    const groups: { type: 'ul' | 'ol'; items: ListItem[] }[] = [];
    let currentGroup: ListItem[] = [];
    let currentType: 'ul' | 'ol' | null = null;

    items.forEach((item) => {
      if (currentType === null) {
        currentType = item.type;
        currentGroup = [item];
      } else if (item.type === currentType && item.indent === parentIndent + 1) {
        currentGroup.push(item);
      } else {
        // 타입이 바뀌거나 indent가 변함
        if (currentGroup.length > 0) {
          groups.push({ type: currentType, items: currentGroup });
        }
        currentType = item.type;
        currentGroup = [item];
      }
    });

    if (currentGroup.length > 0 && currentType) {
      groups.push({ type: currentType, items: currentGroup });
    }

    return (
      <>
        {groups.map((group, gIdx) => {
          const ListTag = group.type === 'ol' ? 'ol' : 'ul';
          return (
            <ListTag
              key={`nested-${gIdx}`}
              className={`pl-5 mt-1 mb-1 space-y-1 ${group.type === 'ol' ? 'list-decimal' : 'list-disc'} marker:text-gray-300 text-gray-700`}
            >
              {renderListItems(group.items, 0, parentIndent + 1)}
            </ListTag>
          );
        })}
      </>
    );
  };

  // 3단계: 최종 렌더링
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < parsedLines.length) {
    const parsed = parsedLines[i];

    if (parsed.type === 'empty') {
      i++;
      continue;
    }

    if (parsed.type === 'list') {
      // ✅ 모든 연속된 list 항목들을 수집 (타입별로 그룹화는 나중에)
      const allListItems: ListItem[] = [];

      // 빈 줄이 2개 이상 나오거나 header/paragraph를 만날 때까지 수집
      let consecutiveEmptyLines = 0;
      while (i < parsedLines.length) {
        const current = parsedLines[i];

        if (current.type === 'list') {
          allListItems.push(current.data as ListItem);
          consecutiveEmptyLines = 0;
          i++;
        } else if (current.type === 'empty') {
          consecutiveEmptyLines++;
          if (consecutiveEmptyLines >= 2) {
            // 빈 줄 2개 이상 → 리스트 그룹 종료
            break;
          }
          i++;
        } else {
          // header나 paragraph를 만나면 종료
          break;
        }
      }

      // ✅ 수집된 모든 리스트를 indent와 type별로 그룹화
      const topLevelGroups: { type: 'ul' | 'ol'; items: ListItem[] }[] = [];
      let currentGroup: ListItem[] = [];
      let currentType: 'ul' | 'ol' | null = null;

      allListItems.forEach((item) => {
        // indent 0인 최상위 항목만 그룹화 (nested는 renderListItems에서 처리)
        if (item.indent === 0) {
          if (currentType === null || item.type !== currentType) {
            // 타입이 바뀌면 새 그룹 시작
            if (currentGroup.length > 0 && currentType) {
              topLevelGroups.push({ type: currentType, items: currentGroup });
            }
            currentType = item.type;
            currentGroup = [item];
          } else {
            // 같은 타입이면 기존 그룹에 추가
            currentGroup.push(item);
          }
        } else {
          // nested item은 마지막 top-level 항목에 붙임
          if (currentGroup.length > 0) {
            currentGroup.push(item);
          }
        }
      });

      // 마지막 그룹 추가
      if (currentGroup.length > 0 && currentType) {
        topLevelGroups.push({ type: currentType, items: currentGroup });
      }

      // ✅ 각 타입별 그룹을 하나의 <ul> 또는 <ol>로 렌더링
      topLevelGroups.forEach((group, gIdx) => {
        const ListTag = group.type === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag
            key={`list-${elements.length}-${gIdx}`}
            className={`pl-5 mb-4 space-y-1 text-[13px] ${group.type === 'ol' ? 'list-decimal' : 'list-disc'} marker:text-gray-300 text-gray-700`}
          >
            {renderListItems(group.items, 0, 0)}
          </ListTag>
        );
      });

      continue;
    }

    if (parsed.type === 'header') {
      elements.push(
        <div
          key={`header-${elements.length}`}
          className="font-sans font-bold text-xs text-gray-900 uppercase tracking-widest mt-5 mb-2"
        >
          {parsed.data as string}
        </div>
      );
      i++;
      continue;
    }

    if (parsed.type === 'paragraph') {
      // 연속된 paragraph를 그룹화
      const paragraphs: React.ReactNode[] = [];
      while (i < parsedLines.length && parsedLines[i].type === 'paragraph') {
        const p = parsedLines[i];
        paragraphs.push(
          <p key={`p-${p.lineIdx}`} className="leading-7">
            {p.data as string}
          </p>
        );
        i++;
      }
      elements.push(
        <div key={`pg-${elements.length}`} className="space-y-1.5">
          {paragraphs}
        </div>
      );
      continue;
    }

    i++;
  }

  // className이 있으면 div로 감싸고, 없으면 Fragment로 반환
  if (className) {
    return <div className={className}>{elements}</div>;
  }
  return <>{elements}</>;
};

// --- Code Block styled as a clean "Figure" ---
const TextbookCodeBlock: React.FC<{
  code: string;
  lang?: string;
  startLine?: number;
  onLineClick?: (lineNumber: number) => void;
}> = ({ code, lang = 'typescript', startLine = 1, onLineClick }) => {
  const codeRef = useRef<HTMLElement>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  useEffect(() => {
    if (codeRef.current && typeof hljs !== 'undefined') {
      codeRef.current.innerHTML = hljs.highlight(code, { language: lang }).value;
    }
  }, [code, lang]);

  const lineCount = code.split('\n').length;
  const codeLines = code.split('\n');

  const handleLineClick = (lineNumber: number) => {
    if (onLineClick) {
      onLineClick(lineNumber);
    }
  };

  return (
    <div className="my-4 bg-gray-50 rounded-md overflow-hidden group border border-gray-100/50">
      <div className="flex leading-5 py-2">
        {/* Line Numbers - Clickable */}
        <div className="flex-none w-8 text-right pr-2 select-none">
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = startLine + i;
            const isHovered = hoveredLine === i;
            return (
              <div
                key={i}
                className={`font-mono text-[10px] leading-5 transition-colors ${onLineClick ? 'cursor-pointer' : ''} ${
                  isHovered ? 'text-blue-500 font-bold' : 'text-gray-300 group-hover:text-gray-400'
                }`}
                onMouseEnter={() => setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => handleLineClick(lineNum)}
                title={onLineClick ? `Go to line ${lineNum}` : undefined}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-x-auto custom-scrollbar pl-3 pr-3">
          {codeLines.map((line, i) => {
            const isHovered = hoveredLine === i;
            return (
              <div
                key={i}
                className={`font-mono leading-5 text-gray-800 text-[11px] transition-colors ${
                  onLineClick ? 'cursor-pointer' : ''
                } ${isHovered ? 'bg-blue-50/50' : ''}`}
                onMouseEnter={() => setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => handleLineClick(startLine + i)}
              >
                <code
                  className={`language-${lang} bg-transparent p-0 block`}
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof hljs !== 'undefined' ? hljs.highlight(line || ' ', { language: lang }).value : line || ' ',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Mermaid Diagram Component ---
const MermaidDiagram: React.FC<{ chart: string; id: string }> = ({ chart, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;

      try {
        // Initialize mermaid with custom theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#eef2ff', // blue-50
            primaryTextColor: '#1e293b', // slate-800
            primaryBorderColor: '#cbd5e1', // slate-300
            lineColor: '#64748b', // slate-500
            secondaryColor: '#f8fafc',
            tertiaryColor: '#fff',
          },
          fontFamily: 'Inter, sans-serif',
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
          },
        });

        // Render Mermaid content to a specific ID
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('[MermaidDiagram] Failed to render:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    renderChart();
  }, [chart, id]);

  if (error) {
    return (
      <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
        <strong>Mermaid Render Error:</strong> {error}
      </div>
    );
  }

  if (!svg) {
    return <div className="animate-pulse h-24 bg-gray-50 rounded-lg my-8"></div>;
  }

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 bg-white border border-gray-100 rounded-lg shadow-sm flex justify-center overflow-x-auto custom-scrollbar"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// --- Breadcrumb Component ---
const Breadcrumb = ({ path, filename }: { path: string; filename: string }) => {
  // path might be "src/utils" or just "utils"
  const segments = path.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-2 text-[11px] font-sans font-medium text-gray-400 tracking-wider mb-8">
      <div className="flex items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
        <Icon name="home" className="w-3 h-3" />
        <span>Home</span>
      </div>
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          <Icon name="chevronRight" className="w-3 h-3 text-gray-300" />
          <span className="hover:text-gray-600 cursor-pointer transition-colors">{seg}</span>
        </React.Fragment>
      ))}
      <Icon name="chevronRight" className="w-3 h-3 text-gray-300" />
      <span className="text-gray-900 font-bold">{filename}</span>
    </nav>
  );
};

// --- Symbol Section ---
const SymbolSection: React.FC<{
  symbol: SymbolDetail;
  layout: 'linear' | 'split';
  onDefinitionClick?: (startLine: number) => void;
}> = ({ symbol, layout, onDefinitionClick }) => {
  let TypeIcon = 'info';
  if (symbol.type === 'function') TypeIcon = 'function';
  if (symbol.type === 'interface') TypeIcon = 'interface';
  if (symbol.type === 'class') TypeIcon = 'class';
  if (symbol.type === 'test-suite') TypeIcon = 'testSuite';
  if (symbol.type === 'test-case') TypeIcon = 'testCase';
  if (symbol.type === 'test-hook') TypeIcon = 'testHook';

  const handleDefinitionClick = () => {
    if (symbol.startLine && onDefinitionClick) {
      onDefinitionClick(symbol.startLine);
    }
  };

  return (
    <section
      id={symbol.name}
      className={`mb-8 p-8 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow ${layout === 'split' ? 'grid grid-cols-12 gap-16' : ''}`}
    >
      {/* LEFT COLUMN (Prose & Specs) */}
      <div className={`${layout === 'split' ? 'col-span-5' : ''}`}>
        {/* Header / Definition */}
        <div className="mb-8">
          <div className="mb-2">
            <span className="font-sans text-2xs font-bold text-gray-400 uppercase tracking-widest">{symbol.type}</span>
          </div>

          <h3
            className={`text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 break-all leading-snug flex items-center gap-4 ${
              symbol.startLine ? 'cursor-pointer group' : ''
            }`}
            onClick={handleDefinitionClick}
            title={symbol.startLine ? `Go to line ${symbol.startLine}` : undefined}
          >
            <div className="flex-none p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors">
              <Icon name={TypeIcon} className="w-6 h-6 stroke-1" />
            </div>
            <span className="group-hover:text-blue-600 transition-colors">{symbol.name}</span>
          </h3>

          {/* Brief Signature Display - Minimalist */}
          <div
            className={`font-mono text-xs text-gray-500 mb-6 break-words bg-white border-l-2 border-gray-100 pl-3 py-1 ${
              symbol.startLine ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors' : ''
            }`}
            onClick={handleDefinitionClick}
            title={symbol.startLine ? `Go to line ${symbol.startLine}` : undefined}
          >
            {symbol.signature}
          </div>
        </div>

        {/* Flowchart Visualization (New) */}
        {symbol.flowchart && (
          <div className="mb-10">
            <span className="block font-sans text-2xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Icon name="flow" className="w-3 h-3" />
              Logic Flow
            </span>
            <MermaidDiagram chart={symbol.flowchart} id={`flow-${symbol.name}`} />
          </div>
        )}

        {/* Description Prose - Parsed with RichText */}
        <div className="prose-textbook text-gray-800 text-base leading-7 mb-10">
          <RichText content={symbol.description} />
        </div>

        {/* Test Metadata (for test-suite, test-case, test-hook) */}
        {symbol.testMetadata && (
          <div className="mb-10 pt-6 border-t border-gray-100">
            <span className="block font-sans text-2xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Test Details
            </span>

            {/* URL */}
            {symbol.testMetadata.url && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans text-xs font-bold text-gray-900">Target URL</span>
                </div>
                <div className="font-mono text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded border border-blue-100 break-all">
                  {symbol.testMetadata.url}
                </div>
              </div>
            )}

            {/* Selectors */}
            {symbol.testMetadata.selectors && symbol.testMetadata.selectors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-sans text-xs font-bold text-gray-900">Test Selectors</span>
                  <span className="font-mono text-2xs text-gray-400">({symbol.testMetadata.selectors.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {symbol.testMetadata.selectors.map((selector, i) => (
                    <span
                      key={i}
                      className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"
                    >
                      {selector}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expectations */}
            {symbol.testMetadata.expectations && symbol.testMetadata.expectations.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-sans text-xs font-bold text-gray-900">Assertions</span>
                  <span className="font-mono text-2xs text-gray-400">({symbol.testMetadata.expectations.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {symbol.testMetadata.expectations.map((expectation, i) => (
                    <span
                      key={i}
                      className="font-mono text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200"
                    >
                      expect(...).{expectation}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Technical Specifications (Params/Returns) - Minimalist List */}
        {((symbol.parameters?.length || 0) > 0 || symbol.returns) && (
          <div className="mb-10 pt-6 border-t border-gray-100">
            {symbol.parameters && symbol.parameters.length > 0 && (
              <div className="mb-6">
                <span className="block font-sans text-2xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Inputs
                </span>
                <ul className="space-y-4">
                  {symbol.parameters.map((p, i) => (
                    <li key={i} className="text-sm group">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                          {p.name}
                        </span>
                        <span className="font-mono text-2xs text-gray-400">{p.type}</span>
                      </div>
                      <div className="font-serif text-gray-600 mt-1.5 leading-relaxed">
                        <RichText content={p.description} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {symbol.returns && symbol.returns !== 'void' && (
              <div className="mt-6">
                <span className="block font-sans text-2xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Returns
                </span>
                <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                  {symbol.returns}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN (Implementation Logic) */}
      <div className={`${layout === 'split' ? 'col-span-7 pt-2' : ''}`}>
        {symbol.blocks?.length > 0 ? (
          <div className="space-y-6">
            {(() => {
              // Group consecutive PROSE blocks
              const grouped: React.ReactNode[] = [];
              let proseGroup: typeof symbol.blocks = [];

              const flushProseGroup = () => {
                if (proseGroup.length > 0) {
                  grouped.push(
                    <div
                      key={`prose-${grouped.length}`}
                      className="font-serif text-gray-700 text-sm leading-6 my-4 pl-3 border-l-2 border-gray-200/60"
                    >
                      {proseGroup.map((block, i) => (
                        <RichText key={i} content={block.content} />
                      ))}
                    </div>
                  );
                  proseGroup = [];
                }
              };

              symbol.blocks.forEach((block, idx) => {
                // 1. Prose Blocks - Group them together
                if (block.type === BlockType.PROSE) {
                  proseGroup.push(block);
                  return;
                }

                // Flush any accumulated prose blocks before other types
                flushProseGroup();

                // 2. Callout Tags (NOTE, WARNING, SECURITY)
                if (block.type === BlockType.TAG) {
                  const label = block.label || 'NOTE';
                  const isSecurity = label.toUpperCase().includes('SECURITY');
                  const isWarning = label.toUpperCase().includes('WARNING') || label.toUpperCase().includes('FIXME');

                  let bgColor = 'bg-blue-50';
                  let textColor = 'text-blue-900';
                  let icon = 'info';

                  if (isSecurity) {
                    bgColor = 'bg-indigo-50';
                    textColor = 'text-indigo-900';
                    icon = 'tag';
                  }
                  if (isWarning) {
                    bgColor = 'bg-amber-50';
                    textColor = 'text-amber-900';
                    icon = 'tag';
                  }

                  grouped.push(
                    <div key={idx} className={`my-8 p-5 rounded-lg ${bgColor} ${textColor} flex gap-4`}>
                      <div className="flex-none pt-1 opacity-60">
                        <Icon name={icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-sans text-2xs font-bold uppercase tracking-widest mb-2 opacity-70">
                          {label}
                        </div>
                        <div className="font-serif text-base leading-relaxed">
                          <RichText content={block.content} />
                        </div>
                      </div>
                    </div>
                  );
                  return;
                }

                // 3. Logic Flow / Branches
                if (block.type === BlockType.BRANCH) {
                  grouped.push(
                    <div key={idx} className="mt-8 mb-4 pl-2 flex gap-4 items-start group">
                      <div className="flex-none pt-1">
                        <div className="text-gray-300 group-hover:text-indigo-500 transition-colors">
                          <Icon name="branch" className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <div className="font-sans text-xs font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider mb-1 transition-colors">
                          {block.label || 'Branch'}
                        </div>
                        <div className="font-serif text-gray-800 font-medium text-base">
                          <RichText content={block.content} />
                        </div>
                      </div>
                    </div>
                  );
                  return;
                }

                // 4. Code Blocks
                if (block.type === BlockType.CODE) {
                  const startLine = getStartLine(block.lines);
                  grouped.push(
                    <div key={idx}>
                      <TextbookCodeBlock code={block.content} startLine={startLine} onLineClick={onDefinitionClick} />
                    </div>
                  );
                  return;
                }
              });

              // Flush any remaining prose blocks
              flushProseGroup();

              return grouped;
            })()}
          </div>
        ) : (
          <div className="bg-gray-50 p-12 text-center text-gray-400 font-serif rounded-lg">
            Implementation details are hidden or not available.
          </div>
        )}
      </div>
    </section>
  );
};

// --- Main Viewer Component ---
export const DocViewer: React.FC<DocViewerProps> = ({ data, layout }) => {
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);
  const importsCount = data.imports?.length || 0;
  const VISIBLE_IMPORTS = 8;
  const visibleImports = isDepsExpanded ? data.imports : data.imports.slice(0, VISIBLE_IMPORTS);

  // Definition 클릭 핸들러 - IDE View로 전환하고 해당 라인으로 이동
  const handleDefinitionClick = (startLine: number) => {
    // TODO: IDE View로 전환하고 해당 파일의 해당 라인으로 스크롤
    console.log('[DocViewer] Navigate to line:', startLine);
    // 현재는 콘솔 로그만 출력
    // 향후 viewModeAtom을 'ide'로 변경하고, activeTab의 해당 라인으로 스크롤하는 기능 추가 필요
  };

  return (
    <div className={`mx-auto ${layout === 'split' ? 'px-16 py-12' : ''}`}>
      {/* 1. Breadcrumb */}
      <Breadcrumb path={data.meta.path} filename={data.meta.filename} />

      {/* 2. Document Header */}
      <header className="mb-24 mt-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-8 tracking-tight leading-snug">
          {data.meta.filename}
        </h1>

        {/* Parsed with RichText for file description */}
        <div className="max-w-3xl font-serif text-base md:text-lg text-gray-600 leading-relaxed pl-6 border-l-4 border-gray-900 py-2 mb-10">
          <RichText content={data.meta.description || 'No description provided.'} />
        </div>

        {/* Meta Grid */}
        <div className="flex flex-wrap gap-x-12 gap-y-6 font-sans text-xs text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-6">
          <div>
            <span className="block text-2xs text-gray-400 mb-1">Author</span>
            <span className="text-gray-900 font-bold">{data.meta.author || 'Unknown'}</span>
          </div>
          <div>
            <span className="block text-2xs text-gray-400 mb-1">Version</span>
            <span className="text-gray-900 font-bold">{data.meta.version || '1.0.0'}</span>
          </div>
          <div>
            <span className="block text-2xs text-gray-400 mb-1">Last Modified</span>
            <span className="text-gray-900 font-bold">{data.meta.lastModified || new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* 3. Dependencies (Compact) */}
      {data.imports && data.imports.length > 0 && (
        <section className="mb-24">
          <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
            <Icon name="package" className="w-3 h-3 text-gray-400" />
            Dependencies <span className="text-gray-300 font-light">|</span>{' '}
            <span className="text-gray-400 font-normal">{importsCount} modules</span>
          </h3>

          <div className="flex flex-wrap gap-2 items-center">
            {visibleImports.map((imp, i) => (
              <div
                key={i}
                title={imp.path} // Show full path on hover
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <Icon name="package" className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="font-mono text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
                  {imp.name}
                </span>
              </div>
            ))}

            {importsCount > VISIBLE_IMPORTS && (
              <button
                onClick={() => setIsDepsExpanded(!isDepsExpanded)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                {isDepsExpanded ? (
                  <>
                    Show Less <Icon name="arrowUp" className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    +{importsCount - VISIBLE_IMPORTS} more <Icon name="arrowDown" className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      )}

      {/* 4. Main Content (Symbols) */}
      <div className="mb-32">
        {data.symbols?.map((symbol, idx) => (
          <SymbolSection key={idx} symbol={symbol} layout={layout} onDefinitionClick={handleDefinitionClick} />
        ))}
      </div>

      <footer className="pt-12 border-t border-gray-100 flex justify-between items-center text-gray-400">
        <div className="font-serif text-sm">Generated by TSDoc GenAI</div>
        <div className="font-sans text-2xs tracking-widest uppercase">{new Date().toLocaleDateString()}</div>
      </footer>
    </div>
  );
};

// --- Table of Contents Component (New) ---
export const TableOfContents = ({ symbols }: { symbols: SymbolDetail[] }) => {
  const scrollToSymbol = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-64 flex-none hidden xl:block pl-8">
      <div className="fixed w-56 pt-12">
        <h4 className="font-sans text-2xs font-bold text-gray-400 uppercase tracking-widest mb-6">On This Page</h4>
        <ul className="space-y-3 relative border-l border-gray-200 ml-1">
          {symbols.map((s, i) => {
            let icon = 'info';
            if (s.type === 'function') icon = 'function';
            if (s.type === 'interface') icon = 'interface';
            if (s.type === 'class') icon = 'class';
            if (s.type === 'test-suite') icon = 'testSuite';
            if (s.type === 'test-case') icon = 'testCase';
            if (s.type === 'test-hook') icon = 'testHook';

            return (
              <li
                key={i}
                className="-ml-[1px] pl-4 border-l border-transparent hover:border-gray-400 transition-colors"
              >
                <button
                  onClick={() => scrollToSymbol(s.name)}
                  className="text-left group flex items-start gap-2 w-full"
                >
                  <span className="flex-none pt-0.5 text-gray-300 group-hover:text-gray-500 transition-colors">
                    <Icon name={icon} className="w-3 h-3" />
                  </span>
                  <span className="text-xs font-medium text-gray-500 group-hover:text-gray-900 transition-colors leading-snug break-all">
                    {s.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
