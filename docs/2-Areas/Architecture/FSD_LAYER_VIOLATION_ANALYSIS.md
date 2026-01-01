# FSD 레이어 위반 분석: Features/Widgets → Entities 이동 검토

## Purpose (목적)

### 분석 목적
Features와 Widgets 레이어에 있는 interface/type 중 **Entities 레이어로 이동해야 할 것**들을 FSD(Feature-Sliced Design) 원칙에 따라 분석합니다.

### FSD 레이어 원칙 복습

```
entities/   # 순수 도메인 모델, 외부 의존성 없음, 재사용 가능
  ↑
features/   # 비즈니스 기능, entities 사용
  ↑
widgets/    # 복잡한 UI, entities + features 사용
```

**핵심 규칙**:
- ✅ widgets → features, entities (허용)
- ✅ features → entities (허용)
- ❌ widgets → features의 타입 의존 (주의 필요)
- ❌ features → widgets (위반)
- ❌ entities → features/widgets (위반)

---

## Requirements (요구사항)

### 분석 기준

**Entities 이동 후보 조건**:
1. ✅ 여러 features/widgets에서 공유되는 타입
2. ✅ 도메인 모델로서 독립적으로 존재 가능
3. ✅ UI/비즈니스 로직과 독립적인 순수 데이터 구조
4. ✅ 레이어 역전(하위 레이어가 상위 레이어 import) 발생

**현재 위치 유지 조건**:
1. ✅ 단일 feature/widget 내부에서만 사용
2. ✅ UI 특화된 타입 (props, style 등)
3. ✅ 비즈니스 로직 특화된 타입

---

## Resolution (해결방안)

### 현재 상태 분석

#### 검색된 Type/Interface 목록

**Features**:
```
features/UnifiedSearch/model/types.ts
  - SearchResult
  - SymbolMetadata
  - SearchMode

features/CodeFold/lib/types.ts
  - FoldInfo
  - FoldPlaceholder

features/FocusMode/ui/FocusedIdentifiers.tsx
  - IdentifierMetadata
```

**Widgets**:
```
widgets/CodeViewer/core/types/codeLine.ts
  - CodeLine
  - ExportSlot
  - DefinitionLocation

widgets/CodeViewer/core/types/segment.ts
  - CodeSegment
  - SegmentKind
  - SegmentStyle

widgets/CodeViewer/core/renderer/astHooks.ts
  - AddKindFunction (함수 타입)
```

---

### 1. 🔴 CRITICAL: FoldInfo (반드시 이동)

**현재 위치**: `features/CodeFold/lib/types.ts`

**타입 정의**:
```typescript
export interface FoldInfo {
  isFoldable: boolean;
  foldStart: number;
  foldEnd: number;
  foldType?: 'statement-block' | 'jsx-children' | 'jsx-fragment' | 'import-block';
  tagName?: string;
  depth?: number;
}

export interface FoldPlaceholder {
  type: 'fold-placeholder';
  parentLine: number;
  foldStart: number;
  foldEnd: number;
  foldedCount: number;
  foldType: 'statement-block' | 'jsx-children' | 'jsx-fragment' | 'import-block';
  tagName?: string;
}
```

**사용처 분석**:
```bash
# Import 분석
widgets/CodeViewer/core/types/codeLine.ts:5
  import type { FoldInfo } from '../../../features/CodeFold/lib/types';

features/CodeFold/lib/collectFoldMetadata.ts:7
  import type { FoldInfo } from './types';
```

**문제점**:
- ❌ **FSD 위반**: widgets/CodeViewer → features/CodeFold (레이어 역전!)
- ❌ `CodeLine` 인터페이스가 `FoldInfo`를 포함
- ❌ widgets가 features의 타입에 의존

**CodeLine에서의 사용**:
```typescript
// widgets/CodeViewer/core/types/codeLine.ts
export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean;
  hasDeclarationKeyword?: boolean;
  exportSlots?: ExportSlot[];
  foldInfo?: FoldInfo;  // ⚠️ features의 타입 사용!
}
```

**분석**:
- ✅ **도메인 모델**: 코드 폴딩 메타데이터는 순수 데이터 구조
- ✅ **UI 독립적**: 폴드 정보 자체는 UI와 무관
- ✅ **여러 레이어에서 사용**: widgets와 features 모두 사용
- ✅ **레이어 역전 발생**: widgets → features

**결론**: **🔴 반드시 entities로 이동**

**권장 위치**: `entities/CodeFold/model/types.ts`

---

### 2. 🟡 WARNING: CodeLine, CodeSegment (이동 고려)

**현재 위치**: `widgets/CodeViewer/core/types/`

**타입 정의**:
```typescript
// codeLine.ts
export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean;
  hasDeclarationKeyword?: boolean;
  exportSlots?: ExportSlot[];
  foldInfo?: FoldInfo;
}

export interface ExportSlot {
  name: string;
  nodeId?: string;
  offset?: number;
}

export interface DefinitionLocation {
  filePath: string;
  line: number;
  character: number;
  fileName: string;
}

// segment.ts
export type SegmentKind =
  | 'text'
  | 'keyword'
  | 'punctuation'
  | 'string'
  | 'comment'
  | 'identifier'
  | 'external-import'
  | 'external-closure'
  | 'external-function'
  | 'self'
  | 'local-variable'
  | 'parameter';

export interface CodeSegment {
  text: string;
  kinds: SegmentKind[];
  nodeId?: string;
  definedIn?: string;
  offset?: number;
  isDeclarationName?: boolean;
  position?: number;
  hoverInfo?: string;
  definitionLocation?: DefinitionLocation;
  tsNode?: any;
}

export interface SegmentStyle {
  className: string;
  title?: string;
  clickable: boolean;
  clickType?: 'close' | 'expand' | 'external' | 'definition' | 'local-variable';
  hoverTooltip?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  'data-token'?: string;
}
```

**사용처 분석**:
```bash
# CodeLine 사용처 (15개 파일)
widgets/CodeViewer/*  - 대부분
widgets/CodeCard/*    - 3개
features/CodeFold/*   - 2개  ⚠️ features가 widgets 타입 사용!

# CodeSegment 사용처 (12개 파일)
widgets/CodeViewer/*  - 대부분
```

**분석**:

**CodeLine, CodeSegment**:
- ✅ **도메인 모델**: "코드 한 줄", "코드 세그먼트"는 핵심 도메인 개념
- ✅ **여러 레이어에서 사용**: widgets와 features 모두 사용
- ⚠️ **UI 요소 포함**: `SegmentStyle`은 명백히 UI 타입
- ⚠️ **React 의존성**: `React.MouseEvent` 사용

**SegmentStyle**:
- ❌ **UI 특화**: className, onClick 등 순수 UI 타입
- ❌ **widgets에 유지해야 함**

**결론**:
- 🟡 **CodeLine, CodeSegment**: entities로 이동 고려
  - 순수 데이터 부분만 entities로
  - UI 관련 필드는 별도 타입으로 분리
- ❌ **SegmentStyle**: widgets에 유지

**권장 접근**:

**Option 1: 부분 이동** (권장)
```typescript
// entities/CodeLine/model/types.ts
export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean;
  hasDeclarationKeyword?: boolean;
  exportSlots?: ExportSlot[];
  foldInfo?: FoldInfo;  // FoldInfo도 entities로 이동 후
}

export interface CodeSegment {
  text: string;
  kinds: SegmentKind[];
  nodeId?: string;
  definedIn?: string;
  offset?: number;
  isDeclarationName?: boolean;
  position?: number;
  hoverInfo?: string;
  definitionLocation?: DefinitionLocation;
  // tsNode는 제거 또는 별도 처리
}

// widgets/CodeViewer/core/types/style.ts (UI 타입 분리)
export interface SegmentStyle {
  // ... UI 관련 타입
}
```

**Option 2: 현재 위치 유지**
- widgets/CodeViewer가 주 사용처
- 대부분 CodeViewer 내부에서만 사용
- features/CodeFold의 사용은 예외적

**권장**: **Option 1 (부분 이동)**

---

### 3. 🟡 WARNING: SymbolMetadata (이동 고려)

**현재 위치**: `features/UnifiedSearch/model/types.ts`

**타입 정의**:
```typescript
export interface SymbolMetadata {
  typeInfo: string | null;
  codeSnippet: string;
  usageCount: number;
}
```

**사용처 분석**:
```bash
store/atoms.ts - re-export 및 atom 정의
  export type { SymbolMetadata } from '../features/UnifiedSearch/model/types';
  export const symbolMetadataAtom = atom(new Map<string, SymbolMetadata>());

shared/symbolMetadataExtractor.ts
  import type { SymbolMetadata } from '../store/atoms';

features/UnifiedSearch/lib/symbolExtractor.ts
  import type { SymbolMetadata } from '../model/types';
```

**분석**:
- ✅ **shared 레이어에서 사용**: shared는 entities급 레이어
- ✅ **도메인 모델**: 심볼 메타데이터는 순수 데이터
- ⚠️ **store를 통한 re-export**: 레이어 우회?
- ⚠️ **UnifiedSearch 특화**: 검색 기능에 특화된 타입

**문제점**:
- shared/symbolMetadataExtractor가 store를 통해 features의 타입 사용
- store가 features의 타입을 re-export (레이어 원칙 모호)

**결론**: **🟡 entities로 이동 고려**

**권장 위치**: `entities/Symbol/model/types.ts`

**이유**:
- shared 레이어가 사용 → entities 레벨 필요
- 심볼 메타데이터는 범용 도메인 개념

---

### 4. ✅ KEEP: SearchResult (현재 위치 유지)

**현재 위치**: `features/UnifiedSearch/model/types.ts`

**타입 정의**:
```typescript
export interface SearchResult {
  id: string;
  type: 'file' | 'folder' | 'symbol';
  name: string;
  filePath: string;
  nodeType?: string;
  nodeId?: string;
  lineNumber?: number;
  score: number;
  matchType?: 'fuzzy';
  matches?: Array<{
    key: string;
    indices: number[][];
  }>;
  typeInfo?: string;
  codeSnippet?: string;
  usageCount?: number;
  isExported?: boolean;
}
```

**사용처 분석**:
```bash
# UnifiedSearch feature 내부에서만 사용
features/UnifiedSearch/lib/searchService.ts
features/UnifiedSearch/lib/symbolExtractor.ts
features/UnifiedSearch/ui/SearchResultItem.tsx
```

**분석**:
- ✅ **Feature 특화**: UnifiedSearch 기능에 특화
- ✅ **단일 feature 사용**: feature 내부에서만 사용
- ❌ **도메인 모델 아님**: 검색 결과는 비즈니스 로직 타입

**결론**: **✅ 현재 위치 유지**

---

### 5. ✅ KEEP: IdentifierMetadata (위치 조정 권장)

**현재 위치**: `features/FocusMode/ui/FocusedIdentifiers.tsx` (컴포넌트 파일 내)

**타입 정의**:
```typescript
export interface IdentifierMetadata {
  name: string;
  hoverInfo?: string;
  kinds: string[];
}
```

**사용처 분석**:
```bash
# FocusMode feature 내부에서만 사용
features/FocusMode/ui/FocusedIdentifierItem.tsx
```

**분석**:
- ✅ **Feature 특화**: FocusMode 전용
- ✅ **단일 feature 사용**: feature 내부만
- ⚠️ **위치 부적절**: UI 컴포넌트 파일에 정의

**결론**: **✅ feature 내 유지, 단 model로 이동**

**권장 위치**: `features/FocusMode/model/types.ts`

**이유**:
- 타입 정의는 ui가 아닌 model에 위치해야 함
- CONVENTIONS.md: Inline props types는 허용하지만, 도메인 타입은 별도 파일

---

### 6. ⚠️ AddKindFunction (함수 타입 - 현재 위치 유지)

**현재 위치**: `widgets/CodeViewer/core/renderer/astHooks.ts`

**타입 정의**:
```typescript
export type AddKindFunction = (
  start: number,
  end: number,
  kind: SegmentKind,
  nodeId?: string,
  isDeclarationNameOrDefinedIn?: boolean | string,
  tsNode?: ts.Node
) => void;
```

**분석**:
- ✅ **Widget 내부 유틸**: astHooks 내부에서만 사용
- ✅ **헬퍼 타입**: 함수 시그니처 타입
- ❌ **도메인 모델 아님**: 렌더링 로직의 일부

**결론**: **✅ 현재 위치 유지**

---

## 요약표

| 타입 | 현재 위치 | 권장 조치 | 우선순위 | 이유 |
|------|-----------|-----------|----------|------|
| **FoldInfo** | features/CodeFold | **entities로 이동** | 🔴 HIGH | widgets→features 의존 (레이어 위반) |
| **FoldPlaceholder** | features/CodeFold | **entities로 이동** | 🔴 HIGH | FoldInfo와 함께 이동 |
| **CodeLine** | widgets/CodeViewer | **entities로 이동 고려** | 🟡 MEDIUM | 도메인 모델, 여러 레이어 사용 |
| **CodeSegment** | widgets/CodeViewer | **entities로 이동 고려** | 🟡 MEDIUM | 도메인 모델, 순수 데이터 부분만 |
| **SegmentStyle** | widgets/CodeViewer | **현재 위치 유지** | ✅ N/A | UI 특화 타입 |
| **SymbolMetadata** | features/UnifiedSearch | **entities로 이동 고려** | 🟡 MEDIUM | shared 레이어 사용 |
| **SearchResult** | features/UnifiedSearch | **현재 위치 유지** | ✅ N/A | Feature 특화 |
| **IdentifierMetadata** | features/FocusMode/ui | **model로 이동** | 🟢 LOW | 위치만 조정 (feature 내) |
| **AddKindFunction** | widgets/CodeViewer | **현재 위치 유지** | ✅ N/A | Widget 내부 유틸 |

---

## Action (실행/활용)

### Phase 1: 긴급 수정 (1-2일)

#### 액션 1: FoldInfo → entities 이동 (CRITICAL)

**이유**: FSD 레이어 위반 해결

**Step 1: entities 폴더 생성**
```bash
mkdir -p src/entities/CodeFold/model
```

**Step 2: FoldInfo 이동**
```bash
# 파일 이동
mv src/features/CodeFold/lib/types.ts \
   src/entities/CodeFold/model/types.ts
```

**Step 3: Import 경로 수정**
```typescript
// Before (widgets/CodeViewer/core/types/codeLine.ts)
import type { FoldInfo } from '../../../features/CodeFold/lib/types';

// After
import type { FoldInfo } from '../../../../entities/CodeFold';
```

**Step 4: features/CodeFold 수정**
```typescript
// features/CodeFold/lib/collectFoldMetadata.ts
// Before
import type { FoldInfo } from './types';

// After
import type { FoldInfo } from '../../../entities/CodeFold';
```

**Step 5: 타입 체크**
```bash
npm run type-check
```

**영향 범위**: 약 3개 파일

---

### Phase 2: 중기 개선 (1주)

#### 액션 2: SymbolMetadata → entities 이동

**Step 1: entities 폴더 생성**
```bash
mkdir -p src/entities/CodeSymbol/model
```

**Step 2: SymbolMetadata 추출**
```typescript
// src/entities/CodeSymbol/model/types.ts
export interface SymbolMetadata {
  typeInfo: string | null;
  codeSnippet: string;
  usageCount: number;
}
```

**Step 3: Import 경로 수정**
```typescript
// store/atoms.ts
// Before
export type { SymbolMetadata } from '../features/UnifiedSearch/model/types';

// After
export type { SymbolMetadata } from '../entities/CodeSymbol';
```

**영향 범위**: 약 4개 파일

---

#### 액션 3: IdentifierMetadata → model 이동

**Step 1: model 폴더에 types.ts 생성**
```typescript
// features/FocusMode/model/types.ts
export interface IdentifierMetadata {
  name: string;
  hoverInfo?: string;
  kinds: string[];
}
```

**Step 2: Import 경로 수정**
```typescript
// Before
import type { IdentifierMetadata } from './FocusedIdentifiers';

// After
import type { IdentifierMetadata } from '../model/types';
```

**Step 3: FocusedIdentifiers.tsx에서 export 제거**
```typescript
// Before
export interface IdentifierMetadata { ... }

// After (제거)
```

**영향 범위**: 2개 파일

---

### Phase 3: 장기 재구성 (선택, 2-3주)

#### 액션 4: CodeLine, CodeSegment → entities 이동

**고려사항**:
- UI 타입(SegmentStyle)과 분리 필요
- tsNode 필드 처리 방법 결정
- 대규모 refactoring (15개+ 파일 영향)

**계획**:
1. **Week 1**: 타입 분석 및 분리 설계
   - 순수 도메인 부분 식별
   - UI 타입 분리 전략 수립

2. **Week 2**: entities로 이동
   - `entities/CodeLine/model/types.ts` 생성
   - `entities/CodeSegment/model/types.ts` 생성
   - Import 경로 일괄 수정

3. **Week 3**: 테스트 및 검증
   - 타입 체크
   - 기능 테스트
   - 코드 리뷰

---

### 마이그레이션 체크리스트

#### FoldInfo 이동 체크리스트
- [ ] `entities/CodeFold/model/types.ts` 생성
- [ ] `FoldInfo`, `FoldPlaceholder` 이동
- [ ] `widgets/CodeViewer/core/types/codeLine.ts` import 수정
- [ ] `features/CodeFold/lib/collectFoldMetadata.ts` import 수정
- [ ] `features/CodeFold/lib/index.ts` re-export 업데이트
- [ ] `entities/CodeFold/index.ts` 생성 및 export
- [ ] `npm run type-check` 통과
- [ ] 기능 테스트 (코드 폴딩 동작 확인)

#### SymbolMetadata 이동 체크리스트
- [ ] `entities/Symbol/model/types.ts` 생성
- [ ] `SymbolMetadata` 이동
- [ ] `store/atoms.ts` import 수정
- [ ] `shared/symbolMetadataExtractor.ts` import 수정 (필요 시)
- [ ] `features/UnifiedSearch` import 수정
- [ ] `entities/Symbol/index.ts` 생성
- [ ] `npm run type-check` 통과
- [ ] 검색 기능 테스트

---

### 자동화 스크립트

#### FoldInfo 이동 스크립트
```bash
#!/bin/bash

# 1. 폴더 생성
mkdir -p src/entities/CodeFold/model

# 2. 파일 이동
mv src/features/CodeFold/lib/types.ts \
   src/entities/CodeFold/model/types.ts

# 3. index.ts 생성
cat > src/entities/CodeFold/index.ts << 'EOF'
export type { FoldInfo, FoldPlaceholder } from './model/types';
EOF

# 4. Import 경로 수정
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  's|from.*features/CodeFold/lib/types|from "@/entities/CodeFold"|g' {} \;

# 5. 타입 체크
npm run type-check
```

---

## 성공 지표

**정량적 지표**:
- [ ] FSD 레이어 위반 0건
- [ ] widgets → features import 0건 (타입)
- [ ] shared → features import 0건 (타입)
- [ ] 타입 체크 에러 0건

**정성적 지표**:
- [ ] entities가 명확한 도메인 모델로 구성
- [ ] 각 레이어의 역할이 명확
- [ ] 타입 import 경로가 레이어 순서대로 흐름

---

## 참고 자료

- [ENTITIES_TYPE_ANALYSIS.md](./ENTITIES_TYPE_ANALYSIS.md) - Entities 타입 분석
- [CONVENTIONS.md](../../../CONVENTIONS.md) - 코딩 컨벤션
- [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview) - FSD 공식 문서
- [FSD: Layers](https://feature-sliced.design/docs/reference/layers) - 레이어 규칙

---

**보고서 작성일**: 2026-01-01
**분석 범위**: src/features, src/widgets 전체
**권장 우선순위**: Phase 1 (FoldInfo 이동) → Phase 2 (SymbolMetadata, IdentifierMetadata) → Phase 3 (CodeLine/CodeSegment, 선택)
