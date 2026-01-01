/**
 * VSCode App Theme
 * Based on Visual Studio Code's Dark+ theme for the app UI
 */

import type { AppTheme } from '../types';

export const vscodeAppTheme: AppTheme = {
  name: 'vscode',

  colors: {
    // VSCode Dark+ backgrounds
    background: '#1e1e1e',
    canvas: '#252526',
    sidebar: '#252526',
    header: '#1e1e1e',
    panel: '#2d2d30',

    // Borders
    border: {
      DEFAULT: '#3e3e42',
      subtle: '#2b2b2b',
      strong: '#4d4d50',
    },

    // Text colors
    text: {
      primary: '#cccccc',
      secondary: '#969696',
      tertiary: '#6e6e6e',
      accent: '#4ec9b0',        // VSCode teal
    },

    // Interactive states
    hover: 'rgb(255 255 255 / 0.05)',
    active: 'rgb(255 255 255 / 0.08)',
    focus: 'rgb(255 255 255 / 0.10)',

    // Status colors
    success: '#89d185',
    warning: '#dcdcaa',
    error: '#f48771',
    info: '#4ec9b0',

    // Special colors
    purple: '#c586c0',
    amber: '#dcdcaa',
    emerald: '#89d185',
  },

  effects: {
    blur: 'backdrop-blur-sm',
    shadow: 'shadow-lg shadow-black/50',
  },
};
