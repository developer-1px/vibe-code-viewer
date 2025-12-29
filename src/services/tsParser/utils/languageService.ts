/**
 * TypeScript Language Service 유틸리티
 *
 * Language Service를 사용하여 변수 선언과 참조를 정확하게 추출
 */

import * as ts from 'typescript';

/**
 * 메모리 기반 Language Service Host 생성
 */
export function createLanguageServiceHost(
  files: Record<string, string>
): ts.LanguageServiceHost {
  const fileVersions = new Map<string, number>();

  // 모든 파일의 초기 버전을 0으로 설정
  Object.keys(files).forEach(fileName => {
    fileVersions.set(fileName, 0);
  });

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),

    getScriptVersion: (fileName: string) => {
      const version = fileVersions.get(fileName) || 0;
      return version.toString();
    },

    getScriptSnapshot: (fileName: string) => {
      const content = files[fileName];
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
      noLib: true,
      noResolve: true, // ✅ 모듈 해석 비활성화 (브라우저 환경)
      isolatedModules: true, // ✅ 각 파일을 독립적으로 처리
    }),

    getDefaultLibFileName: () => 'lib.d.ts', // 브라우저 환경에서는 더미 값 반환

    fileExists: (fileName: string) => files.hasOwnProperty(fileName),

    readFile: (fileName: string) => files[fileName],

    resolveModuleNames: (moduleNames: string[], containingFile: string) => {
      return moduleNames.map(moduleName => {
        // 상대 경로 해석
        if (moduleName.startsWith('.')) {
          const dir = containingFile.substring(0, containingFile.lastIndexOf('/'));
          let resolved = `${dir}/${moduleName}`;

          // 확장자 추가 시도
          if (files[resolved]) return { resolvedFileName: resolved };
          if (files[`${resolved}.ts`]) return { resolvedFileName: `${resolved}.ts` };
          if (files[`${resolved}.tsx`]) return { resolvedFileName: `${resolved}.tsx` };
          if (files[`${resolved}/index.ts`]) return { resolvedFileName: `${resolved}/index.ts` };
          if (files[`${resolved}/index.tsx`]) return { resolvedFileName: `${resolved}/index.tsx` };
        }

        // ✅ 해결 실패 시 undefined 반환 (빈 문자열은 에러 발생)
        return undefined as any;
      });
    },
  };

  return host;
}

/**
 * Language Service 생성
 */
export function createLanguageService(
  files: Record<string, string>
): ts.LanguageService {
  const host = createLanguageServiceHost(files);
  const registry = ts.createDocumentRegistry();
  return ts.createLanguageService(host, registry);
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
  functionNode.parameters.forEach(param => {
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
      if (node !== functionNode.body &&
          (ts.isFunctionDeclaration(node) ||
           ts.isFunctionExpression(node) ||
           ts.isArrowFunction(node))) {
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

  references.forEach(ref => {
    result.push({
      position: ref.textSpan.start,
      fileName: ref.fileName,
      isWriteAccess: ref.isWriteAccess || false
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

    return ts.forEachChild(node, child => findNodeAtPosition(child, pos)) || node;
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
    line: lineAndChar.line + 1 // 0-based → 1-based
  };
}

/**
 * 변수 이름 추출 헬퍼 (destructuring 지원)
 */
function extractVariableNames(
  name: ts.BindingName,
  callback: (name: string) => void
): void {
  if (ts.isIdentifier(name)) {
    callback(name.text);
  } else if (ts.isObjectBindingPattern(name)) {
    name.elements.forEach(element => {
      extractVariableNames(element.name, callback);
    });
  } else if (ts.isArrayBindingPattern(name)) {
    name.elements.forEach(element => {
      if (ts.isBindingElement(element)) {
        extractVariableNames(element.name, callback);
      }
    });
  }
}
