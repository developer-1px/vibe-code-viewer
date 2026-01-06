/**
 * Virtual Type Definitions
 *
 * TypeScript lib 파일과 React 타입 정의를 메모리 파일 시스템에 로드
 * Language Service가 기본 JavaScript 타입과 React 타입을 추론할 수 있도록 함
 */

// Vite raw import로 타입 정의 파일을 문자열로 가져옴
import libDts from './lib.d.ts?raw';
import libDomDts from './lib.dom.d.ts?raw';
import libDomIterableDts from './lib.dom.iterable.d.ts?raw';
import libEs5Dts from './lib.es5.d.ts?raw';
import libEs2015CoreDts from './lib.es2015.core.d.ts?raw';
import libEs2015Dts from './lib.es2015.d.ts?raw';
import libEs2015GeneratorDts from './lib.es2015.generator.d.ts?raw';
import libEs2015IterableDts from './lib.es2015.iterable.d.ts?raw';
import libEs2015PromiseDts from './lib.es2015.promise.d.ts?raw';
import libEs2015SymbolDts from './lib.es2015.symbol.d.ts?raw';
import libEs2015SymbolWellknownDts from './lib.es2015.symbol.wellknown.d.ts?raw';
import libEs2022Dts from './lib.es2022.d.ts?raw';
import reactDts from './react.d.ts?raw';
import reactGlobalDts from './react-global.d.ts?raw';

/**
 * Virtual 파일 시스템에 추가할 타입 정의 파일 맵
 *
 * **경로 규칙**:
 * - TypeScript lib: `/lib.xxx.d.ts` (Language Service가 자동으로 찾음)
 * - React 타입: `/node_modules/@types/react/xxx.d.ts` (import 'react' 해석용)
 */
export const virtualTypeFiles: Record<string, string> = {
  // TypeScript 기본 lib 파일들
  '/lib.d.ts': libDts,
  '/lib.es5.d.ts': libEs5Dts,
  '/lib.es2015.d.ts': libEs2015Dts,
  '/lib.es2015.core.d.ts': libEs2015CoreDts,
  '/lib.es2015.promise.d.ts': libEs2015PromiseDts,
  '/lib.es2015.iterable.d.ts': libEs2015IterableDts,
  '/lib.es2015.symbol.d.ts': libEs2015SymbolDts,
  '/lib.es2015.symbol.wellknown.d.ts': libEs2015SymbolWellknownDts,
  '/lib.es2015.generator.d.ts': libEs2015GeneratorDts,
  '/lib.es2022.d.ts': libEs2022Dts,
  '/lib.dom.d.ts': libDomDts,
  '/lib.dom.iterable.d.ts': libDomIterableDts,

  // React 타입 정의
  '/node_modules/@types/react/index.d.ts': reactDts,
  '/node_modules/@types/react/global.d.ts': reactGlobalDts,
};

/**
 * Virtual 타입 파일의 총 크기 (참고용)
 */
export const virtualTypeFilesSize = Object.values(virtualTypeFiles).reduce((sum, content) => sum + content.length, 0);

console.log(
  `[Virtual Types] Loaded ${Object.keys(virtualTypeFiles).length} type definition files (${(virtualTypeFilesSize / 1024).toFixed(2)} KB)`
);
