# Project Conventions

## Architecture

### Feature-Sliced Design (FSD)

프로젝트는 FSD 아키텍처를 따릅니다:

```
src/
├── app/              # Application initialization
├── components/       # LIMN Design System (shadcn/ui style)
├── entities/         # Business entities (domain models)
├── features/         # User features (business logic units)
├── widgets/          # Complex UI components
├── shared/           # Shared utilities (currently not used)
├── services/         # External services & APIs
├── store/            # Global state (Jotai atoms)
└── hooks/            # Custom React hooks
```

### Layer Rules

#### components/
- **LIMN 디자인 시스템 컴포넌트 (shadcn/ui 방식)**
- 디자인팀에서 제공받은 컴포넌트를 복사하여 사용
- **직접 수정 가능** (프로젝트 요구사항에 맞게)
- 수정사항은 디자인팀에 피드백하여 LIMN에 반영
- `ui/` - 기본 UI 컴포넌트 (Button, Badge, Input 등)
- `ide/` - IDE 특화 컴포넌트 (ActivityBar, StatusBar, TabBar 등)
- 예: `components/ui/CommandPalette.tsx`, `components/ide/ActivityBar.tsx`

#### entities/
- **순수한 도메인 로직만 포함**
- UI 컴포넌트는 포함하지 않음 (lib, model만)
- 예: `entities/VariableNode/lib/`, `entities/CanvasNode/`

#### features/
- **독립적인 비즈니스 기능 단위**
- `lib/` - 순수 로직, 타입 정의
- `ui/` - UI 컴포넌트
- **중요**: Handler는 props로 전달하지 않고, 컴포넌트 내부에서 atom으로 처리
- 예: `features/CodeFold/`

#### widgets/
- **복잡한 UI 컴포넌트 조합**
- 여러 features/entities를 조합
- `ui/` - 하위 컴포넌트들
- 예: `widgets/CodeCard/`, `widgets/PipelineCanvas/`

---

## Import/Export Conventions

### ❌ 배럴 Export 사용 금지

**절대 사용하지 않음:**
```typescript
// ❌ index.ts - 만들지 않음
export * from './Component';
export { default } from './Component';
```

**올바른 방법:**
```typescript
// ✅ 직접 import
import FoldButton from '../../../features/CodeFold/ui/FoldButton';
import { FoldInfo } from '../../../features/CodeFold/lib/types';
```

### Import 경로 규칙

1. **확장자 제거**: `.tsx`, `.ts` 확장자 생략
   ```typescript
   // ✅
   import Component from './Component';

   // ❌
   import Component from './Component.tsx';
   ```

2. **상대 경로 사용**: 가능한 상대 경로 사용
   ```typescript
   // ✅ 일반적인 경우 - 상대 경로
   import { atom } from '../../../store/atoms';
   import { CodeFold } from '../../../features/CodeFold/ui/CodeFold';

   // ✅ components/ 예외 - @/ alias 허용
   import { ActivityBar } from '@/components/ide/ActivityBar';
   import { Button } from '@/components/ui/Button';

   // ❌ components 외에는 path alias 사용 안 함
   import { atom } from '@/store/atoms';
   ```

---

## Props Drilling Convention

### Handler Props Drilling 금지

**핵심 원칙**: 데이터는 props로 받되, Handler는 컴포넌트 내부에서 atom으로 처리

#### ❌ 잘못된 예 (Props Drilling)
```typescript
// Parent Component
const Parent = () => {
  const handleClick = () => { /* ... */ };

  return <Child onClick={handleClick} />;
};

// Child Component
interface ChildProps {
  onClick: () => void;  // ❌ Handler를 props로 받음
}

const Child: React.FC<ChildProps> = ({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
};
```

#### ✅ 올바른 예 (Atom 사용)
```typescript
// Parent Component
const Parent = () => {
  // Handler 전달 없음
  return <Child nodeId="123" data={someData} />;
};

// Child Component (features/)
interface ChildProps {
  nodeId: string;      // ✅ 데이터는 props로 받음
  data: SomeData;      // ✅ 데이터는 props로 받음
}

const Child: React.FC<ChildProps> = ({ nodeId, data }) => {
  const setAtom = useSetAtom(someAtom);  // ✅ Handler는 내부에서 atom 사용

  const handleClick = () => {
    setAtom((prev) => {
      // atom 업데이트 로직
    });
  };

  return <button onClick={handleClick}>Click</button>;
};
```

### Props vs Atom 판단 기준

| 항목 | Props로 전달 | Atom으로 처리 |
|------|--------------|---------------|
| **데이터** (nodeId, text, isActive 등) | ✅ | ❌ |
| **Handler** (onClick, onToggle 등) | ❌ | ✅ |
| **설정값** (config, options 등) | ✅ | ❌ |
| **상태 변경 로직** | ❌ | ✅ |

---

## State Management (Jotai)

### Atom 정의 위치
- **Global atoms**: `src/store/atoms.ts`
- **Feature-specific atoms**: Feature 디렉토리 내부 (필요시)

### Atom 사용 패턴
```typescript
// atoms.ts
export const foldedLinesAtom = atom(new Map<string, Set<number>>());

// Component
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { foldedLinesAtom } from '../../../store/atoms';

const Component = () => {
  // Read-only
  const foldedLines = useAtomValue(foldedLinesAtom);

  // Write-only
  const setFoldedLines = useSetAtom(foldedLinesAtom);

  // Read-write
  const [foldedLines, setFoldedLines] = useAtom(foldedLinesAtom);
};
```

---

## File Naming

### Component Files
- **PascalCase**: `ComponentName.tsx`
- **예**: `FoldButton.tsx`, `CodeCardLine.tsx`

### Utility Files
- **camelCase**: `utilityName.ts`
- **예**: `styleUtils.ts`, `tokenUtils.ts`

### Type Definition Files
- **camelCase**: `types.ts`
- **위치**: `lib/types.ts` 또는 `model/types.ts`

---

## TypeScript Conventions

### Interface vs Inline Props

**핵심 원칙**: Interface는 **데이터 구조**에만 사용, 컴포넌트 Props는 **Inline으로 작성**

#### ✅ Interface - 데이터 구조 정의
```typescript
// 순수 데이터 모델 - 여러 곳에서 재사용
export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  foldInfo?: FoldInfo;
}

export interface FoldInfo {
  isFoldable: boolean;
  foldStart: number;
  foldEnd: number;
}

// 도메인 엔티티
export interface CanvasNode {
  id: string;
  label: string;
  dependencies: string[];
}
```

**Interface 사용 기준:**
- ✅ 비즈니스 데이터 구조
- ✅ API 응답/요청 타입
- ✅ 여러 컴포넌트에서 재사용되는 타입
- ✅ 도메인 모델, 엔티티

#### ✅ Inline Props - 컴포넌트 Props
```typescript
// ✅ 컴포넌트 Props는 Inline으로
const FoldButton = ({
  nodeId,
  lineNum,
  foldInfo,
  isFolded
}: {
  nodeId: string;
  lineNum: number;
  foldInfo?: FoldInfo;  // 데이터 구조는 interface 재사용
  isFolded: boolean;
}) => {
  // ...
};

// ❌ 컴포넌트 Props를 interface로 정의하지 않음
interface FoldButtonProps {  // 이렇게 하지 않음
  nodeId: string;
  lineNum: number;
}

// ❌ React.FC 사용하지 않음
const FoldButton: React.FC<FoldButtonProps> = ({ ... }) => { ... }
```

**Inline Props 사용 이유:**
1. **응집도 향상** - 타입과 구현이 한 곳에
2. **재사용 불필요** - 그 컴포넌트에서만 사용
3. **보일러플레이트 감소** - Interface 정의 단계 제거
4. **명확한 구분** - 데이터(interface) vs UI 계약(inline props)

### Type Exports
```typescript
// ✅ export type 사용 (데이터 구조만)
export type { FoldInfo, FoldPlaceholder };

// ✅ export interface 사용 (데이터 구조만)
export interface CodeSegment {
  text: string;
  kind: string;
}
```

---

## Keyboard Shortcuts (react-hotkeys-hook)

### Scope Management 필수 원칙

**핵심 원칙**: 여러 컴포넌트가 동일한 키를 사용할 때 반드시 **scope 시스템**으로 충돌 방지

#### 🚨 Critical: Scope 없이 사용하면 충돌 발생

```typescript
// ❌ 잘못된 예 - scope 없음
// FolderView.tsx
useHotkeys('down', () => setFocusedIndex(prev => prev + 1), {
  enabled: true  // scope 없음!
});

// UnifiedSearchModal.tsx
useHotkeys('down', () => setFocusedIndex(prev => prev + 1), {
  enabled: isOpen  // scope 없음!
});

// 문제: 두 컴포넌트가 동시에 'down' 키를 처리하려고 해서 충돌
```

#### ✅ 올바른 예 - Scope 시스템 사용

**1단계: App.tsx에서 HotkeysProvider 설정**
```typescript
import { HotkeysProvider } from 'react-hotkeys-hook';

function App() {
  return (
    <HotkeysProvider initiallyActiveScopes={['sidebar']}>
      <AppContent />
    </HotkeysProvider>
  );
}
```

**2단계: 각 컴포넌트마다 고유한 scope 지정**

```typescript
// widgets/Sidebar/FolderView.tsx - 'sidebar' scope
import { useHotkeys } from 'react-hotkeys-hook';

const FolderView = () => {
  useHotkeys('down', () => {
    setFocusedIndex(prev => prev + 1);
  }, {
    scopes: ['sidebar'],           // ✅ 고유 scope
    enabled: focusedPane === 'sidebar'
  });

  useHotkeys('up', () => {
    setFocusedIndex(prev => prev - 1);
  }, {
    scopes: ['sidebar'],           // ✅ 고유 scope
    enabled: focusedPane === 'sidebar'
  });
};
```

```typescript
// features/UnifiedSearch/ui/UnifiedSearchModal.tsx - 'search' scope
import { useHotkeys, useHotkeysContext } from 'react-hotkeys-hook';

const UnifiedSearchModal = () => {
  const [isOpen, setIsOpen] = useAtom(searchModalOpenAtom);

  // Scope 제어 함수
  const { enableScope, disableScope } = useHotkeysContext();

  // 모달 열릴 때 'search' scope 활성화
  useEffect(() => {
    if (isOpen) {
      enableScope('search');
      console.log('[UnifiedSearchModal] Enabled search scope');
    } else {
      disableScope('search');
      console.log('[UnifiedSearchModal] Disabled search scope');
    }
  }, [isOpen, enableScope, disableScope]);

  // 모든 hotkey에 scopes: ['search'] 지정
  useHotkeys('escape', (e) => {
    e.preventDefault();
    handleClose();
  }, {
    scopes: ['search'],             // ✅ 고유 scope
    enabled: isOpen,
    enableOnFormTags: true          // input 필드에서도 동작
  }, [isOpen]);

  useHotkeys('down', (e) => {
    e.preventDefault();
    setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
  }, {
    scopes: ['search'],             // ✅ 고유 scope
    enabled: isOpen,
    enableOnFormTags: true          // input 필드에서도 동작
  }, [isOpen, results.length, setFocusedIndex]);
};
```

### Scope 시스템 작동 방식

**Scope 격리 (Isolation)**:
- 모달 닫혀있을 때: `'sidebar'` scope 활성화 → FolderView의 down/up 작동
- 모달 열렸을 때: `'search'` scope 활성화 → UnifiedSearchModal의 down/up 작동
- **충돌 없음!** 각 scope에서 독립적으로 동일한 키 사용 가능

### enableOnFormTags 옵션

**언제 `true`로 설정하는가?**

```typescript
// ✅ enableOnFormTags: true
// input/textarea에서도 단축키가 작동해야 할 때
useHotkeys('escape', handleClose, {
  scopes: ['search'],
  enableOnFormTags: true  // ✅ input에 포커스 있어도 ESC는 작동
});

useHotkeys('down', handleNavigate, {
  scopes: ['search'],
  enableOnFormTags: true  // ✅ input에서 검색 중에도 화살표로 결과 탐색
});

// ❌ enableOnFormTags: false (기본값)
// 일반적인 경우 - input에서는 타이핑이 우선
useHotkeys('ctrl+s', handleSave, {
  scopes: ['editor'],
  enableOnFormTags: false  // input에서는 Ctrl+S가 브라우저 기본 동작
});
```

### useHotkeys 시그니처

```typescript
useHotkeys(
  keys: string,              // 'down', 'escape', 'ctrl+k', 'shift+shift'
  callback: (e: KeyboardEvent) => void,
  options: {
    scopes?: string[],       // ✅ 필수! 고유한 scope 지정
    enabled?: boolean,       // 조건부 활성화
    enableOnFormTags?: boolean  // input/textarea에서도 작동 여부
  },
  dependencies: any[]        // ✅ 필수! callback에서 사용하는 모든 값
);
```

### 의존성 배열 (Dependencies)

**❌ 의존성 배열 없으면 stale closure 발생**
```typescript
// ❌ 잘못된 예
useHotkeys('down', () => {
  setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
}, {
  scopes: ['search'],
  enabled: isOpen
});
// 문제: results.length가 변해도 이전 값 참조
```

**✅ 의존성 배열 제대로 지정**
```typescript
// ✅ 올바른 예
useHotkeys('down', () => {
  setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
}, {
  scopes: ['search'],
  enabled: isOpen,
  enableOnFormTags: true
}, [isOpen, results.length, setFocusedIndex]);
// ✅ callback에서 사용하는 모든 값을 배열에 포함
```

### Scope 명명 규칙

| Component/Feature | Scope Name | 설명 |
|-------------------|------------|------|
| Sidebar (FolderView) | `'sidebar'` | 파일 탐색기 키보드 내비게이션 |
| UnifiedSearchModal | `'search'` | 통합 검색 모달 |
| CodeCard/Canvas | `'canvas'` | 캔버스 내비게이션 (향후) |
| IDEView | `'ide'` | IDE 모드 (향후) |

### 커스텀 Scope Hook 패턴 (권장)

**네이밍 규칙**: `useHotkeys` 접두사 + scope 이름 → IDE 자동완성에서 찾기 쉬움

```typescript
// ✅ 권장 패턴: 커스텀 훅으로 scope 옵션 캡슐화
const UnifiedSearchModal = () => {
  const [isOpen, setIsOpen] = useAtom(searchModalOpenAtom);
  const [results, setResults] = useAtom(searchResultsAtom);

  // useHotkeys로 시작하는 네이밍으로 IDE 자동완성 활용
  const useHotkeysSearch = (
    keys: string,
    callback: (e: KeyboardEvent) => void,
    deps: any[]
  ) => {
    useHotkeys(keys, callback, {
      scopes: ['search'],
      enabled: isOpen,
      enableOnFormTags: true
    }, deps);
  };

  // 사용: 매번 옵션 반복하지 않고 간결하게
  useHotkeysSearch('escape', (e) => {
    e.preventDefault();
    handleClose();
  }, [isOpen]);

  useHotkeysSearch('down', (e) => {
    e.preventDefault();
    setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
  }, [isOpen, results.length, setFocusedIndex]);
};
```

**장점**:
- ✅ IDE에서 `useHotkeys` 타이핑하면 `useHotkeysSearch`가 자동완성
- ✅ 옵션 중복 제거, 한 곳에서 관리
- ✅ 실수로 다른 scope 사용하는 것 방지
- ✅ 컴포넌트 로직과 scope 설정 분리

**명명 규칙**:
- `useHotkeysSearch` - 검색 모달 (scope: 'search')
- `useHotkeysSidebar` - 사이드바 (scope: 'sidebar')
- `useHotkeysCanvas` - 캔버스 (scope: 'canvas')

### 체크리스트

새로운 컴포넌트에 키보드 단축키를 추가할 때:
- [ ] App.tsx에 HotkeysProvider가 설정되어 있는가?
- [ ] 고유한 scope 이름을 정했는가? (기존 scope와 중복 방지)
- [ ] `useHotkeys{ScopeName}` 형태의 커스텀 훅을 만들었는가? (권장)
- [ ] 모달/동적 컴포넌트인 경우 `useHotkeysContext()`로 scope를 활성화/비활성화하는가?
- [ ] input 필드에서도 동작해야 하는 키는 `enableOnFormTags: true`를 설정했는가?
- [ ] 의존성 배열을 제대로 지정했는가?

### 디버깅 팁

```typescript
// Scope 활성화/비활성화 로그 추가
useEffect(() => {
  if (isOpen) {
    enableScope('search');
    console.log('[ComponentName] Enabled search scope');
  } else {
    disableScope('search');
    console.log('[ComponentName] Disabled search scope');
  }
}, [isOpen, enableScope, disableScope]);

// 단축키가 작동하는지 테스트
useHotkeys('down', (e) => {
  console.log('[ComponentName] Down key pressed');
  // 실제 로직
}, {
  scopes: ['search'],
  enabled: isOpen,
  enableOnFormTags: true
}, [isOpen]);
```

---

## Component Structure

### Feature Component Template
```typescript
/**
 * Component Description
 *
 * 주요 기능 설명
 */

import React from 'react';
import { useSetAtom } from 'jotai';
import { someAtom } from '../../../store/atoms';
import type { SomeData } from '../../../entities/SomeEntity/lib/types';

// ✅ Inline Props - Interface 정의 없음
const ComponentName = ({
  id,
  data
}: {
  id: string;
  data: SomeData;  // 데이터 구조는 interface 재사용
}) => {
  // Atom을 통한 상태 관리
  const setSomeState = useSetAtom(someAtom);

  // Handler는 컴포넌트 내부에서 정의
  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();

    setSomeState((prev) => {
      // 상태 업데이트 로직
      return newState;
    });
  };

  return (
    <div onClick={handleAction}>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

---

## Parser Conventions

### AST 사용 원칙

**❌ 절대 사용 금지: 정규식을 이용한 코드 분석**
```typescript
// ❌ 코드 분석에 정규식 사용 금지
const identifiers = code.match(/\w+/g);
const functions = code.split('function');
```

**✅ 올바른 방법: AST Parser 사용**
```typescript
// ✅ TypeScript AST
import * as ts from 'typescript';
const sourceFile = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest);

// ✅ Babel Parser
import { parse } from '@babel/parser';
const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });

// ✅ Vue Compiler
import { parse } from '@vue/compiler-sfc';
const { descriptor } = parse(code);
```

### 정규식 허용 범위
- ✅ 경로 정규화: `path.replace(/\\/g, '/')`
- ✅ 문자열 정리: `text.trim()`, `text.replace(/\s+/g, ' ')`
- ❌ 코드 분석: 절대 사용 금지

---

## Git Commit Convention

### Commit Message Format
```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 변경

---

## 요약

### 핵심 원칙 4가지

1. **배럴 Export 사용 안 함** - 직접 import만 사용
2. **Handler Props Drilling 금지** - 데이터는 props, Handler는 atom
3. **Interface는 데이터 구조만** - 컴포넌트 Props는 Inline으로
4. **정규식으로 코드 분석 금지** - 반드시 AST Parser 사용

### 빠른 체크리스트

컴포넌트 작성 시:
- [ ] Props를 Inline으로 작성했는가? (interface 만들지 않음)
- [ ] Handler를 props로 받지 않고 atom 사용했는가?
- [ ] React.FC를 사용하지 않았는가?
- [ ] import 경로에 확장자(.tsx, .ts)를 제거했는가?

타입 정의 시:
- [ ] 재사용되는 데이터 구조만 interface로 정의했는가?
- [ ] 컴포넌트 Props를 interface로 만들지 않았는가?

이 컨벤션을 따르면 유지보수가 쉽고 확장 가능한 코드베이스를 유지할 수 있습니다.
