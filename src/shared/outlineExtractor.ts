/**
 * Outline Structure Extractor
 * Extracts complete code structure (blocks, identifiers, comments) as a tree
 * Purpose: Visualize code flow and structure in Outline Panel with fold/expand
 */

import ts from 'typescript';
import type { SourceFileNode } from '../entities/SourceFileNode/model/types';

// Outline node types - comprehensive code structure
export type OutlineNodeKind =
  // Comments
  | 'comment'
  // Blocks and control flow
  | 'block'
  | 'if'
  | 'else'
  | 'for'
  | 'while'
  | 'do-while'
  | 'switch'
  | 'case'
  | 'try'
  | 'catch'
  | 'finally'
  // Declarations
  | 'import'
  | 'type'
  | 'interface'
  | 'enum'
  | 'const'
  | 'let'
  | 'var'
  | 'function'
  | 'arrow-function'
  | 'class'
  | 'method'
  | 'property'
  // Expressions
  | 'call'
  | 'return'
  | 'throw'
  | 'assignment'
  // JSX
  | 'jsx-element'
  | 'jsx-fragment';

export interface OutlineNode {
  kind: OutlineNodeKind;
  name: string;
  line: number;
  endLine?: number; // For blocks
  text?: string; // Actual code/comment text
  identifiers?: string[]; // Identifiers in this statement
  children?: OutlineNode[];
}

/**
 * Get line number from AST node
 */
function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, true));
  return line + 1;
}

/**
 * Get end line number from AST node
 */
function getEndLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return line + 1;
}

/**
 * Extract comments from node
 */
function extractComments(sourceFile: ts.SourceFile, node: ts.Node): OutlineNode[] {
  const comments: OutlineNode[] = [];
  const fullText = sourceFile.text;

  // Leading comments
  const leadingCommentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  if (leadingCommentRanges) {
    leadingCommentRanges.forEach((range) => {
      const text = fullText.slice(range.pos, range.end);
      const { line } = sourceFile.getLineAndCharacterOfPosition(range.pos);
      comments.push({
        kind: 'comment',
        name: text.startsWith('//') ? 'Line comment' : 'Block comment',
        line: line + 1,
        text: text.trim(),
      });
    });
  }

  // Trailing comments
  const trailingCommentRanges = ts.getTrailingCommentRanges(fullText, node.getEnd());
  if (trailingCommentRanges) {
    trailingCommentRanges.forEach((range) => {
      const text = fullText.slice(range.pos, range.end);
      const { line } = sourceFile.getLineAndCharacterOfPosition(range.pos);
      comments.push({
        kind: 'comment',
        name: text.startsWith('//') ? 'Line comment' : 'Block comment',
        line: line + 1,
        text: text.trim(),
      });
    });
  }

  return comments;
}

/**
 * Extract identifiers from a node
 */
function extractIdentifiers(node: ts.Node, sourceFile: ts.SourceFile): string[] {
  const identifiers: string[] = [];
  const seen = new Set<string>();

  function visit(n: ts.Node) {
    if (ts.isIdentifier(n)) {
      const name = n.getText(sourceFile);
      // Skip common keywords and duplicates
      if (!seen.has(name) && name !== 'undefined' && name !== 'null') {
        seen.add(name);
        identifiers.push(name);
      }
    }
    ts.forEachChild(n, visit);
  }

  visit(node);
  return identifiers;
}

/**
 * Get statement kind
 */
function getStatementKind(stmt: ts.Node): OutlineNodeKind {
  // Class members
  if (ts.isMethodDeclaration(stmt)) return 'method';
  if (ts.isPropertyDeclaration(stmt)) return 'property';
  if (ts.isConstructorDeclaration(stmt)) return 'method';

  // Regular statements
  if (ts.isImportDeclaration(stmt)) return 'import';
  if (ts.isVariableStatement(stmt)) {
    const flags = stmt.declarationList.flags;
    if (flags & ts.NodeFlags.Const) return 'const';
    if (flags & ts.NodeFlags.Let) return 'let';
    return 'var';
  }
  if (ts.isFunctionDeclaration(stmt)) return 'function';
  if (ts.isClassDeclaration(stmt)) return 'class';
  if (ts.isInterfaceDeclaration(stmt)) return 'interface';
  if (ts.isTypeAliasDeclaration(stmt)) return 'type';
  if (ts.isEnumDeclaration(stmt)) return 'enum';
  if (ts.isIfStatement(stmt)) return 'if';
  if (ts.isForStatement(stmt) || ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) return 'for';
  if (ts.isWhileStatement(stmt)) return 'while';
  if (ts.isDoStatement(stmt)) return 'do-while';
  if (ts.isSwitchStatement(stmt)) return 'switch';
  if (ts.isTryStatement(stmt)) return 'try';
  if (ts.isReturnStatement(stmt)) return 'return';
  if (ts.isThrowStatement(stmt)) return 'throw';
  if (ts.isExpressionStatement(stmt)) {
    if (ts.isCallExpression(stmt.expression)) return 'call';
    return 'assignment';
  }
  if (ts.isBlock(stmt)) return 'block';
  return 'block'; // default
}

/**
 * Format function parameters
 */
function formatParameters(params: ts.NodeArray<ts.ParameterDeclaration>, sourceFile: ts.SourceFile): string {
  if (params.length === 0) return '()';

  const paramNames = params.map(p => {
    const name = p.name.getText(sourceFile);
    // Optional parameter
    if (p.questionToken) return `${name}?`;
    // Rest parameter
    if (p.dotDotDotToken) return `...${name}`;
    return name;
  });

  return `(${paramNames.join(', ')})`;
}

/**
 * Get statement name/summary
 */
function getStatementName(stmt: ts.Node, sourceFile: ts.SourceFile): string {
  // Class members
  if (ts.isMethodDeclaration(stmt)) {
    const name = stmt.name.getText(sourceFile);
    const params = formatParameters(stmt.parameters, sourceFile);
    return `${name}${params}`;
  }
  if (ts.isPropertyDeclaration(stmt)) {
    return stmt.name.getText(sourceFile);
  }
  if (ts.isConstructorDeclaration(stmt)) {
    const params = formatParameters(stmt.parameters, sourceFile);
    return `constructor${params}`;
  }

  // Regular statements
  if (ts.isImportDeclaration(stmt)) {
    const from = ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : '';
    return `from '${from}'`;
  }
  if (ts.isVariableStatement(stmt)) {
    const names = stmt.declarationList.declarations
      .map(d => ts.isIdentifier(d.name) ? d.name.text : '...')
      .join(', ');
    return names;
  }
  if (ts.isFunctionDeclaration(stmt)) {
    const name = stmt.name?.text || 'anonymous';
    const params = formatParameters(stmt.parameters, sourceFile);
    return `${name}${params}`;
  }
  if (ts.isClassDeclaration(stmt)) {
    return stmt.name?.text || 'anonymous';
  }
  if (ts.isInterfaceDeclaration(stmt)) {
    return stmt.name.text;
  }
  if (ts.isTypeAliasDeclaration(stmt)) {
    return stmt.name.text;
  }
  if (ts.isEnumDeclaration(stmt)) {
    return stmt.name.text;
  }
  if (ts.isIfStatement(stmt)) {
    const condition = stmt.expression.getText(sourceFile);
    return `if (${condition.length > 30 ? condition.slice(0, 30) + '...' : condition})`;
  }
  if (ts.isForOfStatement(stmt)) {
    const variable = stmt.initializer.getText(sourceFile);
    const iterable = stmt.expression.getText(sourceFile);
    return `for (${variable} of ${iterable})`;
  }
  if (ts.isForInStatement(stmt)) {
    const variable = stmt.initializer.getText(sourceFile);
    const object = stmt.expression.getText(sourceFile);
    return `for (${variable} in ${object})`;
  }
  if (ts.isForStatement(stmt)) {
    return 'for loop';
  }
  if (ts.isWhileStatement(stmt)) {
    const condition = stmt.expression.getText(sourceFile);
    return `while (${condition.length > 30 ? condition.slice(0, 30) + '...' : condition})`;
  }
  if (ts.isDoStatement(stmt)) {
    const condition = stmt.expression.getText(sourceFile);
    return `do...while (${condition})`;
  }
  if (ts.isSwitchStatement(stmt)) {
    const expression = stmt.expression.getText(sourceFile);
    return `switch (${expression})`;
  }
  if (ts.isTryStatement(stmt)) {
    return 'try';
  }
  if (ts.isReturnStatement(stmt)) {
    const value = stmt.expression?.getText(sourceFile) || '';
    return `return ${value.length > 30 ? value.slice(0, 30) + '...' : value}`;
  }
  if (ts.isThrowStatement(stmt)) {
    const value = stmt.expression.getText(sourceFile);
    return `throw ${value.length > 30 ? value.slice(0, 30) + '...' : value}`;
  }
  if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression)) {
    const expression = stmt.expression.expression.getText(sourceFile);
    return `${expression}()`;
  }
  return stmt.getText(sourceFile).split('\n')[0].slice(0, 50) + '...';
}

/**
 * Get child statements from a node (for recursion)
 */
function getChildStatements(node: ts.Node, sourceFile: ts.SourceFile): ts.Node[] {
  const children: ts.Node[] = [];

  // Function: process body statements
  if (ts.isFunctionDeclaration(node)) {
    if (node.body && ts.isBlock(node.body)) {
      children.push(...node.body.statements);
    }
  }

  // Method: process body statements
  else if (ts.isMethodDeclaration(node)) {
    if (node.body && ts.isBlock(node.body)) {
      children.push(...node.body.statements);
    }
  }

  // Constructor: process body statements
  else if (ts.isConstructorDeclaration(node)) {
    if (node.body && ts.isBlock(node.body)) {
      children.push(...node.body.statements);
    }
  }

  // Class: process members
  else if (ts.isClassDeclaration(node)) {
    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member) || ts.isConstructorDeclaration(member)) {
        children.push(member);
      }
    });
  }

  // If: process then and else branches
  else if (ts.isIfStatement(node)) {
    if (ts.isBlock(node.thenStatement)) {
      children.push(...node.thenStatement.statements);
    } else {
      children.push(node.thenStatement);
    }

    if (node.elseStatement) {
      if (ts.isBlock(node.elseStatement)) {
        children.push(...node.elseStatement.statements);
      } else {
        children.push(node.elseStatement);
      }
    }
  }

  // For/While/Do-While: process body
  else if (ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node)) {
    if (ts.isBlock(node.statement)) {
      children.push(...node.statement.statements);
    } else {
      children.push(node.statement);
    }
  }
  else if (ts.isWhileStatement(node) || ts.isDoStatement(node)) {
    if (ts.isBlock(node.statement)) {
      children.push(...node.statement.statements);
    } else {
      children.push(node.statement);
    }
  }

  // Switch: process cases
  else if (ts.isSwitchStatement(node)) {
    node.caseBlock.clauses.forEach(clause => {
      children.push(...clause.statements);
    });
  }

  // Try-Catch-Finally: process all blocks
  else if (ts.isTryStatement(node)) {
    children.push(...node.tryBlock.statements);

    if (node.catchClause) {
      children.push(...node.catchClause.block.statements);
    }

    if (node.finallyBlock) {
      children.push(...node.finallyBlock.statements);
    }
  }

  // Block: process statements
  else if (ts.isBlock(node)) {
    children.push(...node.statements);
  }

  return children;
}

/**
 * Visit a node (statement or class member) and create OutlineNode
 */
function visitStatement(stmt: ts.Node, sourceFile: ts.SourceFile, processedComments: Set<number>): OutlineNode | null {
  // Extract comments for this statement
  const comments = extractComments(sourceFile, stmt);
  const commentNodes: OutlineNode[] = [];

  comments.forEach(comment => {
    if (!processedComments.has(comment.line)) {
      processedComments.add(comment.line);
      commentNodes.push(comment);
    }
  });

  // Extract identifiers
  const identifiers = extractIdentifiers(stmt, sourceFile);

  // Get statement info
  const kind = getStatementKind(stmt);
  const name = getStatementName(stmt, sourceFile);
  const line = getLineNumber(sourceFile, stmt);
  const endLine = getEndLineNumber(sourceFile, stmt);
  const text = stmt.getText(sourceFile);

  // Create outline node
  const node: OutlineNode = {
    kind,
    name,
    line,
    endLine: endLine !== line ? endLine : undefined,
    text: text.split('\n')[0],
    identifiers: identifiers.length > 0 ? identifiers : undefined,
  };

  // Get child statements (for recursion)
  const childStatements = getChildStatements(stmt, sourceFile);
  const children: OutlineNode[] = [];

  // Add comments first
  commentNodes.forEach(c => children.push(c));

  // Process child statements recursively
  childStatements.forEach(childStmt => {
    const childNode = visitStatement(childStmt, sourceFile, processedComments);
    if (childNode) children.push(childNode);
  });

  if (children.length > 0) {
    node.children = children;
  }

  return node;
}

/**
 * Extract outline structure from SourceFileNode
 */
export function extractOutlineStructure(node: SourceFileNode): OutlineNode[] {
  if (!node.sourceFile) {
    console.warn('[outlineExtractor] No sourceFile available for:', node.filePath);
    return [];
  }

  const sourceFile = node.sourceFile;
  const nodes: OutlineNode[] = [];
  const imports: OutlineNode[] = [];
  const processedComments = new Set<number>();

  // Process top-level statements
  sourceFile.statements.forEach(stmt => {
    // Collect imports separately
    if (ts.isImportDeclaration(stmt)) {
      const importNode = visitStatement(stmt, sourceFile, processedComments);
      if (importNode) imports.push(importNode);
      return;
    }

    // Process other statements
    const stmtNode = visitStatement(stmt, sourceFile, processedComments);
    if (stmtNode) nodes.push(stmtNode);
  });

  // Group imports at the beginning
  if (imports.length > 0) {
    const firstImportLine = imports[0].line;
    const lastImportLine = imports[imports.length - 1].line;

    nodes.unshift({
      kind: 'block',
      name: `Imports (${imports.length})`,
      line: firstImportLine,
      endLine: lastImportLine,
      children: imports,
    });
  }

  console.log('[outlineExtractor] Extracted structure nodes:', nodes.length, 'from', node.filePath);
  return nodes;
}
