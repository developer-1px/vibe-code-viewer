import React, { useState, useEffect } from 'react';
import {
  Files,
  Search,
  GitBranch,
  Sparkles,
  Terminal as TerminalIcon,
  Settings,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FileCode,
  X,
  Circle,
  Minus,
  Square,
  Maximize2,
  MoreHorizontal,
  Send,
  Play,
  GitCommit,
  Scissors,
  Clipboard,
  ClipboardPaste,
  RefreshCw,
  Check,
  AlertCircle,
  Info,
  ArrowUp,
  ArrowDown,
  Loader2,
  Command,
  CornerDownLeft,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Code,
  Layers,
  Zap,
  MessageSquare,
  PanelRightClose,
  PanelLeftClose,
  Sun,
  Moon,
} from 'lucide-react';

// ============================================
// LIMN DESIGN TOKENS
// ============================================
const tokens = {
  bg: {
    deep: '#08080d',
    base: '#0a0a10',
    surface: 'rgba(18, 18, 28, 0.9)',
    elevated: 'rgba(12, 12, 18, 0.98)',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  warm: {
    50: '#fffaf5',
    100: '#fff8f0',
    200: '#ffeedd',
    300: '#ffcc99',
    400: 'rgba(255, 200, 150, 0.9)',
    500: 'rgba(255, 180, 120, 0.8)',
    glow: 'rgba(255, 180, 120, 0.15)',
  },
  text: {
    primary: 'rgba(255, 240, 220, 0.95)',
    secondary: 'rgba(255, 250, 245, 0.7)',
    tertiary: 'rgba(255, 250, 245, 0.5)',
    muted: 'rgba(255, 250, 245, 0.35)',
    faint: 'rgba(255, 250, 245, 0.2)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.04)',
    default: 'rgba(255, 255, 255, 0.06)',
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.1)',
    warm: 'rgba(255, 200, 150, 0.2)',
    active: 'rgba(255, 200, 150, 0.3)',
  },
  status: {
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
};

// ============================================
// 1. WINDOW CONTROLS
// ============================================
const WindowControls = () => (
  <div style={{ display: 'flex', gap: 8, padding: '0 12px' }}>
    <div style={{
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: '#ff5f57',
      cursor: 'pointer',
    }} />
    <div style={{
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: '#febc2e',
      cursor: 'pointer',
    }} />
    <div style={{
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: '#28c840',
      cursor: 'pointer',
    }} />
  </div>
);

// ============================================
// 2. TITLE BAR
// ============================================
const TitleBar = ({ title, subtitle, isDirty }) => (
  <div style={{
    height: 38,
    background: tokens.bg.elevated,
    borderBottom: `1px solid ${tokens.border.default}`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    userSelect: 'none',
  }}>
    <WindowControls />
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: 8,
    }}>
      <FileCode size={14} style={{ opacity: 0.5 }} />
      <span style={{ color: tokens.text.secondary, fontSize: 13 }}>{title}</span>
      {isDirty && (
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: tokens.warm[300],
        }} />
      )}
      {subtitle && (
        <>
          <span style={{ color: tokens.text.faint }}>—</span>
          <span style={{ color: tokens.text.muted, fontSize: 12 }}>{subtitle}</span>
        </>
      )}
    </div>
    <div style={{ width: 68 }} />
  </div>
);

// ============================================
// 3. ACTIVITY BAR
// ============================================
const ActivityBarItem = ({ icon: Icon, isActive, hasBadge, onClick }) => (
  <div
    onClick={onClick}
    style={{
      width: 36,
      height: 36,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: isActive ? 'rgba(255,200,150,0.12)' : 'transparent',
      border: isActive ? `1px solid ${tokens.border.warm}` : '1px solid transparent',
      position: 'relative',
      transition: 'all 0.2s ease',
    }}
  >
    <Icon 
      size={20} 
      style={{ 
        color: isActive ? tokens.warm[300] : tokens.text.muted,
        strokeWidth: 1.5,
      }} 
    />
    {hasBadge && (
      <div style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: tokens.warm[300],
        boxShadow: '0 0 6px rgba(255,200,150,0.6)',
      }} />
    )}
  </div>
);

const ActivityBar = ({ activeId, onSelect }) => {
  const items = [
    { id: 'files', icon: Files },
    { id: 'search', icon: Search },
    { id: 'git', icon: GitBranch, badge: true },
    { id: 'ai', icon: Sparkles },
    { id: 'terminal', icon: TerminalIcon },
  ];

  return (
    <div style={{
      width: 48,
      background: 'rgba(10,10,16,0.98)',
      borderRight: `1px solid ${tokens.border.default}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 4,
    }}>
      {items.map((item) => (
        <ActivityBarItem
          key={item.id}
          icon={item.icon}
          isActive={activeId === item.id}
          hasBadge={item.badge}
          onClick={() => onSelect(item.id)}
        />
      ))}
      <div style={{ flex: 1 }} />
      <ActivityBarItem icon={Settings} isActive={false} />
    </div>
  );
};

// ============================================
// 4. FILE TREE
// ============================================
const FileTreeItem = ({ name, type, depth = 0, isActive, isOpen, hasChanges, onClick }) => {
  const Icon = type === 'folder' 
    ? (isOpen ? ChevronDown : ChevronRight)
    : FileCode;
  
  const FileIcon = type === 'folder' ? Folder : FileText;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        paddingLeft: 12 + depth * 16,
        cursor: 'pointer',
        background: isActive ? 'rgba(255,200,150,0.08)' : 'transparent',
        borderLeft: isActive 
          ? `2px solid ${tokens.warm[300]}` 
          : '2px solid transparent',
        transition: 'all 0.15s ease',
      }}
    >
      {type === 'folder' && (
        <Icon size={12} style={{ color: tokens.text.muted, flexShrink: 0 }} />
      )}
      <FileIcon 
        size={14} 
        style={{ 
          color: type === 'folder' ? tokens.text.tertiary : tokens.text.muted,
          flexShrink: 0,
        }} 
      />
      <span style={{ 
        color: isActive ? tokens.text.primary : tokens.text.secondary,
        fontSize: 13,
        flex: 1,
      }}>
        {name}
      </span>
      {hasChanges && (
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tokens.warm[300],
          flexShrink: 0,
        }} />
      )}
    </div>
  );
};

const FileTree = () => (
  <div style={{ padding: '8px 0' }}>
    <FileTreeItem name="src" type="folder" isOpen />
    <FileTreeItem name="components" type="folder" depth={1} isOpen />
    <FileTreeItem name="AuthService.ts" type="file" depth={2} isActive hasChanges />
    <FileTreeItem name="UserProfile.ts" type="file" depth={2} />
    <FileTreeItem name="api" type="folder" depth={1} />
    <FileTreeItem name="utils" type="folder" depth={1} />
    <FileTreeItem name="package.json" type="file" />
    <FileTreeItem name="tsconfig.json" type="file" />
  </div>
);

// ============================================
// 5. TAB BAR
// ============================================
const Tab = ({ name, isActive, isDirty, onClose }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: isActive ? tokens.bg.surface : 'transparent',
    borderBottom: isActive 
      ? `2px solid ${tokens.warm[300]}` 
      : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }}>
    <FileCode size={14} style={{ color: tokens.text.muted }} />
    <span style={{ 
      color: isActive ? tokens.text.primary : tokens.text.tertiary,
      fontSize: 12,
    }}>
      {name}
    </span>
    {isDirty && (
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: tokens.warm[300],
      }} />
    )}
    <X 
      size={14}
      onClick={(e) => { e.stopPropagation(); onClose?.(); }}
      style={{ 
        color: tokens.text.muted,
        opacity: isActive ? 1 : 0,
        cursor: 'pointer',
        transition: 'opacity 0.15s ease',
      }}
    />
  </div>
);

const TabBar = ({ tabs }) => (
  <div style={{
    display: 'flex',
    background: tokens.bg.elevated,
    borderBottom: `1px solid ${tokens.border.default}`,
  }}>
    {tabs.map((tab, i) => (
      <Tab key={i} {...tab} />
    ))}
  </div>
);

// ============================================
// 6. BREADCRUMB
// ============================================
const Breadcrumb = ({ path }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'rgba(15,15,22,0.5)',
    borderBottom: `1px solid ${tokens.border.subtle}`,
  }}>
    {path.map((item, i) => (
      <React.Fragment key={i}>
        <span style={{ 
          color: i === path.length - 1 ? tokens.text.secondary : tokens.text.muted,
          fontSize: 12,
          cursor: 'pointer',
        }}>
          {item}
        </span>
        {i < path.length - 1 && (
          <ChevronRight size={12} style={{ color: tokens.text.faint }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ============================================
// 7. COMMAND PALETTE
// ============================================
const CommandPalette = ({ isOpen }) => {
  if (!isOpen) return null;

  const commands = [
    { icon: FileText, label: 'New File', shortcut: '⌘N' },
    { icon: Search, label: 'Find in Files', shortcut: '⇧⌘F' },
    { icon: Sparkles, label: 'Ask AI', shortcut: '⌘K' },
    { icon: Play, label: 'Run Project', shortcut: '⌘R' },
    { icon: GitCommit, label: 'Git: Commit', shortcut: '⌘⇧C' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: tokens.bg.overlay,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: 120,
      zIndex: 1000,
    }}>
      <div style={{
        width: 560,
        background: tokens.bg.surface,
        borderRadius: 16,
        border: `1px solid ${tokens.border.medium}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.border.default}`,
        }}>
          <Search size={18} style={{ color: tokens.text.muted }} />
          <input
            type="text"
            placeholder="Type a command or search..."
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tokens.text.primary,
              fontSize: 15,
            }}
          />
          <div style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{ color: tokens.text.muted, fontSize: 11 }}>ESC</span>
          </div>
        </div>
        
        <div style={{ padding: '8px 0', maxHeight: 320, overflow: 'auto' }}>
          {commands.map((cmd, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                cursor: 'pointer',
                background: i === 0 ? 'rgba(255,200,150,0.08)' : 'transparent',
              }}
            >
              <cmd.icon size={16} style={{ color: tokens.text.tertiary }} />
              <span style={{ 
                color: i === 0 ? tokens.text.primary : tokens.text.secondary,
                fontSize: 14,
                flex: 1,
              }}>
                {cmd.label}
              </span>
              <span style={{ 
                color: tokens.text.muted, 
                fontSize: 12,
                fontFamily: 'monospace',
              }}>
                {cmd.shortcut}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 8. AI CHAT PANEL
// ============================================
const AIChatMessage = ({ role, content, isStreaming }) => (
  <div style={{
    display: 'flex',
    gap: 12,
    padding: '16px 20px',
    background: role === 'assistant' ? 'rgba(255,200,150,0.04)' : 'transparent',
  }}>
    <div style={{
      width: 28,
      height: 28,
      borderRadius: 8,
      background: role === 'assistant' 
        ? 'linear-gradient(135deg, rgba(255,200,150,0.3) 0%, rgba(255,180,120,0.2) 100%)'
        : 'rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {role === 'assistant' 
        ? <Sparkles size={14} style={{ color: tokens.warm[300] }} />
        : <div style={{ width: 12, height: 12, borderRadius: '50%', background: tokens.text.muted }} />
      }
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ 
        color: tokens.text.secondary, 
        fontSize: 14, 
        lineHeight: 1.6,
        margin: 0,
      }}>
        {content}
        {isStreaming && (
          <span style={{
            display: 'inline-block',
            width: 6,
            height: 14,
            background: tokens.warm[300],
            marginLeft: 2,
            animation: 'blink 1s infinite',
          }} />
        )}
      </p>
    </div>
  </div>
);

const AIChatPanel = () => (
  <div style={{
    width: 380,
    background: tokens.bg.elevated,
    borderLeft: `1px solid ${tokens.border.default}`,
    display: 'flex',
    flexDirection: 'column',
  }}>
    <div style={{
      padding: '14px 20px',
      borderBottom: `1px solid ${tokens.border.default}`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: tokens.status.success,
        boxShadow: '0 0 8px rgba(74,222,128,0.5)',
      }} />
      <Sparkles size={16} style={{ color: tokens.warm[300] }} />
      <span style={{ color: tokens.text.secondary, fontSize: 14, fontWeight: 500 }}>
        AI Assistant
      </span>
      <span style={{ color: tokens.text.muted, fontSize: 11, marginLeft: 'auto' }}>
        claude-3.5-sonnet
      </span>
    </div>

    <div style={{ flex: 1, overflow: 'auto' }}>
      <AIChatMessage 
        role="user" 
        content="handleCallback 함수를 리팩토링해줘. 에러 처리를 추가하고 싶어." 
      />
      <AIChatMessage 
        role="assistant" 
        content="네, handleCallback 함수에 try-catch 블록을 추가하고, 각 단계별 에러를 구분해서 처리하도록 개선하겠습니다." 
        isStreaming
      />
    </div>

    <div style={{
      padding: 16,
      borderTop: `1px solid ${tokens.border.default}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${tokens.border.light}`,
      }}>
        <input
          type="text"
          placeholder="Ask anything..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: tokens.text.secondary,
            fontSize: 14,
          }}
        />
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${tokens.warm[400]} 0%, ${tokens.warm[500]} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <ArrowUp size={14} style={{ color: tokens.bg.deep }} />
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// 9. INLINE SUGGESTION
// ============================================
const InlineSuggestion = () => (
  <div style={{
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '2px 0',
    display: 'flex',
    alignItems: 'center',
  }}>
    <span style={{ color: tokens.text.secondary }}>{'  const result = await '}</span>
    <span style={{ color: 'rgba(255,200,150,0.4)', fontStyle: 'italic' }}>
      client.getToken(code);
    </span>
    <span style={{
      marginLeft: 12,
      padding: '2px 8px',
      borderRadius: 4,
      background: 'rgba(255,200,150,0.1)',
      color: 'rgba(255,200,150,0.7)',
      fontSize: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      <CornerDownLeft size={10} />
      Tab
    </span>
  </div>
);

// ============================================
// 10. DIFF VIEW
// ============================================
const DiffLine = ({ type, lineNum, content }) => {
  const colors = {
    add: { bg: 'rgba(74,222,128,0.1)', border: tokens.status.success, text: 'rgba(74,222,128,0.9)' },
    remove: { bg: 'rgba(248,113,113,0.1)', border: tokens.status.error, text: 'rgba(248,113,113,0.9)' },
    normal: { bg: 'transparent', border: 'transparent', text: tokens.text.secondary },
  };
  const c = colors[type];

  return (
    <div style={{
      display: 'flex',
      background: c.bg,
      borderLeft: `3px solid ${c.border}`,
      fontFamily: 'monospace',
      fontSize: 13,
    }}>
      <span style={{
        width: 48,
        padding: '4px 12px',
        textAlign: 'right',
        color: tokens.text.faint,
        borderRight: `1px solid ${tokens.border.default}`,
      }}>
        {lineNum}
      </span>
      <span style={{
        width: 24,
        padding: '4px 8px',
        textAlign: 'center',
        color: c.text,
      }}>
        {type === 'add' ? <Plus size={12} /> : type === 'remove' ? <Minus size={12} /> : ' '}
      </span>
      <span style={{ padding: '4px 12px', color: c.text }}>
        {content}
      </span>
    </div>
  );
};

const DiffView = () => (
  <div style={{
    borderRadius: 10,
    overflow: 'hidden',
    border: `1px solid ${tokens.border.light}`,
  }}>
    <div style={{
      padding: '10px 16px',
      background: tokens.bg.surface,
      borderBottom: `1px solid ${tokens.border.default}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <FileCode size={14} style={{ color: tokens.text.muted }} />
      <span style={{ color: tokens.text.secondary, fontSize: 13 }}>AuthService.ts</span>
      <span style={{ color: tokens.text.muted, fontSize: 12, marginLeft: 'auto' }}>
        <span style={{ color: tokens.status.success }}>+12</span>
        {' '}
        <span style={{ color: tokens.status.error }}>−4</span>
      </span>
    </div>
    <div style={{ background: tokens.bg.base }}>
      <DiffLine type="normal" lineNum="8" content="export async function handleCallback(code) {" />
      <DiffLine type="remove" lineNum="9" content="  const { tokens } = await client.getToken();" />
      <DiffLine type="add" lineNum="9" content="  try {" />
      <DiffLine type="add" lineNum="10" content="    const { tokens } = await client.getToken();" />
      <DiffLine type="add" lineNum="11" content="  } catch (error) {" />
      <DiffLine type="add" lineNum="12" content="    throw new AuthError('Token exchange failed');" />
      <DiffLine type="add" lineNum="13" content="  }" />
    </div>
  </div>
);

// ============================================
// 11. TERMINAL
// ============================================
const Terminal = () => (
  <div style={{
    background: tokens.bg.deep,
    borderTop: `1px solid ${tokens.border.default}`,
    fontFamily: 'monospace',
    fontSize: 12,
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      borderBottom: `1px solid ${tokens.border.default}`,
    }}>
      <TerminalIcon size={14} style={{ color: tokens.text.tertiary }} />
      <span style={{ color: tokens.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terminal</span>
      <div style={{
        padding: '2px 8px',
        borderRadius: 4,
        background: 'rgba(255,200,150,0.1)',
      }}>
        <span style={{ color: tokens.warm[300], fontSize: 11 }}>zsh</span>
      </div>
      <X size={14} style={{ color: tokens.text.muted, marginLeft: 'auto', cursor: 'pointer' }} />
    </div>

    <div style={{ padding: 16, lineHeight: 1.8 }}>
      <div>
        <span style={{ color: tokens.status.success }}>➜</span>
        <span style={{ color: tokens.status.info }}> ~/projects/auth-system</span>
        <span style={{ color: tokens.text.tertiary }}> npm run dev</span>
      </div>
      <div style={{ color: tokens.text.tertiary }}>
        Starting development server...
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.status.success }}>
        <Check size={12} />
        Ready in 1.2s
      </div>
      <div style={{ color: tokens.text.tertiary }}>
        Local: http://localhost:3000
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{ color: tokens.status.success }}>➜</span>
        <span style={{ color: tokens.status.info }}> ~/projects/auth-system</span>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 14,
          background: tokens.text.tertiary,
          marginLeft: 4,
          animation: 'blink 1s infinite',
        }} />
      </div>
    </div>
  </div>
);

// ============================================
// 12. STATUS BAR
// ============================================
const StatusBar = () => (
  <div style={{
    height: 24,
    background: 'rgba(255,200,150,0.06)',
    borderTop: `1px solid ${tokens.border.warm}`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontSize: 11,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <GitBranch size={12} style={{ color: tokens.text.tertiary }} />
        <span style={{ color: tokens.text.secondary }}>main</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowUp size={10} style={{ color: tokens.text.muted }} />
        <span style={{ color: tokens.text.muted }}>2</span>
        <ArrowDown size={10} style={{ color: tokens.text.muted }} />
        <span style={{ color: tokens.text.muted }}>0</span>
      </div>
    </div>

    <div style={{ flex: 1 }} />

    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ color: tokens.text.muted }}>Ln 24, Col 8</span>
      <span style={{ color: tokens.text.muted }}>UTF-8</span>
      <span style={{ color: tokens.text.muted }}>TypeScript</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tokens.status.success,
        }} />
        <Sparkles size={12} style={{ color: tokens.text.tertiary }} />
        <span style={{ color: tokens.text.secondary }}>Ready</span>
      </div>
    </div>
  </div>
);

// ============================================
// 13. CONTEXT MENU
// ============================================
const ContextMenu = ({ x, y }) => {
  const items = [
    { icon: Scissors, label: 'Cut', shortcut: '⌘X' },
    { icon: Clipboard, label: 'Copy', shortcut: '⌘C' },
    { icon: ClipboardPaste, label: 'Paste', shortcut: '⌘V' },
    { divider: true },
    { icon: Sparkles, label: 'Ask AI to explain', shortcut: '⌘K' },
    { icon: RefreshCw, label: 'Refactor', shortcut: '⌘⇧R' },
  ];

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      minWidth: 220,
      background: tokens.bg.surface,
      borderRadius: 10,
      border: `1px solid ${tokens.border.medium}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      padding: '6px 0',
      zIndex: 1000,
    }}>
      {items.map((item, i) => (
        item.divider ? (
          <div key={i} style={{
            height: 1,
            background: tokens.border.default,
            margin: '6px 0',
          }} />
        ) : (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            <item.icon size={14} style={{ color: tokens.text.muted }} />
            <span style={{ color: tokens.text.secondary, fontSize: 13, flex: 1 }}>
              {item.label}
            </span>
            <span style={{ color: tokens.text.muted, fontSize: 11, fontFamily: 'monospace' }}>
              {item.shortcut}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

// ============================================
// 14. TOAST
// ============================================
const Toast = ({ type, message, action }) => {
  const styles = {
    success: { icon: Check, color: tokens.status.success },
    error: { icon: AlertCircle, color: tokens.status.error },
    info: { icon: Sparkles, color: tokens.warm[300] },
  };
  const s = styles[type];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 10,
      background: `${s.color}15`,
      border: `1px solid ${s.color}40`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      minWidth: 300,
    }}>
      <s.icon size={16} style={{ color: s.color }} />
      <span style={{ color: tokens.text.primary, fontSize: 14, flex: 1 }}>
        {message}
      </span>
      {action && (
        <span style={{ 
          color: tokens.warm[300], 
          fontSize: 13, 
          cursor: 'pointer',
          fontWeight: 500,
        }}>
          {action}
        </span>
      )}
    </div>
  );
};

// ============================================
// 15. AGENT STATUS
// ============================================
const AgentStatus = ({ status, task }) => {
  const states = {
    idle: { color: tokens.text.muted, label: 'Ready', icon: Circle },
    thinking: { color: tokens.status.warning, label: 'Thinking...', icon: Loader2 },
    working: { color: tokens.warm[300], label: 'Working', icon: Zap },
    complete: { color: tokens.status.success, label: 'Complete', icon: Check },
  };
  const s = states[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 10,
      background: tokens.bg.surface,
      border: `1px solid ${tokens.border.light}`,
    }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: s.color,
        boxShadow: status !== 'idle' ? `0 0 12px ${s.color}` : 'none',
        animation: status === 'thinking' || status === 'working' ? 'pulse 1.5s infinite' : 'none',
      }} />
      <div style={{ flex: 1 }}>
        <p style={{ color: tokens.text.secondary, fontSize: 13, margin: 0 }}>
          {s.label}
        </p>
        {task && (
          <p style={{ color: tokens.text.muted, fontSize: 11, margin: '4px 0 0 0' }}>
            {task}
          </p>
        )}
      </div>
      {(status === 'thinking' || status === 'working') && (
        <Loader2 
          size={16} 
          style={{ 
            color: tokens.warm[300],
            animation: 'spin 1s linear infinite',
          }} 
        />
      )}
    </div>
  );
};

// ============================================
// 16. PROGRESS BAR
// ============================================
const ProgressBar = ({ value, label }) => (
  <div style={{ width: '100%' }}>
    {label && (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{ color: tokens.text.secondary, fontSize: 12 }}>{label}</span>
        <span style={{ color: tokens.text.muted, fontSize: 12 }}>{value}%</span>
      </div>
    )}
    <div style={{
      height: 4,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        borderRadius: 2,
        background: `linear-gradient(90deg, ${tokens.warm[400]} 0%, ${tokens.warm[300]} 100%)`,
        boxShadow: '0 0 12px rgba(255,200,150,0.4)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  </div>
);

// ============================================
// 17. SEMANTIC ZOOM TOGGLE
// ============================================
const SemanticZoomToggle = ({ level, onChange }) => {
  const levels = [
    { id: 1, label: 'Vibe', icon: Layers },
    { id: 2, label: 'Logic', icon: GitBranch },
    { id: 3, label: 'Syntax', icon: Code },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {levels.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            border: level === l.id 
              ? `1px solid ${tokens.border.active}` 
              : `1px solid ${tokens.border.default}`,
            background: level === l.id
              ? 'linear-gradient(135deg, rgba(255,200,150,0.15) 0%, rgba(255,180,120,0.08) 100%)'
              : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <l.icon 
            size={14} 
            style={{ 
              color: level === l.id ? tokens.warm[300] : tokens.text.muted,
            }} 
          />
          <span style={{ 
            color: level === l.id ? tokens.text.primary : tokens.text.muted,
            fontSize: 12,
            fontWeight: level === l.id ? 500 : 400,
          }}>
            {l.label}
          </span>
        </button>
      ))}
    </div>
  );
};

// ============================================
// MAIN SHOWCASE
// ============================================
export default function LimnIDEClean() {
  const [activeTab, setActiveTab] = useState('files');
  const [zoomLevel, setZoomLevel] = useState(2);

  return (
    <div style={{
      height: '100vh',
      background: tokens.bg.deep,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TitleBar title="AuthService.ts" subtitle="auth-system" isDirty />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ActivityBar activeId={activeTab} onSelect={setActiveTab} />

        <div style={{
          width: 260,
          background: tokens.bg.elevated,
          borderRight: `1px solid ${tokens.border.default}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${tokens.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ 
              color: tokens.text.muted, 
              fontSize: 11, 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Explorer
            </span>
            <MoreHorizontal size={14} style={{ color: tokens.text.muted, cursor: 'pointer' }} />
          </div>
          <FileTree />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TabBar tabs={[
            { name: 'AuthService.ts', isActive: true, isDirty: true },
            { name: 'types.ts', isActive: false },
          ]} />
          <Breadcrumb path={['src', 'components', 'AuthService.ts']} />
          
          {/* Editor Header with Semantic Zoom */}
          <div style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${tokens.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <SemanticZoomToggle level={zoomLevel} onChange={setZoomLevel} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PanelRightClose size={16} style={{ color: tokens.text.muted, cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ flex: 1, background: tokens.bg.base, padding: 24, overflow: 'auto' }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: tokens.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Inline Suggestion
              </h3>
              <InlineSuggestion />
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: tokens.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Diff View
              </h3>
              <DiffView />
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: tokens.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Agent Status
              </h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <AgentStatus status="idle" />
                <AgentStatus status="working" task="Refactoring handleCallback..." />
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: tokens.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Progress
              </h3>
              <div style={{ maxWidth: 320 }}>
                <ProgressBar value={67} label="Generating code..." />
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: tokens.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Toast Notifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Toast type="success" message="Changes saved successfully" />
                <Toast type="error" message="Failed to connect to server" action="Retry" />
                <Toast type="info" message="AI is analyzing your code..." />
              </div>
            </div>
          </div>

          <Terminal />
        </div>

        <AIChatPanel />
      </div>

      <StatusBar />

      <ContextMenu x={100} y={200} />

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
