/**
 * DeadCodeAnalyzer - Types
 */

export interface CategoryState {
  unusedExports: boolean;
  unusedImports: boolean;
  deadFunctions: boolean;
  unusedVariables: boolean;
  unusedProps: boolean;
  unusedArguments: boolean;
}

export type CategoryKey = keyof CategoryState;
