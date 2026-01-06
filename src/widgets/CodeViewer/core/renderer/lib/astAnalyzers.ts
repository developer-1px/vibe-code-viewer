/**
 * AST 분석 함수들
 */

import * as ts from 'typescript';
import type { CodeLine, SegmentKind } from '../../types/codeLine';
import { addSegmentToLines } from './segmentBuilders';

/**
 * AST에서 segment kind를 결정
 */
export const getSegmentKind = (node: ts.Node): SegmentKind | null => {
  // Keywords
  if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
    return 'keyword';
  }

  // Punctuation
  if (node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation) {
    return 'punctuation';
  }

  // Strings
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    return 'string';
  }

  // Numbers
  if (ts.isNumericLiteral(node)) {
    return 'number';
  }

  // Boolean literals (true, false) - treat as numbers for syntax highlighting
  if (
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    node.kind === ts.SyntaxKind.UndefinedKeyword
  ) {
    return 'number';
  }

  return null;
};

/**
 * Comments 추가 (Phase 1-3: Mutable for performance)
 */
export const addComments = (
  lines: CodeLine[],
  node: ts.Node,
  sourceFile: ts.SourceFile,
  code: string,
  deadIdentifiers: Set<string>
): void => {
  // Leading comments
  const leadingCommentRanges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
  if (leadingCommentRanges) {
    leadingCommentRanges.forEach((range) => {
      addSegmentToLines(
        lines,
        sourceFile,
        code,
        {
          start: range.pos,
          end: range.end,
          kinds: ['comment'],
        },
        deadIdentifiers
      );
    });
  }

  // Trailing comments
  const trailingCommentRanges = ts.getTrailingCommentRanges(sourceFile.text, node.getEnd());
  if (trailingCommentRanges) {
    trailingCommentRanges.forEach((range) => {
      addSegmentToLines(
        lines,
        sourceFile,
        code,
        {
          start: range.pos,
          end: range.end,
          kinds: ['comment'],
        },
        deadIdentifiers
      );
    });
  }
};
