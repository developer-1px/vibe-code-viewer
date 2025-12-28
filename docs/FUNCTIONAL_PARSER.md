# Functional Thinking Parser

## Overview

The **Functional Thinking Parser** is a specialized TypeScript code analyzer designed to identify and visualize **external dependencies** in functions, promoting functional programming principles and helping developers understand data flow in their code.

### Purpose

Unlike the existing parser which focuses on React/Vue components and their relationships, this parser is designed for:

- **Functional Programming Analysis** - Identifying pure functions vs impure functions
- **Dependency Visualization** - Highlighting external dependencies (imports and closures)
- **Scope Awareness** - Distinguishing local variables from external dependencies
- **Non-Component Code** - Analyzing TypeScript utility functions, business logic, etc.

### Key Difference from Existing Parser

| Feature | Existing Parser | Functional Parser |
|---------|----------------|-------------------|
| **Target Code** | React/Vue components | TypeScript functions (any code) |
| **Focus** | Component structure, JSX/template | Function purity, external deps |
| **Traversal** | Mixed BFS/DFS | Pure DFS |
| **Highlighting** | All dependencies + primitives | Only external dependencies |
| **Output** | VariableNode graph | FunctionAnalysis + token ranges |

---

## Architecture

### Directory Structure

```
src/services/functionalParser/
├── index.ts                    # Main entry point
├── types.ts                    # Type definitions
├── core/
│   ├── dfsTraverser.ts        # DFS traversal with scope tracking
│   └── functionAnalyzer.ts    # Function analysis and dependency extraction
├── utils/
│   ├── scopeTracker.ts        # Scope chain management
│   ├── importResolver.ts      # Import statement extraction
│   └── closureDetector.ts     # Closure variable detection
└── examples/
    └── testFunctionalParser.ts # Example usage
```

### Core Concepts

#### 1. Scope Tracking

The parser maintains a **scope chain** during AST traversal to distinguish:

- **Local variables** - Declared within current function
- **Parameters** - Function parameters
- **Closure variables** - Variables from parent scopes
- **Imports** - Imported from other modules

```typescript
// Scope hierarchy example
File Scope
  ├─ import { foo } from './foo'  // Import
  ├─ const globalVar = 10         // File-level variable
  └─ Function Scope: myFunction
      ├─ param1, param2           // Parameters
      ├─ const localVar = 5       // Local variable
      └─ Nested Function Scope
          └─ uses globalVar       // Closure (from file scope)
          └─ uses localVar        // Closure (from parent function)
```

#### 2. External Dependencies

**External dependencies** are identifiers used in a function that are NOT:
- Local variables declared in the function
- Function parameters
- Nested function declarations

External dependencies come in two types:

##### Import Dependencies

Variables/functions imported from other modules:

```typescript
import { fetchData } from './api';

const loadUser = async (id: string) => {
  return await fetchData(id); // 'fetchData' is an import dependency
};
```

##### Closure Dependencies

Variables from parent scopes:

```typescript
const multiplier = 2;

const multiply = (value: number) => {
  return value * multiplier; // 'multiplier' is a closure dependency
};
```

#### 3. DFS Traversal

The parser uses **depth-first search** to visit functions in order:

```typescript
// Traversal order
1. File scope (imports, top-level variables)
2. Function A
   3. Nested Function A1
      4. Nested Function A1a
   5. Nested Function A2
6. Function B
   7. Nested Function B1
```

This ensures that when analyzing a function, all parent scopes are already tracked.

---

## API Reference

### Main Functions

#### `parseFunctionalThinking(filePath: string, content: string): FileAnalysis`

Parse a TypeScript file and analyze it for functional thinking patterns.

**Returns:** `FileAnalysis` containing:
- `imports`: All import statements
- `variables`: All variable declarations
- `functions`: All function declarations with analysis
- `rootScope`: File-level scope

**Example:**

```typescript
import { parseFunctionalThinking } from './services/functionalParser';

const code = `
import { add } from './math';

const multiplier = 2;

const calculate = (x: number) => {
  const local = 10;
  return add(x, local) * multiplier;
};
`;

const analysis = parseFunctionalThinking('example.ts', code);
console.log(analysis.functions[0].externalDeps);
// [
//   { name: 'add', type: 'import', source: './math', usages: [...] },
//   { name: 'multiplier', type: 'closure', closureScope: 'scope_0', usages: [...] }
// ]
```

#### `getExternalDependencyTokens(analysis: FunctionAnalysis): TokenRange[]`

Get all token ranges for external dependencies (for syntax highlighting).

**Returns:** Array of `{ name, start, end, line, type }` objects.

**Example:**

```typescript
const tokens = getExternalDependencyTokens(analysis.functions[0]);
// [
//   { name: 'add', start: 120, end: 123, line: 8, type: 'import' },
//   { name: 'multiplier', start: 135, end: 145, line: 8, type: 'closure' }
// ]
```

#### `printAnalysis(analysis: FileAnalysis): void`

Pretty print the entire analysis to console (useful for debugging).

---

## Type Definitions

### `FunctionAnalysis`

```typescript
interface FunctionAnalysis {
  name: string;                  // Function name
  id: string;                    // Unique ID (filePath::name)
  filePath: string;              // File path
  startLine: number;             // Start line number
  endLine: number;               // End line number
  codeSnippet: string;           // Full function code
  scope: Scope;                  // Function's own scope
  externalDeps: ExternalDependency[];  // External dependencies
  localVariables: Set<string>;   // Local variables (excluded)
  parameters: Set<string>;       // Parameters (excluded)
  isAsync: boolean;              // Is async function
  isPure: boolean;               // Is pure function (no side effects)
}
```

### `ExternalDependency`

```typescript
interface ExternalDependency {
  name: string;                  // Identifier name
  type: 'import' | 'closure';    // Dependency type
  source?: string;               // Import source (if import)
  closureScope?: string;         // Scope ID (if closure)
  usages: TokenUsage[];          // All usages in function
}
```

### `TokenUsage`

```typescript
interface TokenUsage {
  name: string;                  // Token text
  start: number;                 // Start offset
  end: number;                   // End offset
  line: number;                  // Line number
  column: number;                // Column number
  context: UsageContext;         // How it's used
}

type UsageContext = 'call' | 'reference' | 'member' | 'type';
```

---

## Usage Examples

### Example 1: Analyze Pure Functions

```typescript
import { parseFunctionalThinking } from './services/functionalParser';

const code = `
const add = (a: number, b: number) => a + b;

const multiply = (a: number, b: number) => a * b;

const calculate = (x: number, y: number) => {
  const sum = add(x, y);
  const product = multiply(x, y);
  return sum + product;
};
`;

const analysis = parseFunctionalThinking('math.ts', code);

// Check purity
analysis.functions.forEach(func => {
  console.log(`${func.name}: ${func.isPure ? 'Pure ✅' : 'Impure ❌'}`);
});

// Output:
// add: Pure ✅
// multiply: Pure ✅
// calculate: Pure ✅
```

### Example 2: Identify Closure Dependencies

```typescript
const code = `
const createCounter = () => {
  let count = 0;  // Outer scope variable

  return () => {
    count++;      // Closure dependency on 'count'
    return count;
  };
};
`;

const analysis = parseFunctionalThinking('counter.ts', code);
const innerFunc = analysis.functions[1]; // The returned arrow function

console.log(innerFunc.externalDeps);
// [{ name: 'count', type: 'closure', closureScope: 'scope_1', usages: [...] }]
```

### Example 3: Highlight External Dependencies in UI

```typescript
import { parseFunctionalThinking, getExternalDependencyTokens } from './services/functionalParser';

const code = `...`; // Your TypeScript code
const analysis = parseFunctionalThinking('app.ts', code);

// For each function, get tokens to highlight
analysis.functions.forEach(func => {
  const tokens = getExternalDependencyTokens(func);

  tokens.forEach(token => {
    // Highlight token in code editor
    if (token.type === 'import') {
      highlightAsImport(token.start, token.end);
    } else if (token.type === 'closure') {
      highlightAsClosure(token.start, token.end);
    }
  });
});
```

---

## How It Works

### 1. Parse TypeScript to AST

Uses Babel parser with TypeScript plugin:

```typescript
const ast = parse(content, {
  sourceType: 'module',
  plugins: ['typescript', 'jsx'],
  attachComments: true,
});
```

### 2. Extract Imports

Scan AST for `ImportDeclaration` nodes and index all imported identifiers:

```typescript
import { foo } from './foo';      // Import: foo
import { bar as baz } from './bar'; // Import: baz
import * as utils from './utils'; // Import: utils
```

### 3. DFS Traversal with Scope Tracking

Visit AST nodes depth-first, creating scopes as we go:

```
Enter file scope
  Extract imports
  Visit variable declarations → add to file scope
  Visit function declaration
    Enter function scope
      Extract parameters → add to function scope
      Visit function body
        Visit nested function
          Enter nested function scope
            ...
          Exit nested function scope
    Exit function scope
```

### 4. Analyze Each Function

For each function:

1. **Extract local variables** - Find all `VariableDeclaration` nodes in function body
2. **Extract parameters** - From function params
3. **Find external dependencies** - Visit all `Identifier` nodes, check:
   - Is it a local variable? → Skip
   - Is it a parameter? → Skip
   - Is it an import? → Mark as import dependency
   - Is it from parent scope? → Mark as closure dependency
4. **Record token positions** - Store start/end offsets for highlighting

### 5. Output Analysis

Return structured data with:
- All imports
- All variables
- All functions with their external dependencies and token positions

---

## Comparison with Existing Parser

### Existing Parser (`src/services/parser/`)

**Focus:** React/Vue component analysis

```typescript
// Existing parser output
{
  id: "Component::MyComponent",
  type: "template",
  dependencies: ["useState", "useEffect", "OtherComponent"],
  // Highlights: ALL dependencies + React primitives
}
```

**What it highlights:**
- All imported components
- React/Vue primitives (useState, computed, etc.)
- Props
- Local variables used in JSX/template

### Functional Parser (`src/services/functionalParser/`)

**Focus:** Functional programming analysis

```typescript
// Functional parser output
{
  name: "myFunction",
  isPure: true,
  externalDeps: [
    { name: "importedFunc", type: "import" },
    { name: "closureVar", type: "closure" }
  ],
  localVariables: ["localA", "localB"], // NOT highlighted
  // Highlights: ONLY external dependencies
}
```

**What it highlights:**
- Imports used in function body
- Closure variables from parent scopes
- **NOT** local variables or parameters

---

## Future Enhancements

### Planned Features

1. **Export Detection** - Track which functions are exported
2. **Call Graph** - Build function call graph
3. **Dependency Graph** - Visualize function dependencies
4. **Mutation Analysis** - Integrate mutability checker
5. **Side Effect Detection** - Enhanced side effect analysis
6. **Type Inference** - Track TypeScript types through functions
7. **React Hook Rules** - Validate React hook usage

### Potential Visualizations

1. **Function Dependency Tree**
   ```
   myFunction
   ├─ import: fetchData (from ./api)
   ├─ closure: multiplier
   └─ calls: helperFunction
       ├─ import: lodash.map
       └─ closure: config
   ```

2. **Purity Heat Map**
   - Green: Pure functions (no external deps)
   - Yellow: Depends only on imports
   - Orange: Has closure dependencies
   - Red: Has side effects

3. **Scope Chain Visualization**
   - Show nested scopes and variable shadowing
   - Highlight closure relationships

---

## Testing

### Run Test Example

```bash
cd src/services/functionalParser/examples
ts-node testFunctionalParser.ts
```

### Expected Output

```
🔍 Parsing file for functional thinking: example.ts
📦 Found 2 imports

⚡ Function: add
   Lines: 6-8
   Pure: ✅
   External Dependencies: 0

⚡ Function: calculateTotal
   Lines: 11-15
   Pure: ✅
   External Dependencies: 0

⚡ Function: createMultiplier
   Lines: 18-22
   Pure: ✅
   External Dependencies: 0

⚡ Function: arrow
   Lines: 19-21
   Pure: ✅
   External Dependencies: 1 (0 imports, 1 closures)
   Dependencies: factor

...
```

---

## Integration Guide

### Step 1: Import the Parser

```typescript
import { parseFunctionalThinking, getExternalDependencyTokens } from '@/services/functionalParser';
```

### Step 2: Parse Your Code

```typescript
const analysis = parseFunctionalThinking(filePath, codeContent);
```

### Step 3: Extract Token Ranges

```typescript
analysis.functions.forEach(func => {
  const tokens = getExternalDependencyTokens(func);
  // Use tokens for syntax highlighting
});
```

### Step 4: Visualize (Optional)

```typescript
// Convert to existing VariableNode format if needed
const nodes = analysis.functions.map(func => ({
  id: func.id,
  label: func.name,
  type: func.isPure ? 'pure-function' : 'function',
  dependencies: func.externalDeps.map(dep => dep.name),
  // ... other fields
}));
```

---

## FAQ

### Q: What's the difference between this and the existing parser?

**A:** The existing parser is designed for React/Vue components and highlights all dependencies including local variables. The functional parser focuses on pure TypeScript functions and only highlights external dependencies (imports and closures), making it easier to identify data flow and function purity.

### Q: Can it analyze React components?

**A:** Yes, but it's not optimized for it. For React components, use the existing parser. The functional parser is best for utility functions, business logic, and non-component code.

### Q: What about global variables?

**A:** Currently, global variables (like `console`, `Math`, etc.) are excluded from highlighting. This can be configured in future versions.

### Q: How does it handle destructuring?

**A:** The parser fully supports destructuring in variable declarations, function parameters, and import statements.

### Q: Can it detect mutations?

**A:** Basic mutation detection is included in purity analysis. For detailed mutation tracking, use the `mutabilityChecker` utility from the existing parser.

---

## Related Documentation

- [PARSER_ARCHITECTURE.md](./PARSER_ARCHITECTURE.md) - Existing parser documentation
- [../../services/parser/utils/purityChecker.ts](../../services/parser/utils/purityChecker.ts) - Purity analysis
- [../../services/parser/utils/mutabilityChecker.ts](../../services/parser/utils/mutabilityChecker.ts) - Mutation detection

---

## Contributing

To extend the functional parser:

1. Add new utilities in `utils/`
2. Extend `FunctionAnalysis` type in `types.ts`
3. Update `functionAnalyzer.ts` to extract new information
4. Add tests in `examples/`

---

**Version:** 1.0.0
**Last Updated:** 2025-01-28
