import * as React from 'react'
import {
  Terminal,
  Plus,
  X,
  Split,
  Trash2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Indicator } from '@/components/ui/Indicator'
import { cn } from '@/lib/utils'

export interface TerminalPanelProps {
  className?: string
}

interface TerminalTab {
  id: string
  name: string
  cwd: string
  history: TerminalLine[]
  active: boolean
}

interface TerminalLine {
  type: 'command' | 'output' | 'error'
  text: string
}

/**
 * TerminalPanel - Integrated terminal interface
 *
 * Features:
 * - Multiple terminal tabs
 * - Command execution simulation
 * - Terminal output display
 * - Tab management (add, remove, switch)
 * - Terminal controls (clear, split, maximize)
 */
export function TerminalPanel({ className }: TerminalPanelProps) {
  const [terminals, setTerminals] = React.useState<TerminalTab[]>([
    {
      id: 'terminal-1',
      name: 'zsh',
      cwd: '~/projects/limn-design',
      active: true,
      history: [
        { type: 'command', text: 'npm run dev' },
        { type: 'output', text: '' },
        { type: 'output', text: '  VITE v6.0.0  ready in 823 ms' },
        { type: 'output', text: '' },
        { type: 'output', text: '  ➜  Local:   http://localhost:5173/' },
        { type: 'output', text: '  ➜  Network: use --host to expose' },
        { type: 'output', text: '  ➜  press h + enter to show help' },
        { type: 'output', text: '' },
      ],
    },
  ])

  const [currentInput, setCurrentInput] = React.useState('')
  const [isMaximized, setIsMaximized] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const activeTerminal = terminals.find((t) => t.active)

  const addTerminal = () => {
    const newId = `terminal-${terminals.length + 1}`
    setTerminals((prev) => [
      ...prev.map((t) => ({ ...t, active: false })),
      {
        id: newId,
        name: 'zsh',
        cwd: '~/projects/limn-design',
        active: true,
        history: [],
      },
    ])
  }

  const removeTerminal = (id: string) => {
    setTerminals((prev) => {
      const filtered = prev.filter((t) => t.id !== id)
      if (filtered.length === 0) return prev
      if (prev.find((t) => t.id === id)?.active && filtered.length > 0) {
        filtered[0].active = true
      }
      return filtered
    })
  }

  const switchTerminal = (id: string) => {
    setTerminals((prev) => prev.map((t) => ({ ...t, active: t.id === id })))
  }

  const clearTerminal = () => {
    setTerminals((prev) =>
      prev.map((t) => (t.active ? { ...t, history: [] } : t))
    )
  }

  const executeCommand = () => {
    if (!currentInput.trim() || !activeTerminal) return

    const newHistory: TerminalLine[] = [
      ...activeTerminal.history,
      { type: 'command', text: currentInput },
    ]

    // Simulate command output
    if (currentInput === 'clear') {
      setTerminals((prev) =>
        prev.map((t) => (t.active ? { ...t, history: [] } : t))
      )
      setCurrentInput('')
      return
    }

    if (currentInput.startsWith('cd ')) {
      const newCwd = currentInput.substring(3).trim()
      setTerminals((prev) =>
        prev.map((t) =>
          t.active
            ? {
                ...t,
                cwd: newCwd.startsWith('~') ? newCwd : `${t.cwd}/${newCwd}`,
                history: newHistory,
              }
            : t
        )
      )
      setCurrentInput('')
      return
    }

    // Default command output
    newHistory.push({ type: 'output', text: `zsh: command not found: ${currentInput}` })

    setTerminals((prev) =>
      prev.map((t) => (t.active ? { ...t, history: newHistory } : t))
    )
    setCurrentInput('')

    // Auto-scroll to bottom
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand()
    }
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeTerminal?.history])

  return (
    <div
      className={cn(
        'flex flex-col bg-bg-deep border-t border-border-DEFAULT',
        isMaximized ? 'h-screen' : 'h-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-bg-surface border-b border-border-DEFAULT">
        <div className="flex items-center gap-1">
          {/* Terminal Tabs */}
          {terminals.map((term) => (
            <button
              key={term.id}
              onClick={() => switchTerminal(term.id)}
              className={cn(
                'group flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
                term.active
                  ? 'bg-bg-deep text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <Terminal size={12} />
              <span>{term.name}</span>
              <Indicator
                variant="success"
                className="h-1 w-1"
              />
              {terminals.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTerminal(term.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5"
                >
                  <X size={10} />
                </button>
              )}
            </button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={addTerminal}
          >
            <Plus size={12} />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearTerminal}
          >
            <Trash2 size={10} className="mr-1" />
            Clear
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Split size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      {activeTerminal && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Output */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
          >
            {activeTerminal.history.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap">
                {line.type === 'command' ? (
                  <div className="flex gap-2">
                    <span className="text-warm-300">❯</span>
                    <span className="text-text-primary">{line.text}</span>
                  </div>
                ) : line.type === 'error' ? (
                  <div className="text-status-error">{line.text}</div>
                ) : (
                  <div className="text-text-secondary">{line.text}</div>
                )}
              </div>
            ))}

            {/* Current Input Line */}
            <div className="flex gap-2 mt-1">
              <span className="text-warm-300">❯</span>
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-text-primary outline-none caret-warm-300"
                autoFocus
                spellCheck={false}
              />
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-bg-surface border-t border-border-DEFAULT text-2xs text-text-muted">
            <span className="flex items-center gap-2">
              <Terminal size={10} />
              <span>{activeTerminal.name}</span>
            </span>
            <span className="font-mono">{activeTerminal.cwd}</span>
          </div>
        </div>
      )}
    </div>
  )
}
