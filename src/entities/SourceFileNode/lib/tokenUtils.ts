
import * as ts from 'typescript';
import type { FunctionAnalysis } from '@/shared/functionalParser/types';

// Internal type for token ranges (legacy, not exported)
interface TokenRange {
  start: number;
  end: number;
  type: 'self' | 'dependency' | 'other-known' | 'text' | 'primitive' | 'import-source' | 'string' | 'comment' | 'external-import' | 'external-closure' | 'keyword' | 'punctuation';
  text: string;
}

const REACT_PRIMITIVES = new Set([
  'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 
  'useReducer', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue', 
  'useDeferredValue', 'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect'
]);

const VUE_PRIMITIVES = new Set([
  'ref', 'computed', 'reactive', 'watch', 'watchEffect', 
  'onMounted', 'onUnmounted', 'onUpdated', 'onBeforeMount', 
  'onBeforeUnmount', 'onBeforeUpdate', 'provide', 'inject', 
  'toRefs', 'storeToRefs', 'defineProps', 'defineEmits', 
  'defineExpose', 'withDefaults', 'shallowRef', 'triggerRef', 
  'customRef', 'shallowReactive', 'toRef', 'unref', 'isRef', 
  'isProxy', 'isReactive', 'isReadonly', 'readonly'
]);

export const isPrimitive = (name: string) => REACT_PRIMITIVES.has(name) || VUE_PRIMITIVES.has(name);

export const extractTokenRanges = (
    codeSnippet: string,
    nodeId: string,
    dependencies: string[],
    isTemplate: boolean,
    localVariableNames?: string[], // For pure functions: exclude these local vars from highlighting
    isModule?: boolean // For module nodes: make export identifiers clickable
): TokenRange[] => {
    if (isTemplate) return [];

    // For module nodes, extract export identifiers as dependencies
    if (isModule) {
        return extractModuleExportTokens(codeSnippet, nodeId);
    }

    const nodeShortId = nodeId.split('::').pop() || '';
    const ranges: TokenRange[] = [];
    const localVarSet = new Set(localVariableNames || []); // Convert to Set for O(1) lookup

    try {
        const sourceFile = ts.createSourceFile(
            'temp.tsx',
            codeSnippet,
            ts.ScriptTarget.Latest,
            true // setParentNodes
        );

        // Extract comments
        const processedComments = new Set<number>();
        const fullText = sourceFile.getFullText();

        ts.forEachChild(sourceFile, function visitForComments(node) {
            // Get leading comments
            const nodeFullStart = node.getFullStart();
            const nodeStart = node.getStart(sourceFile);

            if (nodeFullStart < nodeStart) {
                const leadingText = fullText.substring(nodeFullStart, nodeStart);
                const commentMatches = leadingText.matchAll(/\/\/.*|\/\*[\s\S]*?\*\//g);
                for (const match of commentMatches) {
                    if (match.index !== undefined) {
                        const start = nodeFullStart + match.index;
                        const end = start + match[0].length;
                        if (!processedComments.has(start)) {
                            ranges.push({
                                start,
                                end,
                                text: match[0],
                                type: 'comment'
                            });
                            processedComments.add(start);
                        }
                    }
                }
            }

            ts.forEachChild(node, visitForComments);
        });

        // Main traversal for identifiers, strings, etc.
        const visit = (node: ts.Node, parent?: ts.Node) => {
            // Handle Keywords (using SyntaxKind)
            if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
                ranges.push({
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: node.getText(),
                    type: 'keyword'
                });
                // Still traverse children for keywords like 'export function'
            }

            // Handle Punctuation (braces, brackets, operators, etc.)
            if (node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation) {
                ranges.push({
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: node.getText(),
                    type: 'punctuation'
                });
            }

            // Handle Import Sources
            if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
                const moduleSpec = node.moduleSpecifier;
                ranges.push({
                    start: moduleSpec.getStart(),
                    end: moduleSpec.getEnd(),
                    text: moduleSpec.getText(),
                    type: 'import-source'
                });
            }

            // Handle String Literals
            if (ts.isStringLiteral(node)) {
                // Skip if it's an import source (handled above)
                if (parent && !ts.isImportDeclaration(parent)) {
                    ranges.push({
                        start: node.getStart(),
                        end: node.getEnd(),
                        text: node.getText(),
                        type: 'string'
                    });
                }
            }

            // Handle Template Literals
            if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
                ranges.push({
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: node.getText(),
                    type: 'string'
                });
            }

            // Handle Identifiers
            if (ts.isIdentifier(node)) {
                const name = node.text;

                // Skip local variables for pure functions
                if (localVarSet.has(name)) {
                    return;
                }

                const matchedDep = dependencies.find(dep => dep.endsWith(`::${name}`));
                const isSelf = name === nodeShortId;
                const isPrim = isPrimitive(name);

                if (isSelf || matchedDep || isPrim) {
                    let type: TokenRange['type'] = 'dependency';
                    if (isSelf) type = 'self';
                    else if (isPrim) type = 'primitive';

                    // Context checks (skip property keys, etc.)
                    let isValidRef = true;

                    // Skip property keys in object literals (unless computed or shorthand)
                    if (parent && ts.isPropertyAssignment(parent)) {
                        if (parent.name === node) isValidRef = false;
                    }

                    // Skip property access (obj.prop)
                    if (parent && (ts.isPropertyAccessExpression(parent) || ts.isPropertyAccessChain(parent))) {
                        if (parent.name === node) isValidRef = false;
                    }

                    // Skip import specifiers (import { useState })
                    if (parent && ts.isImportSpecifier(parent)) {
                        isValidRef = false;
                    }

                    if (isValidRef) {
                        ranges.push({
                            start: node.getStart(),
                            end: node.getEnd(),
                            text: name,
                            type
                        });
                    }
                }
            }

            // Traverse children
            ts.forEachChild(node, (child) => visit(child, node));
        };

        visit(sourceFile);

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

/**
 * Extract token ranges from Functional Parser analysis
 * This is used for functions analyzed by the functional parser
 */
export const extractFunctionalParserTokenRanges = (
    functionAnalysis: FunctionAnalysis,
    codeSnippet: string
): TokenRange[] => {
    const ranges: TokenRange[] = [];

    // The usages in FunctionAnalysis have absolute file positions
    // We need to adjust them relative to the code snippet by subtracting codeStartOffset
    const offset = functionAnalysis.codeStartOffset;

    functionAnalysis.externalDeps.forEach(dep => {
        dep.usages.forEach(usage => {
            // Adjust position relative to the code snippet
            const adjustedStart = usage.start - offset;
            const adjustedEnd = usage.end - offset;

            // Only add if within snippet bounds
            if (adjustedStart >= 0 && adjustedEnd <= codeSnippet.length) {
                ranges.push({
                    start: adjustedStart,
                    end: adjustedEnd,
                    text: usage.name,
                    type: dep.type === 'import' ? 'external-import' : 'external-closure',
                });
            }
        });
    });

    // Also extract comments and strings using TypeScript parser
    try {
        const sourceFile = ts.createSourceFile(
            'temp.ts',
            codeSnippet,
            ts.ScriptTarget.Latest,
            true
        );

        // Extract comments
        const fullText = sourceFile.getFullText();
        ts.forEachChild(sourceFile, function visitForComments(node) {
            // Get leading and trailing comments
            const nodeFullStart = node.getFullStart();
            const nodeStart = node.getStart(sourceFile);

            // Leading comments
            if (nodeFullStart < nodeStart) {
                const leadingText = fullText.substring(nodeFullStart, nodeStart);
                const commentMatches = leadingText.matchAll(/\/\/.*|\/\*[\s\S]*?\*\//g);
                for (const match of commentMatches) {
                    if (match.index !== undefined) {
                        const start = nodeFullStart + match.index;
                        const end = start + match[0].length;
                        ranges.push({
                            start,
                            end,
                            text: match[0],
                            type: 'comment'
                        });
                    }
                }
            }

            ts.forEachChild(node, visitForComments);
        });

        // Extract strings
        const visit = (node: ts.Node) => {
            // String Literals
            if (ts.isStringLiteral(node) && !ts.isImportDeclaration(node.parent)) {
                ranges.push({
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: node.getText(),
                    type: 'string'
                });
            }

            // Template Literals
            if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
                // For template literals, just mark the whole thing as string
                ranges.push({
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: node.getText(),
                    type: 'string'
                });
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

    } catch (e) {
        // Fallback or silent fail for syntax errors
    }

    // Deduplicate and sort
    const uniqueRanges: TokenRange[] = [];
    const seenStarts = new Set<number>();
    ranges.sort((a, b) => a.start - b.start).forEach(range => {
        if (!seenStarts.has(range.start)) {
            uniqueRanges.push(range);
            seenStarts.add(range.start);
        }
    });

    return uniqueRanges;
};

/**
 * Extract export identifiers from module code snippet
 * Makes export function/variable names clickable
 */
function extractModuleExportTokens(
    codeSnippet: string,
    nodeId: string
): TokenRange[] {
    const ranges: TokenRange[] = [];
    const filePath = nodeId.replace('::FILE_ROOT', '');

    console.log('🎯 extractModuleExportTokens called:', {
        nodeId,
        codeSnippet
    });

    try {
        const sourceFile = ts.createSourceFile(
            'module.ts',
            codeSnippet,
            ts.ScriptTarget.Latest,
            true
        );

        const visit = (node: ts.Node) => {
            // Check for export keyword in modifiers
            const hasExportModifier = (node as any).modifiers?.some(
                (m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword
            );

            if (hasExportModifier) {
                // Function export: export function foo() {}
                if (ts.isFunctionDeclaration(node) && node.name) {
                    const name = node.name.text;
                    const start = node.name.getStart();
                    const end = node.name.getEnd();

                    console.log('✅ Found exported function:', name, {
                        start,
                        end
                    });

                    ranges.push({
                        start,
                        end,
                        text: name,
                        type: 'dependency' // Make it clickable
                    });
                }

                // Variable export: export const foo = ...
                if (ts.isVariableStatement(node)) {
                    node.declarationList.declarations.forEach((decl) => {
                        if (ts.isIdentifier(decl.name)) {
                            const name = decl.name.text;
                            const start = decl.name.getStart();
                            const end = decl.name.getEnd();

                            console.log('✅ Found exported variable:', name, {
                                start,
                                end
                            });

                            ranges.push({
                                start,
                                end,
                                text: name,
                                type: 'dependency' // Make it clickable
                            });
                        }
                    });
                }
            }

            // Traverse children
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

    } catch (e) {
        console.error('❌ Error parsing module exports:', e);
    }

    console.log('🎯 extractModuleExportTokens result:', {
        rangesCount: ranges.length,
        ranges
    });

    return ranges;
}
