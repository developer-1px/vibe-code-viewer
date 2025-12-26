
import { ProcessedLine, TokenRange, LineSegment, TemplateTokenRange } from './types.ts';

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
        console.log('✅ Using AST-based highlighting (offset-based)');
        console.log('   startLineNum:', startLineNum);
        console.log('   totalLines:', rawLines.length);
        console.log('   templateTokenRanges:', JSON.stringify(templateTokenRanges, null, 2));

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

        console.log('📏 Line offsets:', lineOffsets.map(l => `[${l.lineIdx}] ${l.start}-${l.end}: "${l.text.substring(0, 50)}"`));

        // Group tokens by line
        const tokensByLine = new Map<number, typeof templateTokenRanges>();

        templateTokenRanges.forEach(range => {
            const lineInfo = lineOffsets.find(l =>
                range.startOffset >= l.start && range.startOffset < l.end
            );

            console.log(`🔍 Token "${range.text}" at offset ${range.startOffset}-${range.endOffset} → line ${lineInfo?.lineIdx ?? 'NOT_FOUND'}`);

            if (lineInfo) {
                if (!tokensByLine.has(lineInfo.lineIdx)) {
                    tokensByLine.set(lineInfo.lineIdx, []);
                }
                const relativeStart = range.startOffset - lineInfo.start;
                const relativeEnd = range.endOffset - lineInfo.start;

                console.log(`   → relative position: ${relativeStart}-${relativeEnd} in "${lineInfo.text}"`);
                console.log(`   → extracted text: "${lineInfo.text.substring(relativeStart, relativeEnd)}"`);

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

                // Token segment
                hasInput = true;
                const primaryTokenId = range.tokenIds[0];
                const tokenText = line.substring(range.relativeStart, Math.min(range.relativeEnd, line.length));

                segments.push({
                    text: tokenText,
                    type: 'token',
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
            const fullDepId = isSelf ? nodeId : dependencies.find(d => d.endsWith(`::${token.text}`));

            if (token.type === 'dependency') hasInputDeps = true;

            segments.push({
                text: token.text,
                type: isSelf ? 'self' : 'token',
                tokenId: fullDepId // Can be undefined if logic fails, handled in UI
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
