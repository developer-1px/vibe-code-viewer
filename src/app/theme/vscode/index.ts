/**
 * VSCode Theme Pack
 * Visual Studio Code Dark+ inspired unified theme
 */

import type { UnifiedTheme } from '../types';
import { vscodeAppTheme } from './app';
import { vscodeEditorTheme } from './editor';

export const vscodeTheme: UnifiedTheme = {
  name: 'vscode',
  app: vscodeAppTheme,
  editor: vscodeEditorTheme,
};

// Re-export individual themes for granular usage
export { vscodeAppTheme } from './app';
export { vscodeEditorTheme } from './editor';
