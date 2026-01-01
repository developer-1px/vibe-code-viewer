/**
 * JetBrains (Darcula) Theme
 * Based on IntelliJ IDEA's Darcula color scheme
 */

import type { CodeTheme } from '../types';

export const jetbrainsTheme: CodeTheme = {
  typography: {
    fontSize: 'text-sm',        // Slightly larger than default
    fontFamily: 'font-mono',
    lineHeight: 'leading-[1.4]' // More spacious line height
  },
  colors: {
    background: 'bg-[#2B2B2B]',  // Darcula dark gray
    lineNumber: {
      text: 'text-[#606366]',           // Muted gray
      background: 'bg-[#313335]',       // Slightly lighter than main bg
      border: 'border-[#323232]'        // Subtle border
    },
    code: {
      normal: 'text-[#A9B7C6]',         // Darcula default text
      comment: {
        normal: 'text-[#808080]',       // Standard gray
        focus: 'text-[#8C8C8C]'         // Slightly brighter in focus
      }
    },
    template: {
      text: 'text-[#A9B7C6]',
      clickable: {
        bg: 'bg-[#214283]/40',          // Dark blue selection
        border: 'border-[#4A88C7]',     // IntelliJ blue
        text: 'text-[#FFC66D]',         // Yellow for components
        hoverBg: 'hover:bg-[#214283]/60',
        hoverBorder: 'hover:border-[#4A88C7]/80'
      }
    }
  },
  spacing: {
    containerY: 'py-3',           // More padding
    lineX: 'px-4',                // More horizontal padding
    lineY: 'py-1',                // More vertical padding per line
    lineNumberX: 'pr-3'
  },
  dimensions: {
    lineNumberWidth: 'w-20',      // Wider line number column
    slotSize: 'w-2 h-2',
    slotSpacing: 6                // Slightly more spacing
  }
};
