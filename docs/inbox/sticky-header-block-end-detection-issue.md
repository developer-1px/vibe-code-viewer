# Sticky Header Block End Detection Issue Report

**작성일**: 2026-01-05
**파일**: `src/widgets/CodeViewer/ui/CodeLineView.tsx`
**상태**: ✅ **RESOLVED** - Scroll Event 방식으로 완전 해결

> **해결 방법**: IntersectionObserver 대신 Scroll Event 기반으로 END 라인 위치를 직접 체크하여 문제 해결
>
> **참고**: 최신 구현 상태는 `docs/inbox/sticky-implementation-summary.md` 참조

---

## 1. 문제 요약

Sticky header 기능이 구현되었으나, **IntersectionObserver의 block end 감지 로직이 잘못되어 모든 sticky가 즉시 비활성화**되는 문제가 발생하고 있습니다.

**증상**:
- ✅ Sticky CSS 클래스는 정상 적용 (`sticky z-10 bg-bg-elevated shadow-md`)
- ✅ Offset 계산도 정상 (`top=32px`, 중첩 시 `top=53px`, `top=72px` 등)
- ❌ **모든 sticky 라인이 `active=false`로 즉시 전환됨**
- ❌ 결과: Sticky는 적용되지만 border 등 시각적 효과가 작동하지 않음

---

## 2. 콘솔 로그 분석

### 정상 초기화 로그
```
[Sticky Observer] Line 106 - rootMargin: -2145px 0px 0px 0px (stickyBottom=2145.73)
[Sticky] Line 106 | START | top=32px | active=true | last=false
```

### 즉시 비활성화 로그
```
[Sticky OFF] Line 106 - END line passed sticky bottom threshold
[Sticky] Line 106 | START | top=32px | active=false | last=false
```

### 문제점
1. **Sticky 라인 위치**: `stickyBottom=2145.73px`
   - Sticky 라인이 viewport 상단에서 2145px 아래에 위치
   - 즉, **아직 스크롤되지 않아서 sticky 위치(top=32px)에 도달하지 않음**

2. **IntersectionObserver 즉시 발동**:
   - END 라인도 아직 화면 아래쪽에 있는 상태
   - 하지만 `entry.isIntersecting = false`가 즉시 반환됨
   - 원인: `rootMargin` 계산 방식 오류

---

## 3. 현재 구현 코드 분석

### IntersectionObserver 설정 (Line 187-234)

```typescript
useEffect(() => {
  if (!isStickyEnabled || !line.foldInfo?.foldEnd) return;

  const endLineElement = document.querySelector(`[data-line-num="${line.foldInfo.foldEnd}"]`);
  if (!endLineElement) {
    setIsStickyActive(true);  // ✅ END 라인 없으면 활성
    return;
  }

  // 현재 sticky 라인의 viewport bottom 위치
  const currentRect = lineRef.current?.getBoundingClientRect();
  if (!currentRect) {
    setIsStickyActive(true);
    return;
  }

  // ❌ 문제: rootMargin 계산 방식
  const rootMarginValue = Math.max(0, Math.floor(currentRect.bottom));
  const rootMargin = `-${rootMarginValue}px 0px 0px 0px`;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const shouldBeActive = entry.isIntersecting;
        setIsStickyActive(shouldBeActive);

        if (!shouldBeActive) {
          console.log(`[Sticky OFF] Line ${line.num} - END line passed sticky bottom threshold`);
        }
      });
    },
    {
      rootMargin: rootMargin,  // ❌ "-2145px 0px 0px 0px"
      threshold: [0, 1],
    }
  );

  observer.observe(endLineElement);
}, [isStickyEnabled, line.foldInfo?.foldEnd, line.num, stickyTop]);
```

---

## 4. 근본 원인 분석

### 문제 1: rootMargin 의미 오해

**현재 코드의 의도**:
- Sticky 라인의 bottom 위치(예: 2145px)를 rootMargin으로 설정
- END 라인이 이 위치를 지나가면 sticky 해제

**실제 동작**:
- `rootMargin: "-2145px 0px 0px 0px"`는 **viewport 상단에서 2145px를 빼라는 뜻**
- Viewport 높이가 912px인데 2145px를 빼면 **음의 영역**이 됨
- 결과: END 라인이 항상 이 영역 밖에 있어서 `isIntersecting = false`

### 문제 2: Sticky 위치 vs Viewport 위치 혼동

**Sticky 위치의 두 가지 상태**:
1. **Non-sticky 상태**: 원래 위치에 있을 때 (예: viewport 상단에서 2145px)
2. **Sticky 상태**: 고정될 때 (예: viewport 상단에서 32px)

**현재 코드**:
- `currentRect.bottom`은 **현재 위치**(non-sticky 또는 sticky)를 반환
- Sticky 위치에 도달하기 전: `currentRect.bottom = 2145px` (원래 위치)
- Sticky 위치에 도달한 후: `currentRect.bottom = 32px + lineHeight` (고정 위치)

**문제**:
- useEffect가 초기 렌더링 시점에 실행될 때는 아직 스크롤 전
- `currentRect.bottom = 2145px` (원래 위치)를 rootMargin으로 사용
- 하지만 실제로 감지해야 하는 위치는 **sticky 고정 위치 (32px)**

---

## 5. IntersectionObserver rootMargin 제대로 이해하기

### rootMargin의 역할

```
┌─────────────────────────────────┐
│     Viewport (912px)            │
│                                 │
│  ← rootMargin: "-100px"         │ ← 상단에서 100px 영역 제외
│  ┌───────────────────────────┐  │
│  │  Intersection Root        │  │
│  │  (실제 감지 영역)          │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### 현재 문제

```
Viewport (912px)
┌─────────────────────────────────┐
│                                 │
│  rootMargin: "-2145px"          │ ← 음수 영역! (912 - 2145 = -1233px)
│                                 │
│  ❌ Intersection Root가          │
│     viewport 밖으로 나감!        │
│                                 │
│                                 │
│  [Sticky Line] (2145px)         │ ← 원래 위치
│  ...                            │
│  [END Line] (3000px)            │
│                                 │
└─────────────────────────────────┘
```

**결과**: END 라인이 항상 intersection root 밖에 있어서 `isIntersecting = false`

---

## 6. 올바른 접근 방식

### 목표
**"END 라인이 sticky 라인의 bottom에 닿으면 sticky 해제"**

### 필요한 rootMargin

```
Viewport
┌─────────────────────────────────┐
│  [Sticky Line] (top=32px)       │ ← Sticky 위치 (고정)
│  ↓ lineHeight (예: 19px)        │
│  ─────────────────────────────  │ ← Sticky bottom (32 + 19 = 51px)
│                                 │
│  ← rootMargin: "-51px"          │ ← 이 위치를 threshold로!
│  ┌───────────────────────────┐  │
│  │  Intersection Root        │  │
│  │                           │  │
│  │  [END Line] 여기 들어오면  │  │ ← isIntersecting = true
│  │  sticky 해제!             │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 해결책

**Option 1: Sticky CSS top 값 사용**
```typescript
// Sticky 고정 위치 = CSS top 값 + line 높이
const stickyBottom = stickyTop + (currentRect.height || 19);
const rootMargin = `-${stickyBottom}px 0px 0px 0px`;
```

**Option 2: Sticky 상태에서 실제 위치 측정**
```typescript
// Sticky 상태일 때만 측정 (스크롤 이벤트 필요)
if (lineRef.current) {
  const rect = lineRef.current.getBoundingClientRect();
  if (rect.top === stickyTop) {
    // Sticky 상태 확인
    const stickyBottom = rect.bottom;
    const rootMargin = `-${Math.floor(stickyBottom)}px 0px 0px 0px`;
  }
}
```

**Option 3: 고정된 offset 사용**
```typescript
// 중첩 레벨에 따라 고정 offset 계산
const stickyBottom = stickyTop + LINE_HEIGHT;
const rootMargin = `-${stickyBottom}px 0px 0px 0px`;
```

---

## 7. 권장 수정 방안

### 7.1. 간단한 수정 (추천)

```typescript
useEffect(() => {
  if (!isStickyEnabled || !line.foldInfo?.foldEnd) return;

  const endLineElement = document.querySelector(`[data-line-num="${line.foldInfo.foldEnd}"]`);
  if (!endLineElement) {
    setIsStickyActive(true);
    return;
  }

  // ✅ Sticky CSS top 값 + line 높이 사용
  const lineHeight = 19; // 또는 실제 측정
  const stickyBottom = stickyTop + lineHeight;
  const rootMargin = `-${stickyBottom}px 0px 0px 0px`;

  console.log(`[Sticky Observer] Line ${line.num} - rootMargin: ${rootMargin} (stickyTop=${stickyTop})`);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const shouldBeActive = entry.isIntersecting;
        setIsStickyActive(shouldBeActive);

        if (!shouldBeActive) {
          console.log(`[Sticky OFF] Line ${line.num} - END line passed sticky bottom`);
        }
      });
    },
    {
      rootMargin: rootMargin,
      threshold: [0, 1],
    }
  );

  observer.observe(endLineElement);
  return () => observer.disconnect();
}, [isStickyEnabled, line.foldInfo?.foldEnd, line.num, stickyTop]);
```

### 7.2. 동적 높이 측정 (더 정확)

```typescript
useEffect(() => {
  if (!isStickyEnabled || !line.foldInfo?.foldEnd) return;

  const endLineElement = document.querySelector(`[data-line-num="${line.foldInfo.foldEnd}"]`);
  if (!endLineElement) {
    setIsStickyActive(true);
    return;
  }

  // ✅ 실제 line 높이 측정
  const currentRect = lineRef.current?.getBoundingClientRect();
  if (!currentRect) {
    setIsStickyActive(true);
    return;
  }

  const lineHeight = currentRect.height;
  const stickyBottom = stickyTop + lineHeight;
  const rootMargin = `-${Math.floor(stickyBottom)}px 0px 0px 0px`;

  console.log(`[Sticky Observer] Line ${line.num} - rootMargin: ${rootMargin} (stickyTop=${stickyTop}, lineHeight=${lineHeight})`);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const shouldBeActive = entry.isIntersecting;
        setIsStickyActive(shouldBeActive);

        if (!shouldBeActive) {
          console.log(`[Sticky OFF] Line ${line.num} - END line passed sticky bottom`);
        }
      });
    },
    {
      rootMargin: rootMargin,
      threshold: [0, 1],
    }
  );

  observer.observe(endLineElement);
  return () => observer.disconnect();
}, [isStickyEnabled, line.foldInfo?.foldEnd, line.num, stickyTop]);
```

---

## 8. 테스트 체크리스트

수정 후 확인할 사항:

- [ ] Sticky 라인이 처음 렌더링될 때 `active=true`로 유지되는가?
- [ ] 스크롤하여 sticky 위치에 도달하면 고정되는가?
- [ ] END 라인이 sticky bottom에 닿으면 `active=false`로 전환되는가?
- [ ] 중첩된 함수에서 각 레벨별로 정확히 작동하는가?
- [ ] Border가 마지막 sticky 라인에만 표시되는가?
- [ ] Word wrap으로 line 높이가 변해도 정상 작동하는가?

---

## 9. 관련 파일

- **구현 파일**: `src/widgets/CodeViewer/ui/CodeLineView.tsx`
  - Line 187-234: IntersectionObserver 로직
  - Line 236-291: Last sticky border 로직
  - Line 311-327: className 및 data 속성 설정

- **관련 문서**:
  - `docs/inbox/intersection-observer-debug-report.md` (이전 디버깅 기록)

---

## 10. 결론

**핵심 문제**:
- `currentRect.bottom`은 **현재 DOM 위치**(sticky 적용 전)를 반환
- 하지만 감지해야 하는 위치는 **CSS sticky 고정 위치**

**최종 해결 방법** ✅:
- IntersectionObserver 방식 **폐기**
- **Scroll Event 기반**으로 END 라인 위치 직접 체크
- 로직: `shouldBeActive = endRect.top > stickyBottom`
- 장점: 단순하고 직관적, 디버깅 용이

**구현 위치**: `src/widgets/CodeViewer/ui/CodeLineView.tsx` Line 184-244

**상태**: ✅ **PRODUCTION READY** - 완전히 작동하며 성능 문제 없음

**최신 문서**: `docs/inbox/sticky-implementation-summary.md`