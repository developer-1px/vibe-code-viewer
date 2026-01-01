# Code 레이어 설계 분석: 다중 언어 지원을 위한 확장 전략

**작성일**: 2026-01-01
**카테고리**: Architecture / 설계 분석
**상태**: 제안 (Proposal)

---

## 📋 목적 (Purpose)

현재 TypeScript에 특화된 Code 레이어 구조를 분석하고, JSON, Markdown 등 다른 파일 타입을 지원할 수 있는 확장 가능한 설계 방향을 제안합니다.

### 배경

- **현재**: TypeScript만 지원 (`ts.SourceFile` 기반)
- **문제**: CodeFold, CodeRender는 언어 독립적 기능이지만 TypeScript에 강하게 결합됨
- **목표**: 확장 가능한 구조로 JSON, Markdown 등 추가 언어 지원 준비

---

## 🔍 현재 구조 분석 (Current State)

### 1. 핵심 타입 구조

```typescript
// entities/SourceFileNode/model/types.ts
interface SourceFileNode {
  id: string;
  filePath: string;
  codeSnippet: string;
  sourceFile: ts.SourceFile;  // ⚠️ TypeScript 전용
  dependencies?: string[];
  vueTemplate?: string;        // Vue 지원
}

// widgets/CodeViewer/core/types/
interface CodeLine {
  num: number;
  segments: CodeSegment[];
  foldInfo?: FoldInfo;         // ⚠️ 레이어 위반 (features → widgets)
}

interface CodeSegment {
  text: string;
  kinds: SegmentKind[];
  nodeId?: string;
  position?: number;
  tsNode?: any;                // ⚠️ TypeScript 전용
}

// features/CodeFold/lib/types.ts
interface FoldInfo {
  isFoldable: boolean;
  foldStart: number;
  foldEnd: number;
  foldType?: 'statement-block' | 'jsx-children' | ...;
}
```

### 2. 언어 의존성 분석

#### ✅ 언어 독립적 기능

| 기능 | 위치 | 독립성 | 설명 |
|------|------|--------|------|
| **CodeFold** | `features/CodeFold` | 100% | 라인 번호 기반, 어떤 언어든 사용 가능 |
| **CodeLine** | `widgets/CodeViewer` | 90% | 일부 TypeScript 특화 필드 제외하면 범용 |
| **CodeSegment** | `widgets/CodeViewer` | 80% | `tsNode`, `definitionLocation` 제외하면 범용 |
| **CodeRender** | `widgets/CodeViewer` | 95% | CodeLine[] → React elements 변환 로직은 범용 |

#### ⚠️ TypeScript 특화 기능

| 기능 | 위치 | TypeScript 의존성 | 설명 |
|------|------|-------------------|------|
| **SourceFileNode** | `entities/SourceFileNode` | 100% | `ts.SourceFile` 필수 |
| **tokenUtils** | `entities/SourceFileNode/lib` | 100% | TypeScript Scanner API 사용 |
| **Language Service** | `shared/tsParser` | 100% | 타입 정보, 정의 위치 등 |
| **AST 순회** | `shared/tsParser` | 100% | `ts.forEachChild` 등 |

### 3. 다른 언어 지원 시 필요한 것

#### JSON 파일

```json
{
  "name": "example",
  "nested": {
    "value": 123
  }
}
```

**필요 기능**:
- ✅ **CodeFold**: Object, Array 접기 (라인 번호 기반)
- ✅ **CodeSegment**: 키/값 하이라이팅 (JSON parser로 토큰 추출)
- ⚠️ **Language Service**: 불필요 (스키마 검증은 선택)

#### Markdown 파일

```markdown
# Heading

Code block:
\`\`\`typescript
const x = 1;
\`\`\`
```

**필요 기능**:
- ✅ **CodeFold**: 제목, 코드블록 접기 (라인 범위 기반)
- ✅ **CodeSegment**: 헤딩, 코드, 링크 등 하이라이팅
- ⚠️ **Language Service**: 불필요 (내부 링크 추적은 선택)

---

## 🎯 설계 방안 (Design Options)

### 방안 1: 언어별 분리 (Language-Specific Entities)

```
entities/
├── TypeScriptFile/
│   ├── model/types.ts        → TypeScriptFileNode
│   └── lib/tokenUtils.ts     → TS Scanner
├── JsonFile/
│   ├── model/types.ts        → JsonFileNode
│   └── lib/tokenUtils.ts     → JSON parser
└── MarkdownFile/
    ├── model/types.ts        → MarkdownFileNode
    └── lib/tokenUtils.ts     → MD parser
```

#### 장점
- ✅ 각 언어의 특성을 완전히 활용 가능
- ✅ 타입 안전성 높음 (언어별 전용 인터페이스)
- ✅ 언어별 최적화 가능

#### 단점
- ❌ 중복 코드 많음 (filePath, codeSnippet 등 공통 필드)
- ❌ 새 언어 추가 시 전체 구조 복제 필요
- ❌ 공통 인터페이스 유지 어려움
- ❌ FSD 레이어 위반 미해결 (CodeSegment, FoldInfo는 여전히 widgets/features에)

#### 적합성
- ❌ **비추천**: 확장성 낮음, 유지보수 부담 큼

---

### 방안 2: 추상화 레이어 (Abstract Base + Concrete Implementation)

```
entities/
├── CodeFile/                  # 추상 레이어
│   ├── model/types.ts         → CodeFileNode (abstract interface)
│   └── lib/                   → 공통 유틸리티
├── CodeSegment/               # 렌더링용 (언어 독립적)
└── FoldInfo/                  # 접기용 (언어 독립적)

services/
└── parsers/                   # 구체 구현 (언어별 파서)
    ├── TypeScriptParser/
    │   ├── index.ts           → parseTypeScript()
    │   └── utils/             → TS Scanner, Language Service
    ├── JsonParser/
    │   └── index.ts           → parseJson()
    └── MarkdownParser/
        └── index.ts           → parseMarkdown()
```

#### 구조 예시

```typescript
// entities/CodeFile/model/types.ts
interface CodeFileNode {
  id: string;
  filePath: string;
  codeSnippet: string;
  fileType: 'typescript' | 'json' | 'markdown';
  // AST는 저장하지 않음 (파서마다 다름)
}

// services/parsers/TypeScriptParser/index.ts
export function parseTypeScript(
  fileContent: string
): ParseResult {
  const sourceFile = ts.createSourceFile(...);
  const segments = extractSegments(sourceFile);
  const foldRanges = extractFoldRanges(sourceFile);

  return { segments, foldRanges };
}
```

#### 장점
- ✅ 관심사 분리 명확 (도메인 모델 vs 파싱 로직)
- ✅ 공통 인터페이스 강제 (`CodeFileNode`)
- ✅ 파서만 교체하면 새 언어 지원 가능
- ✅ FSD 레이어 위반 해결 (CodeSegment, FoldInfo → entities)

#### 단점
- ❌ 추상화 오버헤드 (파싱 결과를 매번 변환)
- ❌ 언어별 특수 기능 지원 어려움 (TS Language Service 등)
- ❌ AST를 entities에 저장할 수 없음 (언어마다 AST 구조가 다름)
- ❌ **Getter 기반 아키텍처 원칙 위반**: 현재는 AST에서 필요한 정보를 on-demand로 추출하는데, 파싱 시점에 모든 정보를 미리 추출해야 함

#### 적합성
- ⚠️ **조건부 추천**: Getter 기반 원칙을 포기할 수 있다면 고려 가능

---

### 방안 3: 기능 중심 (Feature-Oriented)

```
entities/
├── CodeDocument/              # 범용 문서 모델
│   └── model/types.ts         → CodeDocumentNode
├── CodeSegment/               # 토큰 모델 (언어 독립적)
│   └── model/types.ts         → CodeSegment
├── FoldInfo/                  # 접기 모델 (언어 독립적)
│   └── model/types.ts         → FoldInfo
└── LanguageContext/           # 언어별 확장 데이터
    └── model/types.ts         → TypeScriptContext | JsonContext | ...
```

#### 구조 예시

```typescript
// entities/CodeDocument/model/types.ts
interface CodeDocumentNode {
  id: string;
  filePath: string;
  codeSnippet: string;
  languageType: 'typescript' | 'json' | 'markdown';
  languageContext?: LanguageContext; // 언어별 확장 데이터
}

// entities/LanguageContext/model/types.ts
type LanguageContext =
  | TypeScriptContext
  | JsonContext
  | MarkdownContext;

interface TypeScriptContext {
  type: 'typescript';
  sourceFile: ts.SourceFile;
  languageService?: ts.LanguageService;
}

interface JsonContext {
  type: 'json';
  parsed: any;
  schema?: JSONSchema;
}

interface MarkdownContext {
  type: 'markdown';
  ast: MarkdownAST;
  toc?: TocEntry[];
}
```

#### 장점
- ✅ 공통 기능 (CodeFold, CodeRender) 완전히 언어 독립적
- ✅ 확장 포인트 명확 (`LanguageContext`)
- ✅ FSD 레이어 위반 해결
- ✅ 기존 Getter 기반 원칙 유지 가능 (AST를 context에 저장)

#### 단점
- ❌ 언어별 데이터 분산 (CodeDocumentNode + TypeScriptContext)
- ❌ 타입 복잡도 증가 (유니온 타입, 타입 가드 필요)
- ❌ 기존 코드 대규모 리팩토링 필요

#### 적합성
- ⚠️ **장기 전략**: 완벽한 설계지만 단기 구현 부담 큼

---

### 방안 4: 하이브리드 (Current + Extension Points) ⭐ **추천**

```
entities/
├── SourceFileNode/            # 기존 유지 (TypeScript 전용)
│   ├── model/types.ts         → SourceFileNode (ts.SourceFile 포함)
│   └── lib/                   → TypeScript 유틸리티
├── CodeSegment/               # ← widgets에서 이동 (언어 독립적)
│   └── model/types.ts         → CodeSegment
├── FoldInfo/                  # ← features에서 이동 (언어 독립적)
│   └── model/types.ts         → FoldInfo, FoldPlaceholder
└── DocumentNode/              # 새로 추가 (범용 문서, 미래 확장용)
    ├── model/types.ts         → DocumentNode (범용 인터페이스)
    └── lib/                   → 범용 파서 인터페이스
```

#### 구조 예시

```typescript
// entities/SourceFileNode/model/types.ts (기존 유지)
interface SourceFileNode {
  id: string;
  filePath: string;
  codeSnippet: string;
  sourceFile: ts.SourceFile;  // TypeScript 전용
  dependencies?: string[];
}

// entities/CodeSegment/model/types.ts (widgets에서 이동)
interface CodeSegment {
  text: string;
  kinds: SegmentKind[];
  nodeId?: string;
  position?: number;
  // TypeScript 특화 필드는 선택적으로
  tsNode?: any;
  definitionLocation?: DefinitionLocation;
}

// entities/FoldInfo/model/types.ts (features에서 이동)
interface FoldInfo {
  isFoldable: boolean;
  foldStart: number;
  foldEnd: number;
  foldType?: FoldType;
}

// entities/DocumentNode/model/types.ts (새로 추가, 미래용)
interface DocumentNode {
  id: string;
  filePath: string;
  content: string;
  fileType: FileType;
  // 언어별 파서가 필요한 정보를 제공하는 인터페이스
}
```

#### 마이그레이션 전략

**Phase 1: FSD 레이어 위반 해결 (1-2주)**
1. `CodeSegment` → `entities/CodeSegment/` 이동
2. `FoldInfo` → `entities/FoldInfo/` 이동
3. Import 경로 수정

**Phase 2: 범용 문서 인터페이스 추가 (2-3주, 선택)**
1. `entities/DocumentNode/` 추가
2. JSON, Markdown 파서 프로토타입 작성
3. `SourceFileNode`와 `DocumentNode` 공존

**Phase 3: 점진적 마이그레이션 (미정)**
1. TypeScript 파싱을 `DocumentNode` 방식으로 전환
2. `SourceFileNode` 폐기 예정 (Deprecated)

#### 장점
- ✅ **즉시 실행 가능**: FSD 레이어 위반 해결 (Phase 1)
- ✅ **하위 호환**: 기존 TypeScript 코드 유지
- ✅ **점진적 확장**: 필요할 때 DocumentNode 추가 (Phase 2)
- ✅ **리스크 최소화**: 기존 기능 깨지지 않음

#### 단점
- ⚠️ 두 가지 패턴 공존 (단기적으로는 혼란 가능)
- ⚠️ 장기적으로 마이그레이션 필요 (하지만 선택적)

#### 적합성
- ✅ **강력 추천**: 실용적, 점진적, 리스크 낮음

---

## 💡 권장 사항 (Recommendations)

### 단기 (1-2주): 방안 4 - Phase 1 실행

**목표**: FSD 레이어 위반 해결

```bash
# 1. entities 폴더 생성
mkdir -p src/entities/CodeSegment/model
mkdir -p src/entities/FoldInfo/model

# 2. 타입 이동
mv src/widgets/CodeViewer/core/types/segment.ts \
   src/entities/CodeSegment/model/types.ts

mv src/features/CodeFold/lib/types.ts \
   src/entities/FoldInfo/model/types.ts

# 3. Import 경로 일괄 변경
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's|from.*CodeViewer/core/types/segment|from "@/entities/CodeSegment/model/types"|g'

find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's|from.*CodeFold/lib/types|from "@/entities/FoldInfo/model/types"|g'
```

**기대 효과**:
- ✅ FSD 레이어 위반 해결 (widgets → features 의존성 제거)
- ✅ 코드 가독성 향상 (도메인 모델 위치 명확화)
- ✅ 타입 재사용성 증가

### 중기 (1-2개월): 방안 4 - Phase 2 고려

**목표**: JSON, Markdown 지원 프로토타입

**조건**:
- JSON, Markdown 파일 업로드 요구사항 발생 시
- 또는 실험적 기능으로 추가

**구현**:
1. `entities/DocumentNode/` 인터페이스 설계
2. `services/parsers/JsonParser/` 구현
3. `CodeViewer`가 `DocumentNode` 렌더링 지원
4. `SourceFileNode`와 공존 (기존 TypeScript 기능 유지)

### 장기 (6개월 이상): SourceFileNode → DocumentNode 마이그레이션

**목표**: 단일 문서 모델 통합

**조건**:
- 다중 언어 지원이 핵심 기능이 되었을 때
- SourceFileNode의 TypeScript 특화 기능이 DocumentNode로 완전히 이식 가능할 때

---

## 📊 비교표

| 항목 | 방안 1<br>언어별 분리 | 방안 2<br>추상화 레이어 | 방안 3<br>기능 중심 | 방안 4<br>하이브리드 ⭐ |
|------|---------------------|----------------------|---------------------|----------------------|
| **확장성** | ⚠️ 낮음 (중복 많음) | ✅ 높음 | ✅ 매우 높음 | ✅ 높음 |
| **타입 안전성** | ✅ 높음 | ⚠️ 중간 | ⚠️ 중간 (복잡) | ✅ 높음 |
| **FSD 준수** | ❌ 미해결 | ✅ 해결 | ✅ 해결 | ✅ 해결 |
| **Getter 원칙** | ✅ 유지 | ❌ 위반 | ✅ 유지 | ✅ 유지 |
| **하위 호환성** | ⚠️ 낮음 | ❌ 깨짐 | ❌ 깨짐 | ✅ 완벽 |
| **구현 난이도** | ⚠️ 중간 | ⚠️ 중간 | ❌ 높음 | ✅ 낮음 |
| **유지보수성** | ❌ 낮음 | ✅ 높음 | ✅ 높음 | ✅ 높음 |
| **리스크** | ⚠️ 중간 | ⚠️ 중간 | ❌ 높음 | ✅ 낮음 |
| **즉시 실행** | ⚠️ 가능 | ❌ 어려움 | ❌ 어려움 | ✅ 가능 |

---

## 🎯 결론

**방안 4 (하이브리드)를 추천합니다.**

### 이유

1. **즉시 실행 가능**: Phase 1 (FSD 레이어 위반 해결)은 1-2주 내 완료 가능
2. **점진적 확장**: 필요할 때 Phase 2 (DocumentNode) 추가
3. **리스크 최소화**: 기존 TypeScript 기능 유지, 하위 호환성 보장
4. **FSD 원칙 준수**: CodeSegment, FoldInfo를 entities로 이동
5. **Getter 원칙 유지**: AST 기반 on-demand 추출 패턴 유지

### 다음 액션

1. ✅ **즉시**: Phase 1 실행 (CodeSegment, FoldInfo → entities)
2. ⏸️ **대기**: Phase 2는 JSON/MD 지원 요구사항 발생 시 진행
3. ⏸️ **보류**: Phase 3는 장기 전략으로 보류

---

## 📚 참고 자료

- [FSD Layer Violation Analysis](./FSD_LAYER_VIOLATION_ANALYSIS.md)
- [Entities Type Analysis](./ENTITIES_TYPE_ANALYSIS.md)
- [CONVENTIONS.md](../../../CONVENTIONS.md) - Getter 기반 아키텍처 원칙
