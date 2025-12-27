
import { loadExampleFiles, findEntryFile } from './utils/loadExamples'

// Load all files from examples and src folders automatically
export const DEFAULT_FILES = loadExampleFiles();

// Automatically detect the most appropriate entry file
// Priority: App.vue > App.tsx > main.vue > main.tsx > index.vue > index.tsx
export const DEFAULT_ENTRY_FILE = findEntryFile(DEFAULT_FILES);
