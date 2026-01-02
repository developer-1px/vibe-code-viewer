import * as React from 'react'
import {
  FileText,
  Search,
  Settings,
  GitBranch,
  Terminal,
  Sparkles,
  Code,
  FolderOpen,
  FileCode,
  Command as CommandIcon,
  Palette,
  Zap,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/Command'

export interface QuickActionsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * QuickActionsDialog - Command palette for quick actions
 *
 * Features:
 * - Quick file opening
 * - Command execution
 * - Symbol search
 * - Recent files
 * - Keyboard navigation
 */
export function QuickActionsDialog({ open, onOpenChange }: QuickActionsDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Files */}
        <CommandGroup heading="Recent Files">
          <CommandItem>
            <FileCode className="mr-2 h-4 w-4" />
            <span>App.tsx</span>
            <CommandShortcut>Recently opened</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <FileCode className="mr-2 h-4 w-4" />
            <span>main.tsx</span>
            <CommandShortcut>2 minutes ago</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <FileText className="mr-2 h-4 w-4" />
            <span>README.md</span>
            <CommandShortcut>5 minutes ago</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Commands */}
        <CommandGroup heading="Commands">
          <CommandItem>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Open File...</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Search className="mr-2 h-4 w-4" />
            <span>Search in Files</span>
            <CommandShortcut>⌘⇧F</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <CommandIcon className="mr-2 h-4 w-4" />
            <span>Command Palette</span>
            <CommandShortcut>⌘⇧P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <GitBranch className="mr-2 h-4 w-4" />
            <span>Git: Commit</span>
            <CommandShortcut>⌘⇧G</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Toggle Terminal</span>
            <CommandShortcut>⌃`</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* AI Features */}
        <CommandGroup heading="AI Features">
          <CommandItem>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>AI: Generate Code</span>
            <CommandShortcut>⌘⇧A</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>AI: Explain Code</span>
            <CommandShortcut>⌘⇧E</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>AI: Refactor</span>
            <CommandShortcut>⌘⇧R</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* View */}
        <CommandGroup heading="View">
          <CommandItem>
            <Code className="mr-2 h-4 w-4" />
            <span>Toggle Sidebar</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Palette className="mr-2 h-4 w-4" />
            <span>Change Theme</span>
            <CommandShortcut>⌘K ⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Zap className="mr-2 h-4 w-4" />
            <span>Toggle Zen Mode</span>
            <CommandShortcut>⌘K Z</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
