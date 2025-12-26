// Vite's import.meta.glob to load all files at build time
const vueExamples = import.meta.glob('/examples/vue/**/*.{vue,ts}', {
  query: '?raw',
  eager: true
});

const reactExamples = import.meta.glob('/examples/react/**/*.{tsx,ts}', {
  query: '?raw',
  eager: true
});

// Load src files (프로젝트 자체 소스)
const srcFiles = import.meta.glob('/src/**/*.{tsx,ts,vue}', {
  query: '?raw',
  eager: true
});

// Convert glob results to files object
export const loadExampleFiles = (): Record<string, string> => {
  const files: Record<string, string> = {};

  // Process Vue examples
  // Object.entries(vueExamples).forEach(([path, module]) => {
  //   const filePath = path.replace(/^\//, '');
  //   files[filePath] = (module as any).default;
  // });
  //
  // // Process React examples
  // Object.entries(reactExamples).forEach(([path, module]) => {
  //   const filePath = path.replace(/^\//, '');
  //   files[filePath] = (module as any).default;
  // });

  // Process src files
  Object.entries(srcFiles).forEach(([path, module]) => {
    const filePath = path.replace(/^\//, '');
    files[filePath] = (module as any).default;
  });

  console.log('📦 Loaded files:', Object.keys(files));
  return files;
};
