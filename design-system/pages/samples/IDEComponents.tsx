import React, { useState } from 'react';

// ============================================
// LIMN IDE DESIGN SYSTEM - APP COMPONENTS
// For Desktop AI-powered IDE Application
// ============================================

// ============================================
// 1. WINDOW CONTROLS (Traffic Lights)
// ============================================
const WindowControls = ({ onClose, onMinimize, onMaximize }) => (
  <div style={{ display: 'flex', gap: 8, padding: '0 12px' }}>
    {[
      { color: '#ff5f57', hoverColor: '#ff3b30', action: onClose },
      { color: '#febc2e', hoverColor: '#ff9500', action: onMinimize },
      { color: '#28c840', hoverColor: '#28cd41', action: onMaximize },
    ].map((btn, i) => (
      <div
        key={i}
        onClick={btn.action}
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: btn.color,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      />
    ))}
  </div>
);

// ============================================
// 2. TITLE BAR
// ============================================
const TitleBar = ({ title, subtitle, isDirty }) => (
  <div style={{
    height: 38,
    background: 'rgba(12,12,18,0.98)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    WebkitAppRegion: 'drag', // 드래그 가능 영역
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
      <span style={{ color: 'rgba(255,250,245,0.6)', fontSize: 13 }}>{title}</span>
      {isDirty && (
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#ffcc99',
        }} />
      )}
      {subtitle && (
        <>
          <span style={{ color: 'rgba(255,250,245,0.2)' }}>—</span>
          <span style={{ color: 'rgba(255,250,245,0.35)', fontSize: 12 }}>{subtitle}</span>
        </>
      )}
    </div>
    <div style={{ width: 68 }} /> {/* Balance for window controls */}
  </div>
);

// ============================================
// 3. ACTIVITY BAR (Leftmost sidebar)
// ============================================
const ActivityBar = ({ items, activeId, onSelect }) => (
  <div style={{
    width: 48,
    background: 'rgba(10,10,16,0.98)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0',
    gap: 4,
  }}>
    {items.map((item) => (
      <div
        key={item.id}
        onClick={() => onSelect(item.id)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: activeId === item.id 
            ? 'rgba(255,200,150,0.12)' 
            : 'transparent',
          border: activeId === item.id
            ? '1px solid rgba(255,200,150,0.2)'
            : '1px solid transparent',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ 
          fontSize: 18,
          opacity: activeId === item.id ? 1 : 0.4,
        }}>
          {item.icon}
        </span>
        {item.badge && (
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#ffcc99',
            boxShadow: '0 0 6px rgba(255,200,150,0.6)',
          }} />
        )}
      </div>
    ))}
    <div style={{ flex: 1 }} />
    {/* Settings at bottom */}
    <div style={{
      width: 36,
      height: 36,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      opacity: 0.4,
    }}>
      <span style={{ fontSize: 18 }}>⚙️</span>
    </div>
  </div>
);

// ============================================
// 4. FILE TREE
// ============================================
const FileTreeItem = ({ name, type, depth = 0, isActive, isOpen, hasChanges, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      paddingLeft: 12 + depth * 16,
      cursor: 'pointer',
      background: isActive 
        ? 'rgba(255,200,150,0.08)' 
        : 'transparent',
      borderLeft: isActive 
        ? '2px solid rgba(255,200,150,0.6)' 
        : '2px solid transparent',
      transition: 'all 0.15s ease',
    }}
  >
    {type === 'folder' && (
      <span style={{ 
        color: 'rgba(255,250,245,0.4)', 
        fontSize: 10,
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
      }}>
        ▶
      </span>
    )}
    <span style={{ 
      fontSize: type === 'folder' ? 14 : 13,
      opacity: type === 'folder' ? 0.7 : 0.5,
    }}>
      {type === 'folder' ? '📁' : '📄'}
    </span>
    <span style={{ 
      color: isActive ? 'rgba(255,240,220,0.95)' : 'rgba(255,250,245,0.7)',
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
        background: '#ffcc99',
      }} />
    )}
  </div>
);

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
    background: isActive 
      ? 'rgba(18,18,28,0.95)' 
      : 'transparent',
    borderBottom: isActive 
      ? '2px solid rgba(255,200,150,0.6)' 
      : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }}>
    <span style={{ fontSize: 12, opacity: 0.5 }}>📄</span>
    <span style={{ 
      color: isActive ? 'rgba(255,240,220,0.95)' : 'rgba(255,250,245,0.5)',
      fontSize: 12,
    }}>
      {name}
    </span>
    {isDirty && (
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#ffcc99',
      }} />
    )}
    <span 
      onClick={(e) => { e.stopPropagation(); onClose?.(); }}
      style={{ 
        color: 'rgba(255,250,245,0.3)', 
        fontSize: 14,
        marginLeft: 4,
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      ×
    </span>
  </div>
);

const TabBar = ({ tabs }) => (
  <div style={{
    display: 'flex',
    background: 'rgba(12,12,18,0.98)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
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
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }}>
    {path.map((item, i) => (
      <React.Fragment key={i}>
        <span style={{ 
          color: i === path.length - 1 ? 'rgba(255,250,245,0.7)' : 'rgba(255,250,245,0.4)',
          fontSize: 12,
          cursor: 'pointer',
        }}>
          {item}
        </span>
        {i < path.length - 1 && (
          <span style={{ color: 'rgba(255,250,245,0.2)', fontSize: 10 }}>›</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ============================================
// 7. COMMAND PALETTE (⌘K)
// ============================================
const CommandPalette = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const commands = [
    { icon: '📄', label: 'New File', shortcut: '⌘N' },
    { icon: '🔍', label: 'Find in Files', shortcut: '⇧⌘F' },
    { icon: '✨', label: 'Ask AI', shortcut: '⌘K' },
    { icon: '🚀', label: 'Run Project', shortcut: '⌘R' },
    { icon: '🔄', label: 'Git: Commit', shortcut: '⌘⇧C' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: 120,
      zIndex: 1000,
    }}>
      <div style={{
        width: 560,
        background: 'rgba(18,18,28,0.98)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Type a command or search..."
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'rgba(255,250,245,0.9)',
              fontSize: 15,
            }}
          />
          <div style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
          }}>
            <span style={{ color: 'rgba(255,250,245,0.3)', fontSize: 11 }}>ESC</span>
          </div>
        </div>
        
        {/* Commands List */}
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
              <span style={{ fontSize: 16 }}>{cmd.icon}</span>
              <span style={{ 
                color: i === 0 ? 'rgba(255,240,220,0.95)' : 'rgba(255,250,245,0.7)',
                fontSize: 14,
                flex: 1,
              }}>
                {cmd.label}
              </span>
              <span style={{ 
                color: 'rgba(255,250,245,0.3)', 
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
      <span style={{ fontSize: 14 }}>{role === 'assistant' ? '✦' : '👤'}</span>
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ 
        color: 'rgba(255,250,245,0.85)', 
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
            background: '#ffcc99',
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
    background: 'rgba(12,12,18,0.98)',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
  }}>
    {/* Header */}
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#4ade80',
        boxShadow: '0 0 8px rgba(74,222,128,0.5)',
      }} />
      <span style={{ color: 'rgba(255,250,245,0.8)', fontSize: 14, fontWeight: 500 }}>
        AI Assistant
      </span>
      <span style={{ 
        color: 'rgba(255,250,245,0.3)', 
        fontSize: 11,
        marginLeft: 'auto',
      }}>
        claude-3.5-sonnet
      </span>
    </div>

    {/* Messages */}
    <div style={{ flex: 1, overflow: 'auto' }}>
      <AIChatMessage 
        role="user" 
        content="handleCallback 함수를 리팩토링해줘. 에러 처리를 추가하고 싶어." 
      />
      <AIChatMessage 
        role="assistant" 
        content="네, handleCallback 함수에 try-catch 블록을 추가하고, 각 단계별 에러를 구분해서 처리하도록 개선하겠습니다. 먼저 토큰 교환 실패와 프로필 조회 실패를 분리하면..." 
        isStreaming
      />
    </div>

    {/* Input */}
    <div style={{
      padding: 16,
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <textarea
          placeholder="Ask anything..."
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'rgba(255,250,245,0.8)',
            fontSize: 14,
            resize: 'none',
            lineHeight: 1.5,
          }}
        />
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(255,200,150,0.9) 0%, rgba(255,180,120,0.9) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <span style={{ fontSize: 12 }}>↑</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// 9. INLINE CODE SUGGESTION (Ghost Text)
// ============================================
const InlineSuggestion = () => (
  <div style={{
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '2px 0',
    display: 'flex',
  }}>
    <span style={{ color: 'rgba(255,250,245,0.85)' }}>{'  const result = await '}</span>
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
    }}>
      Tab to accept
    </span>
  </div>
);

// ============================================
// 10. DIFF VIEW
// ============================================
const DiffLine = ({ type, lineNum, content }) => {
  const colors = {
    add: { bg: 'rgba(74,222,128,0.1)', border: '#4ade80', text: 'rgba(74,222,128,0.9)' },
    remove: { bg: 'rgba(248,113,113,0.1)', border: '#f87171', text: 'rgba(248,113,113,0.9)' },
    normal: { bg: 'transparent', border: 'transparent', text: 'rgba(255,250,245,0.7)' },
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
        color: 'rgba(255,250,245,0.2)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {lineNum}
      </span>
      <span style={{
        width: 20,
        padding: '4px 6px',
        textAlign: 'center',
        color: c.text,
      }}>
        {type === 'add' ? '+' : type === 'remove' ? '−' : ' '}
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
    border: '1px solid rgba(255,255,255,0.08)',
  }}>
    <div style={{
      padding: '10px 16px',
      background: 'rgba(18,18,28,0.8)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ fontSize: 12 }}>📄</span>
      <span style={{ color: 'rgba(255,250,245,0.7)', fontSize: 13 }}>AuthService.ts</span>
      <span style={{ color: 'rgba(255,250,245,0.3)', fontSize: 12, marginLeft: 'auto' }}>
        +12 −4
      </span>
    </div>
    <div style={{ background: 'rgba(12,12,18,0.95)' }}>
      <DiffLine type="normal" lineNum="8" content="export async function handleCallback(code) {" />
      <DiffLine type="remove" lineNum="9" content="  const { tokens } = await client.getToken(code);" />
      <DiffLine type="add" lineNum="9" content="  try {" />
      <DiffLine type="add" lineNum="10" content="    const { tokens } = await client.getToken(code);" />
      <DiffLine type="add" lineNum="11" content="  } catch (error) {" />
      <DiffLine type="add" lineNum="12" content="    throw new AuthError('Token exchange failed', error);" />
      <DiffLine type="add" lineNum="13" content="  }" />
    </div>
  </div>
);

// ============================================
// 11. TERMINAL
// ============================================
const Terminal = () => (
  <div style={{
    background: 'rgba(8,8,12,0.98)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'monospace',
    fontSize: 12,
  }}>
    {/* Terminal Header */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ color: 'rgba(255,250,245,0.6)', fontSize: 12 }}>TERMINAL</span>
      <div style={{
        padding: '2px 8px',
        borderRadius: 4,
        background: 'rgba(255,200,150,0.1)',
      }}>
        <span style={{ color: 'rgba(255,200,150,0.8)', fontSize: 11 }}>zsh</span>
      </div>
      <span style={{ color: 'rgba(255,250,245,0.2)', marginLeft: 'auto', fontSize: 16 }}>×</span>
    </div>

    {/* Terminal Content */}
    <div style={{ padding: 16, lineHeight: 1.8 }}>
      <div>
        <span style={{ color: '#4ade80' }}>➜</span>
        <span style={{ color: '#60a5fa' }}> ~/projects/auth-system</span>
        <span style={{ color: 'rgba(255,250,245,0.6)' }}> npm run dev</span>
      </div>
      <div style={{ color: 'rgba(255,250,245,0.5)' }}>
        Starting development server...
      </div>
      <div style={{ color: '#4ade80' }}>
        ✓ Ready in 1.2s
      </div>
      <div style={{ color: 'rgba(255,250,245,0.5)' }}>
        Local: http://localhost:3000
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{ color: '#4ade80' }}>➜</span>
        <span style={{ color: '#60a5fa' }}> ~/projects/auth-system</span>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 14,
          background: 'rgba(255,250,245,0.6)',
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
    background: 'rgba(255,200,150,0.08)',
    borderTop: '1px solid rgba(255,200,150,0.15)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontSize: 11,
  }}>
    {/* Left */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12 }}>🔀</span>
        <span style={{ color: 'rgba(255,250,245,0.7)' }}>main</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10 }}>🔄</span>
        <span style={{ color: 'rgba(255,250,245,0.5)' }}>↑2 ↓0</span>
      </div>
    </div>

    <div style={{ flex: 1 }} />

    {/* Right */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ color: 'rgba(255,250,245,0.5)' }}>Ln 24, Col 8</span>
      <span style={{ color: 'rgba(255,250,245,0.5)' }}>UTF-8</span>
      <span style={{ color: 'rgba(255,250,245,0.5)' }}>TypeScript</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#4ade80',
        }} />
        <span style={{ color: 'rgba(255,250,245,0.7)' }}>AI Ready</span>
      </div>
    </div>
  </div>
);

// ============================================
// 13. CONTEXT MENU
// ============================================
const ContextMenu = ({ x, y, items }) => (
  <div style={{
    position: 'fixed',
    left: x,
    top: y,
    minWidth: 200,
    background: 'rgba(18,18,28,0.98)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    padding: '6px 0',
    zIndex: 1000,
  }}>
    {items.map((item, i) => (
      item.divider ? (
        <div key={i} style={{
          height: 1,
          background: 'rgba(255,255,255,0.08)',
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
          <span style={{ fontSize: 14, width: 20 }}>{item.icon}</span>
          <span style={{ color: 'rgba(255,250,245,0.8)', fontSize: 13, flex: 1 }}>
            {item.label}
          </span>
          {item.shortcut && (
            <span style={{ color: 'rgba(255,250,245,0.3)', fontSize: 11, fontFamily: 'monospace' }}>
              {item.shortcut}
            </span>
          )}
        </div>
      )
    ))}
  </div>
);

// ============================================
// 14. TOAST / NOTIFICATION
// ============================================
const Toast = ({ type, message, action }) => {
  const styles = {
    success: { icon: '✓', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)' },
    error: { icon: '✕', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
    info: { icon: '✦', bg: 'rgba(255,200,150,0.1)', border: 'rgba(255,200,150,0.3)' },
  };
  const s = styles[type];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 10,
      background: s.bg,
      border: `1px solid ${s.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      minWidth: 300,
    }}>
      <span style={{ fontSize: 16 }}>{s.icon}</span>
      <span style={{ color: 'rgba(255,250,245,0.9)', fontSize: 14, flex: 1 }}>
        {message}
      </span>
      {action && (
        <span style={{ 
          color: '#ffcc99', 
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
// 15. AGENT STATUS INDICATOR
// ============================================
const AgentStatus = ({ status, task }) => {
  const states = {
    idle: { color: 'rgba(255,255,255,0.3)', label: 'Ready' },
    thinking: { color: '#fbbf24', label: 'Thinking...' },
    working: { color: '#ffcc99', label: 'Working' },
    complete: { color: '#4ade80', label: 'Complete' },
  };
  const s = states[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 10,
      background: 'rgba(18,18,28,0.8)',
      border: '1px solid rgba(255,255,255,0.08)',
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
        <p style={{ color: 'rgba(255,250,245,0.8)', fontSize: 13, margin: 0 }}>
          {s.label}
        </p>
        {task && (
          <p style={{ color: 'rgba(255,250,245,0.4)', fontSize: 11, margin: '4px 0 0 0' }}>
            {task}
          </p>
        )}
      </div>
      {(status === 'thinking' || status === 'working') && (
        <div style={{
          width: 16,
          height: 16,
          border: '2px solid rgba(255,200,150,0.3)',
          borderTopColor: '#ffcc99',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
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
        <span style={{ color: 'rgba(255,250,245,0.7)', fontSize: 12 }}>{label}</span>
        <span style={{ color: 'rgba(255,250,245,0.4)', fontSize: 12 }}>{value}%</span>
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
        background: 'linear-gradient(90deg, rgba(255,200,150,0.8) 0%, #ffcc99 100%)',
        boxShadow: '0 0 12px rgba(255,200,150,0.4)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  </div>
);

// ============================================
// 17. TOOLTIP
// ============================================
const Tooltip = ({ children, text }) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    {children}
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 8,
      padding: '6px 12px',
      borderRadius: 6,
      background: 'rgba(18,18,28,0.98)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: 'rgba(255,250,245,0.9)', fontSize: 12 }}>{text}</span>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid rgba(18,18,28,0.98)',
      }} />
    </div>
  </div>
);

// ============================================
// MAIN SHOWCASE
// ============================================
export default function LimnIDEComponents() {
  const [activeTab, setActiveTab] = useState('files');
  const [showCommand, setShowCommand] = useState(false);

  const activityItems = [
    { id: 'files', icon: '📁', badge: false },
    { id: 'search', icon: '🔍', badge: false },
    { id: 'git', icon: '🔀', badge: true },
    { id: 'agents', icon: '✦', badge: false },
    { id: 'terminal', icon: '⌨️', badge: false },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080d',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Title Bar */}
      <TitleBar title="AuthService.ts" subtitle="auth-system" isDirty />

      <div style={{ display: 'flex', height: 'calc(100vh - 38px - 24px)' }}>
        {/* Activity Bar */}
        <ActivityBar 
          items={activityItems} 
          activeId={activeTab}
          onSelect={setActiveTab}
        />

        {/* Sidebar */}
        <div style={{
          width: 260,
          background: 'rgba(12,12,18,0.98)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ 
              color: 'rgba(255,250,245,0.5)', 
              fontSize: 11, 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Explorer
            </span>
          </div>
          <FileTree />
        </div>

        {/* Main Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TabBar tabs={[
            { name: 'AuthService.ts', isActive: true, isDirty: true },
            { name: 'types.ts', isActive: false },
          ]} />
          <Breadcrumb path={['src', 'components', 'AuthService.ts']} />
          
          {/* Editor Content - Placeholder */}
          <div style={{ 
            flex: 1, 
            background: 'rgba(12,12,18,0.95)',
            padding: 20,
            overflow: 'auto',
          }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'rgba(255,250,245,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Inline Suggestion
              </h3>
              <InlineSuggestion />
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'rgba(255,250,245,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Diff View
              </h3>
              <DiffView />
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'rgba(255,250,245,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Agent Status
              </h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <AgentStatus status="idle" />
                <AgentStatus status="working" task="Refactoring handleCallback..." />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'rgba(255,250,245,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Progress
              </h3>
              <div style={{ maxWidth: 300 }}>
                <ProgressBar value={67} label="Generating code..." />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: 'rgba(255,250,245,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Toast Notifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Toast type="success" message="Changes saved successfully" />
                <Toast type="error" message="Failed to connect to server" action="Retry" />
                <Toast type="info" message="AI is analyzing your code..." />
              </div>
            </div>
          </div>

          {/* Terminal */}
          <Terminal />
        </div>

        {/* AI Chat Panel */}
        <AIChatPanel />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette (press ⌘K) */}
      <CommandPalette isOpen={showCommand} onClose={() => setShowCommand(false)} />

      {/* Demo Context Menu */}
      <ContextMenu 
        x={300} 
        y={200}
        items={[
          { icon: '✂️', label: 'Cut', shortcut: '⌘X' },
          { icon: '📋', label: 'Copy', shortcut: '⌘C' },
          { icon: '📄', label: 'Paste', shortcut: '⌘V' },
          { divider: true },
          { icon: '✦', label: 'Ask AI to explain', shortcut: '⌘K' },
          { icon: '🔄', label: 'Refactor', shortcut: '⌘⇧R' },
        ]}
      />

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
      `}</style>
    </div>
  );
}
