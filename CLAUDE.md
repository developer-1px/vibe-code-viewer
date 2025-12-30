# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULES - CODE ANALYSIS

**DO NOT use regular expressions for code parsing or analysis.**

When analyzing JavaScript/TypeScript/Vue/React code:
- ✅ **ALWAYS use TypeScript Compiler API** (`typescript` package) for all code parsing
- ✅ **ALWAYS use `@vue/compiler-sfc`** AST for Vue templates
- ✅ **ALWAYS use AST-based position information** for token highlighting
- ❌ **NEVER use regex patterns** like `/\w+/g`, `match()`, `split()` for code analysis
- ❌ **NEVER use string manipulation** to extract identifiers from code

**Regex is only acceptable for:**
- Path normalization (e.g., `replace(/\\/g, '/')`)
- Simple string cleanup (not code analysis)

**If you find yourself writing regex for code analysis, STOP and use the proper parser instead.**

---

## Project Overview

**Vibe Code Viewer** - A developer tool that visualizes file dependencies and code structure in Vue.js and React projects. The tool parses Vue SFC (Single File Components), React TSX files, and TypeScript files to create an interactive dependency graph using custom tree-based layout (not D3 force simulation).

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Framework Support

The application supports **both Vue 3 and React 19** projects:
- **All code parsing**: TypeScript Compiler API (`typescript` package)
- **Vue templates**: `@vue/compiler-sfc` for template section extraction
- **Script extraction**: Vue files have their `<script>` content extracted before parsing

### State Management - Jotai Atoms

The application uses **Jotai** for global state management. See `CONVENTIONS.md` for full details on the "no props drilling" pattern.

**Key Atoms** (`src/store/atoms.ts`):
- `filesAtom` - Virtual file system (Record<string, string>)
- `entryFileAtom` - Entry point for parsing
- `graphDataAtom` - Parsed dependency graph (SourceFileNode[])
- `layoutNodesAtom` - Computed layout positions (CanvasNode[])
- `visibleNodeIdsAtom` - Set of nodes to display
- `transformAtom` - Canvas zoom/pan state
- `foldedLinesAtom` - Code folding state per node
- `searchModalOpenAtom` - Unified search modal (Shift+Shift)

**Architecture Pattern**: Feature components access atoms directly instead of receiving handlers via props. Data props are allowed, handler props are forbidden. See `CONVENTIONS.md` for the complete ruleset.

### File-Based Parser (`services/tsParser/`)

The parser creates **one SourceFileNode per file** with TypeScript Compiler API:

**Main Entry**: `services/tsParser/index.ts` → `parseProject()`

**Processing Steps**:
1. **File Processing** - Each file becomes one node with `id = filePath`
2. **Vue Extraction** - Extract `<script>` section from `.vue` files
3. **TypeScript Parsing** - Create `ts.SourceFile` via `ts.createSourceFile()`
4. **Import Resolution** - Extract imports, recursively process imported files
5. **Dependency Caching** - Store computed dependencies in `SourceFileNode.dependencies`

**Key Utilities**:
- `utils/languageService.ts` - Creates TypeScript Language Service for identifier resolution
- `utils/vueExtractor.ts` - Extracts script/template from Vue SFC
- `utils/pathResolver.ts` - Resolves relative/alias imports
- `entities/SourceFileNode/lib/getters.ts` - `getDependencies()` extracts import paths from AST

**Important**: The parser stores `ts.SourceFile` in each node. All analysis (token positions, identifiers, etc.) is done via getters that traverse the AST, not by duplicating data structures.

### Data Flow

```
User uploads files → filesAtom updated → useGraphDataInit() → parseProject()
  → SourceFileNode[] created → useCanvasLayout() computes positions
  → layoutNodesAtom (CanvasNode[]) → PipelineCanvas renders
```

### Key Data Structures

**SourceFileNode** (`entities/SourceFileNode/model/types.ts`):
```typescript
interface SourceFileNode {
  id: string;              // filePath
  label: string;           // filename without extension
  filePath: string;        // full file path
  type: 'module';          // always 'module'
  codeSnippet: string;     // full file content
  startLine: number;       // always 1
  sourceFile: ts.SourceFile;  // TypeScript AST
  dependencies?: string[]; // cached import paths
  vueTemplate?: string;    // Vue template section
}
```

**CanvasNode** (`entities/CanvasNode/model/types.ts`):
- Extends SourceFileNode with layout properties: `x`, `y`, `level`, `visualId`, `isVisible`
- Created by `useCanvasLayout()` custom tree algorithm

### Component Architecture (Feature-Sliced Design)

The codebase follows **Feature-Sliced Design (FSD)** - see `CONVENTIONS.md` for detailed layer rules.

**Key Layers**:
- `entities/` - Domain models (SourceFileNode, CanvasNode, CodeSegment)
- `features/` - Business features (CodeFold, FocusMode, UnifiedSearch, File actions)
- `widgets/` - Complex UI (Sidebar, PipelineCanvas, CodeCard)
- `services/` - External services (tsParser, codeParser, searchService)
- `store/` - Global Jotai atoms

**Important Conventions** (from `CONVENTIONS.md`):
1. **No barrel exports** - Direct imports only, no `index.ts` re-exports
2. **No props drilling** - Data via props, handlers via atoms
3. **Inline props types** - No separate interfaces for component props
4. **AST parsing only** - Never use regex for code analysis

### Virtual File System

The app operates on an in-memory file system stored in `filesAtom`:
- `DEFAULT_FILES` (loaded from `app/libs/loadExamples.ts`)
- `DEFAULT_ENTRY_FILE`: Entry point for parsing
- Users can upload local folders via `UploadFolderButton`
### Custom Layout Algorithm

**NOT using D3 force simulation** - Uses custom tree-based layout algorithm in `widgets/PipelineCanvas/useCanvasLayout.ts`:

**Algorithm Steps**:
1. **Build Visual Tree** (lines 111-203): Creates hierarchical tree from dependency graph
   - Skips nodes with empty code snippets (virtual intermediate nodes)
   - Sorts dependencies by weighted category (imports → local logic → functions → components)
2. **Compute Heights** (lines 209-222): Calculate subtree heights for balanced layout
3. **Assign Coordinates** (lines 230-253): Position nodes in LTR (left-to-right) tree layout
   - X: Negative values, level-based (`-(level * LEVEL_SPACING)`)
   - Y: Centered based on subtree height
4. **Handle Orphans**: Visible nodes not in tree are placed to the right

**Node Sorting** (lines 97-108): Weighted category ordering
```typescript
case 'ref': return 1;
case 'computed': return 2;
case 'store': return 3;
case 'hook': return 4;
case 'call': return 5;
case 'function': return 10;
case 'template': return 30; // Always at bottom
```

### Code Rendering System

The app displays code with **interactive tokens** (clickable identifiers):

**Token Extraction** (`entities/SourceFileNode/lib/tokenUtils.ts`):
- Uses TypeScript Scanner API to extract all tokens from `ts.SourceFile`
- Returns position-based tokens (line, column, text, syntaxKind)

**Segment Building** (`entities/CodeRenderer/lib/segmentUtils.ts`):
- Converts tokens into `CodeSegment[]` with semantic types
- Types: `dependency` (imported identifiers), `local` (local variables), `static` (keywords/literals)

**Interactive Features**:
- Click dependency token → expand that file's code card
- Click local token → highlight all usages in Focus Mode
- Fold/unfold code blocks via `CodeFold` feature

### Key Keyboard Shortcuts

- `Cmd/Ctrl + \` - Toggle sidebar
- `Shift + Shift` (double-tap) - Open unified search modal
- File Explorer: Arrow keys + Enter for navigation

## Project Structure

```
src/
├── App.tsx                       # Main container
├── main.tsx                      # React entry point
├── store/atoms.ts                # Jotai global state
├── constants.ts                  # Default files
├── app/libs/loadExamples.ts      # Example file loader
├── services/
│   ├── codeParser.ts             # Public API
│   └── tsParser/                 # TypeScript parser
│       ├── index.ts              # parseProject()
│       └── utils/                # Path resolver, Vue extractor, LanguageService
├── entities/
│   ├── SourceFileNode/           # File node model
│   │   ├── model/types.ts        # SourceFileNode interface
│   │   └── lib/                  # getters, tokenUtils, lineUtils
│   ├── CanvasNode/               # Layout node model
│   ├── CodeSegment/              # Code token model
│   └── CodeRenderer/             # Rendering utilities
├── features/
│   ├── CodeFold/                 # Code folding logic
│   ├── FocusMode/                # Local variable highlighting
│   ├── UnifiedSearch/            # Shift+Shift search
│   └── File/                     # File/symbol navigation
├── widgets/
│   ├── Sidebar/                  # File explorer + code view
│   │   ├── Sidebar.tsx
│   │   ├── FileExplorer.tsx
│   │   └── FolderView.tsx
│   ├── PipelineCanvas/           # Canvas rendering
│   │   ├── PipelineCanvas.tsx
│   │   ├── useCanvasLayout.ts    # Custom tree layout
│   │   ├── useD3Zoom.ts          # Pan/zoom
│   │   ├── CanvasCodeCard.tsx
│   │   └── CanvasConnections.tsx
│   ├── CodeCard/                 # Code card UI
│   │   ├── CodeCard.tsx
│   │   └── ui/                   # Line, segment, token renderers
│   └── MainContent/Header.tsx
└── hooks/useGraphData.ts         # Parse trigger
```

## Important Technical Notes

- **TypeScript AST as source of truth**: All code analysis uses `ts.SourceFile`, never regex
- **Getter-based architecture**: Data is extracted on-demand from AST, not duplicated
- **Feature-Sliced Design**: Strict layer separation (entities → features → widgets)
- **No barrel exports**: Always import from exact file paths
- **Inline component props**: No separate prop interfaces
- **Atom-based handlers**: Feature components access atoms directly, not via props

## Reference Documentation

- `CONVENTIONS.md` - Complete coding conventions (FSD, no barrel exports, AST-only parsing)
- `README.md` - Project setup and AI Studio integration
- TypeScript Compiler API docs for AST traversal patterns
