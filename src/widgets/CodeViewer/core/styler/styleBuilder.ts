/**
 * Segment 스타일링 빌더
 * 여러 kind를 조합하여 최종 스타일과 동작을 결정
 */

import type { SegmentKind, SegmentStyle } from '../types/codeLine';
import type { EditorTheme } from '../../../../app/theme/types';

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
    focusedVariables?: Set<string>; // Focus mode용 활성화된 변수들
    segmentText?: string; // 현재 segment의 텍스트 (focus 확인용)
    theme?: EditorTheme; // Theme for token colors
  }
): SegmentStyle {
  const primaryKind = getPrimaryKind(kinds);
  const returnBg = options.isInReturn ? 'bg-green-500/10 px-0.5 rounded' : '';

  // Focus mode: 활성화된 변수가 있고, 현재 segment가 focus 대상이 아니면 grayscale
  const hasFocusMode = options.focusedVariables && options.focusedVariables.size > 0;
  const isFocused = hasFocusMode && options.segmentText && options.focusedVariables?.has(options.segmentText);

  // 기본 텍스트
  if (primaryKind === 'text') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-text';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false
    };
  }

  // 키워드
  if (primaryKind === 'keyword') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-keyword';
    return {
      className: `${textColor} font-semibold select-text ${returnBg}`,
      clickable: false
    };
  }

  // 구두점
  if (primaryKind === 'punctuation') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-punctuation';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false
    };
  }

  // 문자열
  if (primaryKind === 'string') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-string';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false
    };
  }

  // 주석
  if (primaryKind === 'comment') {
    // Focus mode일 때는 주석을 더 밝게 표시
    const textColor = hasFocusMode ? 'text-editor-comment-focus' : 'text-editor-comment';
    return {
      className: `${textColor} italic select-text`,
      clickable: false
    };
  }

  // Self reference (Declaration name)
  if (primaryKind === 'self') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'inline-block px-0.5 rounded bg-vibe-accent/30 text-vibe-accent font-bold cursor-pointer hover:bg-vibe-accent/40 transition-colors select-text',
        clickable: true,
        clickType: 'definition',
        title: 'Definition (Focused)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'inline-block px-0.5 rounded text-slate-600 cursor-pointer hover:bg-vibe-accent/10 hover:text-vibe-accent/60 transition-colors select-text',
        clickable: true,
        clickType: 'definition',
        title: 'Definition'
      };
    }

    // Normal mode
    return {
      className: `inline-block px-0.5 rounded bg-vibe-accent/10 text-vibe-accent font-bold cursor-pointer hover:bg-vibe-accent/25 hover:text-vibe-accent transition-colors select-text`,
      clickable: true,
      clickType: 'definition',
      title: 'Definition'
    };
  }

  // External Import (active 상태에서만 강조, 크기는 동일)
  if (primaryKind === 'external-import') {
    const isActive = options.isActive;

    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 rounded bg-emerald-400/30 text-emerald-100 font-bold border border-emerald-300/60 shadow-[0_0_12px_rgba(16,185,129,0.6)] hover:bg-emerald-400/40 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 rounded text-slate-600 border border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    // Active 상태: 강조 스타일
    if (isActive) {
      return {
        className: `inline-block px-1 rounded bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-400/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: !!options.hasDefinedIn,
        clickType: 'external',
        title: options.hasDefinedIn ? 'Cmd+Click to close' : 'External Import (Active)'
      };
    }

    // Inactive 상태: 코드와 어울리는 적당한 강도
    return {
      className: `inline-block px-1 rounded bg-emerald-500/12 text-emerald-300/90 border border-emerald-500/25 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show import source' : 'External Import'
    };
  }

  // External Closure (강조된 토큰 스타일)
  if (primaryKind === 'external-closure') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded bg-amber-400/30 text-amber-100 font-bold border border-amber-300/60 shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:bg-amber-400/40 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded text-slate-600 border border-slate-700 hover:bg-amber-500/10 hover:text-amber-400 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    return {
      className: `inline-block px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-400/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show closure variable' : 'Closure Variable'
    };
  }

  // External Function (강조된 토큰 스타일)
  if (primaryKind === 'external-function') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded bg-purple-400/30 text-purple-100 font-bold border border-purple-300/60 shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:bg-purple-400/40 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded text-slate-600 border border-slate-700 hover:bg-purple-500/10 hover:text-purple-400 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    return {
      className: `inline-block px-1 py-0.5 rounded bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-400/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show function' : 'Function Variable'
    };
  }

  // Parameter (클릭하여 하이라이트 가능한 파라미터)
  if (primaryKind === 'parameter') {
    const isActive = options.isActive;

    // Active 상태 && Focus mode: 최대 강조
    if (isActive && isFocused) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-orange-400/30 text-orange-100 font-bold border border-orange-300/60 shadow-[0_0_12px_rgba(251,146,60,0.6)] hover:bg-orange-400/40 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode) - Parameter'
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-orange-500/20 text-orange-200 font-semibold border border-orange-400/40 hover:bg-orange-500/30 hover:border-orange-300/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight - Parameter'
      };
    }

    // Focus mode에서 다른 변수가 활성화된 경우: grayscale
    if (hasFocusMode) {
      return {
        className: 'inline-block px-1 py-0.5 rounded text-slate-600 border border-slate-700 hover:text-orange-400 hover:border-orange-600 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight - Parameter'
      };
    }

    // 기본 상태: 클릭 가능 (orange 계열)
    return {
      className: 'inline-block px-1 py-0.5 rounded bg-orange-500/15 text-orange-300 font-semibold border border-orange-500/30 hover:bg-orange-500/25 hover:border-orange-400/50 transition-all cursor-pointer select-text',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight - Parameter'
    };
  }

  // Local Variable (토글 가능한 하이라이트)
  if (primaryKind === 'local-variable') {
    const isActive = options.isActive;

    // Active 상태 && Focus mode: 최대 강조
    if (isActive && isFocused) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-cyan-400/30 text-cyan-100 font-bold border border-cyan-300/60 shadow-[0_0_12px_rgba(34,211,238,0.6)] hover:bg-cyan-400/40 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-400/40 hover:bg-cyan-500/30 hover:border-cyan-300/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight'
      };
    }

    // Inactive 상태 + Focus mode: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'inline-block px-0.5 rounded text-slate-600 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight'
      };
    }

    // Inactive 상태: 기본 스타일 (하이라이트 없음, 클릭 가능)
    return {
      className: 'inline-block px-0.5 rounded text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all cursor-pointer select-text',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight'
    };
  }

  // Identifier with nodeId (dependency slot)
  if (primaryKind === 'identifier' && options.hasNodeId) {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : '';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: true,
      clickType: 'expand' // CodeCardToken에서 처리
    };
  }

  // Identifier with Language Service
  if (primaryKind === 'identifier' && (options.hasHoverInfo || options.hasDefinition)) {
    const baseColor = hasFocusMode && !isFocused
      ? 'text-editor-focus-gray'
      : options.hasDefinition
        ? 'text-editor-identifier-def'
        : 'text-editor-identifier';
    const decoration = options.hasDefinition && !(hasFocusMode && !isFocused) ? 'underline decoration-dotted decoration-sky-300/40' : '';
    const hover = options.hasDefinition && !(hasFocusMode && !isFocused) ? 'cursor-pointer hover:bg-sky-400/15' : '';

    return {
      className: `relative inline-block px-0.5 rounded transition-colors select-text ${baseColor} ${decoration} ${hover} ${returnBg}`,
      clickable: !!options.hasDefinition,
      clickType: 'definition',
      hoverTooltip: !!options.hasHoverInfo
    };
  }

  // Fallback
  const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-text';
  return {
    className: `${textColor} select-text ${returnBg}`,
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
