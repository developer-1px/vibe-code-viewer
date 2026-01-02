/**
 * Default Editor Theme
 * Extracts current hardcoded values into a JSON-serializable theme object
 */

import type { EditorTheme } from '../types';

export const defaultEditorTheme: EditorTheme = {
  name: 'default',
  typography: {
    fontSize: 'text-[10px]',
    fontFamily: 'font-mono',
    lineHeight: 'leading-[1rem]'
  },
  colors: {
    background: 'bg-[#080a0f]',         // 파란색 → 검은색에 가깝게 (약간의 파란 힌트만)
    lineNumber: {
      text: 'text-slate-600',
      background: 'bg-[#0a0c10]/50',    // 배경과 조화롭게
      border: 'border-white/5'
    },
    code: {
      normal: 'text-slate-300',
      comment: {
        normal: 'text-slate-400/85',
        focus: 'text-slate-400'  // Brighter in focus mode
      }
    },
    template: {
      text: 'text-slate-300',
      clickable: {
        bg: 'bg-slate-800/50',
        border: 'border-slate-700',
        text: 'text-emerald-300',
        hoverBg: 'hover:bg-white/10',
        hoverBorder: 'hover:border-emerald-500/50'
      }
    },
    tokens: {
      // Syntax highlighting
      text: 'text-slate-300',
      keyword: 'text-purple-300/90',      // 보라색 톤 다운 + 약간의 투명도
      punctuation: 'text-slate-400',
      string: 'text-amber-200/85',        // 오렌지 → 앰버로 변경 + 투명도로 부드럽게
      comment: 'text-slate-400/85',
      commentFocus: 'text-slate-400',

      // Special identifiers
      self: 'text-vibe-accent',          // Cyan for definitions
      identifier: 'text-slate-300',
      identifierWithDef: 'text-sky-300',

      // External dependencies
      externalImport: 'text-emerald-300',
      externalClosure: 'text-amber-300',
      externalFunction: 'text-purple-300',

      // Local scope
      parameter: 'text-amber-200/85',     // string과 통일감 있게
      localVariable: 'text-cyan-200',

      // Focus mode
      focusGrayscale: 'text-slate-600',
    }
  },
  spacing: {
    containerY: 'py-2',
    lineX: 'px-3',
    lineY: 'py-0.5',
    lineNumberX: 'pr-2'
  },
  dimensions: {
    lineNumberWidth: 'w-16',
    slotSize: 'w-1.5 h-1.5',  // Reduced from w-2 h-2 (8px → 6px)
    slotSpacing: 4  // Reduced spacing for smaller slots
  }
};
