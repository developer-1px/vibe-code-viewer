import * as React from 'react'
import { cn } from '@/components/lib/utils'
import { GitBranch, ArrowUp, ArrowDown } from 'lucide-react'
import { Indicator } from '@/components/ui/Indicator'

export interface StatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  branch?: string
  ahead?: number
  behind?: number
  line?: number
  column?: number
  encoding?: string
  language?: string
  aiActive?: boolean
}

const StatusBar = React.forwardRef<HTMLDivElement, StatusBarProps>(
  ({
    className,
    branch = 'main',
    ahead = 0,
    behind = 0,
    line = 1,
    column = 1,
    encoding = 'UTF-8',
    language = 'TS',
    aiActive = false,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-[var(--limn-statusbar-height)] items-center justify-between border-t px-3 text-xs text-text-secondary',
          'border-border-warm/30 bg-[rgba(255,200,150,0.08)]',
          className
        )}
        {...props}
      >
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <GitBranch size={11} className="text-text-muted" strokeWidth={1.5} />
            <span>{branch}</span>
            {(ahead > 0 || behind > 0) && (
              <div className="flex items-center gap-0.5 text-2xs">
                {ahead > 0 && (
                  <span className="flex items-center">
                    <ArrowUp size={9} />
                    {ahead}
                  </span>
                )}
                {behind > 0 && (
                  <span className="flex items-center">
                    <ArrowDown size={9} />
                    {behind}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <span>Ln {line}, Col {column}</span>
          <span>{encoding}</span>
          <span>{language}</span>
          {aiActive && (
            <div className="flex items-center gap-1">
              <Indicator variant="working" />
              <span className="text-warm-300">AI</span>
            </div>
          )}
        </div>
      </div>
    )
  }
)
StatusBar.displayName = 'StatusBar'

export { StatusBar }
