/**
 * Statement Block의 fold 메타데이터 수집
 * 각 라인에 fold 정보를 추가
 */

import * as ts from 'typescript';
import type { FoldInfo } from './types';

// CodeLine 인터페이스 (순환 참조 방지를 위해 필요한 필드만 정의)
interface CodeLineForFold {
  num: number;
  foldInfo?: FoldInfo;
}

export function collectFoldMetadata(
  sourceFile: ts.SourceFile,
  lines: CodeLineForFold[]
): void {
  function visit(node: ts.Node) {
    let block: ts.Block | undefined;
    let blockType: 'statement-block' | 'jsx-children' | 'jsx-fragment' | undefined;
    let tagName: string | undefined;
    let customStart: number | undefined;
    let customEnd: number | undefined;

    // ===== Statement Block 감지 =====
    if (ts.isFunctionDeclaration(node) && node.body) {
      block = node.body;
      blockType = 'statement-block';
    }
    else if (ts.isArrowFunction(node) && ts.isBlock(node.body)) {
      block = node.body;
      blockType = 'statement-block';
    }
    else if (ts.isFunctionExpression(node) && node.body) {
      block = node.body;
      blockType = 'statement-block';
    }
    else if (ts.isMethodDeclaration(node) && node.body) {
      block = node.body;
      blockType = 'statement-block';
    }
    else if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement)) {
      block = node.thenStatement;
      blockType = 'statement-block';
    }
    else if (ts.isForStatement(node) && ts.isBlock(node.statement)) {
      block = node.statement;
      blockType = 'statement-block';
    }
    else if (ts.isWhileStatement(node) && ts.isBlock(node.statement)) {
      block = node.statement;
      blockType = 'statement-block';
    }
    else if (ts.isTryStatement(node)) {
      block = node.tryBlock;
      blockType = 'statement-block';
    }
    // ===== JSX Element 감지 =====
    else if (ts.isJsxElement(node)) {
      // <div>children</div> 형태
      const openingElement = node.openingElement;
      const closingElement = node.closingElement;

      // Tag name 추출
      tagName = openingElement.tagName.getText(sourceFile);

      // Opening tag의 끝 (>) 위치
      customStart = openingElement.getEnd();
      // Closing tag의 끝 (>) 위치 - closing tag도 접혀야 함
      customEnd = closingElement.getEnd() - 1;

      blockType = 'jsx-children';
    }
    // ===== JSX Fragment 감지 =====
    else if (ts.isJsxFragment(node)) {
      // <>children</> 형태
      const openingFragment = node.openingFragment;
      const closingFragment = node.closingFragment;

      // Fragment는 tag name 없음
      tagName = undefined;

      // Opening fragment의 끝 (>) 위치
      customStart = openingFragment.getEnd();
      // Closing fragment의 끝 (>) 위치 - closing fragment도 접혀야 함
      customEnd = closingFragment.getEnd() - 1;

      blockType = 'jsx-fragment';
    }

    // Block이 있고, 비어있지 않으면 fold 가능
    if (block && block.statements.length > 0) {
      const openBrace = block.getStart(sourceFile);
      const closeBrace = block.getEnd() - 1;

      // TypeScript는 0-based line numbers를 반환
      const tsStartLine = sourceFile.getLineAndCharacterOfPosition(openBrace).line;
      const tsEndLine = sourceFile.getLineAndCharacterOfPosition(closeBrace).line;

      // lines 배열은 0-based 인덱스
      // CodeLine.num은 startLineNum + idx (실제 파일 라인 번호)
      // 한 줄짜리는 접을 필요 없음
      if (tsEndLine > tsStartLine && tsStartLine >= 0 && tsStartLine < lines.length) {
        // 시작 라인에 fold 메타데이터 추가
        const actualStartLineNum = lines[tsStartLine].num;
        const actualEndLineNum = lines[tsEndLine].num;

        lines[tsStartLine].foldInfo = {
          isFoldable: true,
          foldStart: actualStartLineNum,
          foldEnd: actualEndLineNum,
          isInsideFold: false,
          foldType: blockType,
          tagName
        };

        // 중간 라인들에 "접힌 범위 내부" 표시
        for (let i = tsStartLine + 1; i < tsEndLine; i++) {
          if (i >= 0 && i < lines.length) {
            lines[i].foldInfo = {
              isFoldable: false,
              foldStart: actualStartLineNum,
              foldEnd: actualEndLineNum,
              isInsideFold: true,
              parentFoldLine: actualStartLineNum,
              foldType: blockType,
              tagName
            };
          }
        }
      }
    }
    // JSX Element/Fragment는 customStart/customEnd 사용
    else if (customStart !== undefined && customEnd !== undefined && blockType) {
      const tsStartLine = sourceFile.getLineAndCharacterOfPosition(customStart).line;
      const tsEndLine = sourceFile.getLineAndCharacterOfPosition(customEnd).line;

      // 한 줄짜리는 접을 필요 없음
      if (tsEndLine > tsStartLine && tsStartLine >= 0 && tsStartLine < lines.length) {
        const actualStartLineNum = lines[tsStartLine].num;
        const actualEndLineNum = lines[tsEndLine].num;

        lines[tsStartLine].foldInfo = {
          isFoldable: true,
          foldStart: actualStartLineNum,
          foldEnd: actualEndLineNum,
          isInsideFold: false,
          foldType: blockType,
          tagName
        };

        // 중간 라인들에 "접힌 범위 내부" 표시
        for (let i = tsStartLine + 1; i < tsEndLine; i++) {
          if (i >= 0 && i < lines.length) {
            lines[i].foldInfo = {
              isFoldable: false,
              foldStart: actualStartLineNum,
              foldEnd: actualEndLineNum,
              isInsideFold: true,
              parentFoldLine: actualStartLineNum,
              foldType: blockType,
              tagName
            };
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  try {
    visit(sourceFile);
  } catch (err) {
    console.error('❌ [collectFoldMetadata] Error:', err);
  }
}
