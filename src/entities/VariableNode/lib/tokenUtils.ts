
import { parse } from '@babel/parser';
import { TokenRange } from './types.ts';

export const extractTokenRanges = (
    codeSnippet: string,
    nodeId: string,
    dependencies: string[],
    isTemplate: boolean
): TokenRange[] => {
    if (isTemplate) return [];

    const nodeShortId = nodeId.split('::').pop() || '';
    const ranges: TokenRange[] = [];

    try {
        const ast = parse(codeSnippet, {
            sourceType: 'module',
            plugins: ['typescript']
        });

        const visit = (n: any, parent: any) => {
            if (!n || typeof n !== 'object') return;

            if (n.type === 'Identifier') {
                const name = n.name;
                
                const matchedDep = dependencies.find(dep => dep.endsWith(`::${name}`));
                const isSelf = name === nodeShortId;
                
                if (isSelf || matchedDep) {
                    const type: TokenRange['type'] = isSelf ? 'self' : 'dependency';
                    
                    // Context checks (skip property keys etc)
                    let isValidRef = true;
                    if (parent?.type === 'ObjectProperty' && parent.key === n && !parent.computed && !parent.shorthand) isValidRef = false;
                    if ((parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') && parent.property === n && !parent.computed) isValidRef = false;
                    if (parent?.type === 'ObjectMethod' && parent.key === n && !parent.computed) isValidRef = false;

                    if (isValidRef) {
                        ranges.push({
                            start: n.start,
                            end: n.end,
                            text: name, 
                            type
                        });
                    }
                }
            }

            Object.keys(n).forEach(key => {
                if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) return;
                const child = n[key];
                if (Array.isArray(child)) child.forEach(c => visit(c, n));
                else if (child && typeof child === 'object') visit(child, n);
            });
        };

        visit(ast.program, null);

    } catch (e) {
        // Fallback or silent fail for syntax errors during typing
    }

    // Deduplicate ranges
    const uniqueRanges: TokenRange[] = [];
    const seenStarts = new Set<number>();
    // Sort needed for linear processing later
    ranges.sort((a, b) => a.start - b.start).forEach(range => {
        if (!seenStarts.has(range.start)) {
            uniqueRanges.push(range);
            seenStarts.add(range.start);
        }
    });

    return uniqueRanges;
};
