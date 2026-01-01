
// LEGACY: This file is deprecated and not used
// Types were moved to entities/CodeSegment and entities/CodeLine
// TODO: Remove this file or refactor to use new entities

// Internal types for legacy code
interface TokenRange {
  start: number;
  end: number;
  type: 'self' | 'dependency' | 'other-known' | 'text' | 'primitive' | 'import-source' | 'string' | 'comment' | 'external-import' | 'external-closure' | 'keyword' | 'punctuation';
  text: string;
}

interface LineSegment {
  text: string;
  type: 'text' | 'self' | 'token' | 'primitive' | 'import-source' | 'string' | 'comment' | 'directive-if' | 'directive-for' | 'directive-else' | 'directive-else-if' | 'external-import' | 'external-closure' | 'keyword' | 'punctuation';
  tokenId?: string;
}

interface ProcessedLine {
  num: number;
  segments: LineSegment[];
  hasInput: boolean;
}
import type { TemplateTokenRange } from '../../CanvasNode';

export const processCodeLines = (
    codeSnippet: string,
    startLineNum: number,
    nodeId: string,
    dependencies: string[],
    tokenRanges: TokenRange[],
    isTemplate: boolean,
    templateTokenRanges?: TemplateTokenRange[]
): ProcessedLine[] => {
    const rawLines = codeSnippet.split('\n');

    // --- Strategy A: Template Processing (AST-based, offset-based) ---
    if (isTemplate && templateTokenRanges && templateTokenRanges.length > 0) {
        // ... (Template processing logic remains unchanged as it uses templateTokenRanges which are dependency-based)
        // Note: Primitives in templates (if any) are not currently handled here, but templates usually use variables.
        // If primitives are used in template expressions (e.g. {{ ref(x) }}), they might need handling if parsed by babel in vueTemplateParser.
        
        // For now, assume primitives are mostly in script.
        
        console.log('✅ Using AST-based highlighting (offset-based)');
        // ... (Keep existing template logic)
        
        // Calculate absolute offset for each line
        const lineOffsets: { lineIdx: number; start: number; end: number; text: string }[] = [];
        let currentOffset = 0;

        rawLines.forEach((line, lineIdx) => {
            lineOffsets.push({
                lineIdx,
                start: currentOffset,
                end: currentOffset + line.length,
                text: line
            });
            currentOffset += line.length + 1; // +1 for \n
        });

        // Group tokens by line
        const tokensByLine = new Map<number, typeof templateTokenRanges>();

        templateTokenRanges.forEach(range => {
            const lineInfo = lineOffsets.find(l =>
                range.startOffset >= l.start && range.startOffset < l.end
            );

            if (lineInfo) {
                if (!tokensByLine.has(lineInfo.lineIdx)) {
                    tokensByLine.set(lineInfo.lineIdx, []);
                }
                const relativeStart = range.startOffset - lineInfo.start;
                const relativeEnd = range.endOffset - lineInfo.start;

                tokensByLine.get(lineInfo.lineIdx)!.push({
                    ...range,
                    // Convert absolute offset to line-relative column
                    relativeStart,
                    relativeEnd
                });
            }
        });

        return rawLines.map((line, lineIdx) => {
            const currentLineNum = startLineNum + lineIdx;
            const segments: LineSegment[] = [];
            let hasInput = false;

            const tokensOnLine = tokensByLine.get(lineIdx);

            if (!tokensOnLine || tokensOnLine.length === 0) {
                return {
                    num: currentLineNum,
                    segments: [{ text: line, type: 'text' }],
                    hasInput: false
                };
            }

            // Sort by relative position
            tokensOnLine.sort((a: any, b: any) => a.relativeStart - b.relativeStart);

            let cursor = 0;

            tokensOnLine.forEach((range: any) => {
                // Text before token
                if (range.relativeStart > cursor) {
                    segments.push({
                        text: line.substring(cursor, range.relativeStart),
                        type: 'text'
                    });
                }

                // Token, String, Comment, or Directive segment
                const isString = range.type === 'string';
                const isComment = range.type === 'comment';
                const isDirective = range.type === 'directive-if' || range.type === 'directive-for' || range.type === 'directive-else' || range.type === 'directive-else-if';

                if (!isString && !isComment && !isDirective) hasInput = true;

                const primaryTokenId = range.tokenIds && range.tokenIds.length > 0 ? range.tokenIds[0] : undefined;
                const tokenText = line.substring(range.relativeStart, Math.min(range.relativeEnd, line.length));

                segments.push({
                    text: tokenText,
                    type: (range.type as any) || 'token',
                    tokenId: primaryTokenId
                });

                cursor = Math.min(range.relativeEnd, line.length);
            });

            // Remaining text after last token
            if (cursor < line.length) {
                segments.push({
                    text: line.substring(cursor),
                    type: 'text'
                });
            }

            return {
                num: currentLineNum,
                segments,
                hasInput
            };
        });
    }

    // --- Strategy B: Script Processing (AST Token-based) ---
    let currentGlobalIndex = 0;

    return rawLines.map((lineContent, lineIdx) => {
        const lineStartIdx = currentGlobalIndex;
        const lineEndIdx = lineStartIdx + lineContent.length;
        const currentLineNum = startLineNum + lineIdx;
        currentGlobalIndex = lineEndIdx + 1; // +1 for newline

        const lineTokens = tokenRanges.filter(t => t.start >= lineStartIdx && t.start < lineEndIdx);
        let hasInputDeps = false;
        const segments: LineSegment[] = [];
        let cursor = lineStartIdx;

        lineTokens.forEach((token) => {
            // Text before token
            if (token.start > cursor) {
                segments.push({
                    text: codeSnippet.slice(cursor, token.start),
                    type: 'text'
                });
            }

            const isSelf = token.type === 'self';
            const isPrimitive = token.type === 'primitive';
            const isImportSource = token.type === 'import-source';
            const isString = token.type === 'string';
            const isComment = token.type === 'comment';
            const isExternalImport = token.type === 'external-import';
            const isExternalClosure = token.type === 'external-closure';
            const isKeyword = token.type === 'keyword';
            const isPunctuation = token.type === 'punctuation';

            let fullDepId: string | undefined;
            if (isSelf) {
                fullDepId = nodeId;
            } else if (isPrimitive || isString || isComment || isKeyword || isPunctuation) {
                fullDepId = undefined;
            } else if (isImportSource) {
                // For imports, link to the first dependency (usually the default export or file root of the imported file)
                fullDepId = dependencies.length > 0 ? dependencies[0] : undefined;
            } else if (isExternalImport || isExternalClosure) {
                // For functional parser external dependencies, find matching dependency
                fullDepId = dependencies.find(d => d.endsWith(`::${token.text}`));

                // Debug: Log external dependency matching
                console.log('🔍 External dependency lookup:', {
                    tokenText: token.text,
                    tokenType: token.type,
                    dependencies,
                    found: fullDepId
                });
            } else {
                fullDepId = dependencies.find(d => d.endsWith(`::${token.text}`));

                // Debug: Log token matching for module nodes
                if (nodeId.includes('::FILE_ROOT') && token.type === 'dependency') {
                    console.log('🔍 Module token lookup:', {
                        tokenText: token.text,
                        tokenType: token.type,
                        dependencies,
                        found: fullDepId
                    });
                }
            }

            if (token.type === 'dependency' || isImportSource || isExternalImport || isExternalClosure) hasInputDeps = true;

            segments.push({
                text: token.text,
                type: isSelf ? 'self' :
                      isPrimitive ? 'primitive' :
                      isImportSource ? 'import-source' :
                      isString ? 'string' :
                      isComment ? 'comment' :
                      isExternalImport ? 'external-import' :
                      isExternalClosure ? 'external-closure' :
                      'token',
                tokenId: fullDepId
            });

            cursor = token.end;
        });

        // Trailing text
        if (cursor < lineEndIdx) {
            segments.push({
                text: codeSnippet.slice(cursor, lineEndIdx),
                type: 'text'
            });
        }

        // If line was empty or just pure text with no tokens processed via cursor
        if (segments.length === 0 && lineContent.length > 0) {
             segments.push({ text: lineContent, type: 'text' });
        }

        return {
            num: currentLineNum,
            segments,
            hasInput: hasInputDeps
        };
    });
};
