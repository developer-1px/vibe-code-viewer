# CodeDocView - 요구사항 명세서

## 1. 개요 (Overview)

### 1.1 목적
CodeDocView는 소스 코드를 **문서 중심 뷰**로 변환하여 표시하는 기능입니다. 기존의 IDE 방식이 코드를 메인으로 하고 주석을 보조 정보로 다루는 것과 달리, CodeDocView는 **주석을 메인 콘텐츠로, 코드를 보조 자료로** 배치하여 GitBook이나 PDF 문서를 읽는 것과 같은 경험을 제공합니다.

### 1.2 비전
개발자가 새로운 코드베이스를 탐색할 때, 코드 자체보다는 **"이 코드가 무엇을 하는가"**를 먼저 이해하는 것이 중요합니다. CodeDocView는 잘 작성된 주석이 있는 코드를 자동으로 읽기 쉬운 문서 형태로 변환하여, 코드 이해 속도를 높이고 온보딩 시간을 단축시킵니다.

### 1.3 핵심 가치
- **문서 우선 (Documentation First)**: 주석과 설명을 먼저 보여주고, 코드는 증명 자료로 제시
- **읽기 경험 최적화**: PDF 뷰어처럼 편안한 읽기 환경 제공
- **제로 설정 (Zero Config)**: 기존 주석 스타일을 그대로 인식하여 자동 변환
- **자동 구조화**: 주석 스타일과 코드 구조를 분석하여 자동으로 문서 계층 구성

---

## 2. 주요 목표 (Goals)

### 2.1 기능적 목표
- ✅ 5가지 주석 스타일 자동 인식 및 렌더링
- ✅ Export 함수/변수 시그니처 자동 추출 및 강조 표시
- ✅ Interface 선언 자동 분리 및 개별 섹션 표시
- ✅ Import 의존성 시각화 (심볼 종류별 아이콘)
- ✅ TODO/FIXME 등 주석 태그 배지화
- ✅ 조건문(IF) 자동 감지 및 배지 표시

### 2.2 UX 목표
- ✅ Compact 디자인으로 정보 밀도 최대화
- ✅ PDF 뷰어 스타일 레이아웃으로 읽기 경험 최적화
- ✅ 모든 텍스트 선택 가능하여 복사 편의성 제공
- ✅ Sticky 헤더로 현재 문서 위치 인식
- ✅ 10개 초과 시 자동 접기로 Dependencies 정리

### 2.3 품질 목표
- ✅ TypeScript AST 기반 파싱으로 정확도 보장 (정규식 사용 금지)
- ✅ JSDoc 중복 제거로 깔끔한 표시
- ✅ Interface 1개씩 분리하여 가독성 향상

---

## 3. 사용자 시나리오 (User Scenarios)

### 시나리오 1: 새로운 코드베이스 온보딩
**상황**: 새 프로젝트에 합류한 개발자가 코드베이스를 처음 탐색

**As-Is (IDE 모드)**:
1. 파일을 열면 import 구문부터 시작
2. 주석을 찾기 위해 스크롤 필요
3. 함수가 무엇을 하는지 코드를 읽어야 이해 가능
4. TODO 항목이 코드에 묻혀서 놓치기 쉬움

**To-Be (CodeDoc 모드)**:
1. 파일 설명이 헤더에 먼저 표시됨
2. Dependencies가 시각적 배지로 정리되어 한눈에 파악
3. Export 함수 시그니처가 먼저 표시되고, 그 아래 전체 코드 표시
4. TODO/FIXME 배지가 눈에 띄어 놓치지 않음

**결과**: 코드 이해 시간 50% 단축

---

### 시나리오 2: API 문서 빠르게 확인
**상황**: 다른 팀이 작성한 유틸 함수를 사용해야 하는 개발자

**As-Is**:
1. 함수 전체 코드를 읽어야 사용법 이해
2. 파라미터 타입을 코드에서 직접 확인
3. 주석이 코드 중간에 있어 찾기 어려움

**To-Be**:
1. Export Signature에서 함수명, 파라미터, 리턴 타입을 한눈에 파악
2. JSDoc 주석이 시그니처 바로 위에 표시되어 즉시 확인
3. 예제 코드가 코드 스니펫으로 깔끔하게 정리됨

**결과**: API 사용법 확인 시간 70% 단축

---

### 시나리오 3: 코드 리뷰 및 TODO 관리
**상황**: 리뷰어가 PR의 TODO/FIXME 항목을 확인

**As-Is**:
1. 주석을 일일이 찾아서 읽어야 함
2. TODO가 코드에 묻혀서 놓칠 수 있음
3. 중요도 구분 어려움

**To-Be**:
1. TODO/FIXME/NOTE 배지가 색상별로 강조 표시
2. IF 배지로 조건문의 중요 주석 강조
3. 한 번에 모든 태그 항목 시각적으로 파악 가능

**결과**: 리뷰 효율성 향상, 중요 항목 누락 방지

---

## 4. 핵심 기능 (Core Features)

### 4.1 파일 헤더 (File Header)

#### 기능 설명
파일 상단에 작성된 주석 블록(첫 번째 import 전까지)을 파일 설명으로 추출하여 헤더에 표시합니다.

#### 표시 위치
파일명 아래, Dependencies 섹션 위

#### 표시 정보
- **파일 설명**: 주석 내용 (주석 기호 제거 후 표시)
- **메타데이터**:
  - 총 라인 수 (N lines)
  - Export 개수 (N exports)
  - 코드 블록 수 (N code blocks)

#### 예시
```typescript
/**
 * RefactoringPromptDialog
 * 선택된 dead code items를 기반으로 AI 리팩토링 프롬프트를 생성하고 복사/전송하는 다이얼로그
 */
import React from 'react';
```

**표시 결과**:
```
RefactoringPromptDialog.tsx
152 lines • 1 exports • 2 code blocks

RefactoringPromptDialog
선택된 dead code items를 기반으로 AI 리팩토링 프롬프트를 생성하고 복사/전송하는 다이얼로그
```

---

### 4.2 Dependencies 섹션

#### 기능 설명
파일에서 import한 모든 심볼을 **심볼 종류별 아이콘**과 함께 배지 형태로 표시합니다.

#### 심볼 종류 자동 감지
TypeScript AST를 사용하여 다음 규칙으로 심볼 종류를 추론합니다:

| 심볼 종류 | 감지 규칙 | 아이콘 | 색상 |
|-----------|-----------|--------|------|
| **function** | camelCase (예: `parseCodeDoc`) | Code | 파란색 |
| **type** | type-only import + PascalCase | Type | 보라색 |
| **interface** | type-only import + PascalCase | Type | 보라색 |
| **const** | UPPER_CASE (예: `DEFAULT_VALUE`) | Database | 초록색 |
| **component** | PascalCase + 접미사 (Button, Modal, View 등) | Box | 주황색 |
| **hook** | camelCase + `use` 접두사 (예: `useState`) | Braces | 청록색 |
| **class** | PascalCase (기타) | Layers | 노란색 |
| **enum** | PascalCase | FileCode | 핑크색 |

#### 접기/펼치기 규칙
- **10개 이하**: 기본 펼침
- **10개 초과**: 기본 접힘, 클릭으로 펼치기 가능

#### 표시 형태
```
[▼] Dependencies (11)
    [아이콘] React  [아이콘] useState  [아이콘] useAtomValue  ...
```

---

### 4.3 주석 렌더링

#### 지원하는 주석 스타일

##### 1. JSDoc 스타일 (`/** ... */`)
```typescript
/**
 * Generate prompt when dialog opens
 */
```
**렌더링**: 따뜻한 배경 패널 (bg-warm-50) + 왼쪽 주황색 바 (border-warm-400)

##### 2. XML Doc 스타일 (`/// ...`)
```typescript
/// <summary>
/// This is an XML documentation comment
/// </summary>
```
**렌더링**: 파란 배경 패널 (bg-blue-50) + 왼쪽 파란색 바 (border-blue-400)

##### 3. Separator 스타일 (`// ==== Title ====`)
```typescript
// ==== Section Title ====
```
**렌더링**: 수평선 + 중앙 정렬 큰 제목 + 수평선

##### 4. Line 주석 (`//`)
```typescript
// This is a comment
```
**렌더링**: Depth에 따라 h1/h2/h3 스타일 적용

##### 5. Block 주석 (`/* ... */`)
```typescript
/* This is a block comment */
```
**렌더링**: 일반 텍스트

#### Depth 기반 헤딩 레벨
주석의 들여쓰기(indentation)를 분석하여 자동으로 계층 구조 생성:

- **Depth 0** (들여쓰기 없음): `<h1>` 스타일 (20px, bold)
- **Depth 1** (2칸 들여쓰기): `<h2>` 스타일 (16px, semibold)
- **Depth 2+** (4칸 이상): `<h3>` 스타일 (14px, medium)

---

### 4.4 Export Signature

#### 기능 설명
`export` 키워드로 선언된 함수, 변수, interface를 시그니처 형태로 추출하여 강조 표시합니다.

#### 시그니처 포맷
**함수/변수**:
```
functionName(params) → returnType
```

**Interface**:
```
interface InterfaceName
```

#### 렌더링 스타일 (GitHub 스타일)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[JSDoc 주석 패널]

SIGNATURE
┃ functionName(param1, param2) → ReturnType
```

- **함수명**: 굵게 (bold), 검은색
- **파라미터**: 회색
- **리턴 타입**: 파란색, semibold

#### 표시 순서
같은 라인에서 시작하는 경우:
1. **코드 본문** 먼저
2. **Signature** 나중

이유: 사용자가 코드 전체를 먼저 보고, 그 아래에 요약(signature)을 확인하는 것이 자연스러움

---

### 4.5 코드 스니펫

#### 기능 설명
주석이 아닌 모든 코드를 라인 번호와 함께 박스 형태로 표시합니다.

#### 자동 필터링
- **Import 구문 제거**: Dependencies 섹션에서 이미 표시하므로 중복 제거
- **JSDoc 중복 제거**: relatedComment가 JSDoc/Block 스타일이면 코드 시작 부분의 주석 블록 제거
- **Interface 자동 분리**: 여러 interface가 연속으로 있으면 각각 독립 섹션으로 분리

#### Related Comment 연결
코드 블록 바로 앞에 빈 줄 없이 주석이 있으면 자동으로 연결하여 함께 표시:

```typescript
// Double-tap detection
if (timeSinceLastPress < 300) {
  // ...
}
```

**렌더링**:
```
[TODO 배지] [IF 배지]
Double-tap detection

┌────────────────────────────────────┐
│ 32  if (timeSinceLastPress < 300) {│
│ 33    // ...                        │
│ 34  }                               │
└────────────────────────────────────┘
```

#### 코드 스니펫 스타일
- **배경**: 연한 회색 (bg-gray-50)
- **테두리**: 회색 (border-gray-200)
- **라인 번호**: 10px, 회색, 우측 정렬
- **코드 텍스트**: 11px, monospace
- **Hover 효과**: 라인 hover 시 회색 배경

---

### 4.6 배지 시스템

#### 주석 태그 배지

##### 지원 태그
| 태그 | 색상 | 용도 |
|------|------|------|
| **TODO** | 파란색 (blue-50/700) | 해야 할 작업 |
| **FIXME** | 빨간색 (red-50/700) | 긴급 수정 필요 |
| **NOTE** | 초록색 (green-50/700) | 참고 사항 |
| **HACK** | 주황색 (orange-50/700) | 임시 해결책 |
| **XXX** | 보라색 (purple-50/700) | 주의 필요 |
| **BUG** | 장미색 (rose-50/700) | 버그 |
| **OPTIMIZE** | 청록색 (teal-50/700) | 최적화 필요 |
| **REVIEW** | 남색 (indigo-50/700) | 리뷰 필요 |

##### 감지 패턴
주석 첫 줄에서 `TAG:` 형식 감지:
```typescript
// TODO: 리팩토링 필요
/**
 * FIXME: 버그 수정 필요
 */
```

##### 표시 위치
- CommentSection 상단
- CodeSnippetSection의 relatedComment 상단
- ExportSection의 relatedComment 상단

##### 배지 스타일
```
[TODO]  ← 파란 배경, 파란 테두리, 파란 텍스트, 10px, bold
```

#### IF 구문 배지
코드 블록의 첫 번째 라인이 `if` 또는 `if(`로 시작하면 자동으로 배지 추가:

```
[IF]  ← 보라 배경, 보라 테두리, 보라 텍스트
```

#### 배지 조합
여러 배지가 동시에 표시될 수 있음:
```
[TODO] [IF]
Double-tap detection
```

---

## 5. UI/UX 요구사항

### 5.1 레이아웃

#### PDF 뷰어 스타일
```
┌──────────────────────────────────────────────────────┐
│ [어두운 배경 (bg-bg-base)]                            │
│   ┌────────────────────────────────────────────┐    │
│   │ [흰 문서 카드 (bg-white, shadow-lg)]        │    │
│   │                                            │    │
│   │  File Header                               │    │
│   │  Dependencies                              │    │
│   │  ━━━━━━━━━━━━━━━━━━━━━━                   │    │
│   │  Sections...                               │    │
│   │                                            │    │
│   └────────────────────────────────────────────┘    │
│                                                      │
│   ┌────────────────────────────────────────────┐    │
│   │ [다음 파일 카드]                            │    │
│   └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

#### 최대 폭 제한
- **문서 컨테이너**: `max-w-3xl` (768px)
- **이유**: 한 줄이 너무 길면 가독성 저하

#### Sticky 헤더
파일의 큰 헤더가 화면 밖으로 스크롤되면 상단에 compact 헤더 표시:
```
┌──────────────────────────────────────┐
│ [파일 아이콘] RefactoringPromptDialog.tsx │  ← Sticky
└──────────────────────────────────────┘
```

감지: IntersectionObserver API 사용

---

### 5.2 타이포그래피

#### Compact 디자인 원칙
모든 여백과 폰트 크기를 최소화하여 정보 밀도 최대화

#### 비대칭 여백
**위: 큰 간격, 아래: 작은 간격**
- 섹션 간 구분 명확
- 읽기 흐름 자연스러움

예시:
```css
.section {
  margin-top: 2rem;   /* 큰 간격 */
  margin-bottom: 0.75rem;  /* 작은 간격 */
}
```

#### 폰트 크기
| 요소 | 크기 | 스타일 |
|------|------|--------|
| **파일명** | 30px | font-bold |
| **h1 주석** | 20px | font-bold |
| **h2 주석** | 16px | font-semibold |
| **h3 주석** | 14px | font-medium |
| **본문 주석** | 14px | normal |
| **코드** | 11px | font-mono |
| **라인 번호** | 10px | font-mono |
| **배지** | 10px | font-semibold |
| **섹션 레이블** | 10px | font-semibold, uppercase |

---

### 5.3 컬러 시스템

#### 주석 영역
- **JSDoc 배경**: `bg-warm-50` (따뜻한 베이지)
- **JSDoc 바**: `border-warm-400` (주황색)
- **XML Doc 배경**: `bg-blue-50` (연한 파란색)
- **XML Doc 바**: `border-blue-400` (파란색)

#### 코드 영역
- **배경**: `bg-gray-50` (연한 회색)
- **테두리**: `border-gray-200` (회색)
- **라인 번호**: `text-gray-400`
- **코드 텍스트**: `text-gray-800`
- **Hover**: `bg-gray-100`

#### Signature
- **함수명**: `text-gray-900` (검은색)
- **파라미터**: `text-gray-500` (회색)
- **리턴 타입**: `text-blue-600` (파란색)
- **왼쪽 바**: `border-blue-200`

#### 배지 색상
각 태그별로 고유 색상 (위 4.6 참조)

---

### 5.4 인터랙션

#### 텍스트 선택
- **모든 텍스트 영역**: `select-text` 적용
- **라인 번호**: `select-none` (복사 방지)
- **목적**: 문서처럼 자유롭게 복사 가능

#### Dependencies 섹션
- **클릭**: 접기/펼치기 토글
- **아이콘**: ChevronDown ↔ ChevronRight

#### 파일 네비게이션
우측 사이드바에 열린 파일 목록 표시:
- 파일 아이콘 + 파일명
- 클릭 시 해당 파일로 스크롤 (미구현)

---

## 6. 키보드 단축키

| 단축키 | 기능 | 설명 |
|--------|------|------|
| **\`** (백틱) | IDE ↔ CodeDoc 모드 전환 | react-hotkeys-hook 사용 |
| **Shift+Shift** | 통합 검색 모달 열기 | 더블탭 감지 (300ms 이내) |

**주의**: 키 이름은 `'backquote'` (소문자) 사용

---

## 7. 기술적 제약사항

### 7.1 파싱 규칙
- **TypeScript AST 사용 필수**: 정규식 사용 금지
- **Vue SFC 지원**: `@vue/compiler-sfc`로 `<script>` 섹션 추출 후 파싱
- **파일당 1회 파싱**: `useMemo`로 캐싱

### 7.2 데이터 구조

#### CodeDocSection
```typescript
interface CodeDocSection {
  type: 'comment' | 'code' | 'export' | 'jsx' | 'control' | 'fileHeader';
  content: string;
  startLine: number;
  endLine: number;

  // Comment specific
  depth?: number;
  commentStyle?: CommentStyle;
  headingText?: string;

  // Code specific
  relatedComment?: CodeDocSection;
}
```

#### CommentStyle
```typescript
type CommentStyle = 'line' | 'block' | 'jsdoc' | 'separator' | 'xml';
```

### 7.3 렌더링 순서
1. `fileHeader` 섹션 → 헤더에 표시
2. `comment` 섹션 → relatedComment인지 확인 후 렌더링
3. `export` 섹션 → ExportSection으로 렌더링
4. `code`, `jsx`, `control` 섹션 → CodeSnippetSection으로 렌더링

---

## 8. 향후 개선 사항 (Future Enhancements)

### 8.1 섹션 북마크
- 각 섹션에 permalink 생성
- URL로 특정 섹션 공유 가능
- 목차(Table of Contents) 자동 생성

### 8.2 다크 모드
- `documentModeAtom`: `'light'` | `'dark'`
- 다크 모드 색상 팔레트 정의

### 8.3 Export to PDF/Markdown
- 현재 문서를 PDF로 내보내기
- Markdown 포맷으로 저장

### 8.4 섹션 접기/펼치기
- 큰 코드 블록 자동 접기
- 클릭으로 펼치기

### 8.5 검색 기능
- 문서 내 텍스트 검색
- 태그별 필터링 (TODO만 보기 등)

### 8.6 코드 하이라이팅
- Syntax highlighting 추가
- Prism.js 또는 Shiki 사용

### 8.7 섹션별 메타데이터
- 작성자, 수정일 표시
- Git blame 정보 통합

---

## 9. 성공 지표 (Success Metrics)

### 9.1 사용성 지표
- **코드 이해 시간**: 기존 대비 50% 단축 목표
- **TODO 발견율**: 100% (배지로 모두 시각화)
- **API 문서 확인 시간**: 70% 단축

### 9.2 품질 지표
- **파싱 정확도**: 100% (TypeScript AST 사용)
- **중복 제거율**: JSDoc 중복 0건
- **Interface 분리율**: 100%

### 9.3 UX 지표
- **텍스트 선택 가능 영역**: 100%
- **Compact 디자인**: 모든 여백 최소화 달성
- **배지 시인성**: 색상 대비 4.5:1 이상 (WCAG AA 준수)

---

## 10. 참고 자료

### 10.1 관련 파일
- `src/widgets/CodeDocView/CodeDocView.tsx` - 메인 컴포넌트
- `src/widgets/CodeDocView/ui/CodeDocFileSection.tsx` - 파일 섹션
- `src/widgets/CodeDocView/ui/DependenciesSection.tsx` - Dependencies
- `src/widgets/CodeDocView/ui/CommentSection.tsx` - 주석 렌더링
- `src/widgets/CodeDocView/ui/CodeSnippetSection.tsx` - 코드 스니펫
- `src/widgets/CodeDocView/ui/ExportSection.tsx` - Export signature
- `src/entities/CodeDoc/lib/parseCodeDoc.ts` - 코드 파싱 로직
- `src/entities/CodeDoc/lib/extractImports.ts` - Import 추출
- `src/entities/CodeDoc/lib/commentTagUtils.ts` - 배지 시스템

### 10.2 외부 참고
- GitBook 문서 스타일
- GitHub README 렌더링
- PDF 뷰어 UX

---

**문서 버전**: 1.0
**최종 수정일**: 2026-01-04
**작성자**: Claude Code Assistant
