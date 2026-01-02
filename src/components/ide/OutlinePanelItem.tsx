import {
  ChevronDown,
  ChevronRight,
  FileCode,
  MessageSquare,
  Box,
  Code2,
  GitBranch,
  Repeat,
  RotateCw,
  Shuffle,
  Blocks,
  PackageOpen,
  FileType,
  Braces,
  Hash,
  Variable,
  FunctionSquare,
  SquareStack,
  Dot,
  Phone,
  CornerDownRight,
  Component,
} from 'lucide-react'
import type { OutlineNode, OutlineNodeKind } from '../../shared/outlineExtractor'

interface OutlinePanelItemProps {
  node: OutlineNode
  depth: number
  isExpanded: boolean
  expandedNodes: Set<string>
  onToggle: (nodeKey: string) => void
  onNodeClick: (line: number) => void
}

// Get icon for outline node kind
function getNodeIcon(kind: OutlineNodeKind) {
  const iconProps = { size: 13 }

  switch (kind) {
    // Comments
    case 'comment':
      return <MessageSquare {...iconProps} className="text-slate-400/70" size={11} />

    // Control flow
    case 'if':
      return <GitBranch {...iconProps} className="text-orange-400" />
    case 'for':
    case 'while':
    case 'do-while':
      return <Repeat {...iconProps} className="text-cyan-400" />
    case 'switch':
      return <Shuffle {...iconProps} className="text-purple-400" />
    case 'case':
      return <CornerDownRight {...iconProps} className="text-purple-300" size={11} />

    // Error handling
    case 'try':
    case 'catch':
    case 'finally':
      return <Box {...iconProps} className="text-red-400" />

    // Declarations
    case 'import':
      return <PackageOpen {...iconProps} className="text-purple-400" />
    case 'type':
      return <FileType {...iconProps} className="text-blue-400" />
    case 'interface':
      return <Braces {...iconProps} className="text-cyan-400" />
    case 'enum':
      return <Hash {...iconProps} className="text-orange-400" />
    case 'const':
    case 'let':
    case 'var':
      return <Variable {...iconProps} className="text-yellow-400" size={9} />
    case 'function':
    case 'arrow-function':
      return <FunctionSquare {...iconProps} className="text-pink-400" />
    case 'class':
      return <SquareStack {...iconProps} className="text-status-success" />
    case 'method':
      return <Dot {...iconProps} className="text-warm-300" fill="currentColor" size={8} />
    case 'property':
      return <Dot {...iconProps} className="text-text-tertiary/60" size={6} fill="currentColor" />

    // Expressions
    case 'call':
      return <Phone {...iconProps} className="text-blue-300" size={11} />
    case 'return':
      return <CornerDownRight {...iconProps} className="text-green-400" />
    case 'block':
      return <Blocks {...iconProps} className="text-slate-500" size={11} />

    // JSX
    case 'jsx-element':
    case 'jsx-fragment':
      return <Component {...iconProps} className="text-blue-400" />

    default:
      return <FileCode {...iconProps} className="text-text-muted" />
  }
}

// Get color for node name
function getNodeColor(kind: OutlineNodeKind): string {
  switch (kind) {
    case 'comment':
      return 'text-slate-400/70'
    case 'if':
      return 'text-orange-400'
    case 'for':
    case 'while':
    case 'do-while':
      return 'text-cyan-400'
    case 'switch':
    case 'case':
      return 'text-purple-400'
    case 'try':
    case 'catch':
    case 'finally':
      return 'text-red-400'
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
    case 'var':
      return 'text-yellow-400'
    case 'function':
    case 'arrow-function':
      return 'text-pink-400'
    case 'class':
      return 'text-status-success'
    case 'method':
      return 'text-warm-300'
    case 'call':
      return 'text-blue-300'
    case 'return':
      return 'text-green-400'
    case 'block':
      return 'text-slate-500'
    case 'jsx-element':
    case 'jsx-fragment':
      return 'text-blue-400'
    default:
      return 'text-text-secondary'
  }
}

export function OutlinePanelItem({
  node,
  depth,
  isExpanded,
  expandedNodes,
  onToggle,
  onNodeClick
}: OutlinePanelItemProps) {
  const hasChildren = node.children && node.children.length > 0
  const indent = depth * 10

  // Create unique key for this node (line + name)
  const nodeKey = `${node.line}-${node.name}`

  // Format comment text: remove line breaks and truncate if too long
  const formatCommentText = (text: string | undefined): string => {
    if (!text) return node.name

    // Remove // or /* */ markers
    let cleanText = text.replace(/^\/\/\s*/, '').replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '')

    // Replace line breaks with spaces
    cleanText = cleanText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

    // Truncate if too long
    const maxLength = 50
    if (cleanText.length > maxLength) {
      return cleanText.slice(0, maxLength) + '...'
    }

    return cleanText
  }

  // Display name based on node kind
  const displayName = node.kind === 'comment' ? formatCommentText(node.text) : node.name

  return (
    <div className="mb-0.5">
      {/* Node Header */}
      <div
        className="flex flex-nowrap items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-white/5 transition-colors group overflow-hidden"
        style={{ paddingLeft: `calc(${indent}px + var(--limn-indent) / 2)` }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(nodeKey)
            }}
            className="flex-shrink-0 hover:bg-theme-hover rounded-sm transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={11} className="text-text-muted" />
            ) : (
              <ChevronRight size={11} className="text-text-muted" />
            )}
          </button>
        ) : (
          <div className="w-3 flex-shrink-0" />
        )}

        {/* Kind Icon */}
        <div className="w-4 flex items-center justify-center flex-shrink-0">
          {getNodeIcon(node.kind)}
        </div>

        {/* Node Name (comments can truncate with ellipsis, others never truncate) */}
        <span
          className={`${getNodeColor(node.kind)} cursor-pointer font-medium ${node.kind === 'comment' ? 'truncate overflow-hidden min-w-0' : 'flex-shrink-0 whitespace-nowrap'}`}
          onClick={() => onNodeClick(node.line)}
          title={`${node.text || ''}\nLine ${node.line}${node.endLine ? ` - ${node.endLine}` : ''}`}
        >
          {displayName}
        </span>

        {/* End line indicator (for blocks) */}
        {node.endLine && node.endLine !== node.line && (
          <span className="text-text-tertiary/30 text-2xs truncate overflow-hidden min-w-0">
            L{node.line}-{node.endLine}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {node.children!.map((child, idx) => (
            <OutlinePanelItem
              key={`${child.line}-${child.name}-${idx}`}
              node={child}
              depth={depth + 1}
              isExpanded={expandedNodes.has(`${child.line}-${child.name}`)}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
