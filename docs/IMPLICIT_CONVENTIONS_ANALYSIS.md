# 암묵적 컨벤션 분석 보고서

> **분석 일자**: 2026-01-08
> **대상 프로젝트**: Vibe Code IDE
> **파일 수**: 257개 (TypeScript/TSX)
> **목적**: 실제 코드에서 사용 중인 암묵적 패턴을 발견하고 문서화

---

## 📊 분석 요약

이 보고서는 CLAUDE.md와 CONVENTIONS.md에 명시되지 않았지만, 실제 코드베이스에서 일관되게 사용하고 있는 패턴들을 정리합니다.

**발견된 주요 패턴**:
- ✅ **채택 권장**: 6개 패턴
- ⚠️ **개선 고려**: 3개 패턴
- ❌ **제거 필요**: 2개 패턴

---

## ✅ 채택 권장 패턴

### 1. 중첩 Features 구조 (Nested Features by Domain)

**발견 위치**: `src/features/`

**패턴**:
```
features/
├── Code/                    # 도메인별 그룹핑
│   ├── CodeAnalyzer/
│   │   ├── DeadCodeAnalyzer/
│   │   ├── DeadCodeSelection/
│   │   └── DeadCodePromptCopy/
│   ├── CodeFold/
│   └── FocusMode/
├── File/                    # 도메인별 그룹핑
│   ├── GotoDefinition/
│   ├── Navigation/
│   └── OpenFiles/
└── Search/
    └── UnifiedSearch/
```

**장점**:
- 관련된 features가 함께 모여 탐색 용이
- 도메인 경계가 명확 (Code 관련, File 관련, Search 관련)
- IDE에서 폴더 접으면 한눈에 파악

**현황**:
- Code 도메인: 6개 features
- File 도메인: 3개 features
- Search 도메인: 1개 feature
- 기타 독립: KeyboardShortcuts, DocumentMode, WorkspacePersistence, RefactoringPrompt

**권장 사항**:
```
✅ CONVENTIONS.md에 추가:

### Features 조직 패턴

Features는 2가지 조직 방식 혼용:

1. **도메인 그룹핑** (관련 features 3개 이상):
   features/{Domain}/{FeatureName}/

2. **독립 Feature** (단독 feature):
   features/{FeatureName}/

예시:
- features/Code/CodeFold/
- features/File/OpenFiles/
- features/KeyboardShortcuts/  (독립)
```

---

### 2. `use` 접두사 Hook의 역할별 네이밍

**발견 위치**: 전역

**패턴**:
```typescript
// Feature 로직
features/File/OpenFiles/lib/useOpenFile.ts
features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/useDeadCodeAnalysis.ts

// Atom 접근 wrapper
features/File/GotoDefinition/lib/useGotoDefinition.ts

// UI 컴포넌트 로직
shared/ui/TreeView/lib/useTreeRenderer.tsx
shared/ui/TreeView/lib/useTreeState.ts
```

**암묵적 구분**:
- `use{FeatureName}` - Feature의 핵심 로직 (외부 공개)
- `use{Action}` - 특정 액션 처리 (openFile, gotoDefinition)
- `use{Component}State` - 컴포넌트 내부 상태 관리 (TreeState)
- `use{Component}Renderer` - 컴포넌트 렌더링 로직 (TreeRenderer)

**권장 사항**:
```
✅ CLAUDE.md에 추가:

### Composables 네이밍 가이드

| 패턴 | 용도 | 위치 | 예시 |
|------|------|------|------|
| `use{FeatureName}` | Feature 핵심 로직 | features/{}/lib/ | useOpenFile, useCopyAllPrompt |
| `use{Entity}Actions` | Entity 비즈니스 로직 | entities/{}/model/ | useProductActions |
| `use{Component}State` | 컴포넌트 상태 | shared/ui/{}/lib/ | useTreeState |
| `use{Component}Renderer` | 렌더링 로직 | shared/ui/{}/lib/ | useTreeRenderer |
```

---

### 3. Atoms 파일의 단일 책임

**발견 위치**: 전역 (`model/atoms.ts`)

**패턴**:
```typescript
// ✅ 좋은 예: 한 파일에 한 feature의 atoms만
features/Code/CodeFold/model/atoms.ts
  → export const foldedLinesAtom = atom(...)

features/Code/FocusMode/model/atoms.ts
  → export const activeLocalVariablesAtom = atom(...)

features/File/OpenFiles/model/atoms.ts
  → export const openedTabsAtom = atom(...)
  → export const activeTabAtom = atom(...)
```

**일관된 구조**:
- Feature당 1개의 `model/atoms.ts` 파일
- 관련 atoms만 함께 배치
- Global atoms는 `entities/AppView/model/atoms.ts`에 위치

**권장 사항**: 현재 패턴 유지 (문서화만 필요)

---

### 4. TypeScript Interface 주석의 상세한 설명

**발견 위치**: `entities/SourceFileNode/model/types.ts`

**패턴**:
```typescript
/**
 * SourceFileNode - TypeScript SourceFile 래퍼 또는 Symbol 노드
 *
 * 핵심 원칙:
 * - Worker 파싱 시점에 파일 노드 + Symbol 노드 모두 생성 (AST 순회 1번)
 * - 파일 노드: sourceFile 포함 (전체 AST) + View Map (미리 계산된 메타데이터)
 * - Symbol 노드: sourceFile 없음 (top-level type/interface/function 등)
 * - 검색/분석 단계에서 AST 재순회 금지 → View Map 조회
 */
export interface SourceFileNode {
  // 기본 식별자
  id: string; // 파일: filePath, Symbol: filePath::symbolName
  ...
}
```

**특징**:
- Interface 최상단에 개념 설명 포함
- 핵심 원칙을 bullet point로 명시
- 각 필드에도 inline 주석

**권장 사항**:
```
✅ CONVENTIONS.md에 추가:

### Interface 문서화 패턴

복잡한 Entity interface는 최상단에 JSDoc 주석 추가:
- 개념 설명 (한 문장)
- 핵심 원칙 (bullet points)
- 사용 예시 (필요 시)

예시:
/**
 * SourceFileNode - TypeScript SourceFile 래퍼
 *
 * 핵심 원칙:
 * - Worker에서 1번 파싱
 * - View Map으로 메타데이터 캐싱
 */
```

---

### 5. Feature 컴포넌트의 명시적 주석

**발견 위치**: Features, Widgets

**패턴**:
```typescript
/**
 * Code Fold Button Component
 * Chevron icon button for folding/unfolding code blocks
 */

/**
 * CodeDocView - 주석 기반 문서 뷰 (완전 재작성)
 * sample/App.tsx 기반, 기존 tsParser 사용
 */

/**
 * useOpenFile Hook
 * 파일 열기 로직 통합 관리
 * View Mode (IDE/Canvas)에 따라 자동으로 분기 처리
 */
```

**특징**:
- 파일 최상단에 JSDoc 주석
- 컴포넌트/Hook의 역할을 한 문장으로
- 추가 컨텍스트 (리팩토링 히스토리, 기반 코드 등)

**권장 사항**: 현재 패턴 유지, 모든 feature 컴포넌트에 적용

---

### 6. `@/` Alias의 제한적 사용

**발견 위치**: 전역

**패턴**:
```typescript
// ✅ @/ alias 사용 (App.tsx, 최상위 파일)
import { ThemeProvider } from '@/entities/AppTheme/ThemeProvider';
import { UnifiedSearchModal } from '@/features/Search/UnifiedSearch/ui/UnifiedSearchModal';

// ✅ 상대 경로 (하위 레이어)
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types.ts';
import { foldedLinesAtom } from '../model/atoms.ts';
```

**암묵적 규칙**:
- `App.tsx`, `main.tsx` 같은 최상위 파일에서만 `@/` alias 사용
- Features, Entities, Widgets 내부에서는 상대 경로 사용

**이유**:
- CLAUDE.md에 "상대 경로 선호" 명시되어 있음
- 실제로는 최상위 진입점에서만 예외적으로 `@/` 사용

**권장 사항**:
```
✅ CLAUDE.md 수정:

### Import 경로 규칙

1. **상대 경로 원칙** (features/entities/widgets 내부):
   import { FoldInfo } from '../../../features/CodeFold/lib/types';

2. **@/ Alias 허용** (최상위 진입점만):
   - App.tsx
   - main.tsx
   - workers/*.worker.ts

3. **components/ 예외** (기존 규칙 유지):
   import { Button } from '@/components/ui/Button';
```

---

## ⚠️ 개선 고려 패턴

### 1. `React.FC` 사용

**발견 위치**: 다수 컴포넌트

**패턴**:
```typescript
// FoldButton.tsx
const FoldButton: React.FC<FoldButtonProps> = ({ line, node }) => {

// CodeDocView.tsx
const CodeDocView = () => {

// AppContent
const AppContent: React.FC = () => {
```

**현황**:
- 일부는 `React.FC` 사용
- 일부는 사용 안 함 (inline props)

**CLAUDE.md 규칙**:
```typescript
// ❌ NEVER use React.FC
const Component: React.FC<Props> = ({ ... }) => { ... }  // NO!
```

**불일치**:
- CLAUDE.md는 `React.FC` 금지
- 실제 코드는 혼재

**권장 사항**:
```
⚠️ 선택 필요:

옵션 1: CLAUDE.md 규칙 강화 (React.FC 제거)
- 모든 컴포넌트를 inline props로 변경
- ESLint rule 추가로 강제

옵션 2: 규칙 완화 (React.FC 허용)
- CLAUDE.md 수정하여 "선호하지 않지만 허용"
- 기존 코드 유지

개인 의견: React 19에서 React.FC는 children이 기본 포함 안 되므로
큰 차이 없음. 기존 코드 존중하여 옵션 2 권장.
```

---

### 2. Props Interface 정의 혼재

**발견 위치**: Features, Widgets

**패턴**:
```typescript
// ✅ CLAUDE.md 권장 (inline)
const FoldButton: React.FC<FoldButtonProps> = ({ line, node }) => {

// ❌ CLAUDE.md 금지 (interface 정의)
interface FoldButtonProps {
  line: CodeLine;
  node: CanvasNode;
}
```

**현황**:
- 많은 컴포넌트가 interface 정의
- CLAUDE.md는 inline props 권장

**권장 사항**:
```
⚠️ 선택 필요:

옵션 1: 규칙 유지 (inline props만)
- 기존 interface 정의 제거
- 일관성 강화

옵션 2: 규칙 완화 (interface 허용)
- React.FC 사용 시에는 interface 정의 허용
- Inline props 사용 시에는 inline으로

개인 의견: React.FC를 허용한다면 interface도 허용하는 게 자연스러움.
옵션 2 권장.
```

---

### 3. 파일 확장자 명시 (.ts, .tsx)

**발견 위치**: 전역 import 구문

**패턴**:
```typescript
// ✅ 확장자 포함
import type { CanvasNode } from '../../../../entities/CanvasNode/model/types.ts';
import { foldedLinesAtom } from '../model/atoms.ts';
import type { CodeLine } from '../../../../widgets/CodeViewer/core/types/codeLine.ts';

// ❌ 확장자 없음 (없는 경우도 있음)
import { ThemeProvider } from '@/entities/AppTheme/ThemeProvider';
```

**현황**:
- 상대 경로 import는 대부분 확장자 포함
- `@/` alias import는 확장자 없음

**CLAUDE.md 규칙**:
```
- [ ] Import paths have no extensions (.ts, .tsx)
```

**불일치**:
- CLAUDE.md는 확장자 제거 권장
- 실제 코드는 확장자 포함이 더 많음

**권장 사항**:
```
⚠️ 선택 필요:

현재 Vite/TypeScript 설정에서는 확장자가 있어도 동작함.

옵션 1: 규칙 유지 (확장자 제거)
- 모든 import에서 .ts, .tsx 제거
- 더 짧고 깔끔

옵션 2: 규칙 변경 (확장자 포함)
- 명시적이고 정확함
- Deno, Node.js ESM 호환

개인 의견: 최신 트렌드는 확장자 포함 (ESM 표준).
하지만 대부분의 React 프로젝트는 제거. 옵션 1 권장.
```

---

## ❌ 제거 필요 패턴

### 1. 주석 처리된 Import

**발견 위치**: `App.tsx`

**패턴**:
```typescript
// App.tsx
{/*<WorkspacePersistence />*/}
{/*<JotaiDevTools />*/}
```

**문제**:
- import는 활성화되어 있음
- 사용은 주석 처리
- 번들 사이즈 증가 가능성

**권장 사항**:
```
❌ 제거:
- 사용하지 않는 컴포넌트는 import도 제거
- 필요 시 git history에서 복구 가능

✅ 또는:
- 개발 모드에서만 활성화
{process.env.NODE_ENV === 'development' && <JotaiDevTools />}
```

---

### 2. 오타/중복 폴더

**발견 위치**: `src/pages/`

**패턴**:
```
pages/
├── JsonExploerer/    # 오타 (Explorer 아님)
└── JsonExplorer/     # 정상
```

**문제**:
- `JsonExploerer` 폴더 존재 (오타)
- 사용되지 않는 듯 보임

**권장 사항**:
```
❌ 즉시 제거:
- pages/JsonExploerer/ 폴더 삭제
- 사용 중이라면 JsonExplorer로 통합
```

---

## 📝 추가 발견 사항

### Widgets의 하위 구조 패턴

**발견**:
```
widgets/
├── CodeCard/
├── CodeDocView/
├── CodeViewer/
├── FileExplorer/
├── MainContents/        # ← 복수형
│   ├── IDEScrollView/
│   ├── IDEView/
│   └── PipelineCanvas/
└── Panels/              # ← 복수형
    ├── DefinitionPanel/
    ├── RelatedPanel/
    └── TerminalPanel/
```

**패턴**:
- 대부분 widgets는 독립 폴더
- `MainContents`, `Panels`만 하위 그룹핑
- 복수형 폴더 사용 (여러 widgets 그룹)

**권장 사항**:
```
✅ 패턴 유지:
- 관련 widgets가 3개 이상이면 그룹 폴더 생성 가능
- 폴더명은 복수형 사용 (Panels, MainContents)
```

---

### Feature 내부 구조의 일관성

**발견**:
```
features/{Feature}/
├── ui/          # UI 컴포넌트 (있으면)
├── lib/         # 로직 함수 (있으면)
└── model/       # atoms, types (있으면)
```

**일관된 하위 구조**:
- 모든 features가 동일한 하위 폴더 구조
- `ui/`, `lib/`, `model/` 3가지만 사용
- 다른 폴더(api/, hooks/ 등) 사용 안 함

**권장 사항**: 현재 패턴 유지 (문서화)

---

## 🎯 권장 조치 사항

### 즉시 적용 (Breaking 아님)

1. ✅ **CLAUDE.md 업데이트**:
   - Features 중첩 구조 패턴 추가
   - Composables 네이밍 가이드 추가
   - @/ alias 사용 범위 명확화

2. ✅ **CONVENTIONS.md 업데이트**:
   - Interface 문서화 패턴 추가
   - Widgets 그룹핑 패턴 추가

3. ❌ **코드 정리**:
   - `pages/JsonExploerer/` 폴더 제거
   - `App.tsx` 주석 처리된 import 정리

### 팀 논의 필요

1. ⚠️ **React.FC 사용 여부**:
   - 현재: 혼재 (일부 사용, 일부 미사용)
   - 제안: 허용으로 통일 (기존 코드 존중)

2. ⚠️ **Props Interface 정의**:
   - 현재: 혼재 (inline vs interface)
   - 제안: React.FC와 함께 사용 시 interface 허용

3. ⚠️ **Import 확장자**:
   - 현재: 대부분 포함
   - 제안: 제거로 통일 (기존 컨벤션 따름)

---

## 📊 통계

### 발견된 패턴 분류

| 카테고리 | 채택 권장 | 개선 고려 | 제거 필요 |
|----------|-----------|-----------|-----------|
| 구조 패턴 | 3개 | 0개 | 2개 |
| 네이밍 패턴 | 2개 | 1개 | 0개 |
| 코드 스타일 | 1개 | 2개 | 0개 |
| **합계** | **6개** | **3개** | **2개** |

### Features 분류

| 도메인 | Features 수 | 그룹핑 여부 |
|--------|-------------|-------------|
| Code | 6개 | ✅ 그룹핑 |
| File | 3개 | ✅ 그룹핑 |
| Search | 1개 | ✅ 그룹핑 |
| 독립 | 4개 | ❌ 독립 |

---

## 🔍 분석 방법론

이 보고서는 다음 방법으로 작성되었습니다:

1. **폴더 구조 분석**: 257개 파일의 디렉토리 구조 파악
2. **샘플링 분석**: 각 레이어별 대표 파일 10개 이상 정독
3. **패턴 추출**: 반복되는 구조와 네이밍 패턴 식별
4. **문서 대조**: CLAUDE.md, CONVENTIONS.md와 실제 코드 비교
5. **일관성 평가**: 패턴의 일관성과 유용성 판단

---

## 📅 다음 단계

1. **즉시**: 오타/중복 폴더 제거
2. **1주 내**: CLAUDE.md, CONVENTIONS.md 업데이트
3. **2주 내**: 팀 논의 후 React.FC, Props Interface, Import 확장자 정책 확정
4. **1개월 내**: ESLint rule 추가로 합의된 패턴 강제

---

**작성자**: Claude Code
**검토 필요**: 팀 리드, 시니어 개발자
**업데이트 주기**: 분기별
