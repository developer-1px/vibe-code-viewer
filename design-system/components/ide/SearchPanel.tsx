import * as React from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  CaseSensitive,
  WholeWord,
  FileSearch,
  Replace,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'

export interface SearchPanelProps {
  className?: string
}

interface SearchResult {
  file: string
  matches: {
    line: number
    text: string
    matchStart: number
    matchEnd: number
  }[]
}

/**
 * SearchPanel - File search interface
 *
 * Features:
 * - Search in files
 * - Replace functionality
 * - Search options (case sensitive, whole word, regex)
 * - File filters
 * - Grouped results by file
 */
export function SearchPanel({ className }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [replaceQuery, setReplaceQuery] = React.useState('')
  const [showReplace, setShowReplace] = React.useState(false)
  const [caseSensitive, setCaseSensitive] = React.useState(false)
  const [wholeWord, setWholeWord] = React.useState(false)
  const [useRegex, setUseRegex] = React.useState(false)
  const [expandedFiles, setExpandedFiles] = React.useState<Set<string>>(new Set())

  // Mock search results
  const searchResults: SearchResult[] = [
    {
      file: 'src/components/ide/CodeView.tsx',
      matches: [
        { line: 45, text: "  const user = await createUser(data)", matchStart: 16, matchEnd: 26 },
        { line: 52, text: "  return { success: true, user }", matchStart: 27, matchEnd: 31 },
      ],
    },
    {
      file: 'src/components/ide/OutlinePanel.tsx',
      matches: [
        { line: 12, text: "interface User {", matchStart: 10, matchEnd: 14 },
        { line: 89, text: "function getUserById(id: string) {", matchStart: 9, matchEnd: 20 },
      ],
    },
    {
      file: 'src/App.tsx',
      matches: [
        { line: 23, text: "  const currentUser = useUser()", matchStart: 8, matchEnd: 19 },
      ],
    },
  ]

  const totalMatches = searchResults.reduce((sum, result) => sum + result.matches.length, 0)

  const toggleFileExpanded = (file: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(file)) {
      newExpanded.delete(file)
    } else {
      newExpanded.add(file)
    }
    setExpandedFiles(newExpanded)
  }

  const renderMatchText = (match: SearchResult['matches'][0]) => {
    const before = match.text.substring(0, match.matchStart)
    const matchedText = match.text.substring(match.matchStart, match.matchEnd)
    const after = match.text.substring(match.matchEnd)

    return (
      <span className="font-mono text-xs">
        {before}
        <span className="bg-warm-300/20 text-warm-300 rounded px-0.5">{matchedText}</span>
        {after}
      </span>
    )
  }

  return (
    <div className={cn('flex h-full flex-col bg-bg-surface border-r border-border-DEFAULT', className)}>
      {/* Search Header */}
      <div className="p-3 space-y-2 border-b border-border-DEFAULT">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-text-muted" />
          <span className="text-xs font-medium text-text-primary uppercase tracking-wide">Search</span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-20 text-xs h-8"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-6 w-6 p-0', caseSensitive && 'bg-warm-300/10 text-warm-300')}
              onClick={() => setCaseSensitive(!caseSensitive)}
            >
              <CaseSensitive size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-6 w-6 p-0', wholeWord && 'bg-warm-300/10 text-warm-300')}
              onClick={() => setWholeWord(!wholeWord)}
            >
              <WholeWord size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-6 w-6 p-0', useRegex && 'bg-warm-300/10 text-warm-300')}
              onClick={() => setUseRegex(!useRegex)}
            >
              <span className="text-2xs font-mono">.*</span>
            </Button>
          </div>
        </div>

        {/* Replace Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-full justify-start text-xs gap-1"
          onClick={() => setShowReplace(!showReplace)}
        >
          <Replace size={12} />
          {showReplace ? 'Hide Replace' : 'Show Replace'}
        </Button>

        {/* Replace Input */}
        {showReplace && (
          <div className="relative">
            <Input
              placeholder="Replace..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="text-xs h-8"
            />
          </div>
        )}

        {/* File Filters */}
        <div className="space-y-1">
          <Input placeholder="files to include" className="text-xs h-7" />
          <Input placeholder="files to exclude" className="text-xs h-7" />
        </div>
      </div>

      {/* Results Count */}
      <div className="px-3 py-2 text-xs text-text-muted border-b border-border-DEFAULT">
        {searchQuery ? (
          <span>
            {totalMatches} {totalMatches === 1 ? 'result' : 'results'} in {searchResults.length}{' '}
            {searchResults.length === 1 ? 'file' : 'files'}
          </span>
        ) : (
          <span>Enter search text to find results</span>
        )}
      </div>

      {/* Search Results */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {searchQuery &&
            searchResults.map((result) => {
              const isExpanded = expandedFiles.has(result.file)
              return (
                <div key={result.file} className="rounded overflow-hidden">
                  {/* File Header */}
                  <button
                    onClick={() => toggleFileExpanded(result.file)}
                    className="w-full flex items-center gap-1 px-2 py-1 hover:bg-white/5 transition-colors text-left rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-text-muted shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-text-muted shrink-0" />
                    )}
                    <FileSearch size={14} className="text-warm-300 shrink-0" />
                    <span className="text-xs text-text-primary truncate flex-1">{result.file}</span>
                    <span className="text-xs text-text-muted shrink-0">{result.matches.length}</span>
                  </button>

                  {/* Match Results */}
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 mt-0.5">
                      {result.matches.map((match, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-start gap-2 px-2 py-1 hover:bg-white/5 transition-colors text-left rounded"
                        >
                          <span className="text-xs text-text-muted shrink-0 w-8 text-right">
                            {match.line}
                          </span>
                          <div className="flex-1 min-w-0 truncate">{renderMatchText(match)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </ScrollArea>
    </div>
  )
}
