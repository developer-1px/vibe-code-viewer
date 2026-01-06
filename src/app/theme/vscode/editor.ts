/**
 * VSCode Dark+ Editor Theme
 * Based on Visual Studio Code's Dark+ color scheme
 */

import type { EditorTheme } from '../types';

export const vscodeEditorTheme: EditorTheme = {
  name: 'vscode',
  typography: {
    fontSize: 'text-sm', // VSCode's comfortable reading size
    fontFamily: 'font-mono',
    lineHeight: 'leading-[1.5]', // VSCode's generous line spacing
  },
  colors: {
    background: 'bg-[#252526]', // VSCode editor background
    lineNumber: {
      text: 'text-[#858585]', // VSCode line number gray
      background: 'bg-[#1e1e1e]', // Darker gutter
      border: 'border-[#2b2b2b]', // Subtle border
    },
    code: {
      normal: 'text-[#cccccc]', // VSCode default text
      comment: {
        normal: 'text-[#6A9955]', // VSCode green comments
        focus: 'text-[#7FB070]', // Brighter green in focus
      },
    },
    template: {
      text: 'text-[#cccccc]',
      clickable: {
        bg: 'bg-[#4ec9b0]/20', // Teal selection
        border: 'border-[#4ec9b0]', // VSCode teal accent
        text: 'text-[#4EC9B0]', // Cyan for components (like classes)
        hoverBg: 'hover:bg-[#4ec9b0]/30',
        hoverBorder: 'hover:border-[#4ec9b0]/80',
      },
    },
  },
  spacing: {
    containerY: 'py-2', // Minimal container padding
    lineX: 'px-4', // Standard horizontal padding
    lineY: 'py-0.5', // Tight vertical padding
    lineNumberX: 'pr-4', // More space between line number and code
  },
  dimensions: {
    lineNumberWidth: 'w-16', // Standard width
    slotSize: 'w-1.5 h-1.5', // Reduced from w-2 h-2 (8px → 6px)
    slotSpacing: 4, // Reduced spacing for smaller slots
  },
};
