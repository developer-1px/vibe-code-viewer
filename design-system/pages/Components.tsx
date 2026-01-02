import { useState } from 'react'
import { TitleBar } from '@/components/ide/TitleBar'
import { ActivityBar, ActivityBarItem } from '@/components/ide/ActivityBar'
import { StatusBar } from '@/components/ide/StatusBar'
import { TabBar, Tab } from '@/components/ide/TabBar'
import { Sidebar, FileTreeItem } from '@/components/ide/Sidebar'
import { SettingsPanel } from '@/components/ide/SettingsPanel'
import { QuickActionsDialog } from '@/components/ide/QuickActionsDialog'
import { SearchPanel } from '@/components/ide/SearchPanel'
import { ExtensionsPanel } from '@/components/ide/ExtensionsPanel'
import { GitPanel } from '@/components/ide/GitPanel'
import { TerminalPanel } from '@/components/ide/TerminalPanel'
import { NotificationCenter } from '@/components/ide/NotificationCenter'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Indicator } from '@/components/ui/Indicator'
import { useToast } from '@/components/ui/Toast'
import {
  Files,
  Search,
  GitBranch,
  Sparkles,
  Settings,
  FileCode,
  Folder,
  Command,
  Package,
  Terminal,
} from 'lucide-react'

export default function Components() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const { addToast } = useToast()

  const showToastExample = (type: 'success' | 'warning' | 'error' | 'info') => {
    const messages = {
      success: { title: 'Success!', description: 'Your changes have been saved.' },
      warning: { title: 'Warning', description: 'Please review your settings.' },
      error: { title: 'Error', description: 'Something went wrong.' },
      info: { title: 'Info', description: 'New update available.' },
    }
    addToast({ type, ...messages[type] })
  }

  return (
    <div className="min-h-screen bg-bg-deep p-12 pl-20 pt-12">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium text-text-primary mb-2">Component Library</h1>
            <p className="text-text-tertiary">All LIMN design system components</p>
          </div>
          <NotificationCenter />
        </div>

        {/* IDE Shell Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-medium text-text-primary">IDE Shell Components</h2>

          {/* TitleBar */}
          <div className="space-y-3">
            <h3 className="label">Title Bar</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden">
              <TitleBar filename="example.ts" projectName="demo-project" />
            </div>
          </div>

          {/* ActivityBar */}
          <div className="space-y-3">
            <h3 className="label">Activity Bar</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden inline-flex">
              <ActivityBar>
                <ActivityBarItem icon={Files} label="Files" active />
                <ActivityBarItem icon={Search} label="Search" />
                <ActivityBarItem icon={GitBranch} label="Git" hasBadge />
                <ActivityBarItem icon={Sparkles} label="AI" />
                <div className="flex-1" />
                <ActivityBarItem icon={Settings} label="Settings" />
              </ActivityBar>
            </div>
          </div>

          {/* StatusBar */}
          <div className="space-y-3">
            <h3 className="label">Status Bar</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden">
              <StatusBar branch="main" ahead={2} line={10} column={5} aiActive />
            </div>
          </div>

          {/* TabBar */}
          <div className="space-y-3">
            <h3 className="label">Tab Bar</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden">
              <TabBar>
                <Tab icon={FileCode} label="index.ts" active dirty />
                <Tab icon={FileCode} label="utils.ts" />
                <Tab icon={FileCode} label="types.ts" />
              </TabBar>
            </div>
          </div>
        </section>

        {/* IDE Panel Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-medium text-text-primary">IDE Panel Components</h2>

          {/* Sidebar */}
          <div className="space-y-3">
            <h3 className="label">File Explorer Sidebar</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden inline-flex">
              <Sidebar title="EXPLORER">
                <FileTreeItem icon={Folder} label="src" isFolder isOpen />
                <FileTreeItem icon={FileCode} label="index.ts" active indent={1} />
                <FileTreeItem icon={FileCode} label="utils.ts" dirty indent={1} />
              </Sidebar>
            </div>
          </div>

          {/* SearchPanel */}
          <div className="space-y-3">
            <h3 className="label">Search Panel</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden inline-flex h-[600px]">
              <SearchPanel className="w-96" />
            </div>
          </div>

          {/* ExtensionsPanel */}
          <div className="space-y-3">
            <h3 className="label">Extensions Panel</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden inline-flex h-[600px]">
              <ExtensionsPanel className="w-96" />
            </div>
          </div>

          {/* GitPanel */}
          <div className="space-y-3">
            <h3 className="label">Git Panel</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden inline-flex h-[600px]">
              <GitPanel className="w-96" />
            </div>
          </div>

          {/* TerminalPanel */}
          <div className="space-y-3">
            <h3 className="label">Terminal Panel</h3>
            <div className="rounded-[var(--limn-radius-lg)] border border-border-light overflow-hidden">
              <TerminalPanel />
            </div>
          </div>
        </section>

        {/* Dialog Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-medium text-text-primary">Dialog Components</h2>

          {/* Settings Panel */}
          <div className="space-y-3">
            <h3 className="label">Settings Panel</h3>
            <div className="flex gap-3">
              <Button onClick={() => setSettingsOpen(true)}>
                <Settings size={16} className="mr-2" />
                Open Settings
              </Button>
              <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
            </div>
          </div>

          {/* Quick Actions Dialog */}
          <div className="space-y-3">
            <h3 className="label">Quick Actions Dialog (Command Palette)</h3>
            <div className="flex gap-3">
              <Button onClick={() => setQuickActionsOpen(true)}>
                <Command size={16} className="mr-2" />
                Open Command Palette
              </Button>
              <QuickActionsDialog open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />
            </div>
          </div>

          {/* Notification Center */}
          <div className="space-y-3">
            <h3 className="label">Notification Center</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">
                Click the bell icon in the top-right corner
              </span>
              <NotificationCenter />
            </div>
          </div>
        </section>

        {/* UI Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-medium text-text-primary">UI Components</h2>

          {/* Buttons */}
          <div className="space-y-3">
            <h3 className="label">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="link">Link</Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            <h3 className="label">Cards</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Indicator variant="inactive" />
                    <span className="label">Inactive</span>
                  </div>
                  <CardTitle>Normal Card</CardTitle>
                  <CardDescription>Standard card component</CardDescription>
                </CardHeader>
              </Card>
              <Card active>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Indicator variant="active" />
                    <span className="label">Active</span>
                  </div>
                  <CardTitle>Active Card</CardTitle>
                  <CardDescription>Card with active glow effect</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-3">
            <h3 className="label">Input</h3>
            <div className="max-w-md">
              <Input placeholder="Enter text..." />
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-3">
            <h3 className="label">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="active">Active</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
            </div>
          </div>

          {/* Indicators */}
          <div className="space-y-3">
            <h3 className="label">Indicators</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Indicator variant="inactive" />
                <span className="text-sm text-text-tertiary">Inactive</span>
              </div>
              <div className="flex items-center gap-2">
                <Indicator variant="active" />
                <span className="text-sm text-text-tertiary">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Indicator variant="success" />
                <span className="text-sm text-text-tertiary">Success</span>
              </div>
              <div className="flex items-center gap-2">
                <Indicator variant="warning" />
                <span className="text-sm text-text-tertiary">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <Indicator variant="error" />
                <span className="text-sm text-text-tertiary">Error</span>
              </div>
              <div className="flex items-center gap-2">
                <Indicator variant="working" />
                <span className="text-sm text-text-tertiary">Working</span>
              </div>
            </div>
          </div>

          {/* Toast Notifications */}
          <div className="space-y-3">
            <h3 className="label">Toast Notifications</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => showToastExample('success')}>
                Show Success
              </Button>
              <Button variant="outline" onClick={() => showToastExample('warning')}>
                Show Warning
              </Button>
              <Button variant="outline" onClick={() => showToastExample('error')}>
                Show Error
              </Button>
              <Button variant="outline" onClick={() => showToastExample('info')}>
                Show Info
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
