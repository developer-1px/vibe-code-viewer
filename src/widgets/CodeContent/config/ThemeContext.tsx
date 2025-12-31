/**
 * CodeContent Theme Context
 * Provides theme configuration to all CodeContent components
 */

import React, { createContext, useContext } from 'react';
import { defaultTheme } from './themes/default';
import type { CodeTheme } from './types';

const CodeThemeContext = createContext<CodeTheme>(defaultTheme);

/**
 * Hook to access current CodeContent theme
 */
export const useCodeTheme = () => useContext(CodeThemeContext);

/**
 * Theme Provider for CodeContent widget
 * Allows runtime theme switching by passing different theme objects
 */
export const CodeThemeProvider: React.FC<{
  theme?: CodeTheme;
  children: React.ReactNode;
}> = ({ theme = defaultTheme, children }) => {
  return (
    <CodeThemeContext.Provider value={theme}>
      {children}
    </CodeThemeContext.Provider>
  );
};
