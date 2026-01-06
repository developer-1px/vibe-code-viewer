/**
 * tsAdapter - 기존 TS Parser를 DocData 형식으로 변환
 * 우리 프로젝트의 parseCodeDoc + AST 유틸리티를 사용
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { getFileName } from '../../../shared/pathUtils';
import { extractDefinitions } from '../../Panels/DefinitionPanel/definitionExtractor.ts';
import type { DocBlock, DocData, ImportItem, SymbolDetail } from '../model/types';
import { parseCodeDoc } from './parseCodeDoc';

/**
 * JSDoc 파싱
 */
function _parseJSDoc(node: ts.Node): { description: string; tags: Record<string, string> } {
  const result = { description: '', tags: {} as Record<string, string> };
  const jsDoc = (node as any).jsDoc as any[];

  if (jsDoc && jsDoc.length > 0) {
    result.description = jsDoc
      .map((doc: any) => (typeof doc.comment === 'string' ? doc.comment : ''))
      .join('\n')
      .trim();

    jsDoc.forEach((doc: any) => {
      if (doc.tags) {
        doc.tags.forEach((tag: any) => {
          const tagName = tag.tagName.escapedText as string;
          const comment = typeof tag.comment === 'string' ? tag.comment : '';
          result.tags[tagName] = comment;
        });
      }
    });
  }

  return result;
}

/**
 * 라인 범위 얻기
 */
function getLineRange(sourceFile: ts.SourceFile, node: ts.Node): string {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return `L${start.line + 1}-${end.line + 1}`;
}

/**
 * Cyclomatic Complexity 계산
 */
function _calculateComplexity(node: ts.Node): number {
  let complexity = 1;
  function visit(n: ts.Node) {
    if (
      ts.isIfStatement(n) ||
      ts.isConditionalExpression(n) ||
      ts.isForStatement(n) ||
      ts.isWhileStatement(n) ||
      ts.isCaseClause(n) ||
      ts.isCatchClause(n)
    ) {
      complexity++;
    }
    ts.forEachChild(n, visit);
  }
  ts.forEachChild(node, visit);
  return complexity;
}

/**
 * 주석에서 제목 자동 추출
 * - Separator: // ==== Title ==== → "Title"
 * - Tag: [BRANCH] ... → "BRANCH"
 * - Line/Block: 첫 줄 사용
 */
function extractCommentTitle(commentText: string): string {
  const trimmed = commentText.trim();

  // Separator 스타일: // ==== Title ====
  const separatorMatch = trimmed.match(/^\/\/\s*={3,}\s*(.+?)\s*={3,}/);
  if (separatorMatch) {
    return separatorMatch[1].trim();
  }

  // Tag 스타일: [BRANCH], [STEP] 등
  const tagMatch = trimmed.match(/^\[(\w+)\]/);
  if (tagMatch) {
    return tagMatch[1];
  }

  // JSDoc 또는 블록 주석 정제
  const cleaned = trimmed
    .replace(/^\/\*\*?\s*/, '')
    .replace(/\*\/$/g, '')
    .replace(/^\s*\*\s?/gm, '')
    .replace(/^\/\/\s?/gm, '');

  // 첫 줄만 사용 (최대 40자)
  const firstLine = cleaned.split('\n')[0].trim();
  return firstLine.substring(0, 40);
}

/**
 * Statement와 연결된 leading comment 추출
 */
function getLeadingComment(sourceFile: ts.SourceFile, stmt: ts.Statement): string | null {
  const comments = ts.getLeadingCommentRanges(sourceFile.text, stmt.getFullStart());
  if (!comments || comments.length === 0) return null;

  // 가장 가까운 주석 (마지막 주석) 사용
  const lastComment = comments[comments.length - 1];
  return sourceFile.text.substring(lastComment.pos, lastComment.end);
}

/**
 * Mermaid Flowchart 생성 (주석 기반 그룹화)
 */
function _generateFlowchart(sourceFile: ts.SourceFile, body: ts.Block | ts.Node): string {
  const edges: string[] = [];
  const nodes: string[] = [];
  const subgraphs: Array<{ id: string; title: string; nodes: string[] }> = [];
  let nodeIdCounter = 0;
  let subgraphIdCounter = 0;

  const getId = () => `N${nodeIdCounter++}`;
  const getSubgraphId = () => `SG${subgraphIdCounter++}`;
  // Mermaid 텍스트에서 특수문자를 안전하게 처리
  const escape = (str: string) =>
    str
      .replace(/"/g, '#quot;') // " → #quot;
      .replace(/\[/g, '#91;') // [ → #91;
      .replace(/\]/g, '#93;') // ] → #93;
      .replace(/\{/g, '#123;') // { → #123;
      .replace(/\}/g, '#125;') // } → #125;
      .substring(0, 30);

  const startId = getId();
  nodes.push(`${startId}([Start])`);

  let currentId = startId;
  let currentSubgraph: { id: string; title: string; nodes: string[] } | null = null;

  function visitStatements(statements: ts.NodeArray<ts.Statement> | ts.Statement[]) {
    statements.forEach((stmt, _idx) => {
      // 주석 감지
      const leadingComment = getLeadingComment(sourceFile, stmt);

      if (leadingComment) {
        // 이전 subgraph 종료
        if (currentSubgraph && currentSubgraph.nodes.length > 0) {
          subgraphs.push(currentSubgraph);
        }

        // 새 subgraph 시작
        const title = extractCommentTitle(leadingComment);
        currentSubgraph = {
          id: getSubgraphId(),
          title: title || `Group ${subgraphIdCounter}`,
          nodes: [],
        };
      }

      // Statement 노드 생성
      const stmtNodes: string[] = [];

      if (ts.isIfStatement(stmt)) {
        const conditionId = getId();
        const conditionText = escape(stmt.expression.getText(sourceFile));

        stmtNodes.push(`${conditionId}{"${conditionText}?"}`);
        edges.push(`${currentId} --> ${conditionId}`);

        const trueId = getId();
        stmtNodes.push(`${trueId}[Then]`);
        edges.push(`${conditionId} -- Yes --> ${trueId}`);

        if (stmt.elseStatement) {
          const falseId = getId();
          stmtNodes.push(`${falseId}[Else]`);
          edges.push(`${conditionId} -- No --> ${falseId}`);

          const mergeId = getId();
          edges.push(`${trueId} -.-> ${mergeId}`);
          edges.push(`${falseId} -.-> ${mergeId}`);
          currentId = mergeId;
        } else {
          const mergeId = getId();
          edges.push(`${conditionId} -- No --> ${mergeId}`);
          edges.push(`${trueId} -.-> ${mergeId}`);
          currentId = mergeId;
        }
      } else if (ts.isReturnStatement(stmt)) {
        const returnId = getId();
        const retText = stmt.expression ? escape(stmt.expression.getText(sourceFile)) : 'void';
        stmtNodes.push(`${returnId}([Return ${retText}])`);
        edges.push(`${currentId} --> ${returnId}`);
        currentId = returnId;
      } else {
        const processId = getId();
        const stmtText = escape(stmt.getText(sourceFile).split('\n')[0]);
        stmtNodes.push(`${processId}["${stmtText}"]`);
        edges.push(`${currentId} --> ${processId}`);
        currentId = processId;
      }

      // 노드를 현재 subgraph 또는 전역에 추가
      if (currentSubgraph) {
        currentSubgraph.nodes.push(...stmtNodes);
      } else {
        nodes.push(...stmtNodes);
      }
    });

    // 마지막 subgraph 종료
    if (currentSubgraph && currentSubgraph.nodes.length > 0) {
      subgraphs.push(currentSubgraph);
    }
  }

  if (ts.isBlock(body)) {
    visitStatements(body.statements);
  }

  if (nodes.length <= 1 && subgraphs.length === 0) return '';

  // Mermaid 코드 생성
  let mermaidCode = 'flowchart TD\n';
  mermaidCode += `  ${startId}([Start])\n`;

  // 전역 노드
  nodes.forEach((node) => {
    if (!node.includes('([Start])')) {
      mermaidCode += `  ${node}\n`;
    }
  });

  // Subgraph들
  subgraphs.forEach((sg) => {
    mermaidCode += `\n  subgraph ${sg.id}["${sg.title}"]\n`;
    sg.nodes.forEach((node) => {
      mermaidCode += `    ${node}\n`;
    });
    mermaidCode += '  end\n';
  });

  // Edges
  mermaidCode += '\n';
  edges.forEach((edge) => {
    mermaidCode += `  ${edge}\n`;
  });

  return mermaidCode;
}

/**
 * 함수 본문을 DocBlock[]로 변환
 */
function _generateBlocks(sourceFile: ts.SourceFile, body: ts.Block | ts.Node): DocBlock[] {
  const blocks: DocBlock[] = [];

  if (!ts.isBlock(body)) {
    blocks.push({
      type: 'CODE' as any,
      content: body.getText(sourceFile),
      lines: getLineRange(sourceFile, body),
    });
    return blocks;
  }

  body.statements.forEach((stmt) => {
    // 주석 추출
    const comments = ts.getLeadingCommentRanges(sourceFile.text, stmt.getFullStart());

    if (comments && comments.length > 0) {
      // ✅ 연속된 라인 주석들을 하나로 합침
      const mergedComments: { text: string; pos: number }[] = [];
      let currentGroup: string[] = [];
      let currentPos = -1;

      comments.forEach((comment, _idx) => {
        let text = sourceFile.text.substring(comment.pos, comment.end);
        text = text
          .replace(/^\/\/\s*/, '')
          .replace(/^\/\*\*\s*/, '')
          .replace(/^\/\*\s*/, '')
          .replace(/\*\/$/, '')
          .replace(/^\s*\*\s?/gm, '')
          .trim();

        if (!text) return;

        // 첫 번째 주석이거나 블록 주석인 경우
        const isBlockComment = sourceFile.text.substring(comment.pos, comment.end).startsWith('/*');

        if (currentGroup.length === 0 || isBlockComment) {
          // 이전 그룹 flush
          if (currentGroup.length > 0) {
            mergedComments.push({ text: currentGroup.join('\n'), pos: currentPos });
          }
          // 새 그룹 시작
          currentGroup = [text];
          currentPos = comment.pos;

          // 블록 주석은 즉시 flush
          if (isBlockComment) {
            mergedComments.push({ text, pos: comment.pos });
            currentGroup = [];
            currentPos = -1;
          }
        } else {
          // 연속된 라인 주석 → 그룹에 추가
          currentGroup.push(text);
        }
      });

      // 마지막 그룹 flush
      if (currentGroup.length > 0) {
        mergedComments.push({ text: currentGroup.join('\n'), pos: currentPos });
      }

      // ✅ 합쳐진 주석들을 블록으로 변환
      mergedComments.forEach(({ text, pos }) => {
        // [TAG] 형식 감지
        const tagMatch = text.match(/^\[(\w+)\]\s*(.*)/s);
        if (tagMatch) {
          const [, label, content] = tagMatch;
          const type = label.toLowerCase() === 'branch' ? ('BRANCH' as any) : ('TAG' as any);
          blocks.push({
            type,
            label,
            content,
            lines: `L${sourceFile.getLineAndCharacterOfPosition(pos).line + 1}`,
          });
        } else {
          blocks.push({ type: 'PROSE' as any, content: text });
        }
      });
    }

    // 코드 추가
    blocks.push({
      type: 'CODE' as any,
      content: stmt.getText(sourceFile),
      lines: getLineRange(sourceFile, stmt),
    });
  });

  return blocks;
}

/**
 * SourceFileNode를 DocData로 변환 (extractDefinitions 기반 - 중복 AST 순회 제거)
 */
export function convertToDocData(node: SourceFileNode): DocData {
  const { sections, imports: parsedImports } = parseCodeDoc(node);
  const sourceFile = node.sourceFile;
  const fileName = getFileName(node.filePath);

  // extractDefinitions() 한 번만 호출 (AST 순회 1회)
  const definitions = extractDefinitions(node);

  // Imports 변환
  const imports: ImportItem[] = parsedImports.map((imp) => ({
    name: imp.name,
    path: imp.fromPath,
  }));

  // Exports 수집 (export modifier가 있는 심볼들)
  const exports: any[] = definitions
    .filter((def) => def.modifiers?.export)
    .map((def) => ({
      name: def.name,
      type:
        def.kind === 'function'
          ? 'function'
          : def.kind === 'class'
            ? 'class'
            : def.kind === 'interface'
              ? 'interface'
              : 'const',
    }));

  // Symbols 수집 (DefinitionSymbol → SymbolDetail 변환)
  const symbols: SymbolDetail[] = [];

  // 파일 헤더 (description)
  const fileHeader = sections.find((s) => s.type === 'fileHeader');
  const description = fileHeader?.content || '';

  // definitions를 SymbolDetail로 변환
  definitions.forEach((def) => {
    // function, class, interface, test만 Symbol로 변환 (import, comment 등 제외)
    if (
      def.kind === 'function' ||
      def.kind === 'class' ||
      def.kind === 'interface' ||
      def.kind === 'test-suite' ||
      def.kind === 'test-case' ||
      def.kind === 'test-hook'
    ) {
      const symbolDetail: SymbolDetail = {
        name: def.name,
        type: def.kind as any,
        modifiers: def.modifiers ? Object.keys(def.modifiers).filter((k) => (def.modifiers as any)[k]) : undefined,
        lineRange: def.foldInfo ? `L${def.foldInfo.foldStart}-${def.foldInfo.foldEnd}` : `L${def.line}`,
        startLine: def.line, // ✅ 소스 파일에서의 시작 라인
        signature: def.signature || def.name,
        description: def.description || '',
        parameters: def.params,
        returns: def.returns,
        analysis: def.complexity ? { complexity: def.complexity } : undefined,
        blocks: def.blocks || [],
        flowchart: def.flowchart,
        testMetadata: def.testMetadata,
      };

      symbols.push(symbolDetail);
    }
  });

  return {
    meta: {
      filename: fileName,
      path: node.filePath.includes('/') ? node.filePath.substring(0, node.filePath.lastIndexOf('/')) : 'src',
      description,
      lines: sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1,
      version: '1.0.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Unknown',
    },
    imports,
    exports,
    symbols,
  };
}
