/**
 * Main entry point for the functional parser
 */

export { parseProject } from './parseProject';

// AST utilities
export * from './ast/returnExtractor';
export * from './ast/localReferenceExtractor';
export * from './ast/tokenExtractor';
export * from './ast/hooksDetector';

// Processors
export * from './processors/vueProcessor';
export * from './processors/templateProcessor';
export * from './processors/jsxProcessor';
export * from './processors/fileRootProcessor';
export * from './processors/reactComponentProcessor';

// Core
export * from './core/defaultExport';
export * from './core/importScanner';
export * from './core/dependencyResolver';
export * from './core/returnStatementExtractor';
export * from './core/declarationProcessor';
export * from './core/expressionProcessor';

// Types & Constants
export * from './types';
export * from './constants';
