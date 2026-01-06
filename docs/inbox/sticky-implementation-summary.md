# Sticky Header Implementation Summary

**작성일**: 2026-01-05
**파일**: `src/widgets/CodeViewer/ui/CodeLineView.tsx`
**상태**: ✅ **RESOLVED** - Scroll Event 방식으로 완전 해결

---

## 요약

Sticky header의 block end detection 문제가 **Scroll Event 기반 구현**으로 완전히 해결되었습니다.

**이전 문제**: IntersectionObserver의 `rootMargin` 계산 오류로 sticky가 즉시 비활성화됨
**현재 해결**: Scroll Event로 END 라인 위치를 직접 체크하여 정확한 sticky 제어

---

## 현재 구현 (CodeLineView.tsx)

### 1. Sticky Top 동적 계산 (Line 127-181)

**목적**: 중첩된 함수의 sticky offset을 동적으로 계산

```typescript
const calculateDynamicOffset = () => {
  let offset = HEADER_HEIGHT;

  // 현재 라인을 포함하는 부모 블록들 찾기
  const parentBlocks: { lineNum: number; height: number }[] = [];

  allStickyStarts.forEach((el) => {
    const lineNum = parseInt(el.getAttribute('data-line-num') || '0');
    const foldEnd = parseInt(el.getAttribute('data-fold-end') || '0');

    // 이 블록이 현재 라인을 포함하는가?
    if (lineNum < currentLineNum && foldEnd >= currentLineNum) {
      const height = el.getBoundingClientRect().height;
      parentBlocks.push({ lineNum, height });
    }
  });

  // 부모 블록들의 높이 합산
  parentBlocks.forEach((block) => {
    offset += block.height;
  });

  return Math.floor(offset);
};
```

**핵심**:
- FileSection header (32px) + 부모 블록들의 높이 합산
- ResizeObserver로 높이 변화 자동 감지

**예시**:
```
FileSection Header: 32px
  ↓
Function A (Line 10-50): 32px + 0 = 32px
  ↓
  Function B (Line 20-40): 32px + 19px = 51px (A의 높이만큼 밀림)
    ↓
    Function C (Line 30-35): 32px + 19px + 19px = 70px (A, B 높이 합산)
```

---

### 2. Scroll 기반 END 라인 감지 (Line 184-244)

**목적**: END 라인이 sticky bottom을 지나가면 sticky 해제

```typescript
useEffect(() => {
  if (!isStickyEnabled || !line.foldInfo?.foldEnd) return;

  const endLineElement = document.querySelector(`[data-line-num="${line.foldInfo.foldEnd}"]`);
  if (!endLineElement) {
    setIsStickyActive(true);
    return;
  }

  // Sticky bottom 계산
  const currentRect = lineRef.current?.getBoundingClientRect();
  const lineHeight = currentRect.height;
  const stickyBottom = stickyTop + lineHeight;

  // 실시간 체크 함수
  const checkStickyState = () => {
    const endRect = endLineElement.getBoundingClientRect();
    const endTop = endRect.top;

    // END 라인의 top이 sticky bottom보다 아래 있으면 활성
    const shouldBeActive = endTop > stickyBottom;

    setIsStickyActive(shouldBeActive);
  };

  // 초기 상태 체크
  checkStickyState();

  // 스크롤 이벤트 리스너
  const handleScroll = () => {
    checkStickyState();
  };

  window.addEventListener('scroll', handleScroll, true);

  return () => {
    window.removeEventListener('scroll', handleScroll, true);
  };
}, [isStickyEnabled, line.foldInfo?.foldEnd, line.num, stickyTop]);
```

**핵심 로직**:
```typescript
const shouldBeActive = endTop > stickyBottom;
```

**시각적 설명**:
```
Viewport
┌─────────────────────────────────┐
│  [File Header]                  │ ← 0px
│  ─────────────────────────────  │ ← 32px
│  [Sticky Line] (top=32px)       │ ← stickyTop
│  ↓ lineHeight (19px)            │
│  ─────────────────────────────  │ ← 51px (stickyBottom)
│                                 │
│  [Code Lines]                   │
│  ...                            │
│  [END Line] (endTop=100px)      │ ← endTop > stickyBottom
│                                 │   → shouldBeActive = true ✅
└─────────────────────────────────┘

스크롤 ↓

┌─────────────────────────────────┐
│  [File Header]                  │
│  ─────────────────────────────  │
│  [Sticky Line] (fixed)          │
│  ─────────────────────────────  │ ← stickyBottom
│  [END Line] (endTop=40px)       │ ← endTop < stickyBottom
│                                 │   → shouldBeActive = false ❌
│                                 │   → Sticky 해제!
└─────────────────────────────────┘
```

---

### 3. Sticky 상태 적용 (Line 318-337)

**className**:
```typescript
className={`
  ${isBlockStartLine && isStickyActive ? 'sticky z-10 bg-bg-elevated shadow-md' : ''}
  ${isLastSticky ? 'border-b border-border-active' : ''}
`}
```

**style**:
```typescript
style={{
  top: isBlockStartLine && isStickyActive ? `${stickyTop}px` : undefined,
}}
```

**data attributes**:
```typescript
data-function-start={isBlockStartLine ? line.num : undefined}
data-fold-end={isBlockStartLine && line.foldInfo ? line.foldInfo.foldEnd : undefined}
data-sticky-active={isBlockStartLine && isStickyActive ? 'true' : undefined}
```

**핵심**:
- `isStickyActive = false` → sticky 클래스 제거 → CSS position 해제
- `data-sticky-active` → Last sticky 판별에 사용

---

### 4. Last Sticky Border (Line 246-301)

**목적**: 중첩된 sticky 중 가장 아래 sticky에만 border 표시

```typescript
useEffect(() => {
  if (!isStickyActive) {
    setIsLastSticky(false);
    return;
  }

  const checkIfLast = () => {
    // 실제로 sticky 위치에 고정된 라인들만 필터링
    const activeStickyElements = allStickyElements.filter((el) => {
      return el.getAttribute('data-sticky-active') === 'true';
    });

    if (activeStickyElements.length === 0) {
      setIsLastSticky(false);
      return;
    }

    // Top 위치로 정렬 (아래쪽이 먼저)
    const sortedByTop = activeStickyElements
      .map((el) => ({
        el,
        top: el.getBoundingClientRect().top,
      }))
      .sort((a, b) => b.top - a.top);

    // 가장 아래 sticky가 현재 라인인가?
    const lastStickyElement = sortedByTop[0].el;
    const isLast = lastStickyElement.getAttribute('data-line-num') === String(line.num);

    setIsLastSticky(isLast);
  };

  checkIfLast();
}, [isStickyActive, line.num]);
```

**핵심**:
- `data-sticky-active='true'`인 요소만 필터링
- Top 위치로 정렬하여 가장 아래 sticky 판별
- Border로 시각적 구분

---

## IntersectionObserver vs Scroll Event 비교

### IntersectionObserver 방식 (이전 시도)

**장점**:
- 성능 효율적 (브라우저 최적화)
- 메인 스레드 차단 없음

**단점**:
- rootMargin 계산 복잡
- Sticky 위치 vs DOM 위치 혼동
- 디버깅 어려움
- Edge case 많음 (초기 상태, progressive rendering)

**문제 코드**:
```typescript
// ❌ WRONG - 현재 DOM 위치를 rootMargin으로 사용
const currentRect = lineRef.current?.getBoundingClientRect();
const rootMarginValue = Math.floor(currentRect.bottom); // 2145px!
const rootMargin = `-${rootMarginValue}px 0px 0px 0px`; // viewport 밖으로!
```

---

### Scroll Event 방식 (현재 구현) ✅

**장점**:
- 로직 단순: `endTop > stickyBottom`
- 디버깅 쉬움: console.log로 값 확인
- Edge case 처리 용이
- 직관적: getBoundingClientRect 직접 사용

**단점**:
- 이론적 성능 저하 (실제로는 미미함)
- 스크롤마다 실행 (하지만 계산이 간단함)

**성능 최적화 고려사항**:
```typescript
// 현재: 모든 스크롤 이벤트마다 실행
window.addEventListener('scroll', handleScroll, true);

// 필요시 throttle 적용 가능 (16ms = 60fps)
const throttledScroll = throttle(handleScroll, 16);
window.addEventListener('scroll', throttledScroll, true);
```

**실제 성능**:
- 각 sticky 라인마다 1개의 scroll listener
- `getBoundingClientRect()` 호출: 2회 (start, end)
- 계산량: 매우 적음 (비교 연산 1개)
- 결론: **성능 문제 없음** ✅

---

## 디버그 로그 분석

### Console 출력 예시

**초기 렌더링**:
```
[Sticky] Line 106 | START | top=32px | active=true | last=false | "function getUserData() {"
[Sticky Check] Line 106: {
  stickyTop: 32,
  stickyBottom: 51,
  lineHeight: 19,
  endTop: 2145,
  shouldBeActive: true,
  calculation: "endTop(2145) > stickyBottom(51) = true"
}
[Sticky ON] Line 106 - END top (2145) is below sticky bottom (51)
```

**스크롤 후 END 라인이 sticky bottom에 도달**:
```
[Sticky Check] Line 106: {
  stickyTop: 32,
  stickyBottom: 51,
  lineHeight: 19,
  endTop: 48,
  shouldBeActive: false,
  calculation: "endTop(48) > stickyBottom(51) = false"
}
[Sticky OFF] Line 106 - END top (48) passed sticky bottom (51)
[Sticky] Line 106 | START | top=32px | active=false | last=false | "function getUserData() {"
```

**핵심 지표**:
- `stickyTop`: Sticky 고정 위치 (32px)
- `stickyBottom`: Sticky bottom 위치 (51px)
- `endTop`: END 라인의 현재 위치
- `shouldBeActive`: `endTop > stickyBottom` 계산 결과

---

## 테스트 체크리스트

### ✅ 기본 동작
- [x] Sticky 라인이 처음 렌더링될 때 `active=true`로 유지됨
- [x] 스크롤하여 sticky 위치에 도달하면 고정됨
- [x] END 라인이 sticky bottom에 닿으면 `active=false`로 전환됨
- [x] Sticky 해제 시 CSS position이 해제됨

### ✅ 중첩 함수
- [x] 각 레벨별로 정확한 offset 계산 (32px, 51px, 70px, ...)
- [x] ResizeObserver로 부모 높이 변화 감지
- [x] Border가 마지막 sticky 라인에만 표시됨

### ✅ Edge Cases
- [x] Word wrap으로 line 높이가 변해도 정상 작동
- [x] Progressive rendering (plaintext → rich) 호환
- [x] 초기 렌더링 시 정확한 상태 설정
- [x] END 라인이 없을 때 `active=true` 유지

---

## 결론

### ✅ 해결된 문제

1. **rootMargin 계산 오류** → Scroll Event로 완전 회피
2. **초기 상태 오류** → `checkStickyState()` 초기 실행으로 해결
3. **Progressive rendering 타이밍** → `document.querySelector()` 사용 (항상 최신 DOM)
4. **디버깅 어려움** → 명확한 console.log 출력

### 🎯 현재 상태

- ✅ **Sticky 기능 완전 작동**
- ✅ **중첩 함수 offset 정확**
- ✅ **Last sticky border 정확**
- ✅ **성능 문제 없음**
- ✅ **디버깅 용이**

### 📝 추후 개선 가능성

**필요시 고려 사항** (현재는 불필요):

1. **Throttle 적용** (60fps 제한)
   ```typescript
   const throttledScroll = throttle(handleScroll, 16);
   ```

2. **IntersectionObserver 재도입** (성능이 정말 문제가 될 때)
   - 하지만 rootMargin 계산 복잡도 증가
   - 현재 Scroll Event 방식이 충분히 효율적

3. **Virtual Scrolling** (매우 큰 파일)
   - 10,000+ 라인 파일에서만 필요
   - 현재 사용 사례에서는 불필요

---

## 관련 파일

- **구현**: `src/widgets/CodeViewer/ui/CodeLineView.tsx`
  - Line 127-181: Sticky top 동적 계산 (ResizeObserver)
  - Line 184-244: Scroll 기반 END 라인 감지
  - Line 246-301: Last sticky border 로직
  - Line 318-337: className 및 style 적용

- **이전 분석 문서**:
  - `docs/inbox/sticky-header-block-end-detection-issue.md` (IntersectionObserver 문제 분석)
  - `docs/inbox/intersection-observer-debug-report.md` (IntersectionObserver 상세 가이드)

---

**작성자**: Claude Code
**최종 업데이트**: 2026-01-05
**상태**: ✅ **PRODUCTION READY**
