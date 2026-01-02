import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Layout, Code, MessageSquare, Package, Menu, X, Palette, FileCode, Layers } from 'lucide-react'
import { ToastProvider } from './components/ui/Toast'

// Pages
import Home from './pages/Home'
import IDELayout from './pages/IDELayout'
import EditorView from './pages/EditorView'
import ChatPanel from './pages/ChatPanel'
import Components from './pages/Components'

// Original Samples
import StyleGuide from './pages/samples/StyleGuide'
import IDEComponents from './pages/samples/IDEComponents'
import IDEClean from './pages/samples/IDEClean'

function Navigation() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/ide', label: 'IDE', icon: Layout },
    { path: '/editor', label: 'Editor', icon: Code },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/components', label: 'Components', icon: Package },
  ]

  const sampleLinks = [
    { path: '/samples/style-guide', label: 'Style Guide (Original)', icon: Palette },
    { path: '/samples/ide-components', label: 'IDE Components (Original)', icon: FileCode },
    { path: '/samples/ide-clean', label: 'IDE Clean (Original)', icon: Layers },
  ]

  // Hide navigation on full IDE layout
  if (location.pathname === '/ide') return null

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border-light bg-bg-elevated/95 backdrop-blur-sm shadow-lg transition-all hover:border-border-warm"
      >
        {isOpen ? (
          <X size={18} className="text-text-secondary" />
        ) : (
          <Menu size={18} className="text-text-secondary" />
        )}
      </button>

      {/* Sidebar Navigation */}
      <nav
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r border-border-light bg-bg-elevated/98 backdrop-blur-sm shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-4 pt-20">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-warm-400 to-warm-500">
              <span className="text-sm font-bold text-bg-deep">L</span>
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">LIMN</div>
              <div className="text-xs text-text-muted">Design System</div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {links.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    location.pathname === path
                      ? 'active-glow text-text-primary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            {/* Separator */}
            <div className="my-4 border-t border-border-subtle" />

            {/* Original Samples */}
            <div className="space-y-1">
              <div className="label px-3 mb-2">Original Samples (docs/)</div>
              {sampleLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    location.pathname === path
                      ? 'active-glow text-text-primary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle pt-4">
            <div className="rounded-lg bg-warm-glow/10 p-3">
              <div className="text-xs text-text-tertiary">
                <span className="label mb-1 block">Version</span>
                <span className="text-warm-300">v2.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-bg-overlay backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ide" element={<IDELayout />} />
          <Route path="/editor" element={<EditorView />} />
          <Route path="/chat" element={<ChatPanel />} />
          <Route path="/components" element={<Components />} />

          {/* Original Samples */}
          <Route path="/samples/style-guide" element={<StyleGuide />} />
          <Route path="/samples/ide-components" element={<IDEComponents />} />
          <Route path="/samples/ide-clean" element={<IDEClean />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
