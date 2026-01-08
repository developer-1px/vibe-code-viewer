# Project Conventions

> **목적**: 일관된 구조로 협업 효율 향상, 파일 탐색 용이, 유지보수 비용 절감

---

## 핵심 원칙 (Core Principles)

### 1. Routes와 Pages 분리

**원칙**: 라우팅 정의와 페이지 로직을 분리

```
app/routes/   → 라우팅 정의만 (얇은 레이어, definePageMeta + export)
pages/        → 페이지 로직 저장소 (평탄한 구조, 비즈니스 로직)
```

**이유**: Nuxt 파일 기반 라우팅은 URL 구조를 따라 깊어지므로, 로직을 평탄한 pages/에 분리

```
❌ 문제:
app/routes/support/edu/[article]/apply/
  ├── index.vue
  ├── entities/              ← 경로 너무 깊음
  └── features/

✅ 해결:
app/routes/support/edu/[article]/apply/index.vue
  → export { default } from '~/pages/edu-apply/PageEduApply.vue'

pages/edu-apply/              ← 평탄함
  ├── PageEduApply.vue
  ├── entities/
  └── features/
```

---

### 2. 단방향 의존성

```
Page
 ↓
Module
 ↓
Feature ←┐
 ↓       │
Entity ←┘
```

**규칙**:
- ✅ 상위 → 하위 의존 가능
- ❌ 하위 → 상위 의존 금지
- ❌ 같은 레벨 간 의존 금지 (Feature ↔ Feature)
- ✅ Entity ↔ Entity만 예외 허용 (도메인 관계)

---

### 3. 평탄한 구조 (Flat Structure)

**원칙**: pages 폴더는 가능한 평탄하게

```
✅ 선호:
pages/edu-list/
pages/edu-apply/
pages/notice-detail/

⚠️ 고려:
pages/notice/
  ├── list/
  └── detail/
  └── _shared/      # 목록-상세 패턴에서 entities 공유 시
```

**[미확정]**: Flat vs Nested는 팀 논의 중

---

### 4. 그룹핑 우선 네이밍

**원칙**: 알파벳 정렬 시 관련 항목이 함께 모이도록

```
✅ 그룹핑 우선:
PageEduList.vue
PageEduApply.vue
→ "Page" 검색으로 모든 페이지 찾기

❌ 그룹핑 안 됨:
EduListPage.vue
EduApplyPage.vue
→ Edu로 시작해서 분산됨
```

---

### 5. 최소 표현 차이

**원칙**: 같은 것을 다르게 표현하지 않음

```typescript
✅ 일관된 표현:
interface Product { }
폴더: entities/Product/
props: { product: Product }

❌ 다른 표현:
interface Product { }
폴더: entities/ProductItem/
props: { id, name, price }
```

---

## 레이어 구조

### 레이어별 책임

| 레이어 | 정의 | 책임 |
|--------|------|------|
| **Page** | Route 중심 단위 | 라우트 1:1 매핑, Module 조합, 레이아웃 |
| **Module** | 독립 가능한 개념 단위 | 페이지 섹션 조합 (Hero, Content, Footer) |
| **Feature** | UI 횡단 상태관리 | 사용자 기능, Entity 타입 **직접 안 씀** |
| **Entity** | Interface 중심 단위 | 도메인 모델, Interface 타입 **직접 씀** |

### 배치 기준: 타입 직접 사용 여부

```typescript
// ✅ Entity에 배치 (타입 직접 사용)
interface Props {
  product: Product     // ← 직접 사용
}
const useFetchProduct = (): Promise<Product> => { }

// ✅ Feature에 배치 (타입 직접 안 씀)
interface Props {
  placeholder: string  // ← 원시 타입
  onSelect: (value: string) => void
}
```

**핵심 판단**:
```
"props, args, return에 특정 interface를 직접 사용하는가?"

YES → entities/{InterfaceName}/
NO  → features/{feature-name}/
```

---

## 폴더 구조

### 전체 구조

```
project/
├── app/
│   └── routes/              # 라우팅 정의 (URL 구조 따름)
│       └── support/edu/[article]/apply/index.vue
│
└── pages/                   # 페이지 로직 (평탄함)
    ├── shared/              # 앱 전역 공유 (도메인 무관)
    │   ├── entities/        # User, ApiResponse
    │   └── features/        # captcha, email-form
    │
    └── edu-apply/           # 페이지별 폴더
        ├── PageEduApply.vue
        ├── entities/        # 이 페이지만 사용
        ├── features/
        └── modules/
```

### Entity 구조

```
entities/{InterfaceName}/    # PascalCase, Interface명과 정확히 동일!
  ├── api/
  │   ├── useFetch{Entity}.ts
  │   ├── useQuery{Entity}.ts
  │   └── useMutation{Entity}.ts
  ├── model/
  │   ├── {InterfaceName}.d.ts
  │   └── use{Entity}Actions.ts
  └── ui/
      ├── {Entity}Card.vue
      └── {Entity}ListItem.vue
```

### Feature 구조

```
features/{feature-name}/     # kebab-case
  ├── ui/
  │   └── {FeatureName}.vue
  └── use{FeatureName}.ts
```

### Module

```
modules/{PageName}{ModuleName}.vue     # Page 접두사 없음!
  예: EduListHero.vue, NoticeDetailContent.vue
```

---

## 네이밍 규칙

### 케이스별 사용

| 대상 | 케이스 | 예시 | 이유 |
|------|--------|------|------|
| **Pages 폴더** | kebab-case | `edu-apply/`, `notice-list/` | route 이름 따라감 |
| **Entities 폴더** | PascalCase | `Product/`, `EduArticle/` | Interface명과 일치 |
| **Features 폴더** | kebab-case | `filter-bar/`, `search-input/` | 일반적 이름 |
| **Vue 컴포넌트** | PascalCase | `PageEduList.vue`, `ProductCard.vue` | Vue 컨벤션 |
| **Composables** | camelCase | `useFetchProduct.ts` | use 접두사 |
| **타입 파일** | PascalCase | `Product.d.ts` | Interface명과 일치 |

### Pages 네이밍

```
패턴: pages/{domain}-{action}/Page{PascalCase}.vue

✅ 올바른 예:
pages/edu-apply/PageEduApply.vue
pages/notice-detail/PageNoticeDetail.vue

❌ 잘못된 예:
pages/eduApply/              # camelCase
pages/EduApply.vue           # Page 접두사 없음
pages/EduApplyPage.vue       # Page가 뒤에
```

### Entities 네이밍

```
🚫 CRITICAL: 폴더명 = Interface명 (정확히 동일!)

✅ 올바른 예:
interface Product { }
entities/Product/

interface EduArticle { }
entities/EduArticle/

❌ 절대 불가:
interface Product { }
entities/ProductItem/      # 다름!
entities/product/          # 케이스 다름!
```

### Features 네이밍

```
패턴: features/{feature-name}/

✅ 올바른 예:
features/filter-bar/FilterBar.vue
features/search-input/SearchInput.vue

❌ 잘못된 예:
features/FilterBar/          # PascalCase
features/filter_bar/         # snake_case
```

### Features 조직 패턴 (도메인 그룹핑)

**규모가 커지면서 도메인별 그룹핑 권장** (현재 과도기):

```
features/
├── {Domain}/               # 도메인 폴더 (관련 features 3개 이상 시)
│   ├── {FeatureA}/
│   ├── {FeatureB}/
│   └── {FeatureC}/
└── {IndependentFeature}/   # 독립 feature (도메인 무관)

예시:
features/
├── Code/                   # Code 도메인
│   ├── CodeFold/
│   ├── FocusMode/
│   └── CodeAnalyzer/
├── File/                   # File 도메인
│   ├── OpenFiles/
│   ├── Navigation/
│   └── GotoDefinition/
├── Search/                 # Search 도메인
│   └── UnifiedSearch/
└── KeyboardShortcuts/      # 독립
```

**규칙**:
- ✅ 관련 features 3개 이상 → 도메인 폴더 생성
- ✅ 독립 feature → 최상위 배치
- ⚠️ 과도기: 점진적으로 도메인 그룹화 중
- 🎯 향후: 모든 features를 도메인별로 그룹핑

**동일한 패턴을 entities/에도 적용 가능**:
```
entities/
├── Code/                   # 향후
│   ├── CodeLine/
│   ├── CodeSegment/
│   └── CodeFold/
└── SourceFileNode/         # 현재
```

### Modules 네이밍

```
패턴: modules/{PageName}{ModuleName}.vue

✅ 올바른 예:
modules/EduListHero.vue           # Page 없음!
modules/EduListContent.vue
modules/NoticeDetailContent.vue

❌ 잘못된 예:
modules/PageEduListHero.vue       # Page 붙이지 않음
modules/Hero.vue                  # 페이지명 없음
```

---

## 공유 코드 관리

### 공유 기준

```
"이게 특정 도메인에 속하는가?"

NO (도메인 무관) → pages/shared/
YES (도메인 종속) → pages/{page}/

✅ shared 예시:
- User (인증)
- ApiResponse (API 공통)
- Captcha, email-form

❌ shared 아님:
- Product (commerce 도메인)
- EduArticle (education 도메인)
```

**3번 반복 규칙 없음**: 횟수가 아니라 성격이 기준

---

## 라우팅 전략

### Routes 책임

```vue
<!-- ✅ Routes에서 허용 -->
<script setup lang="ts">
definePageMeta({
  layout: 'support',
  middleware: ['auth']
})
</script>

<script>
export { default } from '~/pages/edu-apply/PageEduApply.vue'
</script>

<!-- ❌ Routes에서 금지 -->
<script setup lang="ts">
const { data } = await useFetch('/api/edu')  # 로직 금지
const filtered = computed(() => { })          # 로직 금지
</script>
```

### 매핑 규칙

```
하나의 route → 하나의 page (1:1)

예시:
/support/edu                  → pages/edu-list/PageEduList.vue
/support/edu/[article]        → pages/edu-detail/PageEduDetail.vue
/support/edu/[article]/apply  → pages/edu-apply/PageEduApply.vue
```

---

## 금지 사항 (Critical)

### 🚫 절대 금지

```typescript
// 1. Entity 폴더명 ≠ Interface명
❌ interface Product { }
   entities/ProductItem/

// 2. 순환 참조
❌ entities/Product/ → features/filter-bar/
   features/filter-bar/ → entities/Product/

// 3. 하위 → 상위 의존
❌ entities/Product/ → features/search/
   features/search/ → modules/SearchModule/

// 4. Feature 간 의존
❌ features/filter-bar/ → features/search-bar/

// 5. Module 간 의존
❌ modules/EduListContent.vue → modules/NoticeListContent.vue

// 6. Routes에 로직
❌ app/routes/support/edu/index.vue에 fetch, computed 작성
```

---

## Best Practices

### Entity Props 통째로 넘기기

```typescript
✅ 권장:
interface Props {
  product: Product  # 전체 entity
}

❌ 지양:
interface Props {
  id: string
  name: string
  price: number
}
```

### Module 분리 시점

```
✅ 분리:
- 시각적으로 독립 영역 (Hero, Content, Footer)
- 100줄 이상 (복잡도)
- 독립적 상태 관리 필요

❌ 분리 안 함:
- 10~20줄 간단한 마크업
- 단순 wrapper
```

### 공유 vs 복제

```
복제가 나은 경우:
✅ 지금은 같지만 나중에 달라질 가능성
✅ 도메인별로 미묘하게 다른 로직
✅ 독립적으로 발전해야 하는 기능

공유가 나은 경우:
✅ 도메인 무관
✅ 변경 시 모든 곳에 동일 적용 필요
✅ 안정적 비즈니스 로직
```

---

## React/TypeScript 컴포넌트 패턴

### 컴포넌트 정의 (React.FC 금지)

```typescript
❌ 사용 금지: React.FC
const Component: React.FC<Props> = ({ ... }) => { }

✅ 권장: Inline props
const Component = ({ id, data }: { id: string; data: SomeData }) => {
  // ...
}

이유:
- React.FC는 불필요한 타입 복잡도 추가
- Inline props가 더 명확하고 간결
- children 타입을 명시적으로 관리 가능
```

### Props 인터페이스 규칙

```typescript
✅ Inline props (features/, widgets/)
// 비즈니스 로직을 담은 컴포넌트는 재사용할 이유가 없음
const FeatureComponent = ({
  id,
  data
}: {
  id: string;
  data: SomeData;
}) => {
  // Handler는 컴포넌트 내부에서 atom으로 처리
  const doSomething = useSetAtom(someActionAtom);
  // ...
}

✅ Interface props (shared/)
// 재사용 가능한 컴포넌트만 interface 허용
interface TreeViewProps {
  data: TreeNode[];
  onSelect: (id: string) => void;
  className?: string;
}

const TreeView = ({ data, onSelect, className }: TreeViewProps) => {
  // ...
}

이유:
- Features/widgets는 최소한의 비즈니스 로직을 담고 있어 재사용 불필요
- Shared 컴포넌트만 재사용성을 위해 interface 정의
- Props drilling 방지: handlers는 atoms로 관리
```

### Import 규칙

```typescript
❌ 확장자 포함 금지
import { FoldInfo } from '../../../features/CodeFold/lib/types.ts';
import { Component } from './Component.tsx';

✅ 확장자 제거
import { FoldInfo } from '../../../features/CodeFold/lib/types';
import { Component } from './Component';

❌ @/ alias 남용
import { atoms } from '@/store/atoms';
import { types } from '@/features/Code/types';

✅ 상대 경로 우선
import { atoms } from '../../../store/atoms';
import { types } from '../Code/types';

⚠️ @/ alias 허용 범위
// components/ (design system)
import { Button } from '@/components/ui/Button';

// Top-level entry points
import '@/app.css';

// Workers (절대 경로 필요)
import Worker from '@/workers/parse.worker?worker';

이유:
- 확장자는 번들러가 자동 처리 (불필요한 중복)
- 상대 경로는 파일 이동 시 IDE 자동 리팩토링 가능
- @/ alias는 필수 상황에만 사용
```

---

## 체크리스트

### 새 컴포넌트 추가

```
□ 레이어 판단
  1. Props/args/return에 특정 interface 직접 사용?
     → YES: entities/{InterfaceName}/
     → NO: 다음

  2. Entity 타입 안 쓰지만 사용자 기능?
     → YES: features/{feature-name}/
     → NO: 다음

  3. 특정 페이지의 섹션 단위?
     → YES: modules/{PageName}{ModuleName}.vue
     → NO: 다음

  4. 라우트와 1:1 매핑?
     → YES: pages/{domain-action}/Page{}.vue

□ 네이밍 확인
  - Entity: PascalCase, Interface명과 정확히 동일
  - Feature: kebab-case
  - Module: {PageName}{ModuleName}.vue (Page 없음)
  - Page: Page{PascalCase}.vue

□ 의존성 확인
  - 하위 레이어만 import
  - 순환 참조 없음
```

### 코드 리뷰

```
□ 네이밍
  - 케이스 규칙 준수
  - Entity 폴더명 = Interface명
  - 그룹핑 고려 (접두사)

□ 구조
  - 올바른 레이어 배치
  - Entity 타입 직접 사용 → entities
  - Entity 타입 안 씀 → features

□ 의존성
  - 단방향 의존성 준수
  - Feature ↔ Feature 의존 없음

□ 공유
  - 도메인 무관 → shared
  - 도메인 종속 → 페이지 내부

□ Routes
  - export만 있는가
  - 로직은 pages에 있는가
```

---

## FAQ

**Q1. Entity vs Feature 판단이 헷갈려요**
```typescript
A: Props 타입 시그니처 확인

Entity: props: { product: Product }  # Interface 직접 사용
Feature: props: { items: any[] }     # 원시 타입
```

**Q2. 한 페이지에서만 쓰는 Entity도 entities에?**
```
A: 네. 기준은 "타입 직접 사용"이지 "사용 횟수" 아님
pages/edu-apply/entities/ApplyForm/  # 1곳만 써도 OK
```

**Q3. Feature에서 Entity composable 호출 가능?**
```typescript
A: 네, 가능

✅ 내부에서 간접 사용:
const { data } = useFetchProduct()  # OK

❌ Props로 직접 사용:
props: { product: Product }  # Entity로 가야 함
```

**Q4. shared에 언제 올리나요?**
```
A: "특정 도메인에 속하는가?"

NO → pages/shared/
YES → 페이지/도메인 내부

횟수는 기준 아님 (1곳만 써도 도메인 무관하면 shared)
```

**Q5. Entity 폴더명이 Interface명과 꼭 같아야?**
```
A: 네, 절대적으로 같아야 함 (향후 ESLint 강제)

interface Product { }
entities/Product/  # 정확히 동일
```

**Q6. Module을 언제 분리?**
```
A: 시각적/기능적 독립 영역일 때

✅ Hero, Content, Footer 같은 섹션
✅ 100줄 이상
❌ 10~20줄 간단한 마크업
```

---

## 용어집

**Entity**: Interface 중심 단위, 타입 직접 사용
**Feature**: UI 횡단 상태관리, 타입 직접 안 씀
**Module**: 페이지 섹션 (Hero, Content, Footer)
**Page**: Route와 1:1 매핑, 조합과 레이아웃
**Shared**: 도메인 무관 공통 모듈

**Flat Structure**: 평탄한 구조 (pages/edu-list/, pages/edu-apply/)
**Nested Structure**: 중첩 구조 (pages/notice/list/, pages/notice/detail/)

**kebab-case**: `edu-apply`, `filter-bar` (pages, features)
**PascalCase**: `Product`, `EduArticle`, `PageEduList` (entities, Vue)
**camelCase**: `useFetchProduct`, `useFormValidation` (composables)

**단방향 의존성**: 상위 → 하위만 가능, 하위 → 상위 금지
**타입 직접 사용**: Props/args/return에 interface 직접 사용 (Entity 기준)

---

## 참고

- CLAUDE.md - AI 코딩 컨벤션 (FSD, Props 규칙, Import 규칙)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Nuxt Directory Structure](https://nuxt.com/docs/guide/directory-structure)

**문서 버전**: 1.0
**상태**: 초안 (Flat vs Nested 논의 중)
