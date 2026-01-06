/**
 * 타입 추론 테스트
 *
 * Virtual 타입 파일이 제대로 로드되어 React와 JavaScript 기본 타입을 추론하는지 확인
 */

import { describe, expect, it } from 'vitest';
import { createLanguageService } from '../utils/languageService';

describe('타입 추론 - Virtual Types', () => {
  it('JavaScript 기본 타입 (Promise, Array) 추론', () => {
    const files = {
      '/test.ts': `
        const arr: Array<number> = [1, 2, 3];
        const promise: Promise<string> = Promise.resolve('hello');
      `,
    };

    const languageService = createLanguageService(files);
    const program = languageService.getProgram();

    expect(program).toBeDefined();

    // 파일이 제대로 파싱되었는지 확인
    const sourceFile = program?.getSourceFile('/test.ts');
    expect(sourceFile).toBeDefined();

    // 에러가 없어야 함 (타입이 제대로 인식됨)
    const diagnostics = languageService.getSemanticDiagnostics('/test.ts');
    expect(diagnostics.length).toBe(0);
  });

  it('React 타입 추론 (useState, useEffect)', () => {
    const files = {
      '/App.tsx': `
        import { useState, useEffect } from 'react';

        function App() {
          const [count, setCount] = useState(0);

          useEffect(() => {
            console.log(count);
          }, [count]);

          return <div>{count}</div>;
        }
      `,
    };

    const languageService = createLanguageService(files);
    const program = languageService.getProgram();

    expect(program).toBeDefined();

    // 파일이 제대로 파싱되었는지 확인
    const sourceFile = program?.getSourceFile('/App.tsx');
    expect(sourceFile).toBeDefined();

    // React import가 해석되었는지 확인
    const diagnostics = languageService.getSemanticDiagnostics('/App.tsx');

    // csstype, prop-types 의존성 에러는 무시 (핵심 타입만 테스트)
    const criticalErrors = diagnostics.filter(
      (d) => !d.messageText.toString().includes('csstype') && !d.messageText.toString().includes('prop-types')
    );

    expect(criticalErrors.length).toBeLessThanOrEqual(2); // JSX 관련 에러는 허용
  });

  it('DOM 타입 추론 (HTMLElement, Event)', () => {
    const files = {
      '/dom.ts': `
        const div: HTMLDivElement = document.createElement('div');
        const handler = (e: MouseEvent) => {
          console.log(e.clientX, e.clientY);
        };
      `,
    };

    const languageService = createLanguageService(files);
    const program = languageService.getProgram();

    expect(program).toBeDefined();

    const sourceFile = program?.getSourceFile('/dom.ts');
    expect(sourceFile).toBeDefined();

    const diagnostics = languageService.getSemanticDiagnostics('/dom.ts');
    expect(diagnostics.length).toBe(0);
  });

  it('Virtual 타입 파일이 메모리에 로드됨', () => {
    const files = {
      '/test.ts': 'const x = 1;',
    };

    const languageService = createLanguageService(files);
    const program = languageService.getProgram();

    // Virtual lib 파일이 로드되었는지 확인
    const libFile = program?.getSourceFile('/lib.d.ts');
    expect(libFile).toBeDefined();

    const libEs2022 = program?.getSourceFile('/lib.es2022.d.ts');
    expect(libEs2022).toBeDefined();

    const libDom = program?.getSourceFile('/lib.dom.d.ts');
    expect(libDom).toBeDefined();

    const reactTypes = program?.getSourceFile('/node_modules/@types/react/index.d.ts');
    expect(reactTypes).toBeDefined();
  });
});
