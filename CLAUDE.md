# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULES - CODE ANALYSIS

**DO NOT use regular expressions for code parsing or analysis.**

When analyzing JavaScript/TypeScript/Vue/React code:
- ✅ **ALWAYS use `@babel/parser`** for JavaScript/TypeScript expressions
- ✅ **ALWAYS use `@vue/compiler-sfc`** AST for Vue templates
- ✅ **ALWAYS use AST-based position information** for token highlighting
- ❌ **NEVER use regex patterns** like `/\w+/g`, `match()`, `split()` for code analysis
- ❌ **NEVER use string manipulation** to extract identifiers from code

**Regex is only acceptable for:**
- Path normalization (e.g., `replace(/\\/g, '/')`)
- Simple string cleanup (not code analysis)

**If you find yourself writing regex for code analysis, STOP and use the proper parser instead.**

See `/docs/정규식_분석_보고서.md` for detailed rationale.

---

## Project Overview

**Vibe Code Viewer** - A developer tool that visualizes variable dependencies and logic pipelines in Vue.js and React components using D3.js force-directed graphs. The tool parses Vue SFC (Single File Components), React TSX files, and TypeScript files to create an interactive dependency graph.

**Key Vision**: See `/docs/프로젝트_활용방안_및_비전.md` for detailed use cases and future roadmap.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Dual Framework Support

The application supports **both Vue 3 and React 19** projects:
- **Vue**: Uses `@vue/compiler-sfc` to parse `.vue` files (script setup + template)
- **React**: Uses `@babel/parser` with JSX plugin to parse `.tsx` files
- **Shared**: TypeScript/JavaScript parsing via `@babel/parser` for both frameworks

### State Management - Jotai Atoms

The application uses **Jotai** for global state management instead of prop drilling:

**Core Atoms** (`src/store/atoms.ts`):
- `filesAtom` - Virtual file system (Record<string, string>)
- `activeFileAtom` - Currently selected file in editor
- `entryFileAtom` - Entry point for parsing
- `isSidebarOpenAtom` - Sidebar visibility state
- `graphDataAtom` - Parsed dependency graph
- `parseErrorAtom` - Parser error messages
- `layoutNodesAtom` - D3 layout-computed node positions
- `layoutLinksAtom` - Layout-computed edges between nodes
- `fullNodeMapAtom` - Map of all nodes by ID
- `templateRootIdAtom` - Root template/JSX node ID
- `transformAtom` - Canvas transform state (zoom/pan)
- `visibleNodeIdsAtom` - Set of nodes to display (filtering)
- `lastExpandedIdAtom` - Last expanded node for navigation

**Architecture Pattern**: Feature components use atoms directly instead of receiving props from parent:
```typescript
// ✅ Modern pattern (Jotai)
const ResetFilesButton = () => {
  const setFiles = useSetAtom(filesAtom);
  // Direct atom access, no props needed
};

// ❌ Old pattern (Prop drilling)
const ResetFilesButton = ({ onReset }: { onReset: () => void }) => {
  // Props passed down from App.tsx
};
```

### Core Parsing Pipeline

The application uses a **dual-parser architecture** with a multi-stage pipeline:

#### Standard Parser (`services/parser/`)
Main entry: `services/parser/parseProject.ts` - 7-step processing pipeline per file:

1. **Import Scanning** - Process imports, recursively parse imported files, create import nodes
2. **Declaration Processing** - Scan top-level declarations (variables, functions, classes)
3. **Initial Dependency Resolution** - Link nodes to their dependencies via AST traversal
4. **Return Statement Extraction** - Extract return statements, create function-local variable nodes
5. **Secondary Dependency Resolution** - Resolve dependencies for function-local variables
6. **Template/JSX Processing** - Handle Vue templates or React JSX
7. **File Root Creation** - Create FILE_ROOT for pure TypeScript files

**Key Modules**:
- `core/` - Core processing (importScanner, declarationProcessor, expressionProcessor, dependencyResolver, returnStatementExtractor, defaultExport)
- `processors/` - File-type specific (vueProcessor, templateProcessor, jsxProcessor, fileRootProcessor, reactComponentProcessor)
- `ast/` - AST analysis (returnExtractor, localReferenceExtractor, hooksDetector, tokenExtractor)
- `utils/` - Analysis utilities (purityChecker, mutabilityChecker)

#### Functional Parser (`services/functionalParser/`)
Specialized parser for pure TypeScript files focusing on:
- **Functional Programming Analysis** - Identifying pure vs impure functions
- **External Dependencies Only** - Highlights imports and closures, excludes local variables
- **DFS Traversal** - Depth-first scope tracking with closure detection
- **Non-Component Code** - Optimized for utility functions and business logic

See `/docs/PARSER_ARCHITECTURE.md` and `/docs/FUNCTIONAL_PARSER.md` for detailed technical documentation.

### Framework Primitives Filtering

The parser **automatically excludes** React and Vue framework primitives to reduce noise:

**React Primitives** (lines 11-16 in ProjectParser.ts):
```typescript
const REACT_PRIMITIVES = new Set([
  'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
  'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue',
  'useDeferredValue', 'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect'
]);
```

**Vue Primitives** (lines 18-22 in ProjectParser.ts):
```typescript
const VUE_PRIMITIVES = new Set([
  'ref', 'reactive', 'computed', 'watch', 'watchEffect', 'toRef', 'toRefs',
  'unref', 'isRef', 'shallowRef', 'triggerRef', 'customRef', 'shallowReactive',
  'readonly', 'shallowReadonly', 'toRaw', 'markRaw', 'effectScope', 'getCurrentScope',
  'onScopeDispose', 'onMounted', 'onUpdated', 'onUnmounted', 'onBeforeMount',
  'onBeforeUpdate', 'onBeforeUnmount', 'onErrorCaptured', 'onRenderTracked',
  'onRenderTriggered', 'onActivated', 'onDeactivated', 'onServerPrefetch',
  'provide', 'inject', 'defineComponent', 'defineAsyncComponent', 'resolveComponent',
  'getCurrentInstance', 'h', 'createVNode', 'cloneVNode', 'mergeProps', 'isVNode',
  'nextTick', 'defineProps', 'defineEmits', 'defineExpose', 'withDefaults'
]);
```

**Purpose**: Only show user-defined logic, not framework boilerplate.

### Data Flow

```
User edits code → filesAtom updated → parseProject() triggered → ProjectParser
  → Graph nodes created → layoutNodesAtom computed → PipelineCanvas renders D3 visualization
```

### Key Data Structures

**VariableNode** (`entities/VariableNode/`): Represents a node in the dependency graph
- `id`: Unique identifier (format: `filePath::localName`)
- `label`: Display name
- `filePath`: Source file path
- `type`: Node category (`module`, `hook`, `computed`, `ref`, `call`, `function`, `template`, etc.)
- `startLine`: Line number in source file (replaces old `sourceLineNum`)
- `dependencies`: Array of node IDs this node depends on
- `codeSnippet`: Extracted code snippet for display

**GraphData**: Container for the parsed graph
```typescript
{ nodes: VariableNode[] }
```

**CanvasNode** (`entities/CanvasNode/`): VariableNode + layout information
- Extends VariableNode with `x`, `y`, `level`, `visualId`, `isVisible` properties
- Used by D3 force simulation for positioning

### Component Architecture (Feature-Based)

**Feature Components** (`src/features/`):
- `FileUpload/` - UploadFolderButton (upload local projects)
- `ResetFiles/` - ResetFilesButton (reset to default examples)

**Widget Components** (`src/widgets/`):
- `Sidebar/` - Code editor interface with file tabs
  - `FileExplorer.tsx` - File tree navigation
  - `Editor.tsx` - Monaco-style code editor
- `PipelineCanvas/` - D3.js visualization container
  - `useCanvasLayout.ts` - Custom layout algorithm (NOT D3 force, manual tree layout)
  - `useD3Zoom.ts` - Pan and zoom behavior
  - `CanvasConnections.tsx` - Renders dependency arrows between nodes
  - `CanvasBackground.tsx` - Grid background
  - `NodeCard.tsx` - Individual node rendering with code snippets

**Entity Components** (`src/entities/`):
- `VariableNode/` - Core node type definitions
- `CanvasNode/` - Layout-enhanced node type

**Application Root**:
- `App.tsx` - Main container, bootstraps Jotai provider
- `index.tsx` - React entry point

### Virtual File System

The app operates on an in-memory file system:
- `DEFAULT_FILES` (in `constants.ts`): Hardcoded example files loaded via `loadExampleFiles()`
- `DEFAULT_ENTRY_FILE`: Starting point for parsing (`examples/react/App.tsx`)
- Files can be edited in the UI and changes trigger re-parsing

**Examples included**:
- `examples/vue/` - Vue 3 example (App.vue, UserList.vue, UserCard.vue, useUsers.ts)
- `examples/react/` - React 19 example (App.tsx, UserList.tsx, UserCard.tsx, useUsers.ts)

### Template and JSX Analysis

**Vue Template Parsing** (in `ProjectParser.ts`):
- Extracts component usage from `<template>` section
- Creates special `TEMPLATE_ROOT` node representing the template
- Links template component references to script imports
- Tracks which components are actually used vs just imported

**React JSX Parsing** (lines 106-185 in `ProjectParser.ts`):
- Extracts JSX snippets from function component returns
- Creates special `JSX_ROOT` node representing the component's JSX tree
- Identifies component usage within JSX (PascalCase identifiers)
- Links JSX component references to imports
- Handles both `return (...)` and `return <div>...</div>` patterns

**Root Node Logic**:
- `.vue` files → `TEMPLATE_ROOT` node
- `.tsx` files → `JSX_ROOT` node
- `.ts`/`.js` files → `FILE_ROOT` node
- Root selection priority checked in `useCanvasLayout.ts` (lines 43-56)

## Important Technical Details

### Custom Layout Algorithm

**NOT using D3 force simulation** - Instead uses custom tree-based layout:

**Algorithm** (`src/widgets/PipelineCanvas/useCanvasLayout.ts`):
1. **Build Visual Tree** (lines 114-206): Creates hierarchical tree from dependency graph
2. **Compute Heights** (lines 212-225): Calculate subtree heights for balanced layout
3. **Assign Coordinates** (lines 233-256): Position nodes in LTR (left-to-right) tree layout
   - X: Negative values, level-based (`-(level * LEVEL_SPACING)`)
   - Y: Centered based on subtree height

**Node Sorting** (lines 92-111): Weighted category ordering:
- Imports (non-component utilities) → top (weight: 0)
- Local logic (ref, computed, store, hook) → middle (weight: 1-4)
- Functions → lower middle (weight: 10)
- Components/Templates → bottom (weight: 25-30)

### Path Alias Configuration

- `@/*` maps to `./src/*` (configured in `vite.config.ts` and `tsconfig.json`)
- The parser must handle various import formats:
  - Relative: `./component.vue`, `../utils.ts`, `./UserCard`
  - Alias: `@/components/Button.vue`
  - Extension-less: `./useUsers` (resolved to `.ts` or `.tsx`)

### Parser Node Types

The parser categorizes variables into functional programming-aware types:

**Pure/Immutable (Calculations)**:
- `pure-function`: Pure functions with no side effects, state hooks, or mutations
- `immutable-data`: Constants with immutable values (primitives, literals)
- `computed`: Memoized/computed values (useMemo, useCallback)

**State Management (State Actions)**:
- `state-ref`: State value references (first element of useState/useReducer destructuring)
- `state-action`: State mutation functions (setters, dispatch functions)
- `mutable-ref`: Mutable references (useRef)
- `ref`: Generic references (legacy, backward compatibility)

**Side Effects (Effect Actions)**:
- `effect-action`: Functions with side effects or effect hooks
- `hook`: Custom hooks (complex logic, assumed impure by default)

**Structural**:
- `template`: Templates/JSX (TEMPLATE_ROOT, JSX_ROOT)
- `module`: Imports/exports/FILE_ROOT
- `call`: Top-level function calls
- `function`: Generic functions (legacy, re-classified during analysis)
- `store`: State store references (storeToRefs)

See `/docs/PARSER_ARCHITECTURE.md` section 2 for detailed node creation conditions.

## Project Structure

```
/
├── src/
│   ├── App.tsx                     # Main application container
│   ├── index.tsx                   # React entry point
│   ├── constants.ts                # Default example files
│   ├── types.ts                    # Shared type definitions
│   ├── store/
│   │   └── atoms.ts                # Jotai global state atoms
│   ├── features/                   # Feature components (Jotai-connected)
│   │   ├── FileUpload/
│   │   └── ResetFiles/
│   ├── widgets/                    # Complex UI widgets
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── FileExplorer.tsx
│   │   │   └── Editor.tsx
│   │   └── PipelineCanvas/         # D3 visualization components
│   │       ├── PipelineCanvas.tsx
│   │       ├── useCanvasLayout.ts  # Custom layout algorithm
│   │       ├── useD3Zoom.ts
│   │       ├── CanvasConnections.tsx
│   │       ├── CanvasBackground.tsx
│   │       └── NodeCard.tsx
│   ├── services/
│   │   ├── codeParser.ts           # Public parsing API (parseProject)
│   │   ├── parser/                 # Standard parser (React/Vue components)
│   │   │   ├── parseProject.ts     # Main entry point (7-step pipeline)
│   │   │   ├── core/               # Core processors
│   │   │   ├── processors/         # File-type processors
│   │   │   ├── ast/                # AST analysis utilities
│   │   │   └── utils/              # Purity & mutability checkers
│   │   └── functionalParser/       # Functional parser (TypeScript utilities)
│   │       ├── index.ts            # Functional thinking analysis
│   │       ├── core/               # DFS traversal & function analyzer
│   │       └── utils/              # Scope tracking & closure detection
│   ├── entities/                   # Domain entities
│   │   ├── VariableNode/           # Graph node entity
│   │   └── CanvasNode/             # Layout-enhanced node
│   ├── utils/
│   │   └── loadExamples.ts         # Hardcoded example files
│   └── examples/                   # Example projects
│       ├── vue/                    # Vue 3 example
│       │   ├── App.vue
│       │   ├── UserList.vue
│       │   ├── UserCard.vue
│       │   └── useUsers.ts
│       └── react/                  # React 19 example
│           ├── App.tsx
│           ├── UserList.tsx
│           ├── UserCard.tsx
│           └── useUsers.ts
├── docs/                           # Documentation
│   ├── PARSER_ARCHITECTURE.md      # Comprehensive parser technical docs
│   ├── FUNCTIONAL_PARSER.md        # Functional parser documentation
│   ├── 프로젝트_활용방안_및_비전.md  # Project vision and use cases
│   ├── 정규식_분석_보고서.md        # Regex analysis report (why AST > regex)
│   └── 경쟁사_분석_보고서.md        # Competitor analysis
└── CLAUDE.md                       # This file
```

## Development Notes

### Parser Selection
- **Pure TypeScript files** (`.ts`, non-component): Uses Functional Parser for external dependency analysis
- **Vue files** (`.vue`): Uses Standard Parser with Vue template analysis
- **React files** (`.tsx`): Uses Standard Parser with JSX analysis
- **Fallback**: If Functional Parser fails, falls back to Standard Parser

### Key Implementation Details
- The parser builds a dependency graph where edges represent "depends on" relationships
- Error handling: If parsing fails, the UI maintains last valid graph (stored in `parseErrorAtom`)
- The custom layout algorithm automatically positions nodes in a hierarchical tree structure
- Framework primitives (useState, ref, etc.) are automatically filtered out via `constants.ts`
- JSX snippets are extracted from React component returns for visualization
- Vue templates are analyzed for component usage and linked to imports
- Both Vue and React examples are included for testing and demonstration
- Purity analysis uses whitelisting (pure methods) and blacklisting (side effects)
- Mutability detection tracks array mutations, object mutations, and reassignments

### Important Files to Reference
- `/docs/PARSER_ARCHITECTURE.md` - Deep dive into 7-step pipeline, node types, classification systems
- `/docs/FUNCTIONAL_PARSER.md` - Functional parser API, scope tracking, external dependencies
- `src/services/parser/constants.ts` - Framework primitive lists (React/Vue hooks to filter)
- `src/services/parser/utils/purityChecker.ts` - Pure function classification logic
- `src/services/parser/utils/mutabilityChecker.ts` - Mutation detection logic
