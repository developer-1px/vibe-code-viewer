/**
 * Default Theme Pack
 * Figma Dark inspired unified theme
 */

import type { UnifiedTheme } from '../types';
import { defaultAppTheme } from './app';
import { defaultEditorTheme } from './editor';

export const defaultTheme: UnifiedTheme = {
  name: 'default',
  app: defaultAppTheme,
  editor: defaultEditorTheme,
};

// Re-export individual themes for granular usage
export { defaultAppTheme } from './app';
export { defaultEditorTheme } from './editor';
