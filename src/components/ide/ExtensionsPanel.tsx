import * as React from 'react'
import {
  Search,
  Package,
  Download,
  CheckCircle2,
  Settings,
  Star,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { cn } from '@/components/lib/utils'

export interface ExtensionsPanelProps {
  className?: string
}

interface Extension {
  id: string
  name: string
  author: string
  description: string
  version: string
  downloads: number
  rating: number
  installed: boolean
  enabled?: boolean
  category: 'ai' | 'theme' | 'language' | 'productivity'
}

/**
 * ExtensionsPanel - Extension marketplace and management
 *
 * Features:
 * - Browse and search extensions
 * - Install/uninstall extensions
 * - Enable/disable installed extensions
 * - Extension details and ratings
 * - Categories (installed, popular, AI, themes)
 */
export function ExtensionsPanel({ className }: ExtensionsPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [extensions, setExtensions] = React.useState<Extension[]>([
    {
      id: 'ai-copilot',
      name: 'AI Copilot',
      author: 'LIMN Team',
      description: 'AI-powered code completion and generation',
      version: '2.1.0',
      downloads: 1250000,
      rating: 4.8,
      installed: true,
      enabled: true,
      category: 'ai',
    },
    {
      id: 'limn-warm-theme',
      name: 'LIMN Warm Theme',
      author: 'LIMN Design',
      description: 'Official LIMN warm color theme',
      version: '1.0.0',
      downloads: 85000,
      rating: 4.9,
      installed: true,
      enabled: true,
      category: 'theme',
    },
    {
      id: 'prettier',
      name: 'Prettier',
      author: 'Prettier',
      description: 'Code formatter using prettier',
      version: '10.4.0',
      downloads: 28000000,
      rating: 4.7,
      installed: true,
      enabled: true,
      category: 'productivity',
    },
    {
      id: 'typescript-hero',
      name: 'TypeScript Hero',
      author: 'rbbit',
      description: 'Additional TypeScript tooling for code organization',
      version: '3.0.1',
      downloads: 420000,
      rating: 4.5,
      installed: false,
      category: 'language',
    },
    {
      id: 'ai-reviewer',
      name: 'AI Code Reviewer',
      author: 'CodeAI',
      description: 'Automated code review with AI suggestions',
      version: '1.5.2',
      downloads: 180000,
      rating: 4.6,
      installed: false,
      category: 'ai',
    },
    {
      id: 'dracula-theme',
      name: 'Dracula Theme',
      author: 'Dracula',
      description: 'Dark theme for many applications',
      version: '2.24.2',
      downloads: 5200000,
      rating: 4.8,
      installed: false,
      category: 'theme',
    },
  ])

  const toggleExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, enabled: !ext.enabled } : ext))
    )
  }

  const installExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, installed: true, enabled: true } : ext))
    )
  }

  const filteredExtensions = extensions.filter((ext) =>
    ext.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const installedExtensions = filteredExtensions.filter((ext) => ext.installed)
  const popularExtensions = filteredExtensions
    .filter((ext) => !ext.installed)
    .sort((a, b) => b.downloads - a.downloads)
  const aiExtensions = filteredExtensions.filter((ext) => ext.category === 'ai')

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
    return count.toString()
  }

  const getCategoryIcon = (category: Extension['category']) => {
    switch (category) {
      case 'ai':
        return <Sparkles size={14} className="text-warm-300" />
      case 'theme':
        return <Package size={14} className="text-purple-400" />
      case 'language':
        return <Package size={14} className="text-blue-400" />
      case 'productivity':
        return <Package size={14} className="text-status-success" />
    }
  }

  const renderExtension = (ext: Extension) => (
    <div
      key={ext.id}
      className="p-3 rounded border border-border-DEFAULT hover:border-border-active transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded bg-bg-elevated border border-border-DEFAULT">
          {getCategoryIcon(ext.category)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-text-primary truncate">{ext.name}</h3>
              <p className="text-xs text-text-muted">{ext.author}</p>
            </div>

            {ext.installed ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={ext.enabled}
                  onCheckedChange={() => toggleExtension(ext.id)}
                  className="h-4 w-7"
                />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings size={12} />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                                className="h-7 text-xs"
                onClick={() => installExtension(ext.id)}
              >
                <Download size={12} className="mr-1" />
                Install
              </Button>
            )}
          </div>

          <p className="mt-1 text-xs text-text-secondary line-clamp-2">{ext.description}</p>

          <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Star size={10} className="text-yellow-500 fill-yellow-500" />
              {ext.rating}
            </span>
            <span className="flex items-center gap-1">
              <Download size={10} />
              {formatDownloads(ext.downloads)}
            </span>
            <Badge className="h-4 px-1 text-2xs border border-border-DEFAULT">
              v{ext.version}
            </Badge>
            {ext.installed && (
              <Badge className="h-4 px-1 text-2xs border border-status-success/30 text-status-success">
                <CheckCircle2 size={8} className="mr-0.5" />
                Installed
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn('flex h-full flex-col bg-bg-surface border-r border-border-DEFAULT', className)}>
      {/* Header */}
      <div className="p-3 space-y-2 border-b border-border-DEFAULT">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-text-muted" />
          <span className="text-xs font-medium text-text-primary uppercase tracking-wide">
            Extensions
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="installed" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 grid w-auto grid-cols-3">
          <TabsTrigger value="installed" className="text-xs">
            Installed ({installedExtensions.length})
          </TabsTrigger>
          <TabsTrigger value="popular" className="text-xs">
            <TrendingUp size={12} className="mr-1" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">
            <Sparkles size={12} className="mr-1" />
            AI
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="installed" className="p-3 space-y-2 mt-0">
            {installedExtensions.length > 0 ? (
              installedExtensions.map(renderExtension)
            ) : (
              <div className="text-center py-8 text-text-muted text-xs">
                No installed extensions found
              </div>
            )}
          </TabsContent>

          <TabsContent value="popular" className="p-3 space-y-2 mt-0">
            {popularExtensions.length > 0 ? (
              popularExtensions.map(renderExtension)
            ) : (
              <div className="text-center py-8 text-text-muted text-xs">No extensions found</div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="p-3 space-y-2 mt-0">
            {aiExtensions.length > 0 ? (
              aiExtensions.map(renderExtension)
            ) : (
              <div className="text-center py-8 text-text-muted text-xs">No AI extensions found</div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
