/**
 * Segment 스타일링 빌더
 * 여러 kind를 조합하여 최종 스타일과 동작을 결정
 */

import type { SegmentKind, SegmentStyle } from '../types/codeLine';

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
    isDead?: boolean; // Dead identifier (VSCode-like muted)
  }
): SegmentStyle {
  const primaryKind = getPrimaryKind(kinds);
  const returnBg = options.isInReturn ? 'bg-code-return' : '';

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
      className: `${textColor} select-text`,
      clickable: false
    };
  }

  // Self reference (Declaration name)
  if (primaryKind === 'self') {
    // Dead identifier: 최우선 처리 - muted 스타일 적용
    if (options.isDead) {
      console.log(`[styleBuilder] DEAD self identifier "${options.segmentText}"`);
      return {
        className: 'inline-block px-0.5 rounded text-code-dead select-text',
        clickable: false,
        title: 'Unused (Dead Code)'
      };
    }

    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'inline-block px-0.5 rounded bg-code-self/30 text-code-self font-bold cursor-pointer hover:bg-code-self/40 border border-code-self/60 transition-colors select-text',
        clickable: true,
        clickType: 'definition',
        title: 'Definition (Focused)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'inline-block px-0.5 rounded text-editor-focus-gray cursor-pointer hover:bg-code-self/10 hover:text-code-self/60 transition-colors select-text',
        clickable: true,
        clickType: 'definition',
        title: 'Definition'
      };
    }

    // Normal mode
    return {
      className: `inline-block px-0.5 rounded bg-code-self/15 text-code-self font-bold cursor-pointer hover:bg-code-self/25 transition-colors select-text`,
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
        className: 'style-code-dead-import',
        clickable: false,
        clickType: 'none',
        title: 'Unused import (Dead code)'
      };
    }

    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `inline-block px-1 rounded bg-code-external-import/30 text-code-external-import font-bold border border-code-external-import/60 hover:bg-code-external-import/40 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 rounded text-editor-focus-gray border border-border-medium hover:bg-code-external-import/10 hover:text-code-external-import transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    // Active 상태: 강조 스타일
    if (isActive) {
      return {
        className: `inline-block px-1 rounded bg-code-external-import/20 text-code-external-import font-semibold border border-code-external-import/30 hover:bg-code-external-import/25 hover:border-code-external-import/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
        clickable: !!options.hasDefinedIn,
        clickType: 'external',
        title: options.hasDefinedIn ? 'Cmd+Click to close' : 'External Import (Active)'
      };
    }

    // Inactive 상태: 코드와 어울리는 적당한 강도
    return {
      className: `inline-block px-1 rounded bg-code-external-import/12 text-code-external-import/90 border border-code-external-import/25 hover:bg-code-external-import/15 hover:text-code-external-import hover:border-code-external-import/30 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
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
        className: `inline-block px-1 py-0.5 rounded bg-code-external-closure/30 text-code-external-closure font-bold border border-code-external-closure/60 hover:bg-code-external-closure/40 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded text-editor-focus-gray border border-border-medium hover:bg-code-external-closure/10 hover:text-code-external-closure transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    return {
      className: `inline-block px-1 py-0.5 rounded bg-code-external-closure/15 text-code-external-closure font-semibold border border-code-external-closure/30 hover:bg-code-external-closure/25 hover:border-code-external-closure/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
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
        className: `inline-block px-1 py-0.5 rounded bg-code-external-function/30 text-code-external-function font-bold border border-code-external-function/60 hover:bg-code-external-function/40 transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: `inline-block px-1 py-0.5 rounded text-editor-focus-gray border border-border-medium hover:bg-code-external-function/10 hover:text-code-external-function transition-all select-text cursor-pointer`,
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight'
      };
    }

    return {
      className: `inline-block px-1 py-0.5 rounded bg-code-external-function/15 text-code-external-function font-semibold border border-code-external-function/30 hover:bg-code-external-function/25 hover:border-code-external-function/50 transition-all select-text ${options.hasDefinedIn ? 'cursor-pointer' : 'cursor-default'}`,
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
        className: 'inline-block px-1 py-0.5 rounded bg-code-parameter/30 text-code-parameter font-bold border border-code-parameter/60 hover:bg-code-parameter/40 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode) - Parameter'
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-code-parameter/20 text-code-parameter font-semibold border border-code-parameter/40 hover:bg-code-parameter/30 hover:border-code-parameter/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight - Parameter'
      };
    }

    // Focus mode에서 다른 변수가 활성화된 경우: grayscale
    if (hasFocusMode) {
      return {
        className: 'inline-block px-1 py-0.5 rounded text-editor-focus-gray border border-border-medium hover:text-code-parameter hover:border-code-parameter/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight - Parameter'
      };
    }

    // 기본 상태: 클릭 가능
    return {
      className: 'inline-block px-1 py-0.5 rounded bg-code-parameter/15 text-code-parameter font-semibold border border-code-parameter/30 hover:bg-code-parameter/25 hover:border-code-parameter/50 transition-all cursor-pointer select-text',
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
        className: 'inline-block px-1 py-0.5 rounded bg-code-local-variable/30 text-code-local-variable font-bold border border-code-local-variable/60 hover:bg-code-local-variable/40 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode)'
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'inline-block px-1 py-0.5 rounded bg-code-local-variable/20 text-code-local-variable font-semibold border border-code-local-variable/40 hover:bg-code-local-variable/30 hover:border-code-local-variable/60 transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight'
      };
    }

    // Inactive 상태 + Focus mode: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'inline-block px-0.5 rounded text-editor-focus-gray hover:bg-code-local-variable/10 hover:text-code-local-variable transition-all cursor-pointer select-text',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight'
      };
    }

    // Inactive 상태: 기본 스타일 (하이라이트 없음, 클릭 가능)
    return {
      className: 'inline-block px-0.5 rounded text-text-secondary hover:bg-code-local-variable/10 hover:text-code-local-variable transition-all cursor-pointer select-text',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight'
    };
  }

  // Identifier with nodeId (dependency slot)
  if (primaryKind === 'identifier' && options.hasNodeId) {
    // ✅ Dead identifier: muted style
    const textColor = options.isDead
      ? 'text-code-dead'
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
      ? 'text-code-dead'
      : hasFocusMode && !isFocused
        ? 'text-editor-focus-gray'
        : options.hasDefinition
          ? 'text-editor-identifier-def'
          : 'text-editor-identifier';
    const decoration = '';
    const hover = options.hasDefinition && !(hasFocusMode && !isFocused) && !options.isDead ? 'cursor-pointer hover-code-identifier' : '';

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
    ? 'text-code-dead'
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
  // ✅ Bug fix: kinds가 undefined인 경우 방어
  if (!kinds || !Array.isArray(kinds)) {
    return 'text';
  }

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
