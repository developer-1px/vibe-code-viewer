/**
 * Statement Block의 fold 메타데이터 수집
 * 각 라인에 fold 정보를 추가
 */

import * as ts from 'typescript';
import type { FoldInfo } from '../../../entities/CodeFold/model/types';

// CodeLine 인터페이스 (순환 참조 방지를 위해 필요한 필드만 정의)
interface CodeLineForFold {
  num: number;
  foldInfo?: FoldInfo;
}

export function collectFoldMetadata(
  sourceFile: ts.SourceFile,
  lines: CodeLineForFold[]
): void {
  // ===== Import 블록 감지 및 fold 메타데이터 추가 =====
  const importRanges: Array<{ start: number; end: number }> = [];
  let currentImportStart: number | null = null;
  let lastImportEnd: number | null = null;

  // import 문들을 찾아서 연속된 블록으로 묶기
  // import 사이의 주석과 빈 줄도 모두 포함
  sourceFile.statements.forEach((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const startLine = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line;
      const endLine = sourceFile.getLineAndCharacterOfPosition(statement.getEnd()).line;

      if (currentImportStart === null) {
        // 첫 import 발견
        currentImportStart = startLine;
        lastImportEnd = endLine;
      } else {
        // 연속된 import - 주석과 빈 줄 상관없이 모두 포함
        lastImportEnd = endLine;
      }
    } else {
      // import가 아닌 실제 코드 발견 - 이전 블록 저장
      if (currentImportStart !== null && lastImportEnd !== null) {
        // import가 1개만 있어도 저장 (>= 조건)
        importRanges.push({ start: currentImportStart, end: lastImportEnd });
      }
      currentImportStart = null;
      lastImportEnd = null;
    }
  });

  // 마지막 블록 처리 (파일 끝까지 import만 있는 경우)
  if (currentImportStart !== null && lastImportEnd !== null) {
    importRanges.push({ start: currentImportStart, end: lastImportEnd });
  }

  // Import 블록에 fold 메타데이터 추가
  importRanges.forEach(range => {
    const { start, end } = range;
    if (start >= 0 && start < lines.length && end >= 0 && end < lines.length) {
      const actualStartLineNum = lines[start].num;
      const actualEndLineNum = lines[end].num;

      // 시작 라인에 fold 메타데이터
      lines[start].foldInfo = {
        isFoldable: true,
        foldStart: actualStartLineNum,
        foldEnd: actualEndLineNum,
        foldType: 'import-block',
        depth: 1  // Import는 항상 depth 1
      };

      // 중간 라인들에 "접힌 범위 내부" 표시
      for (let i = start + 1; i <= end; i++) {
        if (i >= 0 && i < lines.length) {
          lines[i].foldInfo = {
            isFoldable: false,
            foldStart: actualStartLineNum,
            foldEnd: actualEndLineNum,
            foldType: 'import-block',
            depth: 1
          };
        }
      }
    }
  });

  function visit(node: ts.Node, currentDepth: number = 1) {
    let block: ts.Block | undefined;
    let blockType: 'statement-block' | 'jsx-children' | 'jsx-fragment' | undefined;
    let tagName: string | undefined;
    let customStart: number | undefined;
    let customEnd: number | undefined;
    let nextDepth: number = currentDepth;

    // ===== Statement Block 감지 =====
    if (ts.isFunctionDeclaration(node) && node.body) {
      block = node.body;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isArrowFunction(node) && ts.isBlock(node.body)) {
      block = node.body;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isFunctionExpression(node) && node.body) {
      block = node.body;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isMethodDeclaration(node) && node.body) {
      block = node.body;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement)) {
      block = node.thenStatement;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isForStatement(node) && ts.isBlock(node.statement)) {
      block = node.statement;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isWhileStatement(node) && ts.isBlock(node.statement)) {
      block = node.statement;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
    }
    else if (ts.isTryStatement(node)) {
      block = node.tryBlock;
      blockType = 'statement-block';
      nextDepth = currentDepth + 1;
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
      nextDepth = currentDepth + 1;
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
      nextDepth = currentDepth + 1;
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
          foldType: blockType,
          tagName,
          depth: currentDepth
        };

        // 중간 라인들에 "접힌 범위 내부" 표시
        for (let i = tsStartLine + 1; i < tsEndLine; i++) {
          if (i >= 0 && i < lines.length) {
            lines[i].foldInfo = {
              isFoldable: false,
              foldStart: actualStartLineNum,
              foldEnd: actualEndLineNum,
              foldType: blockType,
              tagName,
              depth: currentDepth
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
          foldType: blockType,
          tagName,
          depth: currentDepth
        };

        // 중간 라인들에 "접힌 범위 내부" 표시
        for (let i = tsStartLine + 1; i < tsEndLine; i++) {
          if (i >= 0 && i < lines.length) {
            lines[i].foldInfo = {
              isFoldable: false,
              foldStart: actualStartLineNum,
              foldEnd: actualEndLineNum,
              foldType: blockType,
              tagName,
              depth: currentDepth
            };
          }
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, nextDepth));
  }

  try {
    // sourceFile의 직접 자식(최상위 함수/클래스)은 depth 2로 시작
    // (import는 depth 1로 이미 처리됨)
    visit(sourceFile, 2);
  } catch (err) {
    console.error('❌ [collectFoldMetadata] Error:', err);
  }
}
