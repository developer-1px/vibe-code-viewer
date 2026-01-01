/**
 * JetBrains Theme Pack
 * IntelliJ IDEA New UI / Islands Dark inspired unified theme
 */

import type { UnifiedTheme } from '../types';
import { jetbrainsAppTheme } from './app';
import { jetbrainsEditorTheme } from './editor';

export const jetbrainsTheme: UnifiedTheme = {
  name: 'jetbrains',
  app: jetbrainsAppTheme,
  editor: jetbrainsEditorTheme,
};

// Re-export individual themes for granular usage
export { jetbrainsAppTheme } from './app';
export { jetbrainsEditorTheme } from './editor';
