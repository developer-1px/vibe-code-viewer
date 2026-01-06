/**
 * Default App Theme - Figma Dark inspired
 * High contrast, modern dark theme with cyan/teal identity
 */

import type { AppTheme } from '../types';

export const defaultAppTheme: AppTheme = {
  name: 'default',

  colors: {
    // Main backgrounds - Figma Dark style (1단계 밝게)
    background: '#141414', // 0e → 14 (약간 밝게)
    canvas: '#242424', // 1e → 24 (약간 밝게)
    sidebar: '#242424', // 1e → 24 (약간 밝게)
    header: '#1e1e1e', // 18 → 1e (약간 밝게)
    panel: '#323232', // 2c → 32 (약간 밝게)

    // Borders - Minimal, Figma style (1단계 밝게)
    border: {
      DEFAULT: '#3d3d3d', // 33 → 3d (약간 밝게)
      subtle: '#2e2e2e', // 28 → 2e (약간 밝게)
      strong: '#4e4e4e', // 44 → 4e (약간 밝게)
    },

    // Text - High contrast (1단계 밝게)
    text: {
      primary: '#ffffff', // f5 → ff (최대 밝기)
      secondary: '#c7c7c7', // b3 → c7 (약간 밝게)
      tertiary: '#9a9a9a', // 8c → 9a (약간 밝게)
      accent: '#22d3ee', // Cyan accent (유지)
    },

    // Interactive states (1단계 밝게)
    hover: 'rgba(255, 255, 255, 0.08)', // 0.06 → 0.08
    active: 'rgba(255, 255, 255, 0.14)', // 0.10 → 0.14
    focus: 'rgba(255, 255, 255, 0.16)', // 0.12 → 0.16

    // Status colors - Vibrant on dark (밝기 유지)
    success: '#5fb76b', // Green
    warning: '#f5a623', // Figma orange
    error: '#f24822', // Figma red
    info: '#18a0fb', // Figma blue

    // Special colors
    purple: '#b58bf7', // Figma purple
    amber: '#f5a623', // Figma amber
    emerald: '#5fb76b', // Emerald green
  },

  effects: {
    blur: 'backdrop-blur-sm',
    shadow: 'shadow-lg shadow-black/50',
  },
};
