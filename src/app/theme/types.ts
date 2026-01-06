/**
 * Unified Theme System Types
 * Combines App-wide theme and Code Editor theme
 */

/**
 * App Theme - Global UI styling
 * All color values are hex codes that will be injected as CSS variables
 */
export interface AppTheme {
  name: string;

  colors: {
    // Main backgrounds (hex values)
    background: string; // Main app background
    canvas: string; // Canvas/workspace area
    sidebar: string; // AppSidebar background
    header: string; // Header background
    panel: string; // Panel/card background

    // Borders (hex values)
    border: {
      DEFAULT: string; // Default border
      subtle: string; // Subtle border
      strong: string; // Strong border
    };

    // Text colors (hex values)
    text: {
      primary: string; // Main text
      secondary: string; // Secondary/muted text
      tertiary: string; // Tertiary/muted text
      accent: string; // Accent/highlight text
    };

    // Interactive states (rgba values)
    hover: string; // Hover state
    active: string; // Active/selected state
    focus: string; // Focus state

    // Status colors (hex values)
    success: string;
    warning: string;
    error: string;
    info: string;

    // Special colors (hex values)
    purple: string;
    amber: string;
    emerald: string;
  };

  // Tailwind utility classes (not injected as CSS vars)
  effects: {
    blur: string; // Backdrop blur
    shadow: string; // Box shadow
  };
}

/**
 * Editor Theme - Code syntax highlighting
 */
export interface EditorTheme {
  name: string;

  typography: {
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
  };

  colors: {
    background: string;

    lineNumber: {
      text: string;
      background: string;
      border: string;
    };

    code: {
      normal: string;
      comment: {
        normal: string;
        focus: string;
      };
    };

    template: {
      text: string;
      clickable: {
        bg: string;
        border: string;
        text: string;
        hoverBg: string;
        hoverBorder: string;
      };
    };
  };

  spacing: {
    containerY: string;
    lineX: string;
    lineY: string;
    lineNumberX: string;
  };

  dimensions: {
    lineNumberWidth: string;
    slotSize: string;
    slotSpacing: number;
  };
}

/**
 * Unified Theme - Complete theme configuration
 */
export interface UnifiedTheme {
  name: string;
  app: AppTheme;
  editor: EditorTheme;
}
