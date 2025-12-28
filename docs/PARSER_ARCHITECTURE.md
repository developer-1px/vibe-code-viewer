# Parser Codebase Technical Report

## 1. Overall Architecture

### Entry Point and Main Flow

**File**: `/src/services/parser/parseProject.ts`

The parser's entry point is the `parseProject()` function, which orchestrates the entire parsing pipeline:

```typescript
export function parseProject(files: Record<string, string>, entryFile: string): GraphData
```

**Main Data Structures**:
- `nodes: Map<string, VariableNode>` - Global registry of all parsed nodes
- `processedFiles: Set<string>` - Prevents circular file processing
- `exportsRegistry: Map<string, Map<string, string>>` - Tracks exported symbols per file

**Processing Flow** (7-step pipeline per file):

1. **Import Scanning** (Step 1): Recursively process imported files, create import nodes
2. **Declaration Processing** (Step 2): Scan top-level declarations (variables, functions, classes)
3. **Initial Dependency Resolution** (Step 3): Link nodes to their dependencies
4. **Return Statement Extraction** (Step 4): Extract return statements and function-local variables
5. **Secondary Dependency Resolution** (Step 4.5): Resolve dependencies for function-local variables
6. **Template/JSX Processing** (Step 5-6): Handle Vue templates or React JSX
7. **File Root Creation** (Step 7): Create FILE_ROOT for pure TypeScript files

### File Organization

```
/services/parser/
├── parseProject.ts          # Main entry point
├── index.ts                 # Public API exports
├── types.ts                 # Shared type definitions
├── constants.ts             # Framework primitives (React/Vue hooks)
├── pathUtils.ts             # Path resolution utilities
├── astUtils.ts              # Generic AST utilities
├── tsxParser.ts             # React/JSX parsing
├── vueTemplateParser.ts     # Vue template parsing
│
├── core/                    # Core processing modules
│   ├── importScanner.ts     # Import statement processing
│   ├── declarationProcessor.ts  # Variable/function declarations
│   ├── expressionProcessor.ts   # Top-level expressions
│   ├── dependencyResolver.ts    # Dependency graph linking
│   ├── returnStatementExtractor.ts  # Return extraction + local vars
│   └── defaultExport.ts     # Default export handling
│
├── processors/              # File-type specific processors
│   ├── vueProcessor.ts      # Vue SFC parsing
│   ├── templateProcessor.ts # Vue template node creation
│   ├── jsxProcessor.ts      # React JSX node creation
│   ├── fileRootProcessor.ts # Pure TS file handling
│   └── reactComponentProcessor.ts  # React component statement breakdown
│
├── ast/                     # AST analysis utilities
│   ├── returnExtractor.ts   # Return statement extraction
│   ├── localReferenceExtractor.ts  # Local variable tracking
│   ├── hooksDetector.ts     # React hooks detection
│   └── tokenExtractor.ts    # Token range extraction
│
└── utils/                   # Analysis utilities
    ├── purityChecker.ts     # Pure function detection
    └── mutabilityChecker.ts # Mutation detection
```

### Key Responsibilities by Module

**Core Modules**:
- `importScanner.ts`: Recursively processes imports, creates import nodes, handles cross-file references
- `declarationProcessor.ts`: Creates VariableNodes for top-level declarations, detects React components
- `expressionProcessor.ts`: Handles top-level function calls (e.g., setup block calls)
- `dependencyResolver.ts`: Links nodes via AST analysis, resolves local/external references
- `returnStatementExtractor.ts`: Extracts return statements, creates function-local variable nodes
- `defaultExport.ts`: Ensures default export nodes exist, links to templates/JSX

**Processors**:
- `vueProcessor.ts`: Parses Vue SFC, extracts script/template sections
- `templateProcessor.ts`: Creates TEMPLATE_ROOT nodes with dependency tracking
- `jsxProcessor.ts`: Creates JSX_ROOT nodes, extracts JSX return statements
- `fileRootProcessor.ts`: Creates FILE_ROOT for pure TypeScript files
- `reactComponentProcessor.ts`: Breaks React components into statement-level nodes

**AST Utilities**:
- `returnExtractor.ts`: Finds return statements in function bodies
- `localReferenceExtractor.ts`: Extracts local variable references from expressions
- `hooksDetector.ts`: Detects React hooks in function bodies
- `tokenExtractor.ts`: Extracts token ranges for syntax highlighting

**Analysis Utilities**:
- `purityChecker.ts`: Categorizes functions as calculations vs actions
- `mutabilityChecker.ts`: Detects mutations, assignment, state hooks

---

## 2. Node Creation Conditions

### VariableNode Structure

```typescript
interface VariableNode {
  id: string;              // filePath::localName (e.g., "src/App.tsx::UserList")
  label: string;           // Display name
  filePath: string;        // Source file path
  type: NodeType;          // See node types below
  codeSnippet: string;     // Source code or condensed snippet
  startLine: number;       // Line number in file
  dependencies: string[];  // Array of node IDs this node depends on
  templateTokenRanges?: TemplateTokenRange[];  // For templates/JSX
  localReferences?: LocalReference[];          // For return statements
  mutabilityInfo?: MutabilityAnalysis;         // Mutation analysis
  localVariableNames?: string[];               // For pure functions
}
```

### Node Types and Creation Triggers

#### **CALCULATIONS** (Immutable, Pure)

**1. `pure-function`** - Pure Functions (Calculations)
- **Trigger**: Function with no side effects, state hooks, or I/O
- **Created by**: `returnStatementExtractor.ts` after purity analysis
- **Classification logic**:
  - No `useState`, `useReducer`, `useRef`
  - No `useEffect`, `useLayoutEffect`
  - No side effects (console, fetch, DOM, etc.)
  - No mutations (array.push, obj.prop = val)
- **Example**: `function add(a, b) { return a + b }`

**2. `immutable-data`** - Immutable Constants
- **Trigger**: `const` declaration with primitive or immutable initialization
- **Created by**: `returnStatementExtractor.ts` (function-local) or `declarationProcessor.ts` (file-level)
- **Classification logic**:
  - `const` keyword (not `let` or `var`)
  - Initialization is literal, template literal, or function expression
  - NOT array or object (mutable by default)
- **Example**: `const MAX_SIZE = 100`, `const greeting = 'Hello'`

**3. `computed`** - Computed Values
- **Trigger**: `useMemo` or `useCallback` calls
- **Created by**: `returnStatementExtractor.ts`
- **Detection**: Code snippet includes `useMemo` or `useCallback`
- **Example**: `const memoized = useMemo(() => expensiveCalc(data), [data])`

#### **STATE ACTIONS** (State Management)

**4. `state-ref`** - State References
- **Trigger**: First element of `useState` or `useReducer` destructuring
- **Created by**: `returnStatementExtractor.ts`
- **Detection**:
  - Array destructuring from `useState` or `useReducer`
  - Index 0 element
- **Example**: `const [count, setCount] = useState(0)` → `count` is `state-ref`

**5. `state-action`** - State Mutation Functions
- **Trigger**:
  - Second element of `useState` destructuring
  - Second element of `useReducer` destructuring
  - Functions using state hooks (analyzed after classification)
- **Created by**: `returnStatementExtractor.ts`
- **Detection**:
  - Array destructuring index 1 from `useState`/`useReducer`
  - OR function containing state hooks (purity analysis)
- **Example**: `setCount` from `useState`, `dispatch` from `useReducer`

**6. `mutable-ref`** - Mutable References
- **Trigger**: `useRef` calls
- **Created by**: `returnStatementExtractor.ts`
- **Detection**: Code snippet includes `useRef`
- **Example**: `const divRef = useRef<HTMLDivElement>(null)`

**7. `ref`** - Generic References (Legacy)
- **Trigger**: Default type for variables that don't match other categories
- **Created by**: `declarationProcessor.ts` (file-level), `returnStatementExtractor.ts` (function-local)
- **Note**: Backward compatibility type, should migrate to more specific types

#### **EFFECT ACTIONS** (Side Effects)

**8. `effect-action`** - Effect Actions
- **Trigger**: Functions with side effects or effect hooks
- **Created by**: `returnStatementExtractor.ts` after purity analysis
- **Classification logic**:
  - Uses `useEffect`, `useLayoutEffect`, `useInsertionEffect`
  - OR has side effects (console, fetch, localStorage, DOM manipulation)
  - OR custom hooks (starts with `use` + uppercase)
- **Example**: Functions with `useEffect`, API calls, console.log

**9. `hook`** - Custom Hooks
- **Trigger**:
  - Variable initialization with function starting with `use`
  - OR custom hook calls (not in whitelist)
- **Created by**: `declarationProcessor.ts`, `returnStatementExtractor.ts`
- **Detection**: Pattern match `/^use[A-Z]/`
- **Example**: `const data = useUsers()`, `const layout = useCanvasLayout()`

#### **STRUCTURAL NODES**

**10. `function`** - Generic Functions (Legacy)
- **Trigger**: Function declarations before classification
- **Created by**: `declarationProcessor.ts`
- **Note**: Re-classified to `pure-function`, `state-action`, or `effect-action` in Step 4

**11. `template`** - Templates/Components
- **Trigger**:
  - Vue template sections → `TEMPLATE_ROOT`
  - React JSX return statements → `JSX_ROOT`
- **Created by**: `templateProcessor.ts` (Vue), `jsxProcessor.ts` (React)
- **Properties**: Includes `templateTokenRanges` for syntax highlighting
- **Example**: `<template>` in Vue, JSX return in React

**12. `module`** - Module/Import Nodes
- **Trigger**:
  - Import statements (internal or external)
  - File root nodes for pure TS files (`FILE_ROOT`)
  - Default export nodes
- **Created by**:
  - `importScanner.ts` (imports)
  - `fileRootProcessor.ts` (FILE_ROOT)
  - `defaultExport.ts` (default exports)
- **Example**: `import { UserList } from './UserList'`

**13. `call`** - Top-Level Calls
- **Trigger**: Top-level expression statements (function calls)
- **Created by**: `expressionProcessor.ts`
- **Use case**: Vue setup block side effects
- **Example**: `watchEffect(() => { ... })` at top level

**14. `store`** - State Store References
- **Trigger**: `storeToRefs` calls
- **Created by**: `declarationProcessor.ts`
- **Detection**: Code snippet includes `storeToRefs`
- **Example**: `const { user } = storeToRefs(userStore)`

**15. `prop`** - Component Props
- **Note**: Currently not actively created in the codebase, reserved for future use

---

## 3. Processing Pipeline

### Step-by-Step Flow

```
Entry File → processFile() → 7-Step Pipeline → GraphData
```

#### **Step 1: Import Scanning** (`scanImports`)

**File**: `core/importScanner.ts`

**Purpose**: Process all imports, recursively parse imported files

**Process**:
1. Traverse AST for `ImportDeclaration` nodes
2. Resolve import paths using `pathUtils.ts`:
   - Handle aliases: `@/`, `~/`, `~~/`
   - Resolve relative paths: `./`, `../`
   - Find file with extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`
3. For **internal imports** (file exists in project):
   - Recursively call `processFile()` on imported file
   - Create import node linking to remote definition
   - Dependency: `["targetFile::exportedName"]`
4. For **external imports** (node_modules):
   - Create import node without dependencies
   - Skip framework primitives (React/Vue hooks)
5. Return set of local definitions added

**Node Creation**:
```typescript
{
  id: "currentFile::localName",
  label: "localName",
  type: "module",
  codeSnippet: "import { X } from './Y'",
  dependencies: ["targetFile::exportedName"]
}
```

**Special Handling**:
- Default imports: `import X from './Y'` → depends on `targetFile::default`
- Named imports: `import { X } from './Y'` → depends on `targetFile::X`
- Primitive filtering: Skip `useState`, `useEffect`, etc. (defined in `constants.ts`)

#### **Step 2: Declaration Processing** (`processDeclaration`)

**File**: `core/declarationProcessor.ts`

**Purpose**: Create nodes for all top-level declarations

**Process**:
1. Traverse `ast.program.body` for declaration nodes:
   - `VariableDeclaration`
   - `FunctionDeclaration`
   - `ClassDeclaration`
   - `ExportNamedDeclaration`
   - `ExportDefaultDeclaration`
2. Extract identifiers (including destructuring patterns)
3. Infer type from initialization code:
   - `computed` if includes `computed`
   - `hook` if includes `use` (not `useRoute`)
   - `store` if includes `storeToRefs`
   - Default: `ref`
4. **React Component Detection**:
   - PascalCase name (first char uppercase)
   - Arrow/function expression with hooks
   - Calls `processReactComponentStatements()` to break down component

**Node Creation**:
```typescript
{
  id: "filePath::variableName",
  label: "variableName",
  type: inferType(initCode),
  codeSnippet: fullDeclarationCode,
  startLine: node.loc.start.line,
  dependencies: [],  // Filled in Step 3
  astNode: node      // Temporary, used for dependency resolution
}
```

**React Component Breakdown**:
- If component detected, calls `reactComponentProcessor.ts`
- Creates separate nodes for each statement: `filePath::ComponentName_stmt_1`
- Links individual variables back to statement nodes

#### **Step 3: Initial Dependency Resolution** (`resolveDependencies`)

**File**: `core/dependencyResolver.ts`

**Purpose**: Link nodes to their dependencies via AST analysis

**Process**:
1. Collect all variable names in current file (file-level + function-local)
2. For each node (except `template` and `module` types):
   - Traverse `astNode` using `findDependenciesInAST()`
   - Find all `Identifier` nodes
   - Filter by:
     - Is in known variables (`allVarNames`)
     - Not self-reference
     - Not in local scope (function parameters)
   - Add to `dependencies` array
3. Skip local scope variables (function params, local vars)

**Algorithm** (`astUtils.ts::findDependenciesInAST`):
```typescript
function findDependenciesInAST(rootNode, knownIds, selfId) {
  const deps = new Set();

  function visit(node, localScope = new Set()) {
    // Handle function declarations - add params to local scope
    if (isFunctionNode(node)) {
      const functionScope = new Set(localScope);
      node.params.forEach(param => functionScope.add(paramName));
      visit(node.body, functionScope);
      return;
    }

    // Handle variable declarations - add to local scope
    if (isVariableDeclaration(node)) {
      const extendedScope = new Set(localScope);
      node.declarations.forEach(decl => extendedScope.add(varName));
      visit(decl.init, extendedScope);
      return;
    }

    // Collect identifiers
    if (node.type === 'Identifier') {
      if (knownIds.has(name) && !localScope.has(name)) {
        deps.add(name);
      }
    }

    // Recursively visit children
    Object.keys(node).forEach(key => visit(node[key], localScope));
  }

  visit(rootNode);
  return Array.from(deps);
}
```

#### **Step 4: Return Statement Extraction** (`extractReturnStatements`)

**File**: `core/returnStatementExtractor.ts`

**Purpose**: Extract return statements, classify functions, create function-local variable nodes

**Process**:

**4a. Function-Local Variable Extraction** (`extractFunctionLocalVariables`):
1. Traverse function body to find all `VariableDeclaration` nodes
2. Extract variable names (including destructuring)
3. Create VariableNode for each local variable
4. Detailed classification:
   - **`useState`**: Index 0 → `state-ref`, Index 1 → `state-action`
   - **`useReducer`**: Index 0 → `state-ref`, Index 1 → `state-action`
   - **`useRef`**: → `mutable-ref`
   - **`useMemo`/`useCallback`**: → `computed`
   - **Custom hooks**: → `hook`
   - **Immutable check**: `const` + primitive → `immutable-data`
   - **Mutation analysis**: Array mutation, object mutation → `ref`
   - **Default**: `ref`

**4b. Purity Analysis** (`analyzeFunctionPurity`):
1. Traverse function body AST
2. Detect:
   - **State hooks**: `useState`, `useReducer`, `useRef`, `useAtom`
   - **Effect hooks**: `useEffect`, `useLayoutEffect`, `useSyncExternalStore`
   - **Side effects**: `console`, `fetch`, `localStorage`, `document`, `window`
   - **Mutations**: Array mutation methods, assignment expressions
3. Categorize:
   - **`calculation`**: No state, no effects, no mutations
   - **`state-action`**: Uses state hooks
   - **`effect-action`**: Uses effect hooks or has side effects

**4c. Function Reclassification**:
```typescript
if (node.type === 'function' || node.type === 'hook') {
  switch (purityAnalysis.category) {
    case 'calculation':
      node.type = 'pure-function';
      // Keep full code, extract local vars for exclusion
      break;
    case 'state-action':
      node.type = 'state-action';
      break;
    case 'effect-action':
      node.type = 'effect-action';
      break;
  }
}
```

**4d. Return Statement Condensation** (for impure functions):
1. Find return statement using `ast/returnExtractor.ts`
2. Extract code snippet for return statement
3. Extract local references using `ast/localReferenceExtractor.ts`
4. Create condensed format:
   ```typescript
   const condensedSnippet = `${signature}\n  ...\n\n${returnSnippet}\n}`;
   ```
5. Update node with condensed snippet and `localReferences`

**4e. Pure Function Handling**:
- For pure functions (`calculation`):
  - Keep full code (no condensation)
  - Extract local variable names
  - Store in `node.localVariableNames` for exclusion from highlighting
  - Skip return extraction

**Output**:
- Function nodes reclassified to specific types
- Function-local variable nodes created
- Return statements extracted (for impure functions)
- Local references populated

#### **Step 4.5: Secondary Dependency Resolution**

**File**: Same `core/dependencyResolver.ts`

**Purpose**: Resolve dependencies for function-local variables created in Step 4

**Process**:
- Call `resolveDependencies()` again
- Now includes function-local variables in `allVarNames`
- Links function-local variables to their dependencies

#### **Step 5: Vue Template Processing** (`processVueTemplate`)

**File**: `processors/templateProcessor.ts`

**Applies to**: `.vue` files only

**Process**:
1. Parse template AST using `vueTemplateParser.ts`
2. Extract dependencies and token ranges
3. Create `TEMPLATE_ROOT` node:
   ```typescript
   {
     id: "filePath::TEMPLATE_ROOT",
     label: "ComponentName <template>",
     type: "template",
     codeSnippet: fullTemplateWithTags,
     dependencies: ["filePath::var1", "filePath::var2"],
     localReferences: [...],
     templateTokenRanges: [...]
   }
   ```
4. Call `ensureDefaultExport()` to link default export → TEMPLATE_ROOT

**Vue Template Parser** (`vueTemplateParser.ts`):
- Traverses Vue template AST (from `@vue/compiler-sfc`)
- Detects:
  - **Interpolations**: `{{ variableName }}`
  - **Directives**: `v-if`, `v-for`, `v-bind`, `v-on`
  - **Component tags**: `<UserList />` (kebab or pascal case)
  - **v-for scope**: Local variables in loops
  - **Expressions**: Parsed with Babel to extract identifiers
- Creates token ranges for syntax highlighting:
  ```typescript
  {
    startOffset: number,     // Relative to template snippet
    endOffset: number,
    text: string,            // Token text
    tokenIds: string[],      // Node IDs
    type: 'token' | 'string' | 'directive-if' | 'directive-for'
  }
  ```

#### **Step 6: React JSX Processing** (`processReactJSX`)

**File**: `processors/jsxProcessor.ts`

**Applies to**: `.tsx` and `.jsx` files

**Process**:

**6a. JSX Return Statement Extraction**:
1. Find JSX return statement using `findJSXReturn()`
2. Extract JSX snippet (return statement only, not full component)
3. Calculate snippet offsets for token adjustment

**6b. Parse JSX Dependencies** (`tsxParser.ts`):
- Traverse entire file AST
- Extract:
  - **JSX component tags**: `<UserList />` (PascalCase)
  - **JSX expression containers**: `{variable}`, `{expression}`
  - **String literals**: For syntax highlighting
  - **Template literals**: For syntax highlighting
- Create token ranges (relative to extracted snippet)

**6c. Create JSX_ROOT Node**:
```typescript
{
  id: "filePath::JSX_ROOT",
  label: "ComponentName (View)",
  type: "template",
  codeSnippet: jsxReturnSnippet,
  dependencies: [
    ...statementNodeIds,     // Component statements (_stmt_1, _stmt_2)
    ...jsxReferenceIds       // Variables used in JSX
  ],
  templateTokenRanges: [...],
  localReferences: [...]     // Variables in return statement
}
```

**6d. Link Component Nodes to JSX_ROOT**:
- Find PascalCase function/variable nodes (components)
- Add `JSX_ROOT` to their dependencies
- Ensures component → View relationship

**6e. Call `ensureDefaultExport()`**:
- Link default export → JSX_ROOT

#### **Step 7: File Root Processing** (`processFileRoot`)

**File**: `processors/fileRootProcessor.ts`

**Applies to**: Pure `.ts` files (not `.vue` or `.tsx`)

**Process**:
1. Collect all file-level nodes (exclude function-local, module nodes)
2. Create `FILE_ROOT` node:
   ```typescript
   {
     id: "filePath::FILE_ROOT",
     label: "fileName.ts",
     type: "module",
     codeSnippet: "// fileName.ts\n// This file exports N items",
     dependencies: [...allFileNodeIds],
     localReferences: [...exportedItems]
   }
   ```
3. Convert exported nodes to `LocalReference` format for UI
4. Call `ensureDefaultExport()` to link default export → FILE_ROOT

---

## 4. Core Processors

### `declarationProcessor.ts` - Variable Declarations

**Purpose**: Process all top-level declarations and create VariableNodes

**Key Functions**:

**`inferType(initCode: string)`**:
- Heuristic type inference from initialization code
- Checks for keywords: `computed`, `use`, `storeToRefs`, `useRoute`

**`processDeclaration(node, code, lineOffset, filePath, localDefs, fileExports, nodes)`**:
- Main entry point for processing declarations
- Handles:
  - `VariableDeclaration` (const, let, var)
  - `FunctionDeclaration`
  - `ClassDeclaration`
  - `ExportNamedDeclaration`
  - `ExportDefaultDeclaration`
- Extract identifiers from destructuring patterns
- Detect React components (PascalCase + hooks)
- Call `processReactComponentStatements()` for components

**React Component Detection**:
```typescript
const isReactComponent = varName[0] === varName[0].toUpperCase();
const isArrowFunction = decl.init?.type === 'ArrowFunctionExpression';
const usesHooks = hasHooksInFunction(decl.init);

if (isReactComponent && isArrowFunction && usesHooks) {
  processReactComponentStatements(...);
}
```

### `expressionProcessor.ts` - Expressions

**Purpose**: Process top-level expression statements (function calls)

**Use Case**: Vue setup blocks with side effects

**Process**:
1. Check if node is `ExpressionStatement`
2. Check if expression is `CallExpression` or `AwaitExpression`
3. Extract callee name
4. Create node with type `call`

**Example**:
```typescript
// Top-level call in Vue setup
watchEffect(() => { ... })

// Creates node:
{
  id: "filePath::setup_call_123",
  label: "watchEffect()",
  type: "call"
}
```

### `jsxProcessor.ts` - JSX/Template Extraction

**Purpose**: Extract JSX return statement and create JSX_ROOT node

**Key Functions**:

**`findJSXReturn(node)`**:
- Traverse AST to find `ReturnStatement` with JSX
- Handles:
  - `return <div>...</div>`
  - `return ( <div>...</div> )`
  - `return <>...</>`
- Returns JSX element node (for tight bounds)

**`processReactJSX(filePath, ast, scriptContent, nodes)`**:
1. Find JSX return statement
2. Extract JSX snippet (preserve indentation)
3. Parse dependencies using `tsxParser.ts`
4. Filter token ranges to snippet bounds
5. Create JSX_ROOT node
6. Link component nodes to JSX_ROOT
7. Link default export to JSX_ROOT

**Special Handling**:
- Adjusts token offsets to be relative to extracted snippet
- Merges dependencies: statement nodes + JSX references
- Links PascalCase nodes (components) to JSX_ROOT

### `vueProcessor.ts` - Vue Component Processing

**Purpose**: Parse Vue SFC and extract script/template sections

**Uses**: `@vue/compiler-sfc` package

**Process**:
1. Parse SFC using `parseSFC(content)`
2. Extract script content:
   - Prioritize `<script setup>` over `<script>`
   - Get start line number (offset for line numbers)
3. Parse script with Babel (TypeScript + JSX plugins)
4. Extract template content:
   - Include `<template>` tags (not just inner content)
   - Calculate template start offset for token positions
5. Return `VueFileParts` object:
   ```typescript
   {
     scriptContent: string,
     templateContent: string,
     scriptAst: BabelAst,
     templateAst: VueTemplateAst,
     scriptStartLine: number,
     templateStartLine: number,
     scriptContentOffset: number,
     templateContentOffset: number
   }
   ```

### `templateProcessor.ts` - Template Nodes

**Purpose**: Create TEMPLATE_ROOT node for Vue templates

**Process**:
1. Get file variable names from nodes map
2. Parse template using `vueTemplateParser.ts`
3. Extract dependencies and token ranges
4. Create local references from dependencies
5. Create TEMPLATE_ROOT node with:
   - Full template snippet (with `<template>` tags)
   - Dependencies (mapped to full node IDs)
   - Local references (for UI display)
   - Template token ranges (for highlighting)

### `fileRootProcessor.ts` - File-Level Module Nodes

**Purpose**: Create FILE_ROOT node for pure TypeScript files

**Process**:
1. Filter nodes to file-level only (exclude function-local, module types)
2. Create dependencies array (all file-level node IDs)
3. Convert to local references (export signatures)
4. Create FILE_ROOT node:
   - Type: `module`
   - Label: File name
   - Dependencies: All file-level nodes
   - Local references: Exported items

**Use Case**:
- Utility files (no UI component)
- Service files
- Type definition files

### `reactComponentProcessor.ts` - React Components

**Purpose**: Break down React component into statement-level nodes

**Process**:
1. Extract function body statements
2. For each statement:
   - Extract code snippet
   - Determine statement type:
     - `VariableDeclaration` → extract variable names
     - `ExpressionStatement` with `CallExpression` → function call
     - `ReturnStatement` → JSX return
   - Create statement node: `filePath::ComponentName_stmt_N`
   - Create individual variable nodes pointing to statement
3. Add statement labels to local definitions

**Node Creation**:
```typescript
// Statement node
{
  id: "App.tsx::UserList_stmt_1",
  label: "[users, setUsers]",
  type: "hook",
  codeSnippet: "const [users, setUsers] = useState([])",
  dependencies: []  // Filled later
}

// Individual variable nodes
{
  id: "App.tsx::users",
  label: "users",
  type: "hook",
  codeSnippet: "const [users, setUsers] = useState([])",
  dependencies: []
}
```

---

## 5. AST Analysis Utilities

### `returnExtractor.ts` - Return Statement Extraction

**Purpose**: Find return statements in function bodies

**Key Functions**:

**`findReturnInSingleFunction(functionNode, innerSeen)`**:
- Find return statement within a single function
- Handles:
  - Arrow functions with direct return: `() => value`
  - Block statements: Find last `ReturnStatement`
- Returns return argument (expression)
- Cycle protection with `innerSeen` set

**`findMainFunctionReturn(ast, filePath, seen)`**:
- Find return statement of main exported function
- Prioritizes export matching filename
- Collects all exported functions
- Returns return node of best match

**Algorithm**:
```typescript
if (arrowFunction && body.type !== 'BlockStatement') {
  return body;  // Direct return
}

if (body.type === 'BlockStatement') {
  // Find last return statement (backwards search)
  for (let i = body.body.length - 1; i >= 0; i--) {
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      return stmt.argument;
    }
  }
}
```

### `localReferenceExtractor.ts` - Local Variable Tracking

**Purpose**: Extract local variable references from return statements

**Function**: `extractLocalReferences(returnNode, fileVarNames, filePath, nodes)`

**Process**:
1. Traverse return expression AST
2. Find all `Identifier` nodes
3. Filter:
   - Skip keywords (`true`, `false`, `null`, etc.)
   - Must be in `fileVarNames`
   - Skip object keys (non-computed, non-shorthand)
   - Skip property access (non-computed member expressions)
4. Create `LocalReferenceData` for each:
   ```typescript
   {
     name: string,
     nodeId: string,
     summary: string,     // First line of code snippet
     type: VariableNode['type']
   }
   ```
5. Track found names to avoid duplicates

**Special Cases**:
- **Shorthand properties**: `{ layoutNodes }` → `layoutNodes` IS a reference
- **Computed properties**: `obj[key]` → `key` IS a reference
- **Non-computed properties**: `obj.prop` → `prop` is NOT a reference

### `hooksDetector.ts` - React Hooks Detection

**Purpose**: Detect if a function uses React hooks

**Function**: `hasHooksInFunction(functionNode)`

**Process**:
1. Traverse function body AST
2. Check for `CallExpression` nodes
3. Check if callee is `Identifier` starting with `use`
4. Return `true` if any hook found

**Algorithm**:
```typescript
const checkNode = (node) => {
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'Identifier' &&
        node.callee.name.startsWith('use')) {
      return true;
    }
  }
  // Recursively check children
  return someChildHasHook(node);
};
```

**Used By**:
- `declarationProcessor.ts`: Detect React components
- `returnStatementExtractor.ts`: Classify function purity

### `tokenExtractor.ts` - Code Token Extraction

**Purpose**: Extract token ranges for syntax highlighting

**Function**: `extractTokenRangesFromCode(code, localDefs, ast)`

**Process**:
1. Traverse entire AST
2. Find all `Identifier` nodes
3. Filter:
   - Must be in `localDefs`
   - Skip keywords
   - Skip object keys (non-computed)
   - Skip property access (non-computed)
4. Track positions to avoid duplicates
5. Return `TokenRange[]`:
   ```typescript
   {
     startOffset: number,
     endOffset: number,
     text: string,
     tokenIds: string[]
   }
   ```

**Used By**:
- Template/JSX highlighting (indirectly via specialized parsers)

---

## 6. Classification Systems

### `purityChecker.ts` - Pure Function Detection

**Purpose**: Classify functions as Calculations (pure) vs Actions (impure)

**Core Concept**: Based on functional programming principles
- **Calculations**: Same input → same output, no side effects
- **State Actions**: Manage state (useState, useReducer)
- **Effect Actions**: Perform side effects (useEffect, I/O, mutations)

**Interface**:
```typescript
interface PurityAnalysis {
  isPure: boolean;
  category: 'calculation' | 'state-action' | 'effect-action';
  hasStateHooks: boolean;
  hasEffectHooks: boolean;
  hasSideEffects: boolean;
}
```

**Hook Categories**:

**State Hooks** (mutate state):
- `useState`, `useReducer`, `useRef`
- `useAtom`, `useSetAtom` (Jotai)

**Effect Hooks** (side effects):
- `useEffect`, `useLayoutEffect`, `useInsertionEffect`
- `useSyncExternalStore`

**Computation Hooks** (pure):
- `useMemo`, `useCallback`, `useContext`
- `useAtomValue` (Jotai read-only)

**Side Effect Patterns**:
- **I/O**: `console`, `alert`, `confirm`, `prompt`
- **Browser APIs**: `localStorage`, `sessionStorage`, `document`, `window`, `navigator`
- **Network**: `fetch`, `axios`, `XMLHttpRequest`
- **Non-deterministic**: `Math.random`, `Date.now`, `performance.now`
- **DOM**: `getElementById`, `querySelector`, `createElement`, etc.

**Pure Method Whitelist**:
- **Array (non-mutating)**: `includes`, `indexOf`, `find`, `filter`, `map`, `reduce`, `slice`, `concat`, `flat`, etc.
- **String**: `charAt`, `includes`, `slice`, `split`, `toLowerCase`, `toUpperCase`, `trim`, etc.
- **Math**: `Math.abs`, `Math.ceil`, `Math.floor`, `Math.max`, `Math.min`, etc.

**Algorithm**: `analyzeFunctionPurity(functionNode)`

```typescript
function analyzeFunctionPurity(functionNode) {
  let hasStateHooks = false;
  let hasEffectHooks = false;
  let hasSideEffects = false;

  const traverse = (node) => {
    if (node.type === 'CallExpression') {
      const calleeName = getCalleeName(node.callee);

      // Whitelist check first
      if (isPureMethod(calleeName)) {
        // Safe, skip
      } else if (isStateHook(calleeName)) {
        hasStateHooks = true;
      } else if (isEffectHook(calleeName)) {
        hasEffectHooks = true;
      } else if (isCustomHook(calleeName)) {
        hasEffectHooks = true;  // Assume effect by default
      } else if (hasSideEffectPattern(calleeName)) {
        hasSideEffects = true;
      }
    }

    // Check member expressions (console.log, etc.)
    if (node.type === 'MemberExpression') {
      if (!isPureMethod(memberPath) && hasSideEffectPattern(memberPath)) {
        hasSideEffects = true;
      }
    }

    // Check assignments (mutations)
    if (node.type === 'AssignmentExpression' &&
        node.left?.type === 'MemberExpression') {
      hasSideEffects = true;
    }

    // Recursively traverse
    traverse(children);
  };

  traverse(functionNode.body);

  // Categorize
  const isPure = !hasStateHooks && !hasEffectHooks && !hasSideEffects;

  let category;
  if (isPure) {
    category = 'calculation';
  } else if (hasEffectHooks || hasSideEffects) {
    category = 'effect-action';
  } else if (hasStateHooks) {
    category = 'state-action';
  }

  return { isPure, category, ... };
}
```

**Decision Tree**:
```
Function
├─ Has effect hooks OR side effects? → effect-action
├─ Has state hooks? → state-action
└─ Otherwise → calculation (pure-function)
```

### `mutabilityChecker.ts` - Mutation Detection

**Purpose**: Detect mutable operations in code

**Interface**:
```typescript
interface MutabilityAnalysis {
  isMutable: boolean;
  mutationType: 'pure' | 'state-mutation' | 'data-mutation' | 'reassignment' | 'mixed';
  mutations: MutationInfo[];
}

interface MutationInfo {
  type: 'array-mutation' | 'object-mutation' | 'reassignment' | 'state-hook';
  method?: string;
  line?: number;
  column?: number;
}
```

**Mutation Categories**:

**Array Mutations** (mutate original array):
- `push`, `pop`, `shift`, `unshift`
- `splice`, `sort`, `reverse`
- `fill`, `copyWithin`

**Array Immutable Methods** (return new array):
- `map`, `filter`, `reduce`, `slice`, `concat`
- `flat`, `flatMap`
- `toSorted`, `toReversed`, `toSpliced`, `with` (ES2023)

**Algorithm**: `analyzeMutability(astNode)`

```typescript
function analyzeMutability(astNode) {
  const mutations = [];
  let hasStateMutation = false;
  let hasDataMutation = false;
  let hasReassignment = false;

  const traverse = (node) => {
    // 1. Array mutation methods
    if (node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression') {
      const method = node.callee.property?.name;
      if (ARRAY_MUTATION_METHODS.includes(method)) {
        hasDataMutation = true;
        mutations.push({ type: 'array-mutation', method, ... });
      }
    }

    // 2. Object property mutations
    if (node.type === 'AssignmentExpression' &&
        node.left?.type === 'MemberExpression') {
      hasDataMutation = true;
      mutations.push({ type: 'object-mutation', ... });
    }

    // 3. Variable reassignment
    if (node.type === 'AssignmentExpression' &&
        node.left?.type === 'Identifier') {
      hasReassignment = true;
      mutations.push({ type: 'reassignment', ... });
    }

    // 4. Update expressions (++, --)
    if (node.type === 'UpdateExpression') {
      hasReassignment = true;
      mutations.push({ type: 'reassignment', ... });
    }

    // 5. State hooks
    if (node.type === 'CallExpression') {
      if (calleeName === 'useState' || calleeName === 'useReducer') {
        hasStateMutation = true;
        mutations.push({ type: 'state-hook', method: calleeName, ... });
      }
    }

    traverse(children);
  };

  traverse(astNode.body || astNode);

  // Determine mutation type
  let mutationType;
  if (mutations.length === 0) {
    mutationType = 'pure';
  } else if (types.size > 1) {
    mutationType = 'mixed';
  } else if (hasStateMutation) {
    mutationType = 'state-mutation';
  } else if (hasDataMutation) {
    mutationType = 'data-mutation';
  } else if (hasReassignment) {
    mutationType = 'reassignment';
  }

  return { isMutable: mutations.length > 0, mutationType, mutations };
}
```

**Immutability Checking**: `isImmutableDeclaration(declarationNode)`

```typescript
function isImmutableDeclaration(declarationNode) {
  // Must be const
  if (declarationNode.kind !== 'const') return false;

  const init = declarationNode.declarations?.[0]?.init;
  if (!init) return true;  // const without init

  return isImmutableExpression(init);
}

function isImmutableExpression(node) {
  switch (node.type) {
    case 'Literal':
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'TemplateLiteral':
      return true;  // Primitives

    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return true;  // Functions don't change

    case 'UnaryExpression':
      return isImmutableExpression(node.argument);

    case 'BinaryExpression':
    case 'LogicalExpression':
      return isImmutableExpression(node.left) &&
             isImmutableExpression(node.right);

    case 'CallExpression':
      // Check if immutable method (array.map, string.slice)
      if (node.callee?.type === 'MemberExpression') {
        const method = node.callee.property?.name;
        return ARRAY_IMMUTABLE_METHODS.includes(method);
      }
      return false;

    case 'ArrayExpression':
    case 'ObjectExpression':
      return false;  // Mutable by default

    default:
      return false;
  }
}
```

**Used By**:
- `returnStatementExtractor.ts`: Classify local variables as `immutable-data` vs `ref`

---

## 7. Dependency Resolution

### Discovery Mechanism

**Primary Method**: AST Traversal (`findDependenciesInAST`)

**Process**:
1. Traverse AST recursively
2. Track local scope (function parameters, local variables)
3. Collect `Identifier` nodes that:
   - Are in known variables
   - Not in local scope
   - Not self-reference
4. Convert to full node IDs

### Import Statement Scanning

**File**: `core/importScanner.ts`

**Process**:
1. Scan `ImportDeclaration` nodes
2. Resolve import paths:
   - Alias resolution: `@/`, `~/`, `~~/`
   - Relative path resolution
   - Extension inference: `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`
   - Index file fallback: `/index.ts`
3. Create import nodes with dependencies to remote definitions

**Path Resolution** (`pathUtils.ts`):

```typescript
function resolvePath(currentFile, importPath) {
  // Alias ~~/
  if (importPath.startsWith('~~/')) {
    return importPath.replace('~~/', 'src/');
  }

  // Alias ~/
  if (importPath.startsWith('~/')) {
    return importPath.replace('~/', 'src/');
  }

  // Alias @/
  if (importPath.startsWith('@/')) {
    return importPath.replace('@/', 'src/');
  }

  // Relative ./
  if (importPath.startsWith('.')) {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    const parts = currentDir.split('/');
    const importParts = importPath.split('/');

    for (const part of importParts) {
      if (part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }

    return parts.join('/');
  }

  return importPath;  // Absolute or external
}

function findFileInProject(files, resolvedPath) {
  // Try exact match
  if (files[resolvedPath]) return resolvedPath;

  // Try extensions
  const exts = ['.tsx', '.ts', '.jsx', '.js', '.vue'];
  for (const ext of exts) {
    if (files[resolvedPath + ext]) return resolvedPath + ext;
  }

  // Try index files
  const indexExts = ['/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
  for (const ext of indexExts) {
    if (files[resolvedPath + ext]) return resolvedPath + ext;
  }

  return null;
}
```

**Filename Fallback** (`findFileByName`):
- When path resolution fails
- Search all files for matching filename
- Prefer shorter paths (closer to root)

### External vs Local Dependency Distinction

**Local Dependencies** (internal files):
- File exists in project files map
- Create import node with dependency edge
- Dependency format: `["targetFile::exportedName"]`
- Recursively process target file

**External Dependencies** (node_modules):
- File not found in project
- Create import node without dependencies (no edge)
- Skip framework primitives (React/Vue hooks)

**Primitive Filtering** (`constants.ts`):

```typescript
const REACT_PRIMITIVES = [
  'useState', 'useEffect', 'useMemo', 'useCallback',
  'useRef', 'useContext', 'useReducer', 'useLayoutEffect',
  ...
];

const VUE_PRIMITIVES = [
  'ref', 'computed', 'reactive', 'watch', 'watchEffect',
  'onMounted', 'onUnmounted', 'defineProps', 'defineEmits',
  ...
];

function isPrimitive(name) {
  return REACT_PRIMITIVES.has(name) || VUE_PRIMITIVES.has(name);
}
```

**Primitive Handling**:
- **Import scanning**: Skip node creation for primitives
- **Dependency resolution**: Primitives never added as dependencies
- **Purpose**: Avoid cluttering graph with framework APIs

---

## 8. Special Cases

### Template/Component Handling

**Vue Templates** (`.vue` files):

**File Structure**:
```vue
<template>
  <div>{{ variable }}</div>
</template>

<script setup lang="ts">
const variable = ref('hello');
</script>
```

**Processing**:
1. Parse SFC with `@vue/compiler-sfc`
2. Extract script section → process as regular TypeScript
3. Extract template section → create TEMPLATE_ROOT node
4. Parse template AST to find variable references
5. Create token ranges for highlighting
6. Link default export → TEMPLATE_ROOT

**Token Range Calculation**:
- Template AST provides absolute offsets in full file
- Subtract `templateContentOffset` to get relative offsets
- Store relative offsets in `templateTokenRanges`

**React JSX** (`.tsx` files):

**File Structure**:
```tsx
export function UserList() {
  const [users, setUsers] = useState([]);

  return (
    <div>
      {users.map(user => <User key={user.id} />)}
    </div>
  );
}
```

**Processing**:
1. Parse entire file as TypeScript + JSX
2. Detect React component (PascalCase + hooks)
3. Break down component statements
4. Find JSX return statement
5. Extract JSX snippet
6. Create JSX_ROOT node with dependencies
7. Link component node → JSX_ROOT
8. Link default export → JSX_ROOT

**Statement Breakdown**:
```typescript
// Creates statement nodes:
UserList_stmt_1: const [users, setUsers] = useState([])
UserList_stmt_2: return JSX

// Creates variable nodes:
users: state-ref
setUsers: state-action

// Creates JSX_ROOT:
JSX_ROOT: (View)
  dependencies: [users, setUsers, User, UserList_stmt_1, UserList_stmt_2]
```

### Vue Directives

**Supported Directives**:
- `v-if`, `v-else-if`, `v-else`
- `v-for`
- `v-bind` (`:prop`)
- `v-on` (`@event`)
- `v-model`

**Processing** (`vueTemplateParser.ts`):

**v-for Scope Handling**:
```vue
<div v-for="(item, index) in items" :key="item.id">
  {{ item.name }}  <!-- item and index are local scope -->
</div>
```

**Algorithm**:
```typescript
function extractVForVariables(props) {
  const forProp = props.find(prop => prop.name === 'for');
  if (!forProp) return null;

  // Parse: "(item, index) in items"
  const match = forProp.exp.content.match(/^\s*\(?\s*([^)]+?)\s*\)?\s+(?:in|of)\s+/);
  if (!match) return null;

  const newScope = new Set(parentScope);
  const iteratorVars = match[1].split(',').map(v => v.trim());

  // Handle destructuring: "{ id, name }"
  iteratorVars.forEach(varName => {
    if (varName.includes('{') || varName.includes('[')) {
      const simpleVars = varName.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g);
      simpleVars?.forEach(v => newScope.add(v));
    } else {
      newScope.add(varName);
    }
  });

  return newScope;
}
```

**Child Scope**:
- Extract v-for variables
- Create child scope for nested elements
- Exclude loop variables from dependencies

**Directive Highlighting**:
```typescript
// Highlight directive name itself
if (directiveName === 'if' || directiveName === 'for' || ...) {
  tokenRanges.push({
    startOffset: directiveStart,
    endOffset: directiveEnd,
    text: `v-${directiveName}`,
    type: 'directive-if' | 'directive-for' | ...
  });
}

// Highlight expression identifiers
const depsInExpr = checkExpressionWithScope(prop.exp.content, childScope);
depsInExpr.forEach(dep => {
  tokenRanges.push({
    startOffset: relativeStart,
    endOffset: relativeEnd,
    text: dep.name,
    tokenIds: [dep.name],
    type: 'token'
  });
});
```

### React Hooks

**Supported Hooks**:
- **State**: `useState`, `useReducer`, `useRef`
- **Effect**: `useEffect`, `useLayoutEffect`, `useInsertionEffect`
- **Computation**: `useMemo`, `useCallback`
- **Context**: `useContext`
- **Custom**: Any function starting with `use` + uppercase

**useState Classification**:

```typescript
const [count, setCount] = useState(0);
```

**Processing**:
1. Detect array destructuring pattern
2. Index 0 → `state-ref` (count)
3. Index 1 → `state-action` (setCount)

**Code**:
```typescript
if (initCode.includes('useState')) {
  if (decl.id?.type === 'ArrayPattern') {
    const index = decl.id.elements?.findIndex(elem => elem?.name === name);
    if (index === 0) {
      varType = 'state-ref';
    } else if (index === 1) {
      varType = 'state-action';
    }
  }
}
```

**useReducer Classification**:

```typescript
const [state, dispatch] = useReducer(reducer, initialState);
```

**Processing**:
- Same as useState
- Index 0 → `state-ref`
- Index 1 → `state-action`

**useRef Classification**:

```typescript
const divRef = useRef<HTMLDivElement>(null);
```

**Processing**:
- Type: `mutable-ref`
- Rationale: useRef creates mutable reference object

**useMemo/useCallback Classification**:

```typescript
const memoized = useMemo(() => expensive(data), [data]);
const callback = useCallback(() => handler(), []);
```

**Processing**:
- Type: `computed`
- Rationale: Computed/memoized values

**Custom Hooks**:

```typescript
const users = useUsers();
const layout = useCanvasLayout();
```

**Processing**:
- Type: `hook` initially
- May be reclassified based on purity analysis

**Hook Detection** (`hooksDetector.ts`):

```typescript
function hasHooksInFunction(functionNode) {
  const checkNode = (node) => {
    if (node.type === 'CallExpression') {
      if (node.callee.type === 'Identifier' &&
          node.callee.name.startsWith('use')) {
        return true;
      }
    }
    return someChildHasHook(node);
  };

  return checkNode(functionNode.body);
}
```

**Used For**:
- Detect React components (PascalCase + hooks)
- Trigger component statement breakdown
- Classify function purity

### Destructuring Patterns

**Array Destructuring**:

```typescript
const [a, b] = useState(0);
const [first, second, third] = array;
```

**Processing** (`astUtils.ts::extractIdentifiersFromPattern`):
```typescript
if (pattern.type === 'ArrayPattern') {
  pattern.elements.forEach(el => {
    if (el?.type === 'Identifier') {
      ids.push(el.name);
    }
  });
}
```

**Object Destructuring**:

```typescript
const { user, loading } = useUsers();
const { id, name } = props;
```

**Processing**:
```typescript
if (pattern.type === 'ObjectPattern') {
  pattern.properties.forEach(prop => {
    if (prop.type === 'ObjectProperty' &&
        prop.value.type === 'Identifier') {
      ids.push(prop.value.name);
    }
  });
}
```

**Nested Destructuring**:

```typescript
const { user: { id, name } } = data;
const [{ x, y }, setPoint] = useState({ x: 0, y: 0 });
```

**Processing**:
- Currently flattens to simple identifiers
- Nested patterns extracted recursively

### Local vs External References

**Local References** (within file):

**Definition**:
- Variables defined in same file
- Can be file-level or function-local

**Detection**:
- Check if identifier is in `fileVarNames` or `allVarNames`
- Node ID format: `filePath::variableName`

**Dependency**:
- Added to `dependencies` array
- Creates edge in graph

**External References** (imported):

**Definition**:
- Variables imported from other files
- Node_modules dependencies

**Detection**:
- Import nodes created in Step 1
- Dependency format: `["targetFile::exportedName"]`

**Cross-File Linking**:
```typescript
// File A: src/UserList.tsx
export function UserList() { ... }

// File B: src/App.tsx
import { UserList } from './UserList';

// Creates import node:
{
  id: "src/App.tsx::UserList",
  type: "module",
  dependencies: ["src/UserList.tsx::UserList"]
}
```

**Local Scope Exclusion**:

**Function Parameters**:
```typescript
function add(a, b) {
  return a + b;  // a and b are local scope
}
```

**Processing**:
- Track function params in `localScope` set
- Exclude from dependency collection
- Not added to dependencies array

**Function-Local Variables**:
```typescript
function process() {
  const temp = compute();
  return transform(temp);  // temp is local
}
```

**Processing**:
- Create VariableNode for `temp`
- Track in function's local scope
- Exclude from parent node's dependencies
- Include in return statement's `localReferences`

**Algorithm** (`astUtils.ts::findDependenciesInAST`):

```typescript
function visit(node, localScope = new Set()) {
  // Function - extend local scope with params
  if (isFunctionNode(node)) {
    const functionScope = new Set(localScope);
    node.params.forEach(param => functionScope.add(paramName));
    visit(node.body, functionScope);
    return;
  }

  // Variable declaration - extend local scope
  if (isVariableDeclaration(node)) {
    const extendedScope = new Set(localScope);
    node.declarations.forEach(decl => extendedScope.add(varName));
    visit(decl.init, extendedScope);
    return;
  }

  // Identifier - check if dependency
  if (node.type === 'Identifier') {
    if (knownIds.has(name) &&
        fullId !== selfId &&
        !localScope.has(name)) {  // <-- Key check
      deps.add(name);
    }
  }

  visit(children, localScope);
}
```

---

## Summary

### Key Insights

**1. Multi-Pass Architecture**:
- Initial pass creates nodes
- Secondary pass resolves dependencies
- Tertiary pass classifies and condenses
- Clean separation of concerns

**2. AST-Driven Analysis**:
- Babel parser for JavaScript/TypeScript/JSX
- Vue compiler for templates
- Deep traversal with cycle protection
- Scope tracking for accurate dependency resolution

**3. Classification Sophistication**:
- Purity analysis (calculations vs actions)
- Mutability detection (immutable vs mutable)
- State vs effect distinction
- Framework-aware (React hooks, Vue composition)

**4. Token-Level Precision**:
- Absolute offsets from AST
- Relative offsets for snippets
- Syntax highlighting support
- Local scope exclusion for pure functions

**5. Framework Agnostic Core**:
- Generic AST utilities
- Framework-specific processors
- Extensible architecture
- Primitive filtering for framework APIs

### Data Flow

```
Files → parseProject()
  ↓
  → processFile()
      ↓
      1. scanImports() → Import nodes, recurse
      2. processDeclaration() → Variable/function nodes
      3. resolveDependencies() → Link dependencies
      4. extractReturnStatements() → Classify, condense
      4.5. resolveDependencies() → Link function-local vars
      5. processVueTemplate() → TEMPLATE_ROOT (Vue)
      6. processReactJSX() → JSX_ROOT (React)
      7. processFileRoot() → FILE_ROOT (pure TS)
  ↓
GraphData (VariableNode[])
```

### Node Type Distribution

**Pure/Immutable** (Calculations):
- `pure-function`: Pure functions with no side effects
- `immutable-data`: Constants with immutable values
- `computed`: Memoized/computed values

**State Management** (State Actions):
- `state-ref`: State value references
- `state-action`: State setters/dispatch
- `mutable-ref`: Mutable references (useRef)
- `ref`: Generic mutable references (legacy)

**Side Effects** (Effect Actions):
- `effect-action`: Functions with side effects
- `hook`: Custom hooks (complex logic)

**Structural**:
- `template`: Templates/JSX (UI)
- `module`: Imports/exports
- `call`: Top-level calls
- `function`: Generic functions (legacy)

This comprehensive architecture enables deep code analysis, accurate dependency tracking, and sophisticated visualization of code structure and data flow.
