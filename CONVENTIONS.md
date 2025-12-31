# Project Conventions

## Architecture

### Feature-Sliced Design (FSD)

프로젝트는 FSD 아키텍처를 따릅니다:

```
src/
├── app/              # Application initialization
├── entities/         # Business entities (domain models)
├── features/         # User features (business logic units)
├── widgets/          # Complex UI components
├── shared/           # Shared utilities (currently not used)
├── services/         # External services & APIs
├── store/            # Global state (Jotai atoms)
└── hooks/            # Custom React hooks
```

### Layer Rules

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
   // ✅
   import { atom } from '../../../store/atoms';

   // ❌ (path alias 사용 안 함)
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
