import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Indicator } from '@/components/ui/Indicator'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-deep flex flex-col">
      <div className="flex-1 overflow-y-auto p-12 pl-20 pt-12">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-warm-400 to-warm-500 opacity-25 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-warm-400 to-warm-500 shadow-glow-md">
                <Sparkles size={24} className="text-bg-deep" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-medium text-text-primary">
                LIMN Design System
              </h1>
              <p className="text-md text-text-tertiary">
                AI-powered IDE interface components
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-primary">Examples</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Link to="/ide">
              <Card className="cursor-pointer transition-all hover:border-border-warm">
                <CardHeader>
                  <CardTitle>Full IDE Layout</CardTitle>
                  <CardDescription>
                    Complete IDE interface with all components
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/editor">
              <Card className="cursor-pointer transition-all hover:border-border-warm">
                <CardHeader>
                  <CardTitle>Code Editor</CardTitle>
                  <CardDescription>
                    Editor view with syntax highlighting
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/chat">
              <Card className="cursor-pointer transition-all hover:border-border-warm">
                <CardHeader>
                  <CardTitle>AI Chat Panel</CardTitle>
                  <CardDescription>
                    AI assistant conversation interface
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/components">
              <Card className="cursor-pointer transition-all hover:border-border-warm">
                <CardHeader>
                  <CardTitle>Component Library</CardTitle>
                  <CardDescription>
                    All UI components showcase
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-primary">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-primary">Cards</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-3">
                  <Indicator variant="inactive" />
                  <span className="label">Inactive</span>
                </div>
                <CardTitle>Inactive Module</CardTitle>
                <CardDescription>
                  This module is currently not in use
                </CardDescription>
              </CardHeader>
            </Card>

            <Card active>
              <CardHeader>
                <div className="flex items-center gap-2 mb-3">
                  <Indicator variant="active" />
                  <span className="label">Active</span>
                </div>
                <CardTitle>Active Module</CardTitle>
                <CardDescription>
                  This module is currently running
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Input */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-primary">Input</h2>
          <div className="max-w-md">
            <Input placeholder="Describe what you want to build..." />
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-primary">Badges & Indicators</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="active">Active</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-6">
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
              <Indicator variant="working" />
              <span className="text-sm text-text-tertiary">Working</span>
            </div>
          </div>
        </section>

        {/* Design Tokens */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-primary">Design Tokens</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="label mb-3">Colors</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-warm-300" />
                      <span className="text-text-tertiary">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-status-success" />
                      <span className="text-text-tertiary">Success</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-status-warning" />
                      <span className="text-text-tertiary">Warning</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="label mb-3">Typography</h3>
                  <div className="space-y-2">
                    <p className="text-2xl text-text-primary">Title</p>
                    <p className="text-base text-text-secondary">Body</p>
                    <p className="text-sm text-text-tertiary">Caption</p>
                  </div>
                </div>
                <div>
                  <h3 className="label mb-3">Spacing</h3>
                  <div className="space-y-2 text-sm text-text-tertiary">
                    <div>4px, 6px, 8px</div>
                    <div>12px, 16px, 20px</div>
                    <div>24px, 32px, 48px</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
    </div>
  )
}
