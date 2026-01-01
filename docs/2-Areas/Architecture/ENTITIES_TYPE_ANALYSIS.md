# Entities 타입 구조 분석 보고서

## Purpose (목적)

### 보고서 목적
현재 `src/entities` 폴더의 interface 및 type 정의가 복잡하고 중복되어 있어, 폴더 구조만으로는 타입 간의 관계와 역할이 명확하게 드러나지 않습니다. 이 보고서는 현재 상태를 분석하고 개선 방안을 제시합니다.

### 분석 범위
- `src/entities` 폴더 내 모든 interface 및 type 정의
- 타입 간 의존성 관계
- 실제 사용처 분석 (widgets, features, services)

---

## Requirements (요구사항)

### 분석 기준

**타입 설계 원칙** (CONVENTIONS.md 기준):
1. **Getter-Based 아키텍처**: 데이터는 AST에서 온디맨드 추출, 중복 금지
2. **단일 진실 공급원**: TypeScript AST가 모든 정보의 소스
3. **Inline Props Types**: 별도 props 인터페이스 금지
4. **FSD 레이어 분리**: entities는 외부 의존성 없는 순수 도메인 모델

### 문제 인식 기준

✅ **타입 중복**: 동일한 타입이 여러 곳에 정의됨
✅ **순환 의존성**: 타입 간 순환 참조
✅ **레이어 위반**: entities에 widgets/features 타입 혼입
✅ **명확성 부족**: 폴더 구조만으로 역할 파악 불가

---

## Resolution (해결방안)

### 1. 현재 상태 분석

#### 현재 폴더 구조

```
src/entities/
├── CanvasNode/
│   ├── model/types.ts       # CanvasNode, TemplateTokenRange, ComponentGroup
│   └── index.ts
├── File/
│   ├── model/types.ts       # FileItemProps
│   ├── lib/fuzzyMatch.ts
│   ├── ui/FileItem.tsx
│   └── index.ts
├── SourceFileNode/
│   ├── model/
│   │   ├── types.ts         # SourceFileNode, GraphData, VariableNode, GraphNode
│   │   └── nodeVisibility.ts
│   ├── lib/
│   │   ├── types.ts         # TokenRange, SegmentType, LineSegment, ProcessedLine
│   │   ├── tokenUtils.ts
│   │   ├── lineUtils.ts
│   │   ├── styleUtils.ts
│   │   └── getters.ts
│   ├── ui/
│   └── index.ts
└── VariableNode/
    └── model/types.ts       # VariableNode, GraphData, GraphNode (중복!)
```

---

### 2. 타입 정의 현황

#### 2.1. SourceFileNode 관련

**위치**: `entities/SourceFileNode/model/types.ts`

```typescript
// 핵심 도메인 모델
export interface SourceFileNode {
  id: string;
  label: string;
  filePath: string;
  type: 'module';
  codeSnippet: string;
  startLine: number;
  sourceFile: ts.SourceFile;  // AST - 단일 진실 공급원
  dependencies?: string[];    // 캐싱용
  vueTemplate?: string;
  vueTemplateRefs?: Array<any>;
}

// 그래프 데이터
export interface GraphData {
  nodes: SourceFileNode[];
}

// 하위 호환성을 위한 alias
export type VariableNode = SourceFileNode;

// 레이아웃 정보 포함 (⚠️ 문제: 이것은 CanvasNode와 중복)
export interface GraphNode extends VariableNode {
  x?: number;
  y?: number;
  depth?: number;
}
```

**사용처**:
- ✅ `store/atoms.ts` - `graphDataAtom: GraphData`
- ✅ `widgets/PipelineCanvas/useCanvasLayout.ts`
- ✅ `shared/symbolMetadataExtractor.ts`
- ✅ 전체 24개 파일에서 import

**분석**:
- ✅ **잘 설계됨**: `sourceFile: ts.SourceFile`을 단일 진실 공급원으로 사용
- ⚠️ **문제 1**: `GraphNode`가 CanvasNode와 역할 중복
- ⚠️ **문제 2**: `VariableNode` alias가 혼란 야기

---

#### 2.2. CanvasNode 관련

**위치**: `entities/CanvasNode/model/types.ts`

```typescript
// 템플릿 토큰 범위
export interface TemplateTokenRange {
  startOffset: number;
  endOffset: number;
  text: string;
  tokenIds: string[];
  relativeStart?: number;
  relativeEnd?: number;
  type?: 'token' | 'string' | 'comment' | 'directive-if' | ...;
}

// 캔버스 레이아웃 노드
export interface CanvasNode extends VariableNode {
  x: number;
  y: number;
  level: number;
  isVisible: boolean;
  visualId: string;
}

// 컴포넌트 그룹 (배경 렌더링용)
export interface ComponentGroup {
  filePath: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  label: string;
}
```

**사용처**:
- ✅ `store/atoms.ts` - `layoutNodesAtom: CanvasNode[]`
- ✅ `widgets/PipelineCanvas/*` - 22개 파일
- ✅ `features/CodeFold/*`, `features/FocusMode/*`

**분석**:
- ✅ **올바른 확장**: SourceFileNode에 레이아웃 정보 추가
- ✅ **명확한 역할**: 캔버스 렌더링용 노드
- ⚠️ **문제**: `VariableNode`를 import하는데, 이것이 SourceFileNode의 alias라서 혼란

---

#### 2.3. 렌더링 타입 (분산됨)

**위치 1**: `entities/SourceFileNode/lib/types.ts`

```typescript
// ⚠️ 문제: entities에 있지만 사실상 렌더링 레이어 타입
export interface TokenRange {
  start: number;
  end: number;
  type: 'self' | 'dependency' | 'other-known' | ...;
  text: string;
}

export type SegmentType = 'text' | 'self' | 'token' | ...;

export interface LineSegment {
  text: string;
  type: SegmentType;
  tokenId?: string;
}

export interface ProcessedLine {
  num: number;
  segments: LineSegment[];
  hasInput: boolean;
}
```

**위치 2**: `widgets/CodeViewer/core/types/segment.ts`

```typescript
// ✅ 올바른 위치: widgets 레이어
export interface CodeSegment {
  text: string;
  kinds: SegmentKind[];
  nodeId?: string;
  definedIn?: string;
  offset?: number;
  isDeclarationName?: boolean;
  position?: number;
  hoverInfo?: string;
  definitionLocation?: { ... };
  tsNode?: any;
}
```

**위치 3**: `widgets/CodeViewer/core/types/codeLine.ts`

```typescript
// ✅ 올바른 위치: widgets 레이어
export interface CodeLine {
  num: number;
  segments: CodeSegment[];
  hasInput: boolean;
  hasTopLevelReturn?: boolean;
  hasDeclarationKeyword?: boolean;
  exportSlots?: ExportSlot[];
  foldInfo?: FoldInfo;
}
```

**분석**:
- ⚠️ **레이어 위반**: `entities/SourceFileNode/lib/types.ts`의 렌더링 타입들은 widgets 레이어에 속해야 함
- ✅ **올바른 분리**: `widgets/CodeViewer/core/types`의 타입들은 올바른 위치
- ⚠️ **중복 개념**: `ProcessedLine` vs `CodeLine`, `LineSegment` vs `CodeSegment`

---

#### 2.4. VariableNode (중복 정의!)

**위치 1**: `entities/SourceFileNode/model/types.ts`
```typescript
// Backward compatibility용 alias
export type VariableNode = SourceFileNode;
```

**위치 2**: `entities/VariableNode/model/types.ts`
```typescript
// ⚠️ 완전히 다른 정의!
export interface VariableNode {
  id: string;
  label: string;
  filePath: string;
  type: 'ref' | 'computed' | 'prop' | 'store' | 'function' | 'hook' | 'template' | 'call' | 'module';
  codeSnippet: string;
  startLine: number;
  dependencies: string[];
  templateTokenRanges?: TemplateTokenRange[];
}

// ⚠️ GraphData도 중복!
export interface GraphData {
  nodes: VariableNode[];
}

// ⚠️ GraphNode도 중복!
export interface GraphNode extends VariableNode {
  x?: number;
  y?: number;
  depth?: number;
}
```

**실제 사용 분석**:
```bash
# SourceFileNode에서 import: 9개 파일
import { VariableNode } from '../entities/SourceFileNode'

# VariableNode에서 import: 0개 파일!
# → VariableNode/model/types.ts는 사용되지 않음
```

**분석**:
- ❌ **심각한 문제**: 완전히 다른 두 개의 VariableNode 정의
- ❌ **데드 코드**: `entities/VariableNode/model/types.ts`는 사용되지 않음
- ❌ **혼란**: 타입 이름만으로는 어떤 것을 의미하는지 알 수 없음

---

#### 2.5. File Entity

**위치**: `entities/File/model/types.ts`

```typescript
export interface FileItemProps {
  fileName: string;
  index: number;
}
```

**분석**:
- ⚠️ **Props 인터페이스**: CONVENTIONS.md에 따르면 inline props를 사용해야 함
- ⚠️ **UI 타입**: 사실상 FileItem 컴포넌트의 props인데 entities에 위치

---

### 3. 문제점 요약

#### 🔴 Critical (심각)

**C1. VariableNode 중복 정의**
- `SourceFileNode/model/types.ts`: `type VariableNode = SourceFileNode`
- `VariableNode/model/types.ts`: `interface VariableNode { ... }`
- **영향**: 타입 혼란, 잘못된 import 가능성
- **해결**: VariableNode 폴더 제거, SourceFileNode만 사용

**C2. GraphData/GraphNode 중복**
- 두 곳에 정의되어 있음
- **영향**: 유지보수 혼란
- **해결**: SourceFileNode에만 유지

**C3. 데드 코드 존재**
- `entities/VariableNode/` 전체 폴더가 사용되지 않음
- **영향**: 코드베이스 복잡도 증가
- **해결**: 폴더 삭제

---

#### 🟡 Warning (경고)

**W1. 렌더링 타입의 레이어 위반**
- `entities/SourceFileNode/lib/types.ts`에 렌더링 타입 존재
- **영향**: FSD 레이어 원칙 위반
- **해결**: widgets/CodeViewer로 이동

**W2. GraphNode vs CanvasNode 역할 중복**
- 둘 다 "레이아웃 좌표가 있는 노드"를 의미
- **영향**: 혼란
- **해결**: GraphNode 제거, CanvasNode만 사용

**W3. Props 인터페이스 분리**
- `FileItemProps`가 별도 인터페이스로 정의됨
- **영향**: CONVENTIONS.md 위반
- **해결**: FileItem 컴포넌트에 inline으로 변경

**W4. 타입 명명 불일치**
- `ProcessedLine` vs `CodeLine` (같은 개념)
- `LineSegment` vs `CodeSegment` (같은 개념)
- **영향**: 혼란
- **해결**: 하나로 통합

---

### 4. 개선된 구조 제안

#### 제안 1: 최소한의 변경 (Quick Fix)

**목표**: 중복과 데드 코드만 제거

```
src/entities/
├── SourceFileNode/          # 파일 단위 노드
│   ├── model/
│   │   ├── types.ts         # SourceFileNode, GraphData만 유지
│   │   └── nodeVisibility.ts
│   ├── lib/
│   │   ├── tokenUtils.ts
│   │   ├── lineUtils.ts
│   │   ├── styleUtils.ts
│   │   └── getters.ts
│   └── index.ts
│
├── CanvasNode/              # 레이아웃 노드
│   ├── model/
│   │   └── types.ts         # CanvasNode, ComponentGroup
│   └── index.ts
│
└── File/                    # 파일 엔티티
    ├── lib/fuzzyMatch.ts
    ├── ui/FileItem.tsx      # FileItemProps를 inline으로
    └── index.ts
```

**변경 사항**:
1. ✅ `entities/VariableNode/` 폴더 삭제
2. ✅ `SourceFileNode/model/types.ts`에서 `VariableNode` alias 제거
3. ✅ `GraphNode` 제거 (CanvasNode로 대체)
4. ✅ `File/model/types.ts` 삭제, props는 inline으로
5. ✅ 모든 import를 SourceFileNode로 통일

---

#### 제안 2: 완전한 재구조화 (Recommended)

**목표**: FSD 원칙 준수 및 명확한 레이어 분리

```
src/entities/
├── SourceFileNode/          # 도메인: 파일 노드
│   ├── model/
│   │   ├── types.ts         # SourceFileNode, GraphData
│   │   └── visibility.ts
│   └── lib/
│       ├── getters.ts       # AST에서 정보 추출
│       ├── dependencies.ts
│       └── vue.ts           # Vue 관련 유틸
│
├── CanvasNode/              # 도메인: 레이아웃 노드
│   ├── model/
│   │   └── types.ts         # CanvasNode, ComponentGroup
│   └── lib/
│       └── layout.ts        # 레이아웃 계산 유틸
│
└── File/                    # 도메인: 파일
    └── lib/
        └── fuzzyMatch.ts    # 검색 유틸

src/widgets/CodeViewer/
├── core/
│   ├── types/
│   │   ├── codeLine.ts      # CodeLine (기존)
│   │   ├── segment.ts       # CodeSegment (기존)
│   │   └── rendering.ts     # ⬅️ 새로 추가: 렌더링 타입
│   └── renderer/
│       ├── renderCodeLinesDirect.ts
│       └── renderVueFile.ts
└── ui/
    ├── CodeLine.tsx
    ├── CodeLineSegment.tsx
    └── ...

# entities/SourceFileNode/lib/types.ts 삭제
# → 렌더링 타입은 widgets/CodeViewer/core/types/rendering.ts로 이동
```

**이동할 타입**:
```typescript
// widgets/CodeViewer/core/types/rendering.ts
export interface TokenRange { ... }
export type SegmentType = ...;
export interface LineSegment { ... }
// → 이것들은 CodeSegment와 통합 가능
```

**변경 사항**:
1. ✅ 제안 1의 모든 변경사항
2. ✅ `SourceFileNode/lib/types.ts` 삭제
3. ✅ 렌더링 타입을 `widgets/CodeViewer/core/types`로 이동
4. ✅ `TokenRange`, `LineSegment` → `CodeSegment`로 통합
5. ✅ `ProcessedLine` → `CodeLine`으로 통합
6. ✅ File entity UI 제거 (FileItem은 widgets로)

---

#### 제안 3: 완전한 도메인 분리 (Advanced)

**목표**: 명확한 도메인 경계와 타입 응집도

```
src/entities/
│
├── Domain/                  # ⬅️ 새로 추가: 도메인 공통 타입
│   ├── GraphData.ts         # GraphData 인터페이스
│   └── FileSystem.ts        # 파일 시스템 관련 공통 타입
│
├── SourceFile/              # ⬅️ 이름 변경: Node 제거
│   ├── model/
│   │   ├── SourceFile.ts    # SourceFileNode → SourceFile
│   │   └── visibility.ts
│   └── lib/
│       ├── ast.ts           # AST 추출 유틸
│       ├── dependencies.ts  # 의존성 계산
│       └── vue.ts           # Vue 파일 처리
│
├── Canvas/                  # ⬅️ 이름 변경: Node 제거
│   ├── model/
│   │   ├── CanvasElement.ts # CanvasNode → CanvasElement
│   │   └── Layout.ts        # ComponentGroup 등
│   └── lib/
│       └── positioning.ts   # 위치 계산
│
└── Search/                  # ⬅️ File → Search로 재구성
    └── lib/
        └── fuzzyMatch.ts

src/widgets/
├── CodeViewer/              # 코드 렌더링
│   ├── model/               # ⬅️ 새로 추가
│   │   ├── CodeLine.ts
│   │   └── CodeSegment.ts
│   ├── lib/
│   │   └── renderer.ts
│   └── ui/
│       └── ...
│
└── FileExplorer/            # ⬅️ 파일 탐색 UI
    └── ui/
        └── FileItem.tsx
```

**철학**:
- **명확한 도메인**: SourceFile(파일 AST), Canvas(레이아웃), Search(검색)
- **타입 응집도**: 관련 타입을 한 곳에 모음
- **레이어 분리**: entities는 순수 도메인, widgets는 UI 관심사

---

### 5. 마이그레이션 전략

#### 단계 1: 중복 제거 (1-2일)

**우선순위 1**: 데드 코드 제거
```bash
# 1. VariableNode 폴더 삭제
rm -rf src/entities/VariableNode

# 2. SourceFileNode에서 VariableNode alias 제거
# src/entities/SourceFileNode/model/types.ts
- export type VariableNode = SourceFileNode;

# 3. 모든 import 수정
# 변경 전: import { VariableNode } from '...SourceFileNode'
# 변경 후: import { SourceFileNode } from '...SourceFileNode'
```

**우선순위 2**: GraphNode 제거
```typescript
// src/entities/SourceFileNode/model/types.ts
- export interface GraphNode extends VariableNode {
-   x?: number;
-   y?: number;
-   depth?: number;
- }

// CanvasNode로 대체
```

**영향 범위**: 약 24개 파일

---

#### 단계 2: 레이어 분리 (2-3일)

**우선순위 1**: 렌더링 타입 이동
```bash
# 1. entities/SourceFileNode/lib/types.ts 삭제 예정 표시
# 2. widgets/CodeViewer/core/types/rendering.ts 생성
# 3. TokenRange, LineSegment 등을 CodeSegment로 통합
# 4. 모든 import 경로 수정
```

**우선순위 2**: Props inline화
```typescript
// File/ui/FileItem.tsx
- import { FileItemProps } from '../model/types';
- export function FileItem({ fileName, index }: FileItemProps) { ... }

+ export function FileItem({
+   fileName,
+   index
+ }: {
+   fileName: string;
+   index: number;
+ }) { ... }
```

**영향 범위**: 약 15개 파일

---

#### 단계 3: 도메인 재구성 (선택, 3-5일)

**제안 3**을 따르는 경우:
1. Domain 폴더 생성 및 공통 타입 이동
2. entities 이름 변경 (SourceFileNode → SourceFile)
3. 모든 import 경로 업데이트
4. 문서 업데이트

**영향 범위**: 전체 프로젝트

---

### 6. 타입 의존성 그래프

#### 현재 상태

```
SourceFileNode ──┬──> VariableNode (alias)
                 │
                 └──> GraphNode (extends VariableNode)

CanvasNode ──────────> VariableNode (from SourceFileNode)

VariableNode/* ──────> [사용되지 않음]

SourceFileNode/lib/types.ts ──> [entities 레이어 위반]
                              └──> TokenRange, LineSegment 등

widgets/CodeViewer/core/types ──> CodeLine, CodeSegment
```

**문제**:
- ❌ 순환적 명명: VariableNode → SourceFileNode alias → GraphNode
- ❌ 레이어 위반: entities에 렌더링 타입
- ❌ 중복: ProcessedLine vs CodeLine

---

#### 개선 후 (제안 2)

```
SourceFileNode ──> GraphData

CanvasNode ──────> SourceFileNode (extends)

widgets/CodeViewer/core/types ──> CodeLine, CodeSegment
                                  (TokenRange 등 통합)
```

**개선점**:
- ✅ 명확한 계층: SourceFileNode → CanvasNode
- ✅ 레이어 준수: 렌더링 타입은 widgets에
- ✅ 단일 진실: CodeLine만 사용

---

## Action (실행/활용)

### 즉시 실행 가능한 액션

#### 액션 1: 데드 코드 제거 (30분)

**체크리스트**:
```bash
# 1. VariableNode 폴더 사용 확인
grep -r "from.*VariableNode" src/
# 결과: 0건 → 안전하게 삭제 가능

# 2. 삭제 실행
git mv src/entities/VariableNode src/entities/.deprecated_VariableNode
git commit -m "chore: Mark VariableNode as deprecated (unused)"

# 3. 테스트 실행
npm run test
npm run type-check

# 4. 문제 없으면 완전 삭제
rm -rf src/entities/.deprecated_VariableNode
git commit -m "chore: Remove unused VariableNode entity"
```

---

#### 액션 2: GraphNode 제거 (1시간)

**단계**:
```typescript
// 1. 사용처 확인
grep -r "GraphNode" src/

// 2. SourceFileNode/model/types.ts 수정
- export interface GraphNode extends VariableNode {
-   x?: number;
-   y?: number;
-   depth?: number;
- }

// 3. 모든 GraphNode를 CanvasNode로 교체
// (사용처가 거의 없을 것으로 예상)
```

---

#### 액션 3: VariableNode Alias 제거 (2시간)

**단계**:
```bash
# 1. 모든 사용처 찾기
grep -rn "import.*VariableNode" src/ > variable_node_imports.txt

# 2. 일괄 변경 스크립트
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/import { VariableNode }/import { SourceFileNode }/g'

find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/: VariableNode/: SourceFileNode/g'

# 3. SourceFileNode/model/types.ts에서 alias 제거
- export type VariableNode = SourceFileNode;

# 4. 타입 체크
npm run type-check

# 5. 수동 수정 (복잡한 케이스)
# variable_node_imports.txt 참고하여 하나씩 확인
```

---

### 중기 실행 계획 (1-2주)

#### Week 1: 중복 및 데드 코드 제거

**Day 1-2**: 액션 1, 2, 3 실행
**Day 3-4**: 테스트 및 검증
**Day 5**: 문서 업데이트

---

#### Week 2: 레이어 분리

**Day 1-2**: 렌더링 타입 이동
```typescript
// widgets/CodeViewer/core/types/rendering.ts 생성
export interface RenderToken {
  // TokenRange + CodeSegment 통합
}

export interface RenderLine {
  // ProcessedLine + CodeLine 통합
}
```

**Day 3-4**: Import 경로 수정
**Day 5**: 테스트 및 문서화

---

### 장기 계획 (선택, 1개월)

#### 완전한 도메인 재구성

**제안 3**을 따르는 경우:
- **Week 1**: 계획 수립 및 설계 리뷰
- **Week 2**: Domain 폴더 생성 및 공통 타입 이동
- **Week 3**: Entities 이름 변경 및 구조 조정
- **Week 4**: 테스트, 문서화, 코드 리뷰

---

### 성공 지표

**정량적 지표**:
- [ ] 중복 타입 정의 0건
- [ ] 데드 코드 0건
- [ ] 레이어 위반 0건
- [ ] 타입 체크 에러 0건

**정성적 지표**:
- [ ] 폴더 구조만으로 타입 역할 파악 가능
- [ ] 새 개발자가 5분 이내에 entities 구조 이해
- [ ] 타입 import 경로가 직관적

---

## 참고 자료

### 관련 문서
- [CONVENTIONS.md](../../../CONVENTIONS.md) - 코딩 컨벤션
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 전체 아키텍처
- [Feature-Sliced Design](https://feature-sliced.design/) - FSD 공식 문서

### 타입 사용 통계

| 타입 | 정의 위치 | 사용 횟수 | 상태 |
|------|-----------|-----------|------|
| SourceFileNode | SourceFileNode/model/types.ts | 24 | ✅ 활성 |
| CanvasNode | CanvasNode/model/types.ts | 22 | ✅ 활성 |
| GraphData | SourceFileNode/model/types.ts | 3 | ✅ 활성 |
| VariableNode (alias) | SourceFileNode/model/types.ts | 24 | ⚠️ 제거 예정 |
| GraphNode | SourceFileNode/model/types.ts | 0 | ❌ 제거 |
| VariableNode (중복) | VariableNode/model/types.ts | 0 | ❌ 데드 코드 |
| TokenRange | SourceFileNode/lib/types.ts | 2 | ⚠️ 이동 필요 |
| ProcessedLine | SourceFileNode/lib/types.ts | 1 | ⚠️ 통합 필요 |
| CodeLine | widgets/CodeViewer/core/types | 15 | ✅ 활성 |
| CodeSegment | widgets/CodeViewer/core/types | 18 | ✅ 활성 |

---

**보고서 작성일**: 2026-01-01
**분석 범위**: src/entities 전체
**권장 액션**: 제안 2 (완전한 재구조화)
**예상 소요 시간**: 1-2주
