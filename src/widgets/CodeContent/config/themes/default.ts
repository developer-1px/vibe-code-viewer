/**
 * Default CodeContent Theme
 * Extracts current hardcoded values into a JSON-serializable theme object
 */

import type { CodeTheme } from '../types';

export const defaultTheme: CodeTheme = {
  typography: {
    fontSize: 'text-xs',
    fontFamily: 'font-mono',
    lineHeight: 'leading-[1rem]'
  },
  colors: {
    background: 'bg-[#0b1221]',
    lineNumber: {
      text: 'text-slate-600',
      background: 'bg-[#0f172a]/50',
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
      keyword: 'text-purple-400',
      punctuation: 'text-slate-400',
      string: 'text-orange-300',
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
      parameter: 'text-orange-300',
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
    slotSize: 'w-2 h-2',
    slotSpacing: 5  // Pixels between staggered slots
  }
};
