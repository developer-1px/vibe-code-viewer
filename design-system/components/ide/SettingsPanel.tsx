import * as React from 'react'
import { Settings, X, Palette, Keyboard, Code, Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { Separator } from '@/components/ui/Separator'
import { Button } from '@/components/ui/Button'

export interface SettingsPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * SettingsPanel - IDE settings dialog with multiple tabs
 *
 * Features:
 * - Editor settings (font, tab size, line numbers)
 * - Appearance settings (theme, icon theme, zoom)
 * - Keybindings settings (preset, custom shortcuts)
 * - Features settings (AI, Git, terminal)
 */
export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const [fontSize, setFontSize] = React.useState('14')
  const [tabSize, setTabSize] = React.useState('2')
  const [theme, setTheme] = React.useState('limn-warm')
  const [aiEnabled, setAiEnabled] = React.useState(true)
  const [gitEnabled, setGitEnabled] = React.useState(true)
  const [formatOnSave, setFormatOnSave] = React.useState(true)
  const [lineNumbers, setLineNumbers] = React.useState(true)
  const [minimap, setMinimap] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} className="text-warm-300" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your IDE preferences and features
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code size={14} />
              Editor
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette size={14} />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="keybindings" className="flex items-center gap-2">
              <Keyboard size={14} />
              Keybindings
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Zap size={14} />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Editor Tab */}
          <TabsContent value="editor" className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-primary">Text Editor</h3>

              <div className="grid gap-4">
                {/* Font Family */}
                <div className="grid gap-2">
                  <Label htmlFor="font-family">Font Family</Label>
                  <Select defaultValue="fira-code">
                    <SelectTrigger id="font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fira-code">Fira Code</SelectItem>
                      <SelectItem value="jetbrains-mono">JetBrains Mono</SelectItem>
                      <SelectItem value="cascadia-code">Cascadia Code</SelectItem>
                      <SelectItem value="source-code-pro">Source Code Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size */}
                <div className="grid gap-2">
                  <Label htmlFor="font-size">Font Size (px)</Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    min="10"
                    max="24"
                  />
                </div>

                {/* Tab Size */}
                <div className="grid gap-2">
                  <Label htmlFor="tab-size">Tab Size</Label>
                  <Select value={tabSize} onValueChange={setTabSize}>
                    <SelectTrigger id="tab-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 spaces</SelectItem>
                      <SelectItem value="4">4 spaces</SelectItem>
                      <SelectItem value="8">8 spaces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-primary">Display</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="line-numbers" className="flex-1">
                    <span className="text-sm">Line Numbers</span>
                    <p className="text-xs text-text-muted">Show line numbers in the editor</p>
                  </Label>
                  <Switch
                    id="line-numbers"
                    checked={lineNumbers}
                    onCheckedChange={setLineNumbers}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="minimap" className="flex-1">
                    <span className="text-sm">Minimap</span>
                    <p className="text-xs text-text-muted">Show code minimap on the right</p>
                  </Label>
                  <Switch
                    id="minimap"
                    checked={minimap}
                    onCheckedChange={setMinimap}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="format-on-save" className="flex-1">
                    <span className="text-sm">Format on Save</span>
                    <p className="text-xs text-text-muted">Automatically format code when saving</p>
                  </Label>
                  <Switch
                    id="format-on-save"
                    checked={formatOnSave}
                    onCheckedChange={setFormatOnSave}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-primary">Color Theme</h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limn-warm">LIMN Warm (Default)</SelectItem>
                      <SelectItem value="limn-monotone">LIMN Monotone</SelectItem>
                      <SelectItem value="limn-colorful">LIMN Colorful</SelectItem>
                      <SelectItem value="dark-plus">Dark+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="icon-theme">Icon Theme</Label>
                  <Select defaultValue="lucide">
                    <SelectTrigger id="icon-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lucide">Lucide Icons</SelectItem>
                      <SelectItem value="material">Material Icons</SelectItem>
                      <SelectItem value="minimal">Minimal Icons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zoom">Zoom Level (%)</Label>
                  <Input
                    id="zoom"
                    type="number"
                    defaultValue="100"
                    min="50"
                    max="200"
                    step="10"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Keybindings Tab */}
          <TabsContent value="keybindings" className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-primary">Keyboard Shortcuts</h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="keymap-preset">Keymap Preset</Label>
                  <Select defaultValue="default">
                    <SelectTrigger id="keymap-preset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">LIMN Default</SelectItem>
                      <SelectItem value="vscode">VS Code</SelectItem>
                      <SelectItem value="vim">Vim</SelectItem>
                      <SelectItem value="emacs">Emacs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs text-text-muted">
                  <p>Common shortcuts:</p>
                  <div className="mt-2 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Command Palette</span>
                      <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-DEFAULT">⌘K</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Quick Open</span>
                      <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-DEFAULT">⌘P</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Settings</span>
                      <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-DEFAULT">⌘,</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-primary">Integrations</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-enabled" className="flex-1">
                    <span className="text-sm">AI Assistant</span>
                    <p className="text-xs text-text-muted">Enable AI-powered code suggestions</p>
                  </Label>
                  <Switch
                    id="ai-enabled"
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="git-enabled" className="flex-1">
                    <span className="text-sm">Git Integration</span>
                    <p className="text-xs text-text-muted">Enable Git source control</p>
                  </Label>
                  <Switch
                    id="git-enabled"
                    checked={gitEnabled}
                    onCheckedChange={setGitEnabled}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="telemetry" />
                  <Label htmlFor="telemetry" className="text-sm">
                    Send anonymous usage data
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="crash-reports" />
                  <Label htmlFor="crash-reports" className="text-sm">
                    Send crash reports
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm">
                Reset to Defaults
              </Button>
              <Button size="sm" className="bg-warm-300 text-bg-deep hover:bg-warm-300/90">
                Save Changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
