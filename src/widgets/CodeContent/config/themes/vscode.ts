/**
 * VSCode (Dark+) Theme
 * Based on Visual Studio Code's Dark+ color scheme
 */

import type { CodeTheme } from '../types';

export const vscodeTheme: CodeTheme = {
  typography: {
    fontSize: 'text-sm',        // VSCode's comfortable reading size
    fontFamily: 'font-mono',
    lineHeight: 'leading-[1.5]' // VSCode's generous line spacing
  },
  colors: {
    background: 'bg-[#1E1E1E]',  // VSCode dark background
    lineNumber: {
      text: 'text-[#858585]',           // VSCode line number gray
      background: 'bg-[#1E1E1E]',       // Same as main bg (no distinction)
      border: 'border-transparent'      // No border in VSCode
    },
    code: {
      normal: 'text-[#D4D4D4]',         // VSCode default text (light gray)
      comment: {
        normal: 'text-[#6A9955]',       // VSCode green comments
        focus: 'text-[#7FB070]'         // Brighter green in focus
      }
    },
    template: {
      text: 'text-[#D4D4D4]',
      clickable: {
        bg: 'bg-[#264F78]/50',          // VSCode selection blue
        border: 'border-[#007ACC]',     // VSCode accent blue
        text: 'text-[#4EC9B0]',         // Cyan for components (like classes)
        hoverBg: 'hover:bg-[#264F78]/70',
        hoverBorder: 'hover:border-[#007ACC]/80'
      }
    }
  },
  spacing: {
    containerY: 'py-2',           // Minimal container padding
    lineX: 'px-4',                // Standard horizontal padding
    lineY: 'py-0.5',              // Tight vertical padding
    lineNumberX: 'pr-4'           // More space between line number and code
  },
  dimensions: {
    lineNumberWidth: 'w-16',      // Standard width
    slotSize: 'w-2 h-2',
    slotSpacing: 5
  }
};
