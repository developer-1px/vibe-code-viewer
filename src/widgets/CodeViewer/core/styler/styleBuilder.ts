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
    isDead?: boolean; // Dead identifier (VSCode-like muted)
  }
): SegmentStyle {
  const primaryKind = getPrimaryKind(kinds);
  const returnBg = options.isInReturn ? 'bg-green-500/10 px-0.5 rounded' : '';

  // Focus mode: 활성화된 변수가 있고, 현재 segment가 focus 대상이 아니면 grayscale
  const hasFocusMode = options.focusedVariables && options.focusedVariables.size > 0;
  const isFocused = hasFocusMode && options.segmentText && options.focusedVariables?.has(options.segmentText);

  // ✅ Dead identifier: VSCode처럼 muted 처리 (opacity + grayscale)
  const deadStyle = options.isDead ? 'opacity-50 text-slate-500' : '';

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

  // 숫자 (numeric literals, booleans, null, undefined)
  if (primaryKind === 'number') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-number';
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
    // Dead identifier: 최우선 처리 - muted 스타일 적용
    if (options.isDead) {
      console.log(`[styleBuilder] DEAD self identifier "${options.segmentText}"`);
      return {
        className: 'inline-block px-0.5 rounded text-slate-500 opacity-50 select-text',
        clickable: false,
        title: 'Unused (Dead Code)'
      };
    }

    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'inline-block px-0.5 rounded bg-warm-300/30 text-warm-100 font-bold cursor-pointer hover:bg-warm-300/40 border border-warm-300/60 transition-colors select-text',
        clickable: true,
        clickType: 'definition',
        title: 'Definition (Focused)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'inline-block px-0.5 rounded text-[var(--focus-gray)] cursor-pointer hover:bg-warm-glow hover:text-warm-300/60 transition-colors select-text',
        clickable: true,
        clickType: 'definition',
        title: 'Definition'
      };
    }

    // Normal mode
    return {
      className: `inline-block px-0.5 rounded bg-warm-glow text-warm-300 font-bold cursor-pointer hover:bg-warm-300/25 hover:text-warm-200 transition-colors select-text`,
      clickable: true,
      clickType: 'definition',
      title: 'Definition'
    };
  }

  // External Import (active 상태에서만 강조, 크기는 동일)
  if (primaryKind === 'external-import') {
    const isActive = options.isActive;

    // ✅ Dead code: VSCode-like muted style
    if (options.isDead) {
      return {
        className: `inline-block px-1 rounded bg-slate-500/8 text-slate-400/60 border border-slate-500/15 line-through decoration-slate-500/40 select-text cursor-default`,
        clickable: false,
        clickType: 'none',
        title: 'Unused import (Dead code)'
      };
    }

    // Focus mode && Focused: 최대 강조 (Green - success)
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 rounded bg-status-success/30 text-status-success font-bold border border-status-success/60 shadow-glow-success hover:bg-status-success/40 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 rounded text-[var(--focus-gray)] border border-border-medium hover:bg-status-success/10 hover:text-status-success transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    // Active 상태: 강조 스타일
    if (isActive) {
      return {
        className: `inline-block px-1 rounded bg-status-success-bg text-status-success font-semibold border border-status-success/30 hover:bg-status-success/25 hover:border-status-success/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: !!options.hasDefinedIn,
        clickType: 'external',
        title: options.hasDefinedIn ? 'Cmd+Click to close' : 'External Import (Active)'
      };
    }

    // Inactive 상태: 코드와 어울리는 적당한 강도
    return {
      className: `inline-block px-1 rounded bg-status-success/12 text-status-success/90 border border-status-success/25 hover:bg-status-success/15 hover:text-status-success hover:border-status-success/30 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show import source' : 'External Import'
    };
  }

  // External Closure (강조된 토큰 스타일) - Warning Yellow
  if (primaryKind === 'external-closure') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded bg-status-warning/30 text-status-warning font-bold border border-status-warning/60 shadow-glow-warning hover:bg-status-warning/40 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded text-[var(--focus-gray)] border border-border-medium hover:bg-status-warning/10 hover:text-status-warning transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    return {
      className: `inline-block px-1 py-0.5 rounded bg-status-warning-bg text-status-warning font-semibold border border-status-warning/30 hover:bg-status-warning/25 hover:border-status-warning/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show closure variable' : 'Closure Variable'
    };
  }

  // External Function (강조된 토큰 스타일) - Purple
  if (primaryKind === 'external-function') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded bg-[#a78bfa]/30 text-[#a78bfa] font-bold border border-[#a78bfa]/60 shadow-[0_0_8px_rgba(167,139,250,0.5)] hover:bg-[#a78bfa]/40 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded text-[var(--focus-gray)] border border-border-medium hover:bg-[#a78bfa]/10 hover:text-[#a78bfa] transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    return {
      className: `inline-block px-1 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa] font-semibold border border-[#a78bfa]/30 hover:bg-[#a78bfa]/25 hover:border-[#a78bfa]/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show function' : 'Function Variable'
    };
  }

  // Parameter (클릭하여 하이라이트 가능한 파라미터) - Orange
  if (primaryKind === 'parameter') {
    const isActive = options.isActive;

    // Active 상태 && Focus mode: 최대 강조
    if (isActive && isFocused) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-[#fb923c]/30 text-[#fb923c] font-bold border border-[#fb923c]/60 shadow-[0_0_8px_rgba(251,146,60,0.5)] hover:bg-[#fb923c]/40 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode) - Parameter'
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-[#fb923c]/20 text-[#fb923c] font-semibold border border-[#fb923c]/40 hover:bg-[#fb923c]/30 hover:border-[#fb923c]/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight - Parameter'
      };
    }

    // Focus mode에서 다른 변수가 활성화된 경우: grayscale
    if (hasFocusMode) {
      return {
        className: 'inline-block px-1 py-0.5 rounded text-[var(--focus-gray)] border border-border-medium hover:text-[#fb923c] hover:border-[#fb923c]/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight - Parameter'
      };
    }

    // 기본 상태: 클릭 가능 (orange 계열)
    return {
      className: 'inline-block px-1 py-0.5 rounded bg-[#fb923c]/15 text-[#fb923c] font-semibold border border-[#fb923c]/30 hover:bg-[#fb923c]/25 hover:border-[#fb923c]/50 transition-all cursor-pointer select-text',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight - Parameter'
    };
  }

  // Local Variable (토글 가능한 하이라이트) - Warm
  if (primaryKind === 'local-variable') {
    const isActive = options.isActive;

    // Active 상태 && Focus mode: 최대 강조
    if (isActive && isFocused) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-warm-400/30 text-warm-100 font-bold border border-warm-400/60 shadow-glow-md hover:bg-warm-400/40 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-warm-400/20 text-warm-200 font-semibold border border-warm-400/40 hover:bg-warm-400/30 hover:border-warm-300/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight'
      };
    }

    // Inactive 상태 + Focus mode: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'inline-block px-0.5 rounded text-[var(--focus-gray)] hover:bg-warm-glow hover:text-warm-400 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight'
      };
    }

    // Inactive 상태: 기본 스타일 (하이라이트 없음, 클릭 가능)
    return {
      className: 'inline-block px-0.5 rounded text-text-secondary hover:bg-warm-glow hover:text-warm-300 transition-all cursor-pointer select-text',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight'
    };
  }

  // Identifier with nodeId (dependency slot)
  if (primaryKind === 'identifier' && options.hasNodeId) {
    // ✅ Dead identifier: muted style
    const textColor = options.isDead
      ? 'text-slate-500 opacity-50'
      : hasFocusMode && !isFocused
        ? 'text-editor-focus-gray'
        : '';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: true,
      clickType: 'expand' // CodeCardToken에서 처리
    };
  }

  // Identifier with Language Service
  if (primaryKind === 'identifier' && (options.hasHoverInfo || options.hasDefinition)) {
    // ✅ Dead identifier: override baseColor to ensure muted style
    const baseColor = options.isDead
      ? 'text-slate-500 opacity-50'
      : hasFocusMode && !isFocused
        ? 'text-editor-focus-gray'
        : options.hasDefinition
          ? 'text-editor-identifier-def'
          : 'text-editor-identifier';
    const decoration = options.hasDefinition && !(hasFocusMode && !isFocused) && !options.isDead ? 'underline decoration-dotted decoration-sky-300/40' : '';
    const hover = options.hasDefinition && !(hasFocusMode && !isFocused) && !options.isDead ? 'cursor-pointer hover:bg-sky-400/15' : '';

    const finalClassName = `relative inline-block px-0.5 rounded transition-colors select-text ${baseColor} ${decoration} ${hover} ${returnBg}`;

    if (options.isDead && options.segmentText) {
      console.log(`[styleBuilder] DEAD identifier "${options.segmentText}" - className:`, finalClassName);
    }

    return {
      className: finalClassName,
      clickable: !!options.hasDefinition,
      clickType: 'definition',
      hoverTooltip: !!options.hasHoverInfo
    };
  }

  // Fallback
  const textColor = options.isDead
    ? 'text-slate-500 opacity-50'
    : hasFocusMode && !isFocused
      ? 'text-editor-focus-gray'
      : 'text-editor-text';
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
    'number',
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
