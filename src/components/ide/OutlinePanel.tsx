import { useState, useEffect, useRef } from 'react'
import { ChevronRight, X, GripVertical } from 'lucide-react'
import { OutlinePanelItem } from './OutlinePanelItem'
import type { OutlineNode } from '../../shared/outlineExtractor'

export interface OutlinePanelProps {
  /** Whether the panel is initially open */
  defaultOpen?: boolean
  /** Callback when a node is clicked */
  onNodeClick?: (line: number) => void
  /** Outline nodes to display */
  nodes?: OutlineNode[]
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
export function OutlinePanel({ defaultOpen = true, onNodeClick, nodes = [] }: OutlinePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [width, setWidth] = useState(320) // Default w-80 = 320px
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Initialize expandedNodes to expand all nodes with children by default
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const MIN_WIDTH = 200
  const MAX_WIDTH = 500

  // Expand all nodes when nodes change (except imports block)
  useEffect(() => {
    const allExpandableNodes = new Set<string>()

    const collectExpandable = (nodeList: OutlineNode[]) => {
      nodeList.forEach(node => {
        if (node.children && node.children.length > 0) {
          const nodeKey = `${node.line}-${node.name}`

          // Skip imports block - keep it collapsed by default
          if (node.name.startsWith('Imports (')) {
            return
          }

          allExpandableNodes.add(nodeKey)
          collectExpandable(node.children)
        }
      })
    }

    collectExpandable(nodes)
    setExpandedNodes(allExpandableNodes)
  }, [nodes])

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

  const toggleNode = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey)
    } else {
      newExpanded.add(nodeKey)
    }
    setExpandedNodes(newExpanded)
  }

  const handleNodeClick = (line: number) => {
    onNodeClick?.(line)
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
      <div className="flex-1 overflow-y-auto p-2 font-mono">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            No structure found
          </div>
        ) : (
          nodes.map((node, idx) => (
            <OutlinePanelItem
              key={`${node.line}-${node.name}-${idx}`}
              node={node}
              depth={0}
              isExpanded={expandedNodes.has(`${node.line}-${node.name}`)}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              onNodeClick={handleNodeClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
