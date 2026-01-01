/**
 * Editor Theme Context
 * Provides theme configuration to Code Editor components
 */

import React, { createContext, useContext } from 'react';
import { defaultEditorTheme } from './default/editor';
import type { EditorTheme } from './types';

const EditorThemeContext = createContext<EditorTheme>(defaultEditorTheme);

/**
 * Hook to access current Editor theme
 */
export const useEditorTheme = () => useContext(EditorThemeContext);

/**
 * Theme Provider for Code Editor
 * Allows runtime theme switching by passing different theme objects
 */
export const EditorThemeProvider: React.FC<{
  theme?: EditorTheme;
  children: React.ReactNode;
}> = ({ theme = defaultEditorTheme, children }) => {
  return (
    <EditorThemeContext.Provider value={theme}>
      {children}
    </EditorThemeContext.Provider>
  );
};
