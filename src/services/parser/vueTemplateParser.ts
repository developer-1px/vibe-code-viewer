import { parse as parseBabel } from '@babel/parser';

export interface TemplateTokenRange {
    startOffset: number;
    endOffset: number;
    text: string;
    tokenIds: string[]; // Local variable names (without file path prefix)
}

export interface TemplateParseResult {
    dependencies: string[]; // Local variable names found in template
    tokenRanges: TemplateTokenRange[];
}

/**
 * Parse a Vue template and extract dependencies and token positions
 * @param templateAst - Vue template AST from @vue/compiler-sfc
 * @param fileVarNames - Set of variable names defined in this file's script
 * @param baseOffset - Base offset to subtract from AST offsets (descriptor.template.loc.start.offset)
 * @returns Dependencies and token ranges for highlighting
 */
export const parseVueTemplate = (
    templateAst: any,
    fileVarNames: Set<string>,
    baseOffset: number = 0
): TemplateParseResult => {
    const dependencies = new Set<string>();
    const tokenRanges: TemplateTokenRange[] = [];

    if (!templateAst) {
        return { dependencies: [], tokenRanges: [] };
    }

    traverseTemplateAST(templateAst, fileVarNames, dependencies, new Set(), tokenRanges, baseOffset);

    return {
        dependencies: Array.from(dependencies),
        tokenRanges
    };
};

/**
 * Recursively traverse Vue template AST to find variable references
 */
const traverseTemplateAST = (
    node: any,
    knownVars: Set<string>,
    foundDeps: Set<string>,
    localScope: Set<string>,
    tokenRanges: TemplateTokenRange[],
    baseOffset: number
) => {
    if (!node) return;

    /**
     * Check if an expression contains dependencies using Babel parser
     * Returns array of { name, start, end } for each identifier found
     */
    const checkExpressionWithScope = (text: string, scope: Set<string>): Array<{ name: string; start: number; end: number }> => {
        const localFoundDeps: Array<{ name: string; start: number; end: number }> = [];

        try {
            // Wrap in parentheses to ensure it's parsed as expression, not statement
            // This handles object literals like { 'multi-line': screenSize !== 'sm' }
            const wrappedText = `(${text})`;
            const ast = parseBabel(wrappedText, {
                sourceType: 'module',
                plugins: ['typescript']
            });

            const visit = (n: any, parent: any) => {
                if (!n || typeof n !== 'object') return;

                if (n.type === 'Identifier') {
                    const name = n.name;

                    // Skip keywords, local scope variables
                    if (['true', 'false', 'null', 'undefined', 'this'].includes(name)) return;
                    if (scope.has(name)) return;

                    // Skip object keys in non-computed properties
                    if (parent?.type === 'ObjectProperty' && parent.key === n && !parent.computed && !parent.shorthand) return;

                    // Skip property access in non-computed member expressions
                    if ((parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') &&
                        parent.property === n && !parent.computed) return;

                    if (knownVars.has(name)) {
                        foundDeps.add(name);
                        // Adjust offsets: -1 to account for wrapping parenthesis
                        const adjustedStart = n.start! - 1;
                        const adjustedEnd = n.end! - 1;

                        // Check if we already have this identifier (avoid duplicates)
                        if (!localFoundDeps.some(d => d.name === name && d.start === adjustedStart)) {
                            localFoundDeps.push({
                                name,
                                start: adjustedStart,
                                end: adjustedEnd
                            });
                        }
                    }
                }

                // Recursively visit all properties
                for (const key in n) {
                    if (n.hasOwnProperty(key) && key !== 'loc' && key !== 'start' && key !== 'end') {
                        const value = n[key];
                        if (Array.isArray(value)) {
                            value.forEach(v => visit(v, n));
                        } else if (typeof value === 'object') {
                            visit(value, n);
                        }
                    }
                }
            };

            visit(ast, null);
        } catch (e) {
            // Parsing failed - skip this expression
            console.warn(`Failed to parse expression: "${text}"`, e);
        }

        return localFoundDeps;
    };

    // Type 5 = Interpolation {{ }}
    if (node.type === 5 && node.content?.content && node.content?.loc) {
        const depsInExpr = checkExpressionWithScope(node.content.content, localScope);

        // Create a token range for each identifier found in the expression
        depsInExpr.forEach(dep => {
            foundDeps.add(dep.name);

            // dep.start/end are offsets within the expression text
            // node.content.loc.start.offset is the absolute offset of the expression in the template
            const absoluteStart = node.content.loc.start.offset + dep.start;
            const absoluteEnd = node.content.loc.start.offset + dep.end;

            // Adjust to be relative to templateContent
            const relativeStart = absoluteStart - baseOffset;
            const relativeEnd = absoluteEnd - baseOffset;

            console.log(`🔍 Interpolation identifier "${dep.name}" at offset ${absoluteStart}-${absoluteEnd} (relative: ${relativeStart}-${relativeEnd})`);

            tokenRanges.push({
                startOffset: relativeStart,
                endOffset: relativeEnd,
                text: dep.name,
                tokenIds: [dep.name]
            });
        });
    }

    // Type 1 = Element (Tag)
    if (node.type === 1) {
        const tagName = node.tag;
        let matchedVarName: string | null = null;

        // Check for pascal case match (e.g. MarketplaceSelectorType)
        if (knownVars.has(tagName)) {
            matchedVarName = tagName;
        }
        // Check for kebab case match (e.g. marketplace-selector-type -> MarketplaceSelectorType)
        else {
            const pascal = tagName.replace(/-(\w)/g, (_: any, c: string) => c ? c.toUpperCase() : '').replace(/^[a-z]/, (c: string) => c.toUpperCase());
            if (knownVars.has(pascal)) {
                matchedVarName = pascal;
            }
        }

        if (matchedVarName && node.loc) {
            foundDeps.add(matchedVarName);

            // Extract tag name position
            // Opening tag: <TagName> -> tag starts at loc.start.offset + 1 (after '<')
            const tagStartOffset = node.loc.start.offset + 1; // Skip '<'
            const tagEndOffset = tagStartOffset + tagName.length;

            // Adjust to be relative to templateContent
            const relativeStart = tagStartOffset - baseOffset;
            const relativeEnd = tagEndOffset - baseOffset;

            console.log(`🏷️  Component tag "${tagName}" → "${matchedVarName}" at offset ${tagStartOffset}-${tagEndOffset} (relative: ${relativeStart}-${relativeEnd})`);

            tokenRanges.push({
                startOffset: relativeStart,
                endOffset: relativeEnd,
                text: tagName,
                tokenIds: [matchedVarName]
            });
        }
    }

    // Extract v-for local variables to create child scope
    const extractVForVariables = (props: any[]): Set<string> | null => {
        const forProp = props.find((prop: any) =>
            prop.type === 7 && prop.name === 'for' && prop.exp?.content
        );

        if (!forProp) return null;

        const match = forProp.exp.content.match(/^\s*\(?\s*([^)]+?)\s*\)?\s+(?:in|of)\s+/);
        if (!match) return null;

        const newScope = new Set(localScope);
        const iteratorVars = match[1].split(',').map((v: string) => v.trim());

        iteratorVars.forEach(varName => {
            // Handle destructuring: "{ id, name }" or "[ first, second ]"
            if (varName.includes('{') || varName.includes('[')) {
                const simpleVars = varName.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g);
                simpleVars?.forEach(v => newScope.add(v));
            } else {
                newScope.add(varName);
            }
        });

        return newScope;
    };

    const childScope = node.props ? (extractVForVariables(node.props) || localScope) : localScope;

    if (node.props) {

        // Second pass: Check all directive expressions and collect token ranges
        node.props.forEach((prop: any) => {
            // Type 6 = Attribute (static, like class="foo")
            // Type 7 = Directive (v-if, v-bind, v-on, etc.)

            if (prop.type === 7 && prop.exp?.content) {
                const depsInExpr = checkExpressionWithScope(prop.exp.content, childScope);

                // Create a token range for each identifier found in the directive expression
                depsInExpr.forEach(dep => {
                    foundDeps.add(dep.name);

                    // dep.start/end are offsets within the expression text
                    // prop.exp.loc.start.offset is the absolute offset of the expression in the template
                    const absoluteStart = prop.exp.loc.start.offset + dep.start;
                    const absoluteEnd = prop.exp.loc.start.offset + dep.end;

                    // Adjust to be relative to templateContent
                    const relativeStart = absoluteStart - baseOffset;
                    const relativeEnd = absoluteEnd - baseOffset;

                    console.log(`🔍 Directive identifier "${dep.name}" at offset ${absoluteStart}-${absoluteEnd} (relative: ${relativeStart}-${relativeEnd})`);

                    tokenRanges.push({
                        startOffset: relativeStart,
                        endOffset: relativeEnd,
                        text: dep.name,
                        tokenIds: [dep.name]
                    });
                });
            }
        });
    }

    if (node.children) {
        node.children.forEach((c: any) => traverseTemplateAST(c, knownVars, foundDeps, childScope, tokenRanges, baseOffset));
    }
};
