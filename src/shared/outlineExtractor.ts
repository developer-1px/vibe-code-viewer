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
 * Extract outline structure from SourceFileNode
 */
export function extractOutlineStructure(node: SourceFileNode): OutlineNode[] {
  if (!node.sourceFile) {
    console.warn('[outlineExtractor] No sourceFile available for:', node.filePath);
    return [];
  }

  const sourceFile = node.sourceFile;
  const nodes: OutlineNode[] = [];
  const imports: OutlineNode[] = []; // Collect all imports
  const processedComments = new Set<number>(); // Track comment positions to avoid duplicates

  function visit(astNode: ts.Node, parentNodes: OutlineNode[] = nodes): void {
    // Extract comments first (avoid duplicates)
    const comments = extractComments(sourceFile, astNode);
    comments.forEach(comment => {
      // Use line number as unique key
      if (!processedComments.has(comment.line)) {
        processedComments.add(comment.line);
        parentNodes.push(comment);
      }
    });

    let currentNode: OutlineNode | null = null;

    // Import Declarations - collect separately to group later
    if (ts.isImportDeclaration(astNode)) {
      const moduleSpecifier = astNode.moduleSpecifier;
      const from = ts.isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : '';

      imports.push({
        kind: 'import',
        name: `from '${from}'`,
        line: getLineNumber(sourceFile, astNode),
        text: astNode.getText(sourceFile),
      });

      // Don't add to main tree, we'll group them later
      ts.forEachChild(astNode, (child) => visit(child, parentNodes));
      return;
    }

    // Comments (already handled above, but we can skip them in traversal)
    // Comments are extracted separately, so we don't need to handle them here

    // Type Alias
    else if (ts.isTypeAliasDeclaration(astNode)) {
      currentNode = {
        kind: 'type',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
      };
    }

    // Interface
    else if (ts.isInterfaceDeclaration(astNode)) {
      currentNode = {
        kind: 'interface',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Enum
    else if (ts.isEnumDeclaration(astNode)) {
      currentNode = {
        kind: 'enum',
        name: astNode.name.text,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Variable Statement (const, let, var)
    else if (ts.isVariableStatement(astNode)) {
      const declaration = astNode.declarationList.declarations[0];
      if (declaration && ts.isIdentifier(declaration.name)) {
        const isConst = (astNode.declarationList.flags & ts.NodeFlags.Const) !== 0;
        const isLet = (astNode.declarationList.flags & ts.NodeFlags.Let) !== 0;

        currentNode = {
          kind: isConst ? 'const' : isLet ? 'let' : 'var',
          name: declaration.name.text,
          line: getLineNumber(sourceFile, astNode),
          text: astNode.getText(sourceFile).split('\n')[0], // First line only
          children: [],
        };
      }
    }

    // Function Declaration
    else if (ts.isFunctionDeclaration(astNode)) {
      const name = astNode.name?.text || 'anonymous';
      currentNode = {
        kind: 'function',
        name,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Arrow Function
    else if (ts.isArrowFunction(astNode)) {
      currentNode = {
        kind: 'arrow-function',
        name: '(arrow function)',
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Class Declaration
    else if (ts.isClassDeclaration(astNode)) {
      const name = astNode.name?.text || 'anonymous';
      currentNode = {
        kind: 'class',
        name,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Method Declaration
    else if (ts.isMethodDeclaration(astNode)) {
      const name = astNode.name.getText(sourceFile);
      currentNode = {
        kind: 'method',
        name,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Property Declaration
    else if (ts.isPropertyDeclaration(astNode)) {
      const name = astNode.name.getText(sourceFile);
      currentNode = {
        kind: 'property',
        name,
        line: getLineNumber(sourceFile, astNode),
        text: astNode.getText(sourceFile).split('\n')[0],
      };
    }

    // If Statement
    else if (ts.isIfStatement(astNode)) {
      const condition = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'if',
        name: `if (${condition.length > 30 ? condition.slice(0, 30) + '...' : condition})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // For Statement
    else if (ts.isForStatement(astNode)) {
      currentNode = {
        kind: 'for',
        name: 'for loop',
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // For-Of Statement
    else if (ts.isForOfStatement(astNode)) {
      const variable = astNode.initializer.getText(sourceFile);
      const iterable = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'for',
        name: `for (${variable} of ${iterable})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // For-In Statement
    else if (ts.isForInStatement(astNode)) {
      const variable = astNode.initializer.getText(sourceFile);
      const object = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'for',
        name: `for (${variable} in ${object})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // While Statement
    else if (ts.isWhileStatement(astNode)) {
      const condition = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'while',
        name: `while (${condition.length > 30 ? condition.slice(0, 30) + '...' : condition})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Do-While Statement
    else if (ts.isDoStatement(astNode)) {
      const condition = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'do-while',
        name: `do...while (${condition})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Switch Statement
    else if (ts.isSwitchStatement(astNode)) {
      const expression = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'switch',
        name: `switch (${expression})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Case Clause
    else if (ts.isCaseClause(astNode)) {
      const expression = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'case',
        name: `case ${expression}:`,
        line: getLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Try Statement
    else if (ts.isTryStatement(astNode)) {
      currentNode = {
        kind: 'try',
        name: 'try',
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Catch Clause
    else if (ts.isCatchClause(astNode)) {
      const variable = astNode.variableDeclaration?.name.getText(sourceFile) || 'error';
      currentNode = {
        kind: 'catch',
        name: `catch (${variable})`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // Return Statement
    else if (ts.isReturnStatement(astNode)) {
      const returnValue = astNode.expression?.getText(sourceFile) || '';
      currentNode = {
        kind: 'return',
        name: `return ${returnValue.length > 30 ? returnValue.slice(0, 30) + '...' : returnValue}`,
        line: getLineNumber(sourceFile, astNode),
        text: astNode.getText(sourceFile),
      };
    }

    // Call Expression (function calls)
    else if (ts.isCallExpression(astNode)) {
      const expression = astNode.expression.getText(sourceFile);
      currentNode = {
        kind: 'call',
        name: `${expression}()`,
        line: getLineNumber(sourceFile, astNode),
        text: astNode.getText(sourceFile).split('\n')[0],
      };
    }

    // Block Statement
    else if (ts.isBlock(astNode)) {
      currentNode = {
        kind: 'block',
        name: '{ block }',
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // JSX Element
    else if (ts.isJsxElement(astNode)) {
      const tagName = astNode.openingElement.tagName.getText(sourceFile);
      currentNode = {
        kind: 'jsx-element',
        name: `<${tagName}>`,
        line: getLineNumber(sourceFile, astNode),
        endLine: getEndLineNumber(sourceFile, astNode),
        children: [],
      };
    }

    // JSX Self-Closing Element
    else if (ts.isJsxSelfClosingElement(astNode)) {
      const tagName = astNode.tagName.getText(sourceFile);
      currentNode = {
        kind: 'jsx-element',
        name: `<${tagName} />`,
        line: getLineNumber(sourceFile, astNode),
      };
    }

    // Add current node to parent
    if (currentNode) {
      parentNodes.push(currentNode);

      // If node has children, traverse them
      if (currentNode.children) {
        ts.forEachChild(astNode, (child) => visit(child, currentNode.children!));
      }
    } else {
      // No specific node created, continue traversal
      ts.forEachChild(astNode, (child) => visit(child, parentNodes));
    }
  }

  visit(sourceFile);

  // Add imports as a single collapsed block at the beginning
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
