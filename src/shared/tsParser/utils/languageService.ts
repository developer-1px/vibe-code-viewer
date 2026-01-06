/**
 * TypeScript Language Service 유틸리티
 *
 * Language Service를 사용하여 변수 선언과 참조를 정확하게 추출
 */

import * as ts from 'typescript';
import { virtualTypeFiles } from '../virtual-types';

/**
 * 메모리 기반 Language Service Host 생성
 */
export function createLanguageServiceHost(files: Record<string, string>): ts.LanguageServiceHost {
  // ✅ Virtual 타입 파일을 사용자 파일과 병합
  const allFiles = { ...virtualTypeFiles, ...files };

  const fileVersions = new Map<string, number>();

  // 모든 파일의 초기 버전을 0으로 설정
  Object.keys(allFiles).forEach((fileName) => {
    fileVersions.set(fileName, 0);
  });

  const host: ts.LanguageServiceHost = {
    // ✅ Virtual 타입 파일 + 사용자 파일 모두 반환
    getScriptFileNames: () => Object.keys(allFiles),

    getScriptVersion: (fileName: string) => {
      const version = fileVersions.get(fileName) || 0;
      return version.toString();
    },

    getScriptSnapshot: (fileName: string) => {
      // ✅ Virtual 타입 파일 + 사용자 파일 모두 읽기
      const content = allFiles[fileName];
      if (!content) return undefined;
      return ts.ScriptSnapshot.fromString(content);
    },

    getCurrentDirectory: () => '/',

    getCompilationSettings: () => ({
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true,
      // ✅ lib 타입 추론 활성화
      noLib: false,
      lib: ['es2022', 'dom'],
      // ✅ 모듈 해석 활성화 (react 등 외부 모듈 해석)
      noResolve: false,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
    }),

    getDefaultLibFileName: () => '/lib.d.ts', // ✅ Virtual lib 경로

    fileExists: (fileName: string) => Object.hasOwn(allFiles, fileName),

    readFile: (fileName: string) => allFiles[fileName],

    resolveModuleNames: (moduleNames: string[], containingFile: string) => {
      return moduleNames.map((moduleName) => {
        // ✅ react 모듈 해석
        if (moduleName === 'react') {
          return {
            resolvedFileName: '/node_modules/@types/react/index.d.ts',
            extension: ts.Extension.Dts,
            isExternalLibraryImport: true,
          };
        }

        // 상대 경로 해석
        if (moduleName.startsWith('.')) {
          const dir = containingFile.substring(0, containingFile.lastIndexOf('/'));
          const resolved = `${dir}/${moduleName}`;

          // 확장자 추가 시도
          if (allFiles[resolved]) return { resolvedFileName: resolved };
          if (allFiles[`${resolved}.ts`]) return { resolvedFileName: `${resolved}.ts` };
          if (allFiles[`${resolved}.tsx`]) return { resolvedFileName: `${resolved}.tsx` };
          if (allFiles[`${resolved}/index.ts`]) return { resolvedFileName: `${resolved}/index.ts` };
          if (allFiles[`${resolved}/index.tsx`]) return { resolvedFileName: `${resolved}/index.tsx` };
        }

        // ✅ 해결 실패 시 undefined 반환 (빈 문자열은 에러 발생)
        return undefined as any;
      });
    },
  };

  return host;
}

/**
 * 🔥 Performance Optimization: Language Service Cache
 *
 * - Language Service는 무거운 객체이므로 매번 생성하지 않고 재사용
 * - files 객체가 변경되면 invalidateLanguageService() 호출하여 캐시 무효화
 * - parseProject()에서 한 번 생성 후 extractDefinitions()에서 재사용
 */
let cachedLanguageService: ts.LanguageService | null = null;
let cachedFilesReference: Record<string, string> | null = null;

/**
 * Language Service 생성 (캐싱 지원)
 *
 * **캐싱 전략**:
 * - 동일한 files 객체: 캐시된 Language Service 반환
 * - files 객체 변경: 새 Language Service 생성 + 캐시 업데이트
 *
 * **성능 개선**:
 * - Before: extractDefinitions() 호출 시마다 Language Service 생성
 * - After: 첫 호출에만 생성, 이후 재사용
 *
 * @param files - Virtual file system
 * @returns TypeScript Language Service
 */
export function createLanguageService(files: Record<string, string>): ts.LanguageService {
  // 캐시 확인: 동일한 files 객체인 경우 재사용
  if (cachedLanguageService && cachedFilesReference === files) {
    console.log('[createLanguageService] ✅ Cache hit, reusing Language Service');
    return cachedLanguageService;
  }

  console.log('[createLanguageService] 🔥 Cache miss, creating new Language Service');

  // 새 Language Service 생성
  const host = createLanguageServiceHost(files);
  const registry = ts.createDocumentRegistry();
  const languageService = ts.createLanguageService(host, registry);

  // 캐시 저장
  cachedLanguageService = languageService;
  cachedFilesReference = files;

  return languageService;
}

/**
 * Invalidate Language Service cache
 *
 * **사용 시점**:
 * - filesAtom이 변경되어 parseProject()가 재실행될 때
 * - 새 폴더를 업로드하거나 파일이 추가/삭제될 때
 */
export function invalidateLanguageService(): void {
  cachedLanguageService = null;
  cachedFilesReference = null;
  console.log('[invalidateLanguageService] 🗑️ Language Service cache cleared');
}

/**
 * 함수 내부의 모든 로컬 변수 선언 찾기 (파라미터 포함)
 */
export function findAllLocalVariables(
  languageService: ts.LanguageService,
  fileName: string,
  functionNode: ts.FunctionLikeDeclaration
): Set<string> {
  const program = languageService.getProgram();
  if (!program) return new Set();

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return new Set();

  const variables = new Set<string>();

  // 1. 파라미터 추출 (destructuring 지원)
  functionNode.parameters.forEach((param) => {
    extractVariableNames(param.name, (name) => {
      variables.add(name);
    });
  });

  // 2. 함수 body 내부의 변수 선언 추출
  if (functionNode.body) {
    const functionStart = functionNode.body.getStart(sourceFile);
    const functionEnd = functionNode.body.getEnd();

    function visit(node: ts.Node) {
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.getEnd();

      // 함수 범위 밖이면 스킵
      if (nodeStart < functionStart || nodeEnd > functionEnd) {
        return;
      }

      // 중첩 함수는 스킵 (중첩 함수의 내부 변수는 제외)
      if (
        node !== functionNode.body &&
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node))
      ) {
        return;
      }

      // 변수 선언 찾기 (destructuring 자동 지원)
      if (ts.isVariableDeclaration(node)) {
        extractVariableNames(node.name, (name) => {
          variables.add(name);
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(functionNode.body);
  }

  return variables;
}

/**
 * 변수의 모든 참조 찾기
 */
export function findReferencesToVariable(
  languageService: ts.LanguageService,
  fileName: string,
  position: number
): Array<{ position: number; fileName: string; isWriteAccess: boolean }> {
  const references = languageService.getReferencesAtPosition(fileName, position);

  if (!references) return [];

  const result: Array<{ position: number; fileName: string; isWriteAccess: boolean }> = [];

  references.forEach((ref) => {
    result.push({
      position: ref.textSpan.start,
      fileName: ref.fileName,
      isWriteAccess: ref.isWriteAccess || false,
    });
  });

  return result;
}

/**
 * 특정 위치의 심볼 정보 가져오기
 */
export function getSymbolAtPosition(
  languageService: ts.LanguageService,
  fileName: string,
  position: number
): ts.Symbol | undefined {
  const program = languageService.getProgram();
  if (!program) return undefined;

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return undefined;

  const typeChecker = program.getTypeChecker();

  // 위치에서 노드 찾기
  function findNodeAtPosition(node: ts.Node, pos: number): ts.Node | undefined {
    if (pos < node.getStart(sourceFile) || pos >= node.getEnd()) {
      return undefined;
    }

    return ts.forEachChild(node, (child) => findNodeAtPosition(child, pos)) || node;
  }

  const node = findNodeAtPosition(sourceFile, position);
  if (!node) return undefined;

  return typeChecker.getSymbolAtLocation(node);
}

/**
 * 특정 위치에서 정의로 이동 (Go to Definition)
 * @returns {filePath, line} 또는 undefined
 */
export function getDefinitionAtPosition(
  languageService: ts.LanguageService,
  fileName: string,
  position: number
): { filePath: string; line: number } | undefined {
  const definitions = languageService.getDefinitionAtPosition(fileName, position);

  if (!definitions || definitions.length === 0) {
    return undefined;
  }

  // 첫 번째 정의 사용
  const def = definitions[0];
  const program = languageService.getProgram();
  if (!program) return undefined;

  const sourceFile = program.getSourceFile(def.fileName);
  if (!sourceFile) return undefined;

  const lineAndChar = sourceFile.getLineAndCharacterOfPosition(def.textSpan.start);

  return {
    filePath: def.fileName,
    line: lineAndChar.line + 1, // 0-based → 1-based
  };
}

/**
 * 변수 이름 추출 헬퍼 (destructuring 지원)
 */
function extractVariableNames(name: ts.BindingName, callback: (name: string) => void): void {
  if (ts.isIdentifier(name)) {
    callback(name.text);
  } else if (ts.isObjectBindingPattern(name)) {
    name.elements.forEach((element) => {
      extractVariableNames(element.name, callback);
    });
  } else if (ts.isArrayBindingPattern(name)) {
    name.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        extractVariableNames(element.name, callback);
      }
    });
  }
}

/**
 * 함수 호출의 각 argument에 대한 파라미터 이름 추출
 * IntelliJ-style inlay hints를 위한 정보 제공
 *
 * @param languageService - TypeScript Language Service
 * @param fileName - 파일 이름
 * @param callExpression - 함수 호출 AST 노드
 * @param sourceFile - SourceFile
 * @returns Map<argumentPosition, parameterName> - argument 시작 위치 → 파라미터 이름
 */
export function getParameterHintsForCall(
  languageService: ts.LanguageService,
  fileName: string,
  callExpression: ts.CallExpression,
  sourceFile: ts.SourceFile
): Map<number, string> {
  const hints = new Map<number, string>();

  try {
    // 1. CallExpression의 expression (함수 식별자) 위치 가져오기
    const expr = callExpression.expression;
    const exprPos = expr.getEnd(); // getEnd()를 사용하여 함수 이름 끝 위치

    // 2. Language Service로 함수 signature 가져오기
    const signatureHelp = languageService.getSignatureHelpItems(fileName, exprPos, {});

    if (!signatureHelp || signatureHelp.items.length === 0) {
      return hints;
    }

    // 3. 첫 번째 signature 사용 (overload는 나중에 처리)
    const signature = signatureHelp.items[0];
    const parameters = signature.parameters;

    // 4. 각 argument에 파라미터 이름 매핑
    callExpression.arguments.forEach((arg, idx) => {
      if (idx < parameters.length) {
        const paramName = parameters[idx].name;
        const argStart = arg.getStart(sourceFile);
        hints.set(argStart, paramName);
      }
    });
  } catch (error) {
    // Language Service 에러는 무시 (타입 정의 없는 함수 등)
    console.debug('[getParameterHintsForCall] Error:', error);
  }

  return hints;
}
