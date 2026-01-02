import { useState, useEffect } from 'react'
import { Files, Search, GitBranch, Sparkles, Settings, FileCode, Folder, Terminal as TerminalIcon, MessageSquare, Copy, Edit3, Trash2, FileText } from 'lucide-react'
import { TitleBar } from '@/components/ide/TitleBar'
import { ActivityBar, ActivityBarItem } from '@/components/ide/ActivityBar'
import { StatusBar } from '@/components/ide/StatusBar'
import { TabBar, Tab } from '@/components/ide/TabBar'
import { Sidebar, FileTreeItem } from '@/components/ide/Sidebar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ContextMenu, ContextMenuItem } from '@/components/ui/ContextMenu'
import { useToast } from '@/components/ui/Toast'
import { CodeView } from '@/components/ide/CodeView'
import { OutlinePanel } from '@/components/ide/OutlinePanel'

export default function IDELayout() {
  const [activeView, setActiveView] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [activeFile, setActiveFile] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const { addToast } = useToast()

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Title Bar */}
      <TitleBar filename="AuthService.ts" projectName="limn-design" />

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar>
          <ActivityBarItem
            icon={Files}
            label="Explorer"
            active={activeView === 0}
            onClick={() => setActiveView(0)}
          />
          <ActivityBarItem
            icon={Search}
            label="Search"
            active={activeView === 1}
            onClick={() => setSearchOpen(true)}
          />
          <ActivityBarItem
            icon={GitBranch}
            label="Source Control"
            active={activeView === 2}
            hasBadge
            onClick={() => setActiveView(2)}
          />
          <ActivityBarItem
            icon={Sparkles}
            label="AI Assistant"
            active={activeView === 3}
            onClick={() => setActiveView(3)}
          />
          <div className="flex-1" />
          <ActivityBarItem icon={Settings} label="Settings" onClick={() => {}} />
        </ActivityBar>

        {/* Sidebar */}
        <Sidebar title="PROJECT">
          <div onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY })
          }}>
            <FileTreeItem
              icon={Folder}
              label="src"
              isFolder
              isOpen
              onClick={() => {}}
            />
            <FileTreeItem
              icon={Folder}
              label="components"
              isFolder
              isOpen
              indent={1}
              onClick={() => {}}
            />
            <FileTreeItem
              icon={FileCode}
              label="AuthService.ts"
              active={activeFile === 0}
              dirty
              indent={2}
              onClick={() => setActiveFile(0)}
            />
            <FileTreeItem
              icon={FileCode}
              label="UserService.ts"
              active={activeFile === 1}
              indent={2}
              onClick={() => setActiveFile(1)}
            />
            <FileTreeItem
              icon={FileCode}
              label="types.ts"
              indent={2}
              onClick={() => {}}
            />
            <FileTreeItem
              icon={Folder}
              label="lib"
              isFolder
              indent={1}
              onClick={() => {}}
            />
            <FileTreeItem
              icon={FileCode}
              label="package.json"
              onClick={() => {}}
            />
            <FileTreeItem
              icon={FileCode}
              label="tsconfig.json"
              onClick={() => {}}
            />
          </div>
        </Sidebar>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tab Bar */}
          <TabBar>
            <Tab
              icon={FileCode}
              label="AuthService.ts"
              active={activeTab === 0}
              dirty
              onClick={() => setActiveTab(0)}
              onClose={() => {}}
            />
            <Tab
              icon={FileCode}
              label="UserService.ts"
              active={activeTab === 1}
              onClick={() => setActiveTab(1)}
              onClose={() => {}}
            />
            <Tab
              icon={FileCode}
              label="types.ts"
              active={activeTab === 2}
              onClick={() => setActiveTab(2)}
              onClose={() => {}}
            />
          </TabBar>

          {/* Editor Area with Outline */}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden bg-bg-base">
              <CodeView activeLine={3} showAISuggestion={false} />
            </div>
            <OutlinePanel defaultOpen={true} onMethodClick={(line) => console.log('Navigate to line:', line)} />
          </div>

          {/* Bottom Panel */}
          <div className="border-t border-border-DEFAULT bg-bg-elevated">
            <div className="flex h-7 items-center justify-between border-b border-border-DEFAULT px-2">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 text-xs text-text-primary">
                  <TerminalIcon size={12} />
                  <span>Terminal</span>
                </button>
                <button className="text-xs text-text-muted">Output</button>
                <button className="text-xs text-text-muted">Problems</button>
              </div>
            </div>
            <div className="h-28 overflow-y-auto p-2 font-mono text-xs leading-relaxed">
              <div className="text-status-success">➜ ~/limn-design npm run dev</div>
              <div className="text-text-secondary mt-0.5">Starting development server...</div>
              <div className="text-status-success mt-0.5">✓ Ready in 438ms</div>
              <div className="text-text-tertiary mt-0.5">Local: http://localhost:5173/</div>
              <div className="text-text-secondary mt-1 flex items-center gap-1.5">
                <span>➜ ~/limn-design</span>
                <span className="inline-block h-3 w-1.5 bg-warm-300 animate-blink" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        branch="main"
        ahead={2}
        behind={0}
        line={4}
        column={43}
        aiActive
      />

      {/* Command Palette */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Open',
              icon: FileText,
              onClick: () => addToast({ type: 'info', title: 'File opened', description: 'AuthService.ts' })
            },
            {
              label: 'Copy Path',
              icon: Copy,
              shortcut: '⌘⇧C',
              onClick: () => addToast({ type: 'success', title: 'Path copied to clipboard' })
            },
            {
              label: 'Rename',
              icon: Edit3,
              shortcut: 'F2',
              onClick: () => addToast({ type: 'info', title: 'Rename mode activated' })
            },
            { separator: true },
            {
              label: 'Copy',
              icon: Copy,
              shortcut: '⌘C',
              onClick: () => addToast({ type: 'success', title: 'Copied' })
            },
            { label: 'Paste', icon: FileText, shortcut: '⌘V', disabled: true, onClick: () => {} },
            { separator: true },
            {
              label: 'Delete',
              icon: Trash2,
              danger: true,
              onClick: () => addToast({ type: 'warning', title: 'File deleted', description: 'Moved to trash' })
            },
          ]}
        />
      )}
    </div>
  )
}
