/**
 * Unified Theme Provider
 * Manages both App and Editor themes together
 * Injects AppTheme colors as CSS variables for Tailwind
 */

import type React from 'react';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { defaultAppTheme } from './default/app';
import { defaultEditorTheme } from './default/editor';
import { EditorThemeProvider } from './EditorThemeProvider';
import { jetbrainsAppTheme } from './jetbrains/app';
import { jetbrainsEditorTheme } from './jetbrains/editor';
import type { AppTheme, EditorTheme, UnifiedTheme } from './types';
import { vscodeAppTheme } from './vscode/app';
import { vscodeEditorTheme } from './vscode/editor';

const themes: Record<string, UnifiedTheme> = {
  default: {
    name: 'default',
    app: defaultAppTheme,
    editor: defaultEditorTheme,
  },
  vscode: {
    name: 'vscode',
    app: vscodeAppTheme,
    editor: vscodeEditorTheme,
  },
  jetbrains: {
    name: 'jetbrains',
    app: jetbrainsAppTheme,
    editor: jetbrainsEditorTheme,
  },
};

export type ThemeName = keyof typeof themes;

interface ThemeContextValue {
  theme: UnifiedTheme;
  themeName: ThemeName;
  appTheme: AppTheme;
  editorTheme: EditorTheme;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook to access current theme
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * Unified Theme Provider
 * Wraps both App and Editor theme providers
 * Injects CSS variables for Tailwind to use
 */
export const ThemeProvider: React.FC<{
  children: ReactNode;
  initialTheme?: ThemeName;
}> = ({ children, initialTheme = 'default' }) => {
  const [themeName, setThemeName] = useState<ThemeName>(initialTheme);
  const theme = themes[themeName];

  // Set data-theme attribute for Tailwind v4 theme switching
  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute (for Tailwind v4)
    if (themeName === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.dataset.theme = themeName;
    }

    console.log('[ThemeProvider] Theme switched to:', themeName);
  }, [themeName]);

  const value: ThemeContextValue = {
    theme,
    themeName,
    appTheme: theme.app,
    editorTheme: theme.editor,
    setTheme: setThemeName,
  };

  return (
    <ThemeContext.Provider value={value}>
      <EditorThemeProvider theme={theme.editor}>{children}</EditorThemeProvider>
    </ThemeContext.Provider>
  );
};
