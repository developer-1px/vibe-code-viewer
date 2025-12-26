import { loadExampleFiles } from './utils/loadExamples';

// Load all files from examples and src folders automatically
export const DEFAULT_FILES = loadExampleFiles();

// Default entry files (switch between these)
// export const DEFAULT_ENTRY_FILE = 'examples/vue/App.vue';
export const DEFAULT_ENTRY_FILE = 'examples/react/App.tsx';
