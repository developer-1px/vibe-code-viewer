# LIMN Design System Usage Guide
> vibe-code-viewer에서 LIMN 디자인 시스템 사용 가이드

작성일: 2026-01-02

---

## 🎯 핵심 원칙: shadcn/ui 방식

LIMN 디자인 시스템은 **shadcn/ui 방식**으로 통합됩니다:

✅ 컴포넌트를 **복사**해서 프로젝트에 포함
✅ 필요하면 **직접 수정 가능**
✅ npm package가 아니라 **소스코드 소유**
✅ 수정사항을 디자인팀에 **피드백**하여 LIMN 개선

---

## 📁 디렉토리 구조

```
src/
├── components/              # LIMN 컴포넌트 (직접 수정 가능)
│   ├── ui/                  # 기본 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Dialog.tsx
│   │   ├── CommandPalette.tsx
│   │   └── ...              # 21개 컴포넌트
│   └── ide/                 # IDE 특화 컴포넌트
│       ├── ActivityBar.tsx
│       ├── StatusBar.tsx
│       ├── TitleBar.tsx
│       ├── TabBar.tsx
│       ├── Sidebar.tsx
│       └── ...              # 14개 컴포넌트
│
├── widgets/                 # 비즈니스 로직 (components 사용)
│   ├── AppActivityBar/
│   ├── AppStatusBar/
│   └── ...
│
└── features/                # 기능 단위 (components 사용)
    ├── UnifiedSearch/
    └── ...
```

---

## 🔧 컴포넌트 수정 가이드

### ✅ 할 수 있는 것

#### 1. Props 인터페이스 확장
```typescript
// components/ide/ActivityBar.tsx

// Before (LIMN 원본)
export interface ActivityBarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

// After (vibe-code-viewer 요구사항 추가)
export interface ActivityBarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;          // ⭐ 배지 카운트 추가
  hasBadge?: boolean;      // ⭐ 배지 표시 여부
}
```

#### 2. 새로운 variant 추가
```typescript
// components/ui/CommandPalette.tsx

// size variant 추가
<div className={cn(
  "fixed left-1/2 top-[15%] z-50 w-full -translate-x-1/2",
  size === 'default' && "max-w-xl",
  size === 'large' && "max-w-3xl",   // ⭐ Desktop용 large 추가
)}>
```

#### 3. 버그 수정
```typescript
// components/ide/TabBar.tsx

// 탭 닫기 버튼 클릭 시 propagation 방지
<button
  onClick={(e) => {
    e.stopPropagation();  // ⭐ 추가
    onClose?.();
  }}
>
```

#### 4. 스타일 조정
```typescript
// components/ide/StatusBar.tsx

// 폰트 크기 줄이기 (Desktop 최적화)
<div className="text-2xs">  {/* text-xs → text-2xs */}
```

---

### 📝 해야 할 것

#### 1. 변경사항 문서화

**LIMN_INTEGRATION_REPORT.md에 추가:**
```markdown
### 발견된 이슈 및 개선 제안

#### N. ActivityBar - badge 지원 부재

**현재 상황:**
- vibe-code-viewer는 Search 아이콘에 검색 결과 수를 배지로 표시 필요
- LIMN `ActivityBarItem`은 badge 미지원

**임시 해결:**
```typescript
// components/ide/ActivityBar.tsx
export interface ActivityBarItemProps {
  badge?: number;  // ⭐ 추가
  hasBadge?: boolean;
}
```

**LIMN 개선 제안:**
- ActivityBarItem에 badge props 추가 권장
- 우선순위: Medium
```

#### 2. 디자인팀에 피드백

**피드백 방법:**
1. LIMN_INTEGRATION_REPORT.md의 "발견된 이슈 및 개선 제안" 섹션에 추가
2. 우선순위 지정 (High / Medium / Low)
3. Workaround 방법 기록
4. 디자인팀에 전달

**피드백 예시:**
```markdown
| 이슈 | 우선순위 | 영향도 | 제안 |
|------|---------|--------|------|
| ActivityBar badge | Medium | 중간 | badge, hasBadge props 추가 |
| CommandPalette size | Low | 낮음 | size variant 추가 (default, large) |
```

---

## 🔄 업데이트 워크플로우

### LIMN 새 버전 출시 시

#### 1. 현재 수정사항 확인
```bash
# components/ 폴더의 git diff 확인
git diff main -- src/components/
```

#### 2. 새 버전 검토
```bash
# design-system 레포지토리에서 변경사항 확인
cd design-system
git log --oneline
git diff v1.0.0...v2.0.0
```

#### 3. 업데이트 결정

**Option A: 전체 교체 (권장)**
- 새 버전이 우리 수정사항을 포함한 경우
- Breaking changes가 없는 경우

```bash
# 백업
cp -r src/components src/components.backup

# 새 버전 복사
cp -r design-system/components/ui/* src/components/ui/
cp -r design-system/components/ide/* src/components/ide/

# 테스트 후 문제 없으면 백업 삭제
rm -rf src/components.backup
```

**Option B: 선택적 업데이트**
- Breaking changes가 있는 경우
- 우리 커스터마이징을 유지하고 싶은 경우

```bash
# 필요한 컴포넌트만 선택적으로 복사
cp design-system/components/ui/Button.tsx src/components/ui/
cp design-system/components/ui/Badge.tsx src/components/ui/
```

**Option C: 수정사항 유지**
- 새 버전을 사용하지 않기로 결정
- 현재 버전 계속 사용

#### 4. 테스트
```bash
npm run dev
# 모든 화면 동작 확인
# 특히 수정한 컴포넌트 사용 부분 집중 테스트
```

---

## 📖 사용 예시

### widgets에서 components 사용

**Import 규칙: components는 @/ alias 허용**

```typescript
// widgets/AppActivityBar/AppActivityBar.tsx

import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Files, Search, GitBranch } from 'lucide-react';
import { ActivityBar, ActivityBarItem } from '@/components/ide/ActivityBar';  // ✅ @/ 허용
import { viewModeAtom, searchModalOpenAtom } from '../../store/atoms';  // 상대 경로

export function AppActivityBar() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const setSearchModalOpen = useSetAtom(searchModalOpenAtom);
  const [activeView, setActiveView] = useState(0);

  return (
    <ActivityBar>
      <ActivityBarItem
        icon={Files}
        label="Explorer"
        active={activeView === 0 && viewMode === 'ide'}
        onClick={() => {
          setActiveView(0);
          setViewMode('ide');
        }}
      />
      <ActivityBarItem
        icon={Search}
        label="Search"
        active={activeView === 1}
        onClick={() => {
          setActiveView(1);
          setSearchModalOpen(true);
        }}
        badge={5}        // ⭐ 커스텀 props 사용 (수정 후)
        hasBadge={true}
      />
      {/* ... */}
    </ActivityBar>
  );
}
```

### features에서 components 사용

```typescript
// features/UnifiedSearch/ui/UnifiedSearchModal.tsx

import React from 'react';
import { CommandPalette } from '@/components/ui/CommandPalette';  // ✅ @/ 허용

export function UnifiedSearchModal() {
  // ...

  return (
    <CommandPalette
      open={isOpen}
      onOpenChange={setIsOpen}
      query={query}
      onQueryChange={setQuery}
      results={results}
      selectedIndex={focusedIndex}
      onSelectedIndexChange={setFocusedIndex}
      onSelectResult={handleSelectResult}
    />
  );
}
```

---

## ❌ 하지 말아야 할 것

### 1. Adapter 패턴 사용 금지
```typescript
// ❌ Bad: 불필요한 간접 레이어
// shared/ui/adapters/ActivityBarAdapter.tsx
export function ActivityBarAdapter({ items }) {
  return <LIMNActivityBar>...</LIMNActivityBar>;
}

// ✅ Good: components 직접 사용 (@/ alias 사용)
import { ActivityBar } from '@/components/ide/ActivityBar';
```

### 2. 수정 금지 정책 적용 금지
```typescript
// ❌ Bad: components를 수정할 수 없다고 생각
// "LIMN은 건드리면 안 돼, wrapper 만들자"

// ✅ Good: 필요하면 바로 수정
// components/ide/ActivityBar.tsx 열어서 수정
```

### 3. shared/ui/로 이동 금지
```
❌ src/shared/ui/ActivityBar.tsx
❌ import { ActivityBar } from '../../shared/ui/ActivityBar';

✅ src/components/ide/ActivityBar.tsx
✅ import { ActivityBar } from '@/components/ide/ActivityBar';
```

---

## 🎨 디자인팀 KPI 달성

### vibe-code-viewer의 역할

LIMN 디자인 시스템 개선에 기여:

1. **실사용 피드백 제공**
   - IDE 개발 중 발견한 불편한 점
   - 부족한 props, variant
   - 버그 및 접근성 이슈

2. **개선 제안 문서화**
   - LIMN_INTEGRATION_REPORT.md에 체계적으로 기록
   - 우선순위 및 영향도 분석
   - Workaround 방법 공유

3. **실제 구현 예시 제공**
   - vibe-code-viewer에서 임시로 구현한 코드
   - 디자인팀이 LIMN에 반영 시 참고 자료

### 피드백 루프

```
vibe-code-viewer 개발
    ↓
components/ 직접 수정 (임시)
    ↓
LIMN_INTEGRATION_REPORT.md에 피드백 작성
    ↓
디자인팀에 전달
    ↓
LIMN에 반영
    ↓
다음 버전 업데이트 시 표준 기능으로 제공
    ↓
vibe-code-viewer 커스터마이징 제거, LIMN 표준 사용
```

---

## 📚 참고 문서

- [LIMN_INTEGRATION_REPORT.md](./LIMN_INTEGRATION_REPORT.md) - 통합 완료 보고서
- [CONVENTIONS.md](./CONVENTIONS.md) - 프로젝트 코딩 규칙
- [shadcn/ui 공식 문서](https://ui.shadcn.com/) - shadcn/ui 방식 참고

---

## 🤝 문의 및 지원

**LIMN 개선 제안:**
- GitHub Issues: (LIMN 레포지토리)
- 담당자: (디자인팀 연락처)

**vibe-code-viewer 문의:**
- 프로젝트 오너: (연락처)

---

**작성자**: Claude Code
**최종 수정**: 2026-01-02
