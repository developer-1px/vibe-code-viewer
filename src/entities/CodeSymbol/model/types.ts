/**
 * CodeSymbol Entity - Code symbol metadata
 * Domain model for code symbols (functions, variables, types, etc.)
 */

/**
 * CodeSymbol metadata - enriched information about a code symbol
 * Extracted from TypeScript Language Service and dependency analysis
 */
export interface CodeSymbolMetadata {
  typeInfo: string | null; // TypeScript type information from Language Service hover
  codeSnippet: string; // First line of code snippet (definition)
  usageCount: number; // Number of dependencies referencing this symbol
}
