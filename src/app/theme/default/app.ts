/**
 * Default App Theme - Figma Dark inspired
 * High contrast, modern dark theme with cyan/teal identity
 */

import type { AppTheme } from '../types';

export const defaultAppTheme: AppTheme = {
  name: 'default',

  colors: {
    // Main backgrounds - Figma Dark style
    background: '#0e0e0e',    // Very dark background
    canvas: '#1e1e1e',        // Canvas/workspace
    sidebar: '#1e1e1e',       // Sidebar
    header: '#181818',        // Header (slightly darker)
    panel: '#2c2c2c',         // Panel/card (lighter for hierarchy)

    // Borders - Minimal, Figma style
    border: {
      DEFAULT: '#333333',     // Subtle border
      subtle: '#282828',      // Very subtle
      strong: '#444444',      // Strong border
    },

    // Text - High contrast
    text: {
      primary: '#f5f5f5',     // Very bright primary
      secondary: '#b3b3b3',   // Clear secondary
      tertiary: '#8c8c8c',    // Muted but readable
      accent: '#22d3ee',      // Cyan accent (AI identity)
    },

    // Interactive states
    hover: 'rgba(255, 255, 255, 0.06)',   // Subtle hover
    active: 'rgba(255, 255, 255, 0.10)',  // Active state
    focus: 'rgba(255, 255, 255, 0.12)',   // Focus state

    // Status colors - Vibrant on dark
    success: '#5fb76b',       // Green
    warning: '#f5a623',       // Figma orange
    error: '#f24822',         // Figma red
    info: '#18a0fb',          // Figma blue

    // Special colors
    purple: '#b58bf7',        // Figma purple
    amber: '#f5a623',         // Figma amber
    emerald: '#5fb76b',       // Emerald green
  },

  effects: {
    blur: 'backdrop-blur-sm',
    shadow: 'shadow-lg shadow-black/50',
  },
};
