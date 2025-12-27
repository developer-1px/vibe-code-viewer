import { VariableNode } from '../../../entities/VariableNode';
import { findMainFunctionReturn } from '../ast/returnExtractor';
import { extractLocalReferences } from '../ast/localReferenceExtractor';
import { extractTokenRangesFromCode } from '../ast/tokenExtractor';

/**
 * Process regular TS file and create FILE_ROOT node
 * For files that export a main function, extracts and displays only the return statement
 */
export function processFileRoot(
  filePath: string,
  scriptContent: string,
  localDefs: Set<string>,
  ast: any,
  nodes: Map<string, VariableNode>
): string {
  const fileRootId = `${filePath}::FILE_ROOT`;

  // Get all variables defined in this file
  const fileVarNames = new Set(localDefs);

  // Try to find the main function's return statement
  const returnNode = findMainFunctionReturn(ast, filePath);

  let returnSnippet = scriptContent;
  let returnStartLine = 1;
  let snippetStartOffset = 0;
  let localReferences: any[] = [];

  if (returnNode && returnNode.loc) {
    const startLine = returnNode.loc.start.line;
    const endLine = returnNode.loc.end.line;

    // Calculate offset of the start of the line (preserve indentation)
    let currentOffset = 0;
    for (let i = 1; i < startLine; i++) {
      const nextNewline = scriptContent.indexOf('\n', currentOffset);
      if (nextNewline === -1) break;
      currentOffset = nextNewline + 1;
    }
    snippetStartOffset = currentOffset;

    // Calculate offset of the end of the end line
    let endOffset = currentOffset;
    for (let i = startLine; i <= endLine; i++) {
      const nextNewline = scriptContent.indexOf('\n', endOffset);
      if (nextNewline === -1) {
        endOffset = scriptContent.length;
        break;
      }
      if (i === endLine) {
        endOffset = nextNewline;
      } else {
        endOffset = nextNewline + 1;
      }
    }

    returnSnippet = scriptContent.substring(snippetStartOffset, endOffset);
    returnStartLine = startLine;

    // Extract local references from return statement
    localReferences = extractLocalReferences(returnNode, fileVarNames, filePath, nodes);
  } else {
    console.log('⚠️ No main function return found, using full file content');
  }

  // Get all nodes defined in this file (except FILE_ROOT itself)
  const fileNodes = Array.from(nodes.values()).filter(
    (n) => n.filePath === filePath && n.id !== fileRootId
  );
  const dependencies = fileNodes.map((n) => n.id);

  // Extract token ranges for the snippet
  const snippetEndOffset = snippetStartOffset + returnSnippet.length;
  const tokenRanges = extractTokenRangesFromCode(scriptContent, localDefs, ast);

  // Filter and adjust token ranges to be relative to the snippet
  const processedTokenRanges = tokenRanges
    .filter(
      (range) => range.startOffset >= snippetStartOffset && range.endOffset <= snippetEndOffset
    )
    .map((range) => ({
      ...range,
      startOffset: range.startOffset - snippetStartOffset,
      endOffset: range.endOffset - snippetStartOffset,
      tokenIds: range.tokenIds.map((name: string) => `${filePath}::${name}`),
    }));

  const fileName = filePath.split('/').pop() || 'File';
  const fileRootNode: VariableNode = {
    id: fileRootId,
    label: `${fileName}`,
    filePath,
    type: 'module',
    codeSnippet: returnSnippet,
    startLine: returnStartLine,
    dependencies,
    templateTokenRanges: processedTokenRanges,
    localReferences: localReferences.length > 0 ? localReferences : undefined,
  };

  nodes.set(fileRootId, fileRootNode);
  return fileRootId;
}
