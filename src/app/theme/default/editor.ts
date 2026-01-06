/**
 * Default Editor Theme
 * Extracts current hardcoded values into a JSON-serializable theme object
 */

import type { EditorTheme } from '../types';

export const defaultEditorTheme: EditorTheme = {
  name: 'default',
  typography: {
    fontSize: 'text-xs',
    fontFamily: 'font-mono',
    lineHeight: 'leading-snug',
  },
  colors: {
    background: '', // @TODO
    lineNumber: {
      text: 'text-slate-500', // 600 → 500 (1단계 밝게)
      background: 'bg-[#15151d]/50', // LIMN bg-deep와 일치
      border: 'border-white/5',
    },
    code: {
      normal: 'text-slate-200', // 300 → 200 (1단계 밝게)
      comment: {
        normal: 'text-slate-300/85', // 400 → 300 (1단계 밝게)
        focus: 'text-slate-300', // 400 → 300 (1단계 밝게)
      },
    },
    template: {
      text: 'text-slate-200', // 300 → 200 (1단계 밝게)
      clickable: {
        bg: 'bg-slate-800/50',
        border: 'border-slate-700',
        text: 'text-emerald-300',
        hoverBg: 'hover:bg-white/10',
        hoverBorder: 'hover:border-emerald-500/50',
      },
    },
  },
  spacing: {
    containerY: 'py-2',
    lineY: '',
    lineX: 'px-3',
    lineNumberX: 'pr-2',
  },
  dimensions: {
    lineNumberWidth: 'w-16',
    slotSize: 'w-1.5 h-1.5', // Reduced from w-2 h-2 (8px → 6px)
    slotSpacing: 4, // Reduced spacing for smaller slots
  },
};
