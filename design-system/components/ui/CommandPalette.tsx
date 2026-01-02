import * as React from 'react'
import { Search, File, Folder, Hash, Command, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResult {
  type: 'file' | 'folder' | 'symbol' | 'command'
  title: string
  subtitle?: string
  icon: React.ElementType
  shortcut?: string
}

const mockResults: SearchResult[] = [
  { type: 'file', title: 'AuthService.ts', subtitle: 'src/services', icon: File },
  { type: 'file', title: 'UserService.ts', subtitle: 'src/services', icon: File },
  { type: 'folder', title: 'components', subtitle: 'src', icon: Folder },
  { type: 'symbol', title: 'handleCallback', subtitle: 'function in AuthService.ts', icon: Hash },
  { type: 'symbol', title: 'User', subtitle: 'interface in types.ts', icon: Hash },
  { type: 'command', title: 'Open Settings', subtitle: 'Command', icon: Command, shortcut: '⌘,' },
  { type: 'command', title: 'Toggle Terminal', subtitle: 'Command', icon: Command, shortcut: '⌃`' },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        onOpenChange(false)
        setQuery('')
        setSelectedIndex(0)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % mockResults.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + mockResults.length) % mockResults.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        // Handle selection
        onOpenChange(false)
        setQuery('')
        setSelectedIndex(0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-bg-overlay backdrop-blur-sm"
        onClick={() => {
          onOpenChange(false)
          setQuery('')
          setSelectedIndex(0)
        }}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2">
        <div className="mx-4 rounded-lg border border-border-active bg-bg-elevated shadow-xl">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-border-DEFAULT px-3 py-2">
            <Search size={16} className="text-warm-300 shrink-0" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files, symbols, and commands..."
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1.5 py-0.5 text-2xs text-text-muted">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-1.5">
            {mockResults.map((result, index) => {
              const Icon = result.icon
              return (
                <div
                  key={index}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all',
                    selectedIndex === index
                      ? 'bg-warm-glow/30 border border-warm-300/20'
                      : 'border border-transparent hover:bg-white/5'
                  )}
                  onClick={() => {
                    onOpenChange(false)
                    setQuery('')
                    setSelectedIndex(0)
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded',
                      selectedIndex === index
                        ? 'bg-warm-glow/30 text-warm-300'
                        : 'bg-bg-surface text-text-tertiary group-hover:text-text-secondary'
                    )}
                  >
                    <Icon size={12} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm truncate',
                        selectedIndex === index ? 'text-text-primary' : 'text-text-secondary'
                      )}
                    >
                      {result.title}
                    </span>
                    {result.subtitle && (
                      <span className="text-2xs text-text-muted truncate">· {result.subtitle}</span>
                    )}
                  </div>
                  {result.shortcut && (
                    <div className="shrink-0 text-2xs text-text-muted">{result.shortcut}</div>
                  )}
                  {selectedIndex === index && (
                    <CornerDownLeft size={12} className="shrink-0 text-text-muted" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-DEFAULT px-3 py-1.5 text-2xs text-text-muted">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1 py-0.5">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border-DEFAULT bg-bg-surface px-1 py-0.5">↵</kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-text-faint">
              <span>⌘K</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
