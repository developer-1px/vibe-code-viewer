# LIMN Design System Integration Report
> vibe-code-viewer 프로젝트 통합 완료 보고서
>
> 작성일: 2026-01-02

---

## 📋 통합 개요

**목표**: LIMN 디자인 시스템을 vibe-code-viewer에 완전 통합하여, 향후 LIMN 업데이트 시 `src/components/` 디렉토리만 교체하면 최신 UI를 적용할 수 있도록 설계

**통합 방식**:
- LIMN 컴포넌트 원본 수정 금지
- Composition 패턴으로 비즈니스 로직 분리
- Props API에만 의존

---

## ✅ 완료된 작업

### 1. 인프라 구축

**디렉토리 구조 변경**:
```
src/
├── lib/
│   └── utils.ts                # cn() 유틸리티
├── components/                 # LIMN 컴포넌트 (절대 수정 금지)
│   ├── ui/                     # 21개 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   └── ide/                    # 14개 IDE 컴포넌트
│       ├── TabBar.tsx
│       ├── Sidebar.tsx
│       ├── StatusBar.tsx
│       └── ...
└── widgets/                    # 비즈니스 로직 (LIMN 의존)
    ├── IDEView/
    ├── Sidebar/
    └── ...
```

**Dependencies 추가**:
- `class-variance-authority` ^0.7.1
- `clsx` ^2.1.1
- `tailwind-merge` ^3.4.0
- `tw-animate-css` ^1.4.0

**Import Path 설정**:
- `@/` alias 이미 존재 (vite.config.ts, tsconfig.json)
- LIMN 컴포넌트 import path 수정 불필요

---

### 2. CSS 토큰 완전 전환

**Before** (Cyan 테마):
- 3개 테마 (default, vscode, jetbrains) - UI 전체 변경
- `--color-vibe-*` 토큰
- Cyan accent (#22d3ee)

**After** (LIMN Warm 테마):
- UI는 LIMN Warm 고정 (#ffcc99)
- 코드 에디터만 테마 선택 가능 (default/vscode/jetbrains)
- `--color-*` LIMN 토큰 사용

**주요 색상 변경**:
```css
/* Warm Accent */
--color-warm-300: #ffcc99        /* 기본 강조색 (기존 Cyan에서 변경) */
--color-warm-glow: rgb(255 180 120 / 0.15)

/* Background - 더 어두운 배경 */
--color-bg-deep: #0d0d12
--color-bg-base: #0f0f16
--color-bg-elevated: #14141c

/* Text - 따뜻한 톤 */
--color-text-primary: rgb(255 240 220 / 0.95)
--color-text-secondary: rgb(255 250 245 / 0.7)
```

**폰트 크기 - 더 컴팩트**:
```css
--font-size-2xs: 10px   /* 신규 */
--font-size-xs: 11px
--font-size-sm: 12px
--font-size-base: 13px  /* 기본 크기 (기존 14px) */
```

---

### 3. 컴포넌트 교체

#### 3.1 IDEView TabBar ✅

**Before** (커스텀 인라인 탭):
```tsx
<div className="flex-none border-b border-white/10 bg-black/20">
  <div className="flex items-center gap-0 overflow-x-auto">
    {openedTabs.map((tabPath) => (
      <div className={...}>
        <FileText className="w-3 h-3" />
        <span>{fileName}</span>
        <button onClick={handleCloseTab}>
          <X className="w-3 h-3" />
        </button>
        {isActive && <div className="h-0.5 bg-vibe-accent" />}
      </div>
    ))}
  </div>
</div>
```

**After** (LIMN TabBar):
```tsx
import { TabBar, Tab } from '@/components/ide/TabBar';

<TabBar>
  {openedTabs.map((tabPath) => (
    <Tab
      key={tabPath}
      icon={FileText}
      label={fileName}
      active={isActive}
      dirty={false}
      onClick={() => setActiveTab(tabPath)}
      onClose={() => handleCloseTab(tabPath)}
    />
  ))}
</TabBar>
```

**변경 사항**:
- ~50줄 인라인 UI 코드 → ~10줄 LIMN 컴포넌트 사용
- 비즈니스 로직 (atoms 연결, 탭 닫기)은 IDEView에서 관리
- LIMN 컴포넌트는 Props API만 사용

**향후 업데이트 시**:
- LIMN `TabBar.tsx`, `Tab.tsx` 교체만 하면 UI 업데이트 완료
- IDEView.tsx는 수정 불필요

#### 3.2 Sidebar (부분 완료)

현재 `Sidebar.tsx`는 리사이징, 헤더 커스터마이징 등 비즈니스 로직이 많아 wrapper로 유지.

**다음 단계**: `FileItemView`, `FolderItemView`를 LIMN `FileTreeItem`으로 교체 예정.

---

## 🎯 통합 전략 검증

### ✅ 성공 요소

1. **LIMN 컴포넌트 원본 수정 금지 준수**
   - 모든 LIMN 컴포넌트는 `src/components/`에 원본 그대로 복사
   - 비즈니스 로직은 `src/widgets/`, `src/features/`에서 관리

2. **Props API 의존성 최소화**
   - LIMN 컴포넌트의 Props 인터페이스에만 의존
   - 내부 구현은 블랙박스로 취급

3. **Composition 패턴**
   - LIMN 컴포넌트를 직접 사용
   - 필요 시 wrapper로 감싸지만, LIMN은 수정하지 않음

### 🔄 업데이트 시나리오

**LIMN v2.0 업데이트 시**:
1. `design-system/components/` → `src/components/`로 복사
2. Props API 변경 확인
3. widgets/features에서 Props 사용 부분만 수정
4. 완료

**예상 작업 시간**: ~1시간 (Props API 변경이 없다면 0분)

---

## 🚨 발견된 이슈 및 LIMN 개선 제안

### 1. FileTreeItem - 더블클릭 지원 부재

**현재 상황**:
- vibe-code-viewer는 싱글클릭(포커스), 더블클릭(파일 열기) 패턴 사용
- LIMN `FileTreeItem`은 `onClick`만 제공

**제안**:
```typescript
export interface FileTreeItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  dirty?: boolean
  isFolder?: boolean
  isOpen?: boolean
  indent?: number
  onClick?: () => void
  onDoubleClick?: () => void  // ⭐ 추가 제안
}
```

**영향도**: 중간
**우선순위**: Medium

**Workaround** (현재):
```tsx
// FileItemView에서 자체 처리
<div
  onClick={handleFocus}
  onDoubleClick={handleOpen}
  className="..."
>
  {/* LIMN FileTreeItem 사용 불가, 커스텀 구현 필요 */}
</div>
```

---

### 2. FileTreeItem - 확장자별 아이콘 색상 지원 없음

**현재 상황**:
- vibe-code-viewer는 파일 확장자에 따라 아이콘 색상 변경
  - `.vue` → 초록색 (Emerald)
  - `.tsx/.jsx` → 보라색 (Purple)
  - `.ts/.js` → 노란색 (Amber)
  - `.json` → 주황색 (Orange)

**제안**:
```typescript
export interface FileTreeItemProps {
  icon: LucideIcon
  iconColor?: string  // ⭐ 추가 제안 (Tailwind 클래스 또는 CSS 변수)
  label: string
  active?: boolean
  // ...
}
```

**영향도**: 낮음 (UX 개선)
**우선순위**: Low

**Workaround** (현재):
```tsx
// 아이콘 색상 적용 불가, 모든 파일이 동일한 회색 아이콘
<FileTreeItem icon={FileIcon} label={fileName} />
```

---

### 3. FileTreeItem - active vs isFocused 구분 모호

**현재 상황**:
- vibe-code-viewer는 두 가지 상태 구분:
  - **Focused**: 키보드 네비게이션으로 선택된 아이템 (테두리 하이라이트)
  - **Active**: 현재 열려있는 파일 (배경색 변경)

- LIMN은 `active` prop만 제공

**제안**:
```typescript
export interface FileTreeItemProps {
  icon: LucideIcon
  label: string
  active?: boolean        // 현재 열린 파일
  focused?: boolean       // ⭐ 추가 제안 (키보드 포커스)
  dirty?: boolean
  // ...
}
```

**영향도**: 중간 (IDE 사용성)
**우선순위**: Medium

**Workaround** (현재):
```tsx
// isFocused를 active prop으로 우회
<FileTreeItem
  active={isFocused || isActive}  // 두 상태를 하나로 병합
  // ... 세밀한 스타일링 불가
/>
```

---

### 4. TabBar - dirty 상태 시각적 피드백 부족

**현재 상황**:
- LIMN `Tab`은 `dirty` prop을 받지만, Indicator(점)만 표시
- vibe-code-viewer는 추가로 파일명 옆에 `*` 표시를 선호

**제안**:
```typescript
export interface TabProps {
  icon?: LucideIcon
  label: string
  active?: boolean
  dirty?: boolean
  dirtyIndicator?: 'dot' | 'asterisk' | 'both'  // ⭐ 추가 제안
  onClose?: () => void
  onClick?: () => void
}
```

**영향도**: 낮음 (UX 선호도)
**우선순위**: Low

---

### 5. Button - 로딩 상태 지원 없음

**현재 상황**:
- vibe-code-viewer의 일부 버튼은 비동기 작업 중 로딩 스피너 표시 필요
- LIMN `Button`은 로딩 상태 미지원

**제안**:
```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean      // ⭐ 추가 제안
  loadingText?: string   // ⭐ 추가 제안 (선택)
}

// 구현 예시
<button disabled={loading || disabled}>
  {loading && <Spinner className="mr-2" />}
  {loading ? loadingText : children}
</button>
```

**영향도**: 중간
**우선순위**: Medium

**Workaround** (현재):
```tsx
// 별도 로딩 컴포넌트를 button children으로 전달
<Button disabled={isLoading}>
  {isLoading && <Spinner />}
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

---

### 6. Sidebar - 리사이징 핸들 내장 부재

**현재 상황**:
- vibe-code-viewer는 Sidebar 우측 가장자리를 드래그하여 너비 조절
- LIMN `Sidebar`는 고정 너비 (`--limn-sidebar-width`)

**제안**:
```typescript
export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  children: React.ReactNode
  resizable?: boolean    // ⭐ 추가 제안
  minWidth?: number      // ⭐ 추가 제안
  maxWidth?: number      // ⭐ 추가 제안
  defaultWidth?: number  // ⭐ 추가 제안
  onWidthChange?: (width: number) => void  // ⭐ 추가 제안
}
```

**영향도**: 높음 (IDE 필수 기능)
**우선순위**: High

**Workaround** (현재):
```tsx
// Sidebar를 wrapper로 감싸서 리사이징 핸들 추가
<div style={{ width }}>
  <Sidebar>{children}</Sidebar>
  <div className="resize-handle" {...bind()} />
</div>
```

---

## 📊 우선순위 요약

| 이슈 | 우선순위 | 영향도 | 구현 난이도 |
|------|---------|--------|-----------|
| Sidebar 리사이징 | High | 높음 | 중간 |
| FileTreeItem 더블클릭 | Medium | 중간 | 낮음 |
| FileTreeItem active/focused | Medium | 중간 | 낮음 |
| Button 로딩 상태 | Medium | 중간 | 낮음 |
| FileTreeItem 아이콘 색상 | Low | 낮음 | 낮음 |
| Tab dirty 표시 옵션 | Low | 낮음 | 낮음 |

---

## 🎨 LIMN 장점 평가

### ✅ 우수한 점

1. **Tailwind v4 완벽 지원**
   - `@theme` 패턴 적용
   - CSS 변수 기반 토큰 시스템
   - OKLCH 색상 공간 (미래 지향적)

2. **CVA 기반 Variant 시스템**
   - 타입 안전한 variant props
   - 일관된 API 패턴
   - 확장 가능한 구조

3. **접근성 고려**
   - 키보드 네비게이션 지원
   - ARIA 속성 적용
   - 포커스 관리

4. **IDE 특화 컴포넌트**
   - TabBar, Sidebar, StatusBar 등 즉시 사용 가능
   - IDE 개발 시간 대폭 단축

5. **일관된 디자인 토큰**
   - Warm 테마 일관성
   - 컴팩트한 Dimension (데스크톱 최적화)
   - 세밀한 그라데이션, Glow 효과

---

## 🔮 향후 계획

### 1단계 (완료)
- [x] LIMN 컴포넌트 복사
- [x] CSS 토큰 통합
- [x] IDEView TabBar 교체

### 2단계 (진행 중)
- [ ] Sidebar FileTreeItem 교체
- [ ] Button 전체 교체
- [ ] Legacy `bg-vibe-*` 클래스 제거

### 3단계 (향후)
- [ ] UnifiedSearch Modal → LIMN Dialog 사용
- [ ] CodeFold → LIMN Badge 사용
- [ ] StatusBar 추가 (하단 상태바)

---

## 📝 결론

LIMN 디자인 시스템은 **vibe-code-viewer에 성공적으로 통합**되었습니다.

**통합 철학 준수**:
- ✅ LIMN 컴포넌트 원본 수정 금지
- ✅ Props API만 의존
- ✅ 향후 `src/components/` 교체만으로 업데이트 가능

**LIMN 개선 제안**:
- 6개 이슈 발견, 우선순위 분류 완료
- High 우선순위: Sidebar 리사이징
- Medium 우선순위: FileTreeItem 더블클릭, active/focused 구분, Button 로딩

**LIMN 강점**:
- Tailwind v4 완벽 지원
- CVA 기반 variant
- IDE 특화 컴포넌트
- 접근성 고려

LIMN 팀에서 제안된 개선 사항을 반영하면, **vibe-code-viewer 같은 IDE 도구 개발 시 즉시 사용 가능한 프로덕션급 디자인 시스템**이 될 것으로 기대됩니다.

---

**문의**:
- GitHub Issues: (LIMN 레포지토리)
- Email: (담당자 이메일)

**작성자**: Claude Code
**검토자**: (프로젝트 오너)
