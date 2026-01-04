/**
 * tsAdapter - 기존 TS Parser를 DocData 형식으로 변환
 * 우리 프로젝트의 parseCodeDoc + AST 유틸리티를 사용
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import { parseCodeDoc } from './parseCodeDoc';
import type { DocData, BlockType, SymbolDetail, DocBlock, ImportItem, Parameter } from '../model/types';
import { getFileName } from '../../../shared/pathUtils';

/**
 * JSDoc 파싱
 */
function parseJSDoc(node: ts.Node): { description: string; tags: Record<string, string> } {
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
function calculateComplexity(node: ts.Node): number {
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
 * Mermaid Flowchart 생성 (간단한 control flow)
 */
function generateFlowchart(sourceFile: ts.SourceFile, body: ts.Block | ts.Node): string {
  const edges: string[] = [];
  const nodes: string[] = [];
  let nodeIdCounter = 0;

  const getId = () => `N${nodeIdCounter++}`;
  const escape = (str: string) => str.replace(/["()\[\]{}]/g, '').substring(0, 30);

  const startId = getId();
  nodes.push(`${startId}([Start])`);

  let currentId = startId;

  function visitStatements(statements: ts.NodeArray<ts.Statement> | ts.Statement[]) {
    statements.forEach((stmt) => {
      if (ts.isIfStatement(stmt)) {
        const conditionId = getId();
        const conditionText = escape(stmt.expression.getText(sourceFile));

        nodes.push(`${conditionId}{"${conditionText}?"}`);
        edges.push(`${currentId} --> ${conditionId}`);

        const trueId = getId();
        nodes.push(`${trueId}[Then]`);
        edges.push(`${conditionId} -- Yes --> ${trueId}`);

        if (stmt.elseStatement) {
          const falseId = getId();
          nodes.push(`${falseId}[Else]`);
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
        nodes.push(`${returnId}([Return ${retText}])`);
        edges.push(`${currentId} --> ${returnId}`);
        currentId = getId();
      } else {
        const processId = getId();
        const stmtText = escape(stmt.getText(sourceFile).split('\n')[0]);
        nodes.push(`${processId}["${stmtText}"]`);
        edges.push(`${currentId} --> ${processId}`);
        currentId = processId;
      }
    });
  }

  if (ts.isBlock(body)) {
    visitStatements(body.statements);
  }

  if (nodes.length <= 1) return '';

  return `flowchart TD\n  ${nodes.join('\n  ')}\n  ${edges.join('\n  ')}`;
}

/**
 * 함수 본문을 DocBlock[]로 변환
 */
function generateBlocks(sourceFile: ts.SourceFile, body: ts.Block | ts.Node): DocBlock[] {
  const blocks: DocBlock[] = [];

  if (!ts.isBlock(body)) {
    blocks.push({
      type: 'CODE' as any,
      content: body.getText(sourceFile),
      lines: getLineRange(sourceFile, body)
    });
    return blocks;
  }

  body.statements.forEach((stmt) => {
    // 주석 추출
    const comments = ts.getLeadingCommentRanges(sourceFile.text, stmt.getFullStart());

    if (comments && comments.length > 0) {
      comments.forEach((comment) => {
        let text = sourceFile.text.substring(comment.pos, comment.end);
        text = text
          .replace(/^\/\/\s*/, '')
          .replace(/^\/\*\*\s*/, '')
          .replace(/^\/\*\s*/, '')
          .replace(/\*\/$/, '')
          .replace(/^\s*\*\s?/gm, '')
          .trim();

        if (!text) return;

        // [TAG] 형식 감지
        const tagMatch = text.match(/^\[(\w+)\]\s*(.*)/s);
        if (tagMatch) {
          const [, label, content] = tagMatch;
          const type = label.toLowerCase() === 'branch' ? ('BRANCH' as any) : ('TAG' as any);
          blocks.push({ type, label, content, lines: `L${sourceFile.getLineAndCharacterOfPosition(comment.pos).line + 1}` });
        } else {
          blocks.push({ type: 'PROSE' as any, content: text });
        }
      });
    }

    // 코드 추가
    blocks.push({
      type: 'CODE' as any,
      content: stmt.getText(sourceFile),
      lines: getLineRange(sourceFile, stmt)
    });
  });

  return blocks;
}

/**
 * SourceFileNode를 DocData로 변환
 */
export function convertToDocData(node: SourceFileNode): DocData {
  const { sections, imports: parsedImports } = parseCodeDoc(node);
  const sourceFile = node.sourceFile;
  const fileName = getFileName(node.filePath);

  // Imports 변환
  const imports: ImportItem[] = parsedImports.map((imp) => ({
    name: imp.name,
    path: imp.fromPath
  }));

  // Exports 수집
  const exports: any[] = [];

  // Symbols 수집
  const symbols: SymbolDetail[] = [];

  // 파일 헤더 (description)
  const fileHeader = sections.find((s) => s.type === 'fileHeader');
  const description = fileHeader?.content || '';

  // AST 순회
  ts.forEachChild(sourceFile, (child) => {
    // Function Declaration
    if (ts.isFunctionDeclaration(child)) {
      const name = child.name?.text || 'anonymous';
      const isExport = child.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExport) exports.push({ name, type: 'function' });

      const { description: funcDesc, tags } = parseJSDoc(child);
      const signatureEnd = child.body ? child.body.getStart() : child.end;
      const signature = sourceFile.text.substring(child.getStart(), signatureEnd).trim();

      const parameters: Parameter[] = child.parameters.map((p) => ({
        name: p.name.getText(sourceFile),
        type: p.type?.getText(sourceFile) || 'any',
        description: tags[p.name.getText(sourceFile)] || ''
      }));

      symbols.push({
        name,
        type: 'function',
        modifiers: child.modifiers?.map((m) => m.getText(sourceFile)) || [],
        lineRange: getLineRange(sourceFile, child),
        signature,
        description: funcDesc,
        parameters,
        returns: child.type?.getText(sourceFile) || 'void',
        analysis: {
          complexity: calculateComplexity(child)
        },
        blocks: child.body ? generateBlocks(sourceFile, child.body) : [],
        flowchart: child.body ? generateFlowchart(sourceFile, child.body) : undefined
      });
    }

    // Variable Statement (Arrow Function, Const Export)
    else if (ts.isVariableStatement(child)) {
      const isExport = child.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      child.declarationList.declarations.forEach((decl) => {
        const name = decl.name.getText(sourceFile);

        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          if (isExport) exports.push({ name, type: 'function' });

          const funcNode = decl.initializer;
          const { description: funcDesc } = parseJSDoc(child);
          const signature = `const ${name} = ${sourceFile.text.substring(funcNode.getStart(), funcNode.body.getStart()).trim()}`;

          const parameters: Parameter[] = funcNode.parameters.map((p) => ({
            name: p.name.getText(sourceFile),
            type: p.type?.getText(sourceFile) || 'any',
            description: ''
          }));

          symbols.push({
            name,
            type: 'function',
            modifiers: ['export', 'const'],
            lineRange: getLineRange(sourceFile, child),
            signature,
            description: funcDesc,
            parameters,
            blocks: generateBlocks(sourceFile, funcNode.body),
            flowchart: generateFlowchart(sourceFile, funcNode.body)
          });
        } else {
          if (isExport) exports.push({ name, type: 'const' });
        }
      });
    }

    // Interface Declaration
    else if (ts.isInterfaceDeclaration(child)) {
      const name = child.name.text;
      const isExport = child.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExport) exports.push({ name, type: 'interface' });

      const { description: intDesc } = parseJSDoc(child);
      const signature = `interface ${name}${child.typeParameters ? `<${child.typeParameters.map((t) => t.getText(sourceFile)).join(', ')}>` : ''}`;

      symbols.push({
        name,
        type: 'interface',
        modifiers: ['export'],
        lineRange: getLineRange(sourceFile, child),
        signature,
        description: intDesc,
        members: child.members.map((m) => {
          const mName = m.name?.getText(sourceFile) || '';
          const mType = (m as any).type?.getText(sourceFile) || 'any';
          const mDoc = parseJSDoc(m);
          return { name: mName, type: mType, description: mDoc.description };
        }),
        blocks: [
          {
            type: 'CODE' as any,
            content: child.getText(sourceFile),
            lines: getLineRange(sourceFile, child)
          }
        ]
      });
    }

    // Class Declaration
    else if (ts.isClassDeclaration(child)) {
      const name = child.name?.text || 'Anonymous';
      const isExport = child.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExport) exports.push({ name, type: 'class' });

      const { description: classDesc } = parseJSDoc(child);
      const signature = `class ${name}`;

      symbols.push({
        name,
        type: 'class',
        modifiers: child.modifiers?.map((m) => m.getText(sourceFile)) || [],
        lineRange: getLineRange(sourceFile, child),
        signature,
        description: classDesc,
        members: child.members.map((m) => ({
          name: m.name?.getText(sourceFile) || '',
          type: 'unknown',
          description: parseJSDoc(m).description
        })),
        analysis: { complexity: calculateComplexity(child) },
        blocks: []
      });
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
      author: 'Unknown'
    },
    imports,
    exports,
    symbols
  };
}
