import { useState, useEffect, useRef } from 'react'
import {
  ChevronDown,
  ChevronRight,
  X,
  FileCode,
  Type as TypeIcon,
  Box,
  Circle,
  Square,
  Variable,
  Braces,
  Download,
  Dot,
  Lock,
  Zap,
  ArrowUpRight,
  Hash,
  GripVertical,
  FunctionSquare
} from 'lucide-react'

// Symbol Types
type SymbolKind =
  | 'import'
  | 'type'
  | 'interface'
  | 'enum'
  | 'const'
  | 'let'
  | 'function'
  | 'class'
  | 'method'
  | 'property'

interface SymbolModifier {
  export?: boolean
  async?: boolean
  static?: boolean
  readonly?: boolean
  private?: boolean
  public?: boolean
}

interface SymbolParam {
  name: string
  type: string
  defaultValue?: string
  optional?: boolean
}

interface OutlineSymbol {
  kind: SymbolKind
  name: string
  line: number
  modifiers?: SymbolModifier
  type?: string // For variables, properties, return types
  params?: SymbolParam[]
  jsDoc?: string
  children?: OutlineSymbol[]
  value?: string // For enums, constants
  from?: string // For imports
}

export interface OutlinePanelProps {
  /** Whether the panel is initially open */
  defaultOpen?: boolean
  /** Callback when a symbol is clicked */
  onSymbolClick?: (line: number) => void
  /** Outline symbols to display (optional, uses mock data if not provided) */
  symbols?: OutlineSymbol[]
}

// Get icon for symbol kind with diverse colors - wrapped in fixed width container
function getSymbolIcon(kind: SymbolKind, modifiers?: SymbolModifier) {
  const iconProps = { size: 13 }

  let icon
  switch (kind) {
    case 'import':
      icon = <Download {...iconProps} className="text-purple-400" />
      break
    case 'type':
      icon = <TypeIcon {...iconProps} className="text-blue-400" />
      break
    case 'interface':
      icon = <Braces {...iconProps} className="text-cyan-400" />
      break
    case 'enum':
      icon = <Box {...iconProps} className="text-orange-400" />
      break
    case 'const':
      icon = <Square {...iconProps} className="text-yellow-400" size={9} />
      break
    case 'let':
      icon = <Square {...iconProps} className="text-yellow-400/70" size={9} />
      break
    case 'function':
      icon = <FunctionSquare {...iconProps} className="text-pink-400" size={14} />
      break
    case 'class':
      icon = <Square {...iconProps} className="text-status-success" fill="currentColor" />
      break
    case 'method':
      icon = <Circle {...iconProps} className="text-warm-300" fill="currentColor" size={8} />
      break
    case 'property':
      icon = modifiers?.private ? (
        <Lock {...iconProps} className="text-red-400/60" size={10} />
      ) : (
        <Circle {...iconProps} className="text-text-tertiary/60" size={6} fill="currentColor" />
      )
      break
    default:
      icon = <FileCode {...iconProps} className="text-text-muted" />
  }

  return <div className="w-4 flex items-center justify-center flex-shrink-0">{icon}</div>
}

// Get color for symbol name to match icon
function getSymbolColor(kind: SymbolKind): string {
  switch (kind) {
    case 'import':
      return 'text-purple-400'
    case 'type':
      return 'text-blue-400'
    case 'interface':
      return 'text-cyan-400'
    case 'enum':
      return 'text-orange-400'
    case 'const':
    case 'let':
      return 'text-yellow-400'
    case 'function':
      return 'text-pink-400'
    case 'class':
      return 'text-status-success'
    case 'method':
      return 'text-warm-300'
    case 'property':
      return 'text-text-secondary'
    default:
      return 'text-text-primary'
  }
}

// Render modifier icons - positioned after name
function renderModifierIcons(modifiers?: SymbolModifier) {
  if (!modifiers) return null

  const hasAnyModifier =
    modifiers.export || modifiers.async || modifiers.static ||
    modifiers.readonly || modifiers.private

  if (!hasAnyModifier) return null

  return (
    <div className="flex gap-0.5 ml-0.5">
      {modifiers.export && (
        <ArrowUpRight size={10} className="text-status-success/80" title="export" />
      )}
      {modifiers.async && (
        <Zap size={10} className="text-yellow-400/80" title="async" />
      )}
      {modifiers.static && (
        <Hash size={10} className="text-cyan-400/80" title="static" />
      )}
      {modifiers.readonly && (
        <Lock size={9} className="text-orange-400/80" title="readonly" />
      )}
      {modifiers.private && (
        <Lock size={9} className="text-red-400/80" title="private" />
      )}
    </div>
  )
}

/**
 * OutlinePanel - Code structure outline view with diverse symbol types
 *
 * Displays:
 * - Imports
 * - Type aliases
 * - Interfaces
 * - Enums
 * - Constants and variables
 * - Functions
 * - Classes with methods and properties
 */
export function OutlinePanel({ defaultOpen = true, onSymbolClick, symbols }: OutlinePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(
    new Set(['UserService', 'UserRole', 'ApiConfig'])
  )
  const [width, setWidth] = useState(320) // Default w-80 = 320px
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  const MIN_WIDTH = 200
  const MAX_WIDTH = 500

  // Handle resize
  useEffect(() => {
    if (!isResizing) return

    // Prevent text selection during resize
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return

      const containerRect = resizeRef.current.getBoundingClientRect()
      const newWidth = containerRect.right - e.clientX

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizeStart = () => {
    setIsResizing(true)
  }

  // Rich mock data with diverse symbol types (fallback if symbols not provided)
  const mockData: OutlineSymbol[] = [
    // Imports
    {
      kind: 'import',
      name: 'React',
      line: 1,
      from: 'react',
    },
    {
      kind: 'import',
      name: '{ z }',
      line: 2,
      from: 'zod',
    },
    {
      kind: 'import',
      name: '{ prisma }',
      line: 3,
      from: '@/lib/database',
    },

    // Type alias
    {
      kind: 'type',
      name: 'UserId',
      line: 5,
      modifiers: { export: true },
      type: 'string',
    },

    // Interface
    {
      kind: 'interface',
      name: 'User',
      line: 7,
      modifiers: { export: true },
      jsDoc: 'User entity with authentication and profile data',
      children: [
        { kind: 'property', name: 'id', line: 8, type: 'string' },
        { kind: 'property', name: 'email', line: 9, type: 'string' },
        { kind: 'property', name: 'name', line: 10, type: 'string', modifiers: {} },
        { kind: 'property', name: 'role', line: 11, type: 'UserRole' },
        { kind: 'property', name: 'createdAt', line: 12, type: 'Date' },
        { kind: 'property', name: 'deletedAt', line: 13, type: 'Date | null', modifiers: {} },
      ],
    },

    // Enum
    {
      kind: 'enum',
      name: 'UserRole',
      line: 16,
      modifiers: { export: true },
      children: [
        { kind: 'property', name: 'ADMIN', line: 17, value: '"admin"' },
        { kind: 'property', name: 'USER', line: 18, value: '"user"' },
        { kind: 'property', name: 'GUEST', line: 19, value: '"guest"' },
      ],
    },

    // Const object
    {
      kind: 'const',
      name: 'ApiConfig',
      line: 22,
      modifiers: { export: true },
      type: 'object',
      children: [
        { kind: 'property', name: 'baseUrl', line: 23, type: 'string', value: '"/api/v1"' },
        { kind: 'property', name: 'timeout', line: 24, type: 'number', value: '5000' },
        { kind: 'property', name: 'maxRetries', line: 25, type: 'number', value: '3' },
      ],
    },

    // Standalone function
    {
      kind: 'function',
      name: 'validateEmail',
      line: 28,
      modifiers: { export: true },
      params: [{ name: 'email', type: 'string' }],
      type: 'boolean',
      jsDoc: 'Validates email format using regex',
    },

    // Async function
    {
      kind: 'function',
      name: 'hashPassword',
      line: 33,
      modifiers: { export: true, async: true },
      params: [
        { name: 'password', type: 'string' },
        { name: 'saltRounds', type: 'number', defaultValue: '10' },
      ],
      type: 'Promise<string>',
    },

    // Class
    {
      kind: 'class',
      name: 'UserService',
      line: 38,
      modifiers: { export: true },
      jsDoc: 'Service for managing user operations',
      children: [
        // Private property
        {
          kind: 'property',
          name: 'db',
          line: 39,
          modifiers: { private: true, readonly: true },
          type: 'PrismaClient',
        },

        // Constructor (as method)
        {
          kind: 'method',
          name: 'constructor',
          line: 41,
          params: [{ name: 'database', type: 'PrismaClient' }],
          type: 'void',
        },

        // Public async method
        {
          kind: 'method',
          name: 'createUser',
          line: 45,
          modifiers: { async: true },
          params: [{ name: 'data', type: 'Partial<User>' }],
          type: 'Promise<User>',
          jsDoc: 'Creates a new user with validation',
        },

        // Public async method
        {
          kind: 'method',
          name: 'getUser',
          line: 52,
          modifiers: { async: true },
          params: [{ name: 'id', type: 'UserId' }],
          type: 'Promise<User | null>',
          jsDoc: 'Retrieves a user by their unique identifier',
        },

        // Public async method
        {
          kind: 'method',
          name: 'updateUser',
          line: 58,
          modifiers: { async: true },
          params: [
            { name: 'id', type: 'UserId' },
            { name: 'data', type: 'Partial<User>' },
          ],
          type: 'Promise<User>',
        },

        // Public async method
        {
          kind: 'method',
          name: 'deleteUser',
          line: 67,
          modifiers: { async: true },
          params: [{ name: 'id', type: 'UserId' }],
          type: 'Promise<void>',
          jsDoc: 'Soft delete user by setting deletedAt timestamp',
        },

        // Static method
        {
          kind: 'method',
          name: 'getInstance',
          line: 74,
          modifiers: { static: true },
          params: [],
          type: 'UserService',
          jsDoc: 'Returns singleton instance of UserService',
        },

        // Private method
        {
          kind: 'method',
          name: 'validateUserData',
          line: 80,
          modifiers: { private: true },
          params: [{ name: 'data', type: 'Partial<User>' }],
          type: 'boolean',
        },
      ],
    },
  ]

  // Use provided symbols or fallback to mock data
  const outlineData = symbols || mockData

  const toggleSymbol = (symbolName: string) => {
    const newExpanded = new Set(expandedSymbols)
    if (newExpanded.has(symbolName)) {
      newExpanded.delete(symbolName)
    } else {
      newExpanded.add(symbolName)
    }
    setExpandedSymbols(newExpanded)
  }

  const handleSymbolClick = (line: number) => {
    onSymbolClick?.(line)
  }

  const renderSymbol = (symbol: OutlineSymbol, depth: number = 0) => {
    const hasChildren = symbol.children && symbol.children.length > 0
    const isExpanded = expandedSymbols.has(symbol.name)
    const indent = depth * 10

    // Format parameters inline
    const paramsText = symbol.params
      ? `(${symbol.params.map(p => `${p.name}${p.optional ? '?' : ''}${p.defaultValue ? `=${p.defaultValue}` : ''}`).join(', ')})`
      : ''

    return (
      <div key={`${symbol.kind}-${symbol.name}-${symbol.line}`} className="mb-0.5">
        {/* Symbol Header */}
        <div
          className="flex flex-nowrap items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-white/5 transition-colors group overflow-hidden"
          style={{ paddingLeft: `calc(${indent}px + var(--limn-indent) / 2)` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button onClick={() => toggleSymbol(symbol.name)} className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown size={11} className="text-text-muted" />
              ) : (
                <ChevronRight size={11} className="text-text-muted" />
              )}
            </button>
          ) : (
            <div className="w-3 flex-shrink-0" />
          )}

          {/* 1. Kind Icon (class, interface, function, const, etc) */}
          {getSymbolIcon(symbol.kind, symbol.modifiers)}

          {/* 2. Name (never truncate - always show full name) */}
          <span
            className={`${getSymbolColor(symbol.kind)} cursor-pointer font-medium flex-shrink-0 whitespace-nowrap`}
            onClick={() => handleSymbolClick(symbol.line)}
            title={`${symbol.jsDoc || ''}\nLine ${symbol.line}`}
          >
            {symbol.name}
          </span>

          {/* 3. Params (can truncate with ellipsis) */}
          {paramsText && (
            <span className="text-text-muted/60 text-2xs font-mono truncate overflow-hidden min-w-0">
              {paramsText}
            </span>
          )}

          {/* 4. Modifier Icons (export, async, static, readonly, private) */}
          {renderModifierIcons(symbol.modifiers)}

          {/* 5. Type annotation : Type (can truncate with ellipsis) */}
          {symbol.type && !symbol.from && (
            <span className="text-text-tertiary/50 text-2xs font-mono truncate overflow-hidden min-w-0">
              : {symbol.type}
            </span>
          )}

          {/* Value for enums/consts = value (can truncate with ellipsis) */}
          {symbol.value && (
            <span className="text-text-muted/50 text-2xs truncate overflow-hidden min-w-0">
              = {symbol.value}
            </span>
          )}

          {/* Import path: from 'path' (can truncate with ellipsis) */}
          {symbol.from && (
            <span className="text-text-muted/40 text-2xs italic truncate overflow-hidden min-w-0">
              from {symbol.from}
            </span>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="mt-0.5">
            {symbol.children!.map((child) => renderSymbol(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="flex items-center justify-center border-l border-border-DEFAULT bg-bg-elevated p-2">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded p-2 text-text-muted hover:bg-white/5 hover:text-text-secondary transition-colors"
          title="Show Outline"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={resizeRef}
      className="border-l border-border-DEFAULT bg-bg-elevated flex flex-col relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group transition-colors ${
          isResizing ? 'bg-warm-300/60' : 'hover:bg-warm-300/30'
        }`}
        onMouseDown={handleResizeStart}
        style={{ zIndex: 10 }}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-12 rounded-r bg-bg-elevated/80 opacity-0 group-hover:opacity-100 transition-opacity border border-l-0 border-border-DEFAULT">
          <GripVertical size={12} className="text-warm-300" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-DEFAULT px-3 py-2">
        <span className="label">OUTLINE</span>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-text-muted hover:bg-white/5 hover:text-text-secondary transition-colors"
          title="Hide Outline"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {outlineData.map((symbol) => renderSymbol(symbol, 0))}
      </div>
    </div>
  )
}
