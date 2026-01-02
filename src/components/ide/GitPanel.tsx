import * as React from 'react'
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Plus,
  Minus,
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  RotateCw,
  Upload,
  Download,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Separator } from '@/components/ui/Separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { cn } from '@/components/lib/utils'

export interface GitPanelProps {
  className?: string
}

interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  staged: boolean
}

interface Commit {
  hash: string
  message: string
  author: string
  date: string
}

/**
 * GitPanel - Git source control interface
 *
 * Features:
 * - View changes (staged/unstaged)
 * - Stage/unstage files
 * - Commit changes
 * - Branch management
 * - Push/pull operations
 * - Commit history
 */
export function GitPanel({ className }: GitPanelProps) {
  const [commitMessage, setCommitMessage] = React.useState('')
  const [currentBranch, setCurrentBranch] = React.useState('main')
  const [showStagedChanges, setShowStagedChanges] = React.useState(true)
  const [showUnstagedChanges, setShowUnstagedChanges] = React.useState(true)
  const [showCommitHistory, setShowCommitHistory] = React.useState(false)

  const [fileChanges, setFileChanges] = React.useState<FileChange[]>([
    { path: 'src/components/ide/CodeView.tsx', status: 'modified', staged: true },
    { path: 'src/components/ide/OutlinePanel.tsx', status: 'modified', staged: true },
    { path: 'src/components/ui/Button.tsx', status: 'modified', staged: false },
    { path: 'src/App.tsx', status: 'modified', staged: false },
    { path: 'src/utils/helpers.ts', status: 'added', staged: false },
    { path: 'README.md', status: 'deleted', staged: false },
  ])

  const commits: Commit[] = [
    {
      hash: 'a1b2c3d',
      message: 'Add outline panel with symbol navigation',
      author: 'You',
      date: '2 hours ago',
    },
    {
      hash: 'e4f5g6h',
      message: 'Implement code view with syntax highlighting',
      author: 'You',
      date: '5 hours ago',
    },
    {
      hash: 'i7j8k9l',
      message: 'Initial LIMN design system setup',
      author: 'You',
      date: 'yesterday',
    },
  ]

  const stagedChanges = fileChanges.filter((f) => f.staged)
  const unstagedChanges = fileChanges.filter((f) => !f.staged)

  const toggleStage = (path: string) => {
    setFileChanges((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: !f.staged } : f))
    )
  }

  const stageAll = () => {
    setFileChanges((prev) => prev.map((f) => ({ ...f, staged: true })))
  }

  const unstageAll = () => {
    setFileChanges((prev) => prev.map((f) => ({ ...f, staged: false })))
  }

  const getStatusIcon = (status: FileChange['status']) => {
    switch (status) {
      case 'added':
        return <Plus size={12} className="text-status-success" />
      case 'modified':
        return <FileText size={12} className="text-yellow-500" />
      case 'deleted':
        return <Minus size={12} className="text-red-500" />
      case 'renamed':
        return <RotateCw size={12} className="text-blue-500" />
    }
  }

  const getStatusColor = (status: FileChange['status']) => {
    switch (status) {
      case 'added':
        return 'text-status-success'
      case 'modified':
        return 'text-yellow-500'
      case 'deleted':
        return 'text-red-500'
      case 'renamed':
        return 'text-blue-500'
    }
  }

  const renderFileChange = (file: FileChange) => (
    <button
      key={file.path}
      onClick={() => toggleStage(file.path)}
      className="w-full flex items-center gap-2 px-2 py-1 hover:bg-white/5 transition-colors text-left rounded group"
    >
      {getStatusIcon(file.status)}
      <span className={cn('text-xs flex-1 truncate', getStatusColor(file.status))}>{file.path}</span>
      <span className="text-2xs text-text-muted uppercase">{file.status.charAt(0)}</span>
      {file.staged ? (
        <Check size={12} className="text-status-success opacity-0 group-hover:opacity-100" />
      ) : (
        <Plus size={12} className="text-text-muted opacity-0 group-hover:opacity-100" />
      )}
    </button>
  )

  return (
    <div className={cn('flex h-full flex-col bg-bg-surface border-r border-border-DEFAULT', className)}>
      {/* Header */}
      <div className="p-3 space-y-2 border-b border-border-DEFAULT">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-text-muted" />
            <span className="text-xs font-medium text-text-primary uppercase tracking-wide">
              Source Control
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Pull">
              <Download size={12} />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Push">
              <Upload size={12} />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Refresh">
              <RotateCw size={12} />
            </Button>
          </div>
        </div>

        {/* Branch Selector */}
        <Select value={currentBranch} onValueChange={setCurrentBranch}>
          <SelectTrigger className="h-8 text-xs">
            <GitBranch size={12} className="mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="main">main</SelectItem>
            <SelectItem value="develop">develop</SelectItem>
            <SelectItem value="feature/new-ui">feature/new-ui</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Commit Message */}
          <div className="space-y-2">
            <Textarea
              placeholder="Commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="min-h-15 text-xs resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs bg-warm-300 text-bg-deep hover:bg-warm-300/90"
                disabled={!commitMessage || stagedChanges.length === 0}
              >
                <GitCommit size={12} className="mr-1" />
                Commit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                disabled={!commitMessage || stagedChanges.length === 0}
              >
                <GitCommit size={12} className="mr-1" />
                Commit & Push
              </Button>
            </div>
          </div>

          <Separator />

          {/* Staged Changes */}
          <div className="space-y-1">
            <button
              onClick={() => setShowStagedChanges(!showStagedChanges)}
              className="w-full flex items-center gap-1 px-1 py-1 hover:bg-white/5 rounded transition-colors"
            >
              {showStagedChanges ? (
                <ChevronDown size={14} className="text-text-muted" />
              ) : (
                <ChevronRight size={14} className="text-text-muted" />
              )}
              <span className="text-xs font-medium text-text-primary flex-1 text-left">
                Staged Changes
              </span>
              <span className="text-xs text-text-muted">{stagedChanges.length}</span>
              {stagedChanges.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-2xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    unstageAll()
                  }}
                >
                  <Minus size={10} className="mr-0.5" />
                  Unstage All
                </Button>
              )}
            </button>

            {showStagedChanges && (
              <div className="ml-2 space-y-0.5">
                {stagedChanges.length > 0 ? (
                  stagedChanges.map(renderFileChange)
                ) : (
                  <div className="px-2 py-3 text-xs text-text-muted text-center">
                    No staged changes
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Unstaged Changes */}
          <div className="space-y-1">
            <button
              onClick={() => setShowUnstagedChanges(!showUnstagedChanges)}
              className="w-full flex items-center gap-1 px-1 py-1 hover:bg-white/5 rounded transition-colors"
            >
              {showUnstagedChanges ? (
                <ChevronDown size={14} className="text-text-muted" />
              ) : (
                <ChevronRight size={14} className="text-text-muted" />
              )}
              <span className="text-xs font-medium text-text-primary flex-1 text-left">
                Changes
              </span>
              <span className="text-xs text-text-muted">{unstagedChanges.length}</span>
              {unstagedChanges.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-2xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    stageAll()
                  }}
                >
                  <Plus size={10} className="mr-0.5" />
                  Stage All
                </Button>
              )}
            </button>

            {showUnstagedChanges && (
              <div className="ml-2 space-y-0.5">
                {unstagedChanges.length > 0 ? (
                  unstagedChanges.map(renderFileChange)
                ) : (
                  <div className="px-2 py-3 text-xs text-text-muted text-center">
                    No changes
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Commit History */}
          <div className="space-y-1">
            <button
              onClick={() => setShowCommitHistory(!showCommitHistory)}
              className="w-full flex items-center gap-1 px-1 py-1 hover:bg-white/5 rounded transition-colors"
            >
              {showCommitHistory ? (
                <ChevronDown size={14} className="text-text-muted" />
              ) : (
                <ChevronRight size={14} className="text-text-muted" />
              )}
              <span className="text-xs font-medium text-text-primary flex-1 text-left">
                Recent Commits
              </span>
              <span className="text-xs text-text-muted">{commits.length}</span>
            </button>

            {showCommitHistory && (
              <div className="ml-2 space-y-1">
                {commits.map((commit) => (
                  <div
                    key={commit.hash}
                    className="px-2 py-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <GitCommit size={12} className="text-warm-300 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary line-clamp-2">{commit.message}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-muted">
                          <span className="font-mono">{commit.hash}</span>
                          <span>•</span>
                          <span>{commit.author}</span>
                          <span>•</span>
                          <span>{commit.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
