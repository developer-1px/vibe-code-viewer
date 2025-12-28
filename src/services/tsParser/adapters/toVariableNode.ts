 /**
 * VariableNode 어댑터
 *
 * TypeScript 파서 분석 결과를 기존 VariableNode 형식으로 변환
 */

import * as ts from 'typescript';
import { VariableNode, GraphData } from '../../../entities/VariableNode';
import {
  TSProjectAnalysis,
  TSFunctionAnalysis,
} from '../types';
import {
  getCodeSnippet,
  getStartLine,
  getEndLine,
  isAsyncFunction,
  isExportedFunction,
  getCodeStartOffset,
  getParameters,
  getLocalVariables as getLocalVariablesFromAST,
} from '../utils/astGetters';

/**
 * 프로젝트 분석 결과를 GraphData로 변환
 */
export function tsProjectToGraphData(
  projectAnalysis: TSProjectAnalysis
): GraphData {
  const nodes: VariableNode[] = [];

  // 1. 각 파일의 FILE_ROOT 생성 (레이아웃을 위해 필수!)
  projectAnalysis.files.forEach((fileAnalysis) => {
    // export 여부와 관계없이 모든 1depth 함수/변수를 포함
    const allFunctions = fileAnalysis.functions.map(f => f.id);
    const allVariables = fileAnalysis.fileVariables.map(v => v.id);
    const allTopLevelItems = [...allFunctions, ...allVariables];

    if (allTopLevelItems.length > 0) {
      // FILE_ROOT 노드 생성 - 원본 코드 사용 (렌더링에서 함수 본문 접기)
      const fileRootNode: VariableNode = {
        id: `${fileAnalysis.filePath}::FILE_ROOT`,
        label: 'Module',
        filePath: fileAnalysis.filePath,
        type: 'module',
        codeSnippet: fileAnalysis.sourceFile.getFullText(), // 원본 코드 전체
        startLine: 1,
        dependencies: allTopLevelItems,
      };
      nodes.push(fileRootNode);
    }
  });

  // 2. 모든 함수를 VariableNode로 변환
  projectAnalysis.allFunctions.forEach((func) => {
    try {
      const node = tsFunctionToVariableNode(func, projectAnalysis);
      nodes.push(node);
    } catch (error) {
      console.error(`❌ Error converting function ${func.name}:`, error);
    }
  });

  // 3. 각 파일의 파일 레벨 변수 추가 (함수가 할당된 변수 제외)
  projectAnalysis.files.forEach((fileAnalysis) => {
    // 함수 이름 목록 생성 (중복 방지용)
    const functionNames = new Set(fileAnalysis.functions.map(f => f.name));

    fileAnalysis.fileVariables.forEach((variable) => {
      // 함수가 할당된 변수는 이미 함수로 추가되었으므로 스킵
      if (functionNames.has(variable.name)) {
        return;
      }

      // id format: filePath::name
      const filePath = variable.id.split('::')[0];

      nodes.push({
        id: variable.id,
        label: variable.name,
        filePath,
        type: variable.isConst ? 'immutable-data' : 'ref',
        codeSnippet: variable.codeSnippet,
        startLine: variable.line,
        dependencies: [],
      });
    });
  });

  return { nodes };
}

// generateModuleSnippet 제거 - 사용되지 않음 (FILE_ROOT는 전체 코드 표시)

/**
 * TSFunctionAnalysis를 VariableNode로 변환
 */
function tsFunctionToVariableNode(
  funcAnalysis: TSFunctionAnalysis,
  projectAnalysis: TSProjectAnalysis
): VariableNode {
  // 노드 타입 결정
  let nodeType: VariableNode['type'];
  if (funcAnalysis.isPure) {
    nodeType = 'pure-function';
  } else if (funcAnalysis.hasSideEffects) {
    nodeType = 'effect-action';
  } else {
    nodeType = 'function';
  }

  // Dependencies: 함수가 호출하는 다른 함수들 ⭐
  // + 외부 참조 중 file-level 함수/변수
  const dependencies = new Set<string>();

  // 1. 함수 호출 관계
  funcAnalysis.callsTo.forEach((id) => dependencies.add(id));

  // 2. 외부 참조 중 file-level 항목들
  funcAnalysis.externalRefs.forEach((ref) => {
    if (ref.refType === 'file-level' && ref.definedIn) {
      dependencies.add(ref.definedIn);
    }
    // import는 dependencies에 포함하지 않음 (별도 표시)
  });

  // Getter 함수로 AST에서 직접 정보 추출
  return {
    id: funcAnalysis.id,
    label: funcAnalysis.name,
    filePath: funcAnalysis.filePath,
    type: nodeType,
    codeSnippet: getCodeSnippet(funcAnalysis),
    startLine: getStartLine(funcAnalysis),
    dependencies: Array.from(dependencies),

    // 로컬 변수 이름 (Language Service로 추출)
    localVariableNames: getLocalVariables(funcAnalysis, projectAnalysis.languageService),

    // 함수 분석 정보 저장 (외부 참조 하이라이팅용)
    functionAnalysis: convertToLegacyFormat(funcAnalysis, projectAnalysis.languageService),
  };
}

/**
 * TSFunctionAnalysis를 기존 FunctionAnalysis 형식으로 변환
 * (하이라이팅 등에서 사용) - Language Service 사용
 */
function convertToLegacyFormat(
  funcAnalysis: TSFunctionAnalysis,
  languageService?: ts.LanguageService
): any {
  return {
    name: funcAnalysis.name,
    id: funcAnalysis.id,
    filePath: funcAnalysis.filePath,
    startLine: getStartLine(funcAnalysis),
    endLine: getEndLine(funcAnalysis),
    codeSnippet: getCodeSnippet(funcAnalysis),
    codeStartOffset: getCodeStartOffset(funcAnalysis),

    // 외부 참조를 externalDeps 형식으로 변환
    externalDeps: funcAnalysis.externalRefs.map((ref) => ({
      name: ref.name,
      type: ref.refType === 'import' ? 'import' : 'closure',
      source: ref.source,
      closureScope: ref.refType === 'file-level' ? 'file' : undefined,
      usages: ref.usages,
    })),

    localVariables: new Set(getLocalVariables(funcAnalysis, languageService)),
    parameters: new Set(getParameters(funcAnalysis)),
    isAsync: isAsyncFunction(funcAnalysis),
    isPure: funcAnalysis.isPure,
    isExported: isExportedFunction(funcAnalysis),
  };
}

/**
 * 외부 참조 토큰 범위 가져오기 (하이라이팅용)
 */
export function getExternalRefTokenRanges(funcAnalysis: TSFunctionAnalysis): Array<{
  start: number;
  end: number;
  text: string;
  type: 'import' | 'file-level' | 'closure' | 'global';
}> {
  const ranges: Array<{
    start: number;
    end: number;
    text: string;
    type: 'import' | 'file-level' | 'closure' | 'global';
  }> = [];

  funcAnalysis.externalRefs.forEach((ref) => {
    ref.usages.forEach((usage) => {
      ranges.push({
        start: usage.start,
        end: usage.end,
        text: usage.name,
        type: ref.refType,
      });
    });
  });

  // 위치순 정렬
  ranges.sort((a, b) => a.start - b.start);

  return ranges;
}

/**
 * 로컬 변수 추출 (Language Service 또는 AST 사용)
 */
function getLocalVariables(
  funcAnalysis: TSFunctionAnalysis,
  languageService?: ts.LanguageService
): string[] {
  // Language Service 없으면 AST getter 사용
  if (!languageService) {
    return getLocalVariablesFromAST(funcAnalysis);
  }

  // Language Service 시도, 실패하면 AST fallback
  try {
    const allLocals = new Set<string>();

    // 1. 파라미터 추출
    funcAnalysis.astNode.parameters.forEach(param => {
      extractVariableNames(param.name, (name) => allLocals.add(name));
    });

    // 2. 함수 body 내부 변수 선언
    if (funcAnalysis.astNode.body) {
      const visit = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node)) {
          extractVariableNames(node.name, (name) => allLocals.add(name));
        }
        ts.forEachChild(node, visit);
      };
      visit(funcAnalysis.astNode.body);
    }

    // 파라미터 제외
    const params = new Set(getParameters(funcAnalysis));
    return Array.from(allLocals).filter(name => !params.has(name));
  } catch (error) {
    // 에러 시 AST getter 사용
    console.warn(`⚠️ Language Service failed for ${funcAnalysis.name}, using AST fallback`);
    return getLocalVariablesFromAST(funcAnalysis);
  }
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
