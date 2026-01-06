import * as React from 'react';
import { cn } from '@/components/lib/utils';

export interface TitleBarProps extends React.HTMLAttributes<HTMLDivElement> {
  filename?: string;
  projectName?: string;
  children?: React.ReactNode;
}

const TitleBar = React.forwardRef<HTMLDivElement, TitleBarProps>(
  ({ className, filename, projectName, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-[var(--limn-titlebar-height)] items-center justify-between border-b border-border-DEFAULT bg-bg-elevated px-3',
          className
        )}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        {...props}
      >
        {/* Window Controls */}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-status-error/70 hover:bg-status-error" />
          <div className="h-2.5 w-2.5 rounded-full bg-status-warning/70 hover:bg-status-warning" />
          <div className="h-2.5 w-2.5 rounded-full bg-status-success/70 hover:bg-status-success" />
        </div>
        {/* Title */}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {filename && (
            <>
              <span className="font-medium text-text-primary">{filename}</span>
              {projectName && (
                <>
                  <span className="text-text-muted">—</span>
                  <span>{projectName}</span>
                </>
              )}
            </>
          )}
        </div>
        {/* Right Controls */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {children}
        </div>
      </div>
    );
  }
);
TitleBar.displayName = 'TitleBar';

export { TitleBar };
