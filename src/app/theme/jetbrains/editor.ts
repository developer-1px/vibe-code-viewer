/**
 * JetBrains New UI / Islands Dark Editor Theme
 * Based on IntelliJ IDEA's New UI and Islands Dark color scheme
 */

import type { EditorTheme } from '../types';

export const jetbrainsEditorTheme: EditorTheme = {
  name: 'jetbrains',
  typography: {
    fontSize: 'text-sm',        // Slightly larger than default
    fontFamily: 'font-mono',
    lineHeight: 'leading-[1.4]' // More spacious line height
  },
  colors: {
    background: 'bg-[#1e1f22]',  // Islands Dark canvas
    lineNumber: {
      text: 'text-[#6c6e75]',           // Muted gray
      background: 'bg-[#191a1c]',       // Darker background
      border: 'border-[#2b2b2b]'        // Subtle border
    },
    code: {
      normal: 'text-[#bcbec4]',         // Islands Dark default text
      comment: {
        normal: 'text-[#7a7e85]',       // Muted gray comments
        focus: 'text-[#868a91]'         // Slightly brighter in focus
      }
    },
    template: {
      text: 'text-[#bcbec4]',
      clickable: {
        bg: 'bg-[#56a8f5]/20',          // Blue selection
        border: 'border-[#56a8f5]',     // Islands blue
        text: 'text-[#cf8e6d]',         // Warm orange for components
        hoverBg: 'hover:bg-[#56a8f5]/30',
        hoverBorder: 'hover:border-[#56a8f5]/80'
      }
    },
    tokens: {
      // Syntax highlighting (Islands Dark colors)
      text: 'text-[#bcbec4]',           // Default text
      keyword: 'text-[#cf8e6d]',        // Warm orange keywords
      punctuation: 'text-[#bcbec4]',    // Same as text
      string: 'text-[#6aab73]',         // Fresh green strings
      comment: 'text-[#7a7e85]',        // Muted gray comments
      commentFocus: 'text-[#868a91]',

      // Special identifiers
      self: 'text-[#cf8e6d]',           // Orange for definitions
      identifier: 'text-[#bcbec4]',
      identifierWithDef: 'text-[#9a7ecc]', // Purple for definitions

      // External dependencies
      externalImport: 'text-[#6aab73]', // Green imports
      externalClosure: 'text-[#cf8e6d]', // Orange closure
      externalFunction: 'text-[#56a8f5]', // Blue functions

      // Local scope
      parameter: 'text-[#cf8e6d]',      // Orange parameters
      localVariable: 'text-[#9a7ecc]',  // Purple local vars

      // Focus mode
      focusGrayscale: 'text-[#6c6e75]', // Muted gray
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
    slotSize: 'w-1.5 h-1.5',      // Reduced from w-2 h-2 (8px → 6px)
    slotSpacing: 4                // Reduced spacing for smaller slots
  }
};
