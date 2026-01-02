import { useState, useEffect } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { OutlinePanelItem } from './OutlinePanelItem'
import { DefinitionPanel } from './DefinitionPanel'
import type { OutlineNode } from '../../shared/outlineExtractor'
import type { DefinitionSymbol } from '../../shared/definitionExtractor'

export interface OutlinePanelProps {
  /** Whether the panel is initially open */
  defaultOpen?: boolean
  /** Callback when a node is clicked */
  onNodeClick?: (line: number) => void
  /** Outline nodes to display */
  nodes?: OutlineNode[]
  /** Definition symbols to display */
  definitions?: DefinitionSymbol[]
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
export function OutlinePanel({ defaultOpen = true, onNodeClick, nodes = [], definitions = [] }: OutlinePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Initialize expandedNodes to expand all nodes with children by default
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

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
      <div className="flex items-center justify-center border-r border-border-DEFAULT bg-bg-elevated p-2">
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
    <div className="flex-1 bg-bg-elevated flex">
      {/* Left: Definition Panel */}
      <DefinitionPanel
        symbols={definitions}
        onSymbolClick={handleNodeClick}
      />

      {/* Right: Outline Panel */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex h-8 items-center justify-between border-b border-border-DEFAULT px-3 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-[1rem]">
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-tertiary">
              No structure found
            </div>
          ) : (
            nodes.map((node, idx) => {
              const prevNode = idx > 0 ? nodes[idx - 1] : null
              return (
                <OutlinePanelItem
                  key={`${node.line}-${node.name}-${idx}`}
                  node={node}
                  prevNode={prevNode}
                  depth={0}
                  isExpanded={expandedNodes.has(`${node.line}-${node.name}`)}
                  expandedNodes={expandedNodes}
                  onToggle={toggleNode}
                  onNodeClick={handleNodeClick}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
