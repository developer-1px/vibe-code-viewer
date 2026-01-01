/**
 * JetBrains App Theme
 * Based on IntelliJ IDEA's New UI / Islands Dark theme for the app UI
 */

import type { AppTheme } from '../types';

export const jetbrainsAppTheme: AppTheme = {
  name: 'jetbrains',

  colors: {
    // JetBrains New UI / Islands Dark backgrounds
    background: '#191a1c',         // Main background
    canvas: '#1e1f22',             // Editor/canvas area
    sidebar: '#1e1f22',            // Sidebar background
    header: '#191a1c',             // Header bar
    panel: '#25262b',              // Panel background

    // Borders
    border: {
      DEFAULT: '#2b2b2b',          // Default border
      subtle: '#232428',           // Subtle border
      strong: '#3d3f43',           // Strong border
    },

    // Text colors
    text: {
      primary: '#bcbec4',          // Main text (Islands Dark)
      secondary: '#868a91',        // Secondary text
      tertiary: '#6c6e75',         // Tertiary text
      accent: '#56a8f5',           // Blue accent (Islands)
    },

    // Interactive states
    hover: 'rgb(255 255 255 / 0.04)',
    active: 'rgb(255 255 255 / 0.07)',
    focus: 'rgb(255 255 255 / 0.09)',

    // Status colors
    success: '#6aab73',            // Green
    warning: '#e8a85b',            // Orange/amber
    error: '#e66779',              // Red
    info: '#56a8f5',               // Blue

    // Special colors
    purple: '#9a7ecc',
    amber: '#e8a85b',
    emerald: '#6aab73',
  },

  effects: {
    blur: 'backdrop-blur-sm',
    shadow: 'shadow-lg shadow-black/50',
  },
};
