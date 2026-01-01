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
    },
    tokens: {
      // Syntax highlighting (Darcula colors)
      text: 'text-[#A9B7C6]',           // Default text
      keyword: 'text-[#CC7832]',        // Orange keywords
      punctuation: 'text-[#A9B7C6]',    // Same as text
      string: 'text-[#6A8759]',         // Green strings
      comment: 'text-[#808080]',        // Gray comments
      commentFocus: 'text-[#8C8C8C]',

      // Special identifiers
      self: 'text-[#FFC66D]',           // Yellow for definitions
      identifier: 'text-[#A9B7C6]',
      identifierWithDef: 'text-[#9876AA]', // Purple for definitions

      // External dependencies
      externalImport: 'text-[#6A8759]', // Green imports
      externalClosure: 'text-[#FFC66D]', // Yellow closure
      externalFunction: 'text-[#FFC66D]', // Yellow functions

      // Local scope
      parameter: 'text-[#CC7832]',      // Orange parameters
      localVariable: 'text-[#9876AA]',  // Purple local vars

      // Focus mode
      focusGrayscale: 'text-[#606366]', // Muted gray
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
