import { useState } from 'react'
import { TitleBar } from '@/components/ide/TitleBar'
import { StatusBar } from '@/components/ide/StatusBar'
import { Badge } from '@/components/ui/Badge'
import { Autocomplete, AutocompleteItem } from '@/components/ui/Autocomplete'
import { CodeView } from '@/components/ide/CodeView'
import { OutlinePanel } from '@/components/ide/OutlinePanel'

const mockAutocompleteItems: AutocompleteItem[] = [
  { label: 'createUser', type: 'method', detail: '(data: UserData): Promise<User>' },
  { label: 'updateUser', type: 'method', detail: '(id: string, data: Partial<User>)' },
  { label: 'deleteUser', type: 'method', detail: '(id: string): Promise<void>' },
  { label: 'getUserById', type: 'function', detail: '(id: string): Promise<User>' },
  { label: 'const', type: 'keyword' },
  { label: 'class', type: 'keyword' },
  { label: 'User', type: 'class', detail: 'interface' },
]

export default function EditorView() {
  const [showAutocomplete, setShowAutocomplete] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-deep">
      <TitleBar filename="UserService.ts" projectName="my-app" />

      {/* Breadcrumb */}
      <div className="flex h-[var(--limn-breadcrumb-height)] items-center gap-2 border-b border-border-DEFAULT bg-bg-elevated px-3 text-xs text-text-tertiary">
        <span className="hover:text-text-secondary cursor-pointer">src</span>
        <span className="text-text-muted">›</span>
        <span className="hover:text-text-secondary cursor-pointer">services</span>
        <span className="text-text-muted">›</span>
        <span className="text-text-primary">UserService.ts</span>
      </div>

      {/* Editor with Outline */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden bg-bg-base">
          <CodeView activeLine={5} showAISuggestion={true} />
        </div>
        <OutlinePanel defaultOpen={true} onMethodClick={(line) => console.log('Navigate to line:', line)} />
      </div>

      {/* Inline AI Suggestion Bar */}
      <div className="border-t border-border-warm/30 bg-warm-glow/20 px-5 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="active">AI Suggestion</Badge>
            <span className="text-sm text-text-secondary">
              Add email validation before creating user
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button className="rounded px-3 py-1 hover:bg-white/10 text-text-secondary">
              Reject
            </button>
            <button className="rounded px-3 py-1 bg-warm-glow border border-border-warm text-warm-300 hover:bg-warm-glow/80">
              Accept
            </button>
            <kbd className="rounded bg-white/5 px-2 py-1 text-xs text-text-muted ml-2">Tab</kbd>
          </div>
        </div>
      </div>

      <StatusBar
        branch="feature/user-service"
        ahead={3}
        behind={1}
        line={6}
        column={60}
        language="TypeScript"
        aiActive
      />

      {/* Autocomplete */}
      {showAutocomplete && (
        <Autocomplete
          items={mockAutocompleteItems}
          position={{ x: 240, y: 220 }}
          selectedIndex={selectedIndex}
          onSelect={(item) => {
            console.log('Selected:', item)
            setShowAutocomplete(false)
          }}
          onClose={() => setShowAutocomplete(false)}
        />
      )}
    </div>
  )
}
