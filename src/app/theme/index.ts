/**
 * Unified Theme System - Public API
 */

// Types
export type { UnifiedTheme, AppTheme, EditorTheme } from './types';

// Theme packs - Unified themes with app + editor configuration
export { defaultTheme, defaultAppTheme, defaultEditorTheme } from './default';
export { vscodeTheme, vscodeAppTheme, vscodeEditorTheme } from './vscode';
export { jetbrainsTheme, jetbrainsAppTheme, jetbrainsEditorTheme } from './jetbrains';

// Providers and Hooks
export { ThemeProvider, useTheme, useAppTheme } from './ThemeProvider';
export type { ThemeName } from './ThemeProvider';
export { EditorThemeProvider, useEditorTheme } from './EditorThemeProvider';
