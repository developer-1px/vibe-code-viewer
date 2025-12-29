/**
 * Segment 스타일링 빌더
 * 여러 kind를 조합하여 최종 스타일과 동작을 결정
 */

import type { SegmentKind, SegmentStyle } from '../model/types';

/**
 * Primary kind에 따른 기본 스타일 결정
 */
export function buildSegmentStyle(
  kinds: SegmentKind[],
  options: {
    isDeclarationName?: boolean;
    hasNodeId?: boolean;
    hasDefinedIn?: boolean;
    hasDefinition?: boolean;
    hasHoverInfo?: boolean;
    isInReturn?: boolean;
    isActive?: boolean; // external-import 토글 상태
  }
): SegmentStyle {
  const primaryKind = getPrimaryKind(kinds);
  const returnBg = options.isInReturn ? 'bg-green-500/10 px-0.5 rounded' : '';

  // 기본 텍스트
  if (primaryKind === 'text') {
    return {
      className: `text-slate-300 select-text ${returnBg}`,
      clickable: false
    };
  }

  // 키워드
  if (primaryKind === 'keyword') {
    return {
      className: `text-purple-400 font-semibold select-text ${returnBg}`,
      clickable: false
    };
  }

  // 구두점
  if (primaryKind === 'punctuation') {
    return {
      className: `text-slate-400 select-text ${returnBg}`,
      clickable: false
    };
  }

  // 문자열
  if (primaryKind === 'string') {
    return {
      className: `text-orange-300 select-text ${returnBg}`,
      clickable: false
    };
  }

  // 주석
  if (primaryKind === 'comment') {
    return {
      className: 'text-slate-500 italic opacity-80 select-text',
      clickable: false
    };
  }

  // Self reference
  if (primaryKind === 'self') {
    const glowClass = options.isDeclarationName
      ? 'shadow-[0_0_6px_rgba(139,92,246,0.4)] bg-vibe-accent/15'
      : 'bg-vibe-accent/10';

    const hasDefinitionNode = options.isDeclarationName && options.hasNodeId;
    const hoverClass = hasDefinitionNode
      ? 'hover:bg-vibe-accent/25 hover:text-vibe-accent'
      : 'hover:bg-red-500/20 hover:text-red-400 hover:line-through';

    return {
      className: `inline-block px-0.5 rounded ${glowClass} text-vibe-accent font-bold cursor-pointer ${hoverClass} transition-colors select-text`,
      clickable: true,
      clickType: hasDefinitionNode ? 'expand' : 'close',
      title: hasDefinitionNode
        ? 'Click to show definition'
        : options.isDeclarationName
        ? 'Declaration name (click to close)'
        : 'Click to close this card'
    };
  }

  // External Import (active 상태에서만 강조, 크기는 동일)
  if (primaryKind === 'external-import') {
    const isActive = options.isActive;

    // Active 상태: 강조 스타일
    if (isActive) {
      return {
        className: `inline-block px-1 rounded bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-400/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: !!options.hasDefinedIn,
        clickType: 'external',
        title: options.hasDefinedIn ? 'Click to close' : 'External Import (Active)'
      };
    }

    // Inactive 상태: 코드와 어울리는 적당한 강도
    return {
      className: `inline-block px-1 rounded bg-emerald-500/12 text-emerald-300/90 border border-emerald-500/25 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Click to show import source' : 'External Import'
    };
  }

  // External Closure (강조된 토큰 스타일)
  if (primaryKind === 'external-closure') {
    return {
      className: `inline-block px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-400/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Click to show closure variable' : 'Closure Variable'
    };
  }

  // External Function (강조된 토큰 스타일)
  if (primaryKind === 'external-function') {
    return {
      className: `inline-block px-1 py-0.5 rounded bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-400/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Click to show function' : 'Function Variable'
    };
  }

  // Parameter (클릭 가능한 토큰)
  if (primaryKind === 'parameter') {
    return {
      className: 'inline-block px-1 py-0.5 rounded bg-violet-500/15 text-violet-300 font-semibold border border-violet-500/30 hover:bg-violet-500/25 hover:border-violet-400/50 transition-all cursor-default select-text',
      clickable: false,
      title: 'Parameter'
    };
  }

  // Local Variable (클릭 가능한 토큰)
  if (primaryKind === 'local-variable') {
    return {
      className: 'inline-block px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-400/50 transition-all cursor-default select-text',
      clickable: false,
      title: 'Local Variable'
    };
  }

  // Identifier with nodeId (dependency slot)
  if (primaryKind === 'identifier' && options.hasNodeId) {
    return {
      className: `select-text ${returnBg}`,
      clickable: true,
      clickType: 'expand' // CodeCardToken에서 처리
    };
  }

  // Identifier with Language Service
  if (primaryKind === 'identifier' && (options.hasHoverInfo || options.hasDefinition)) {
    return {
      className: `relative inline-block px-0.5 rounded transition-colors select-text ${
        options.hasDefinition
          ? 'text-sky-300 underline decoration-dotted decoration-sky-300/40 cursor-pointer hover:bg-sky-400/15'
          : 'text-slate-300'
      } ${returnBg}`,
      clickable: !!options.hasDefinition,
      clickType: 'definition',
      hoverTooltip: !!options.hasHoverInfo
    };
  }

  // Fallback
  return {
    className: `text-slate-300 select-text ${returnBg}`,
    clickable: false
  };
}

/**
 * 우선순위에 따라 primary kind 결정
 */
function getPrimaryKind(kinds: SegmentKind[]): SegmentKind {
  const priority: SegmentKind[] = [
    'keyword',
    'punctuation',
    'string',
    'comment',
    'self',
    'external-import',
    'external-function',
    'external-closure',
    'identifier',
    'parameter',
    'local-variable',
    'text'
  ];

  for (const kind of priority) {
    if (kinds.includes(kind)) return kind;
  }

  return 'text';
}
