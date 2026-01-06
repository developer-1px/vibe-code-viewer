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
      clickable: false,
    };
  }

  // 키워드
  if (primaryKind === 'keyword') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-keyword';
    return {
      className: `${textColor} font-semibold select-text ${returnBg}`,
      clickable: false,
    };
  }

  // 구두점
  if (primaryKind === 'punctuation') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-punctuation';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false,
    };
  }

  // 문자열
  if (primaryKind === 'string') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-string';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false,
    };
  }

  // 숫자 (numeric literals, booleans, null, undefined)
  if (primaryKind === 'number') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-number';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false,
    };
  }

  // 주석
  if (primaryKind === 'comment') {
    // Focus mode일 때는 주석을 더 밝게 표시
    const textColor = hasFocusMode ? 'text-editor-comment-focus' : 'text-editor-comment';
    return {
      className: `${textColor} select-text`,
      clickable: false,
    };
  }

  // 함수 (Language Service로 감지된 function call)
  if (primaryKind === 'function') {
    const textColor = hasFocusMode && !isFocused ? 'text-editor-focus-gray' : 'text-editor-function';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: false,
    };
  }

  // Self reference (Declaration name)
  if (primaryKind === 'self') {
    // Dead identifier: 최우선 처리 - muted 스타일 적용
    if (options.isDead) {
      console.log(`[styleBuilder] DEAD self identifier "${options.segmentText}"`);
      return {
        className: 'text-code-dead select-text',
        clickable: false,
        title: 'Unused (Dead Code)',
      };
    }

    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'token-self token-self-focused',
        clickable: true,
        clickType: 'definition',
        title: 'Definition (Focused)',
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'token-self token-self-unfocused',
        clickable: true,
        clickType: 'definition',
        title: 'Definition',
      };
    }

    // Normal mode
    return {
      className: 'token-self',
      clickable: true,
      clickType: 'definition',
      title: 'Definition',
    };
  }

  // External NPM (npm 모듈 - 다른 색상으로 구분)
  if (primaryKind === 'external-npm') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'token-external-npm token-external-npm-focused',
        clickable: false,
        clickType: 'none',
        title: 'NPM Module (Focused)',
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'token-external-npm token-external-npm-unfocused',
        clickable: false,
        clickType: 'none',
        title: 'NPM Module',
      };
    }

    // Normal mode
    return {
      className: 'token-external-npm',
      clickable: false,
      clickType: 'none',
      title: 'NPM Module',
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
        title: 'Unused import (Dead code)',
      };
    }

    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: `token-external-import token-external-import-focused token-italic ${options.hasDefinedIn ? 'token-clickable' : ''}`,
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)',
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'token-external-import token-external-import-unfocused token-italic token-clickable',
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight',
      };
    }

    // Active 상태: 강조 스타일
    if (isActive) {
      return {
        className: `token-external-import token-external-import-active token-italic ${options.hasDefinedIn ? 'token-clickable' : ''}`,
        clickable: !!options.hasDefinedIn,
        clickType: 'external',
        title: options.hasDefinedIn ? 'Cmd+Click to close' : 'External Import (Active)',
      };
    }

    // Inactive 상태: 기본 스타일
    return {
      className: `token-external-import token-italic ${options.hasDefinedIn ? 'token-clickable' : ''}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show import source' : 'External Import',
    };
  }

  // External Closure (강조된 토큰 스타일)
  if (primaryKind === 'external-closure') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'token-external-closure token-external-closure-focused token-italic token-clickable',
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)',
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'token-external-closure token-external-closure-unfocused token-italic token-clickable',
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight',
      };
    }

    return {
      className: `token-external-closure token-italic ${options.hasDefinedIn ? 'token-clickable' : ''}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show closure variable' : 'Closure Variable',
    };
  }

  // External Function (강조된 토큰 스타일)
  if (primaryKind === 'external-function') {
    // Focus mode && Focused: 최대 강조
    if (hasFocusMode && isFocused) {
      return {
        className: 'token-external-function token-external-function-focused token-italic token-clickable',
        clickable: true,
        clickType: 'external',
        title: 'Click to deactivate highlight (Focus mode)',
      };
    }

    // Focus mode && Not focused: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'token-external-function token-external-function-unfocused token-italic token-clickable',
        clickable: true,
        clickType: 'external',
        title: 'Click to activate highlight',
      };
    }

    return {
      className: `token-external-function token-italic ${options.hasDefinedIn ? 'token-clickable' : ''}`,
      clickable: !!options.hasDefinedIn,
      clickType: 'external',
      title: options.hasDefinedIn ? 'Cmd+Click to show function' : 'Function Variable',
    };
  }

  // Parameter (클릭하여 하이라이트 가능한 파라미터)
  if (primaryKind === 'parameter') {
    const isActive = options.isActive;

    // Active 상태 && Focus mode: 최대 강조
    if (isActive && isFocused) {
      return {
        className: 'token-parameter token-parameter-focused',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode) - Parameter',
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'token-parameter token-parameter-active',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight - Parameter',
      };
    }

    // Focus mode에서 다른 변수가 활성화된 경우: grayscale
    if (hasFocusMode) {
      return {
        className: 'token-parameter token-parameter-unfocused',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight - Parameter',
      };
    }

    // 기본 상태: 클릭 가능
    return {
      className: 'token-parameter',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight - Parameter',
    };
  }

  // Local Variable (토글 가능한 하이라이트)
  if (primaryKind === 'local-variable') {
    const isActive = options.isActive;

    // Active 상태 && Focus mode: 최대 강조
    if (isActive && isFocused) {
      return {
        className: 'token-local-variable token-local-variable-focused',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight (Focus mode)',
      };
    }

    // Active 상태: 강조 하이라이트
    if (isActive) {
      return {
        className: 'token-local-variable token-local-variable-active',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to deactivate highlight',
      };
    }

    // Inactive 상태 + Focus mode: grayscale
    if (hasFocusMode && !isFocused) {
      return {
        className: 'token-local-variable token-local-variable-unfocused',
        clickable: true,
        clickType: 'local-variable',
        title: 'Click to activate highlight',
      };
    }

    // Inactive 상태: 기본 스타일 (하이라이트 없음, 클릭 가능)
    return {
      className: 'token-local-variable',
      clickable: true,
      clickType: 'local-variable',
      title: 'Click to activate highlight',
    };
  }

  // Identifier with nodeId (dependency slot)
  if (primaryKind === 'identifier' && options.hasNodeId) {
    // ✅ Dead identifier: muted style
    const textColor = options.isDead ? 'text-code-dead' : hasFocusMode && !isFocused ? 'text-editor-focus-gray' : '';
    return {
      className: `${textColor} select-text ${returnBg}`,
      clickable: true,
      clickType: 'expand', // CodeCardToken에서 처리
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
    const hover =
      options.hasDefinition && !(hasFocusMode && !isFocused) && !options.isDead
        ? 'cursor-pointer hover-code-identifier'
        : '';

    const finalClassName = `relative inline-block rounded transition-colors select-text ${baseColor} ${decoration} ${hover} ${returnBg}`;

    if (options.isDead && options.segmentText) {
      console.log(`[styleBuilder] DEAD identifier "${options.segmentText}" - className:`, finalClassName);
    }

    return {
      className: finalClassName,
      clickable: !!options.hasDefinition,
      clickType: 'definition',
      hoverTooltip: !!options.hasHoverInfo,
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
    clickable: false,
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
    'function', // ✅ Language Service로 감지된 함수 호출
    'self',
    'external-npm',
    'external-import',
    'external-function',
    'external-closure',
    'identifier',
    'parameter',
    'local-variable',
    'text',
  ];

  for (const kind of priority) {
    if (kinds.includes(kind)) return kind;
  }

  return 'text';
}
