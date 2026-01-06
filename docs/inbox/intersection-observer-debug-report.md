# IntersectionObserver 디버그 보고서

**작성일**: 2026-01-05
**대상 코드**: `src/widgets/IDEScrollView/hooks/useVisibleFunctionBlocks.ts`
**목적**: Sticky header용 함수 블록 추적 기능의 IntersectionObserver 구현 분석 및 문제점 파악

---

## 1. IntersectionObserver API 상세 설명

### 1.1 기본 개념

IntersectionObserver는 **타겟 요소가 특정 영역(root)과 교차하는지 비동기적으로 감지**하는 Web API입니다.

```typescript
const observer = new IntersectionObserver(callback, options);
observer.observe(targetElement);
```

**성능 장점**:
- ✅ Scroll event보다 훨씬 효율적 (메인 스레드 차단 없음)
- ✅ 브라우저가 최적화된 타이밍에 callback 실행
- ✅ Layout thrashing 방지

### 1.2 옵션 설명

#### `root: Element | null`
- **의미**: 교차를 확인할 기준 영역
- **`null`**: Viewport (브라우저 화면 전체)
- **Element**: 특정 스크롤 컨테이너

**중요**: Root element는 **관찰 대상(target)의 조상 요소**여야 합니다!

```typescript
// ❌ WRONG - header 내부에 code line이 없음
root: headerRef.current  // header는 code line의 형제 요소

// ✅ CORRECT - viewport는 모든 요소의 조상
root: null
```

#### `rootMargin: string`
- **의미**: Root 영역을 확장/축소하는 margin (CSS margin 문법과 동일)
- **기본값**: `'0px'`
- **예시**:
  ```typescript
  rootMargin: '-60px 0px 0px 0px'
  // → Viewport 상단에서 60px 아래부터 intersection 시작
  // → 즉, 상단 60px 영역은 "dead zone"
  ```

**시각적 설명**:
```
┌─────────────────────────┐
│ Viewport                │
│ ┌─────────────────────┐ │ ← rootMargin -60px (dead zone)
│ │ (Intersection zone) │ │
│ │                     │ │
│ │  [Start Line]       │ │ ← isIntersecting = true
│ │                     │ │
│ │  [End Line]         │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

요소가 **dead zone 위로 스크롤되면** `isIntersecting = false`가 됩니다.

#### `threshold: number | number[]`
- **의미**: Callback을 실행할 visibility 비율
- **`0`**: 요소가 1px이라도 보이면/사라지면 실행 (Enter/Exit 감지)
- **`0.5`**: 요소가 50% 보일 때 실행
- **`[0, 0.5, 1]`**: 0%, 50%, 100% visibility마다 실행

**성능 주의**:
```typescript
// ❌ BAD - 스크롤 중 callback이 너무 자주 실행됨
threshold: [0, 0.5, 1]

// ✅ GOOD - Enter/Exit만 감지
threshold: 0
```

### 1.3 Callback 실행 타이밍

```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    console.log(entry.isIntersecting);  // true/false
    console.log(entry.target);          // 관찰 중인 DOM 요소
    console.log(entry.boundingClientRect); // 요소의 위치
    console.log(entry.rootBounds);      // Root의 위치
  });
});
```

**Callback이 실행되는 경우**:
1. `observer.observe(element)` 호출 직후 (초기 상태 체크)
2. 요소가 root와 교차 상태 변경 시 (Enter/Exit)
3. Threshold 조건 만족 시

---

## 2. 현재 구현 분석

### 2.1 요구사항

**목표**: 스크롤 시 현재 보고 있는 함수 블록을 sticky header에 표시

**동작**:
1. 함수 시작 라인이 sticky header 위로 스크롤 → "가려짐" 상태
2. 함수 끝 라인이 아직 화면에 보임 → "진행 중" 상태
3. 조건: `!startVisible && endVisible` → Sticky header에 함수명 표시

### 2.2 코드 흐름

```typescript
// Step 1: 함수 블록 추출 (processedLines에서)
functionBlocks.current = processedLines.filter(/* foldable */)

// Step 2: IntersectionObserver 생성
const observer = new IntersectionObserver(callback, {
  root: null,
  rootMargin: `-${headerHeight}px 0px 0px 0px`,
  threshold: 0
});

// Step 3: Start line과 End line 관찰
blockRefsMap.current.forEach(el => observer.observe(el));  // Start lines
functionBlocks.current.forEach(block => {
  const endElement = document.querySelector(`[data-line-num="${block.endLine}"]`);
  observer.observe(endElement);  // End lines
});

// Step 4: Callback에서 상태 업데이트
entries.forEach(entry => {
  if (/* start line */) {
    state.startVisible = entry.isIntersecting;
  } else {
    state.endVisible = entry.isIntersecting;
  }
});

// Step 5: 표시할 블록 계산
const blocksToShow = blocks.filter(block =>
  !state.startVisible && state.endVisible
);
```

### 2.3 현재 설정값

| Option | Value | 의도 |
|--------|-------|------|
| `root` | `null` | Viewport 기준 |
| `rootMargin` | `-${headerHeight}px 0px 0px 0px` | Sticky header 영역 제외 |
| `threshold` | `0` | Enter/Exit만 감지 |

**예상 동작**:
- Start line이 `headerHeight` 위로 스크롤 → `isIntersecting = false`
- End line이 화면에 보임 → `isIntersecting = true`

---

## 3. 문제점 상세 분석

### 🔴 문제 1: 동적 headerHeight로 인한 Observer 재생성

**위치**: `useVisibleFunctionBlocks.ts:45-46`

```typescript
const headerHeight = headerRef.current.offsetHeight;
console.log('[Setup] Header height:', headerHeight);

const observer = new IntersectionObserver(callback, {
  rootMargin: `-${headerHeight}px 0px 0px 0px`,  // ← 문제!
});
```

**문제점**:
- `headerHeight`가 동적으로 계산됨 (debug UI 포함 시 높이 변함)
- `rootMargin`이 문자열로 고정되어 Observer 생성 시점의 값만 사용
- Header 높이가 변경되어도 Observer는 재생성되지 않음 (useEffect dependency에 headerHeight 없음)

**재현 시나리오**:
1. 초기 렌더링: headerHeight = 40px → rootMargin = `-40px ...`
2. Debug UI 추가: headerHeight = 300px → Observer는 여전히 `-40px` 사용
3. 잘못된 intersection 감지!

**해결 방안**:
```typescript
// Option A: useEffect dependency에 headerHeight 추가
useEffect(() => {
  const headerHeight = headerRef.current?.offsetHeight ?? 0;
  // ... create observer
}, [processedLines, headerRef, headerHeight]);  // ← 추가

// Option B: ResizeObserver로 header 높이 변화 감지
useEffect(() => {
  const resizeObserver = new ResizeObserver(entries => {
    const newHeight = entries[0].contentRect.height;
    // Recreate IntersectionObserver with new rootMargin
  });
  resizeObserver.observe(headerRef.current);
}, []);
```

---

### 🔴 문제 2: DOM 쿼리 타이밍 이슈

**위치**: `useVisibleFunctionBlocks.ts:146-150`

```typescript
functionBlocks.current.forEach((block) => {
  const endElement = document.querySelector(`[data-line-num="${block.endLine}"]`);
  if (endElement) {
    observer.observe(endElement);  // ← 문제: 요소가 없을 수 있음!
  }
});
```

**문제점**:
1. **Progressive Rendering**: FileSection이 plaintext → rich parsing 순서로 렌더링
   - 초기: `renderPlaintext()` → 간단한 라인만 렌더링
   - 이후: `renderCodeLinesDirect()` → 전체 라인 + `data-line-num` 속성 추가

2. **Timing Race Condition**:
   ```
   useEffect (Observer setup) 실행
     → document.querySelector() 호출
       → 아직 rich parsing 전이면 endElement = null!
         → observer.observe() 호출 안 됨
           → endVisible 상태가 업데이트되지 않음
   ```

3. **Start line vs End line 비대칭**:
   - Start line: `registerBlockRef()`로 React ref callback 사용 → 안전 ✅
   - End line: `document.querySelector()` 사용 → 타이밍 이슈 ❌

**재현 시나리오**:
```
[Timeline]
0ms:   FileSection 렌더링 시작 (plaintext)
10ms:  useVisibleFunctionBlocks useEffect 실행
       → functionBlocks: [{ startLine: 10, endLine: 50 }]
       → document.querySelector('[data-line-num="50"]') → null!
       → observer.observe() 호출 안 됨
20ms:  Rich parsing 완료
       → <div data-line-num="50"> DOM 추가
       → But observer는 이미 setup 완료 (다시 observe 안 함)
```

**해결 방안**:

**Option A: End line도 ref callback으로 등록**
```typescript
// CodeLineView.tsx
useEffect(() => {
  // Start line 등록
  if (registerBlockRef && isBlockStartLine && lineRef.current) {
    registerBlockRef(line.num, lineRef.current);
  }

  // ✅ End line도 등록
  if (registerEndLineRef && isBlockEndLine && lineRef.current) {
    registerEndLineRef(line.num, lineRef.current);
  }
}, [registerBlockRef, registerEndLineRef, isBlockStartLine, isBlockEndLine, line.num]);
```

**Option B: MutationObserver로 DOM 추가 감지**
```typescript
const mutationObserver = new MutationObserver(() => {
  // DOM이 변경되면 end line 다시 찾아서 observe
  functionBlocks.current.forEach((block) => {
    const endElement = document.querySelector(`[data-line-num="${block.endLine}"]`);
    if (endElement && !observedEndLines.has(block.endLine)) {
      observer.observe(endElement);
      observedEndLines.add(block.endLine);
    }
  });
});
```

**Option C: processedLines 변경 시 re-observe**
```typescript
useEffect(() => {
  // processedLines가 변경되면 (plaintext → rich) end line 다시 observe
  functionBlocks.current.forEach((block) => {
    const endElement = document.querySelector(`[data-line-num="${block.endLine}"]`);
    if (endElement) {
      observer.observe(endElement);
    }
  });
}, [processedLines]);  // ← dependency 추가
```

---

### 🔴 문제 3: 초기 상태 값 오류

**위치**: `useVisibleFunctionBlocks.ts:64, 86`

```typescript
let state = blockVisibilityState.current.get(startLineNum);
if (!state) {
  state = { startVisible: false, endVisible: false };  // ← 문제!
  blockVisibilityState.current.set(startLineNum, state);
}
```

**문제점**:
- 새로운 블록 발견 시 무조건 `{ startVisible: false, endVisible: false }` 설정
- 실제로는 요소가 **화면에 보이는 상태**일 수 있음
- 초기 intersection callback을 놓치면 상태가 영구적으로 틀림

**재현 시나리오**:
```
1. 함수 블록(Line 10-50)이 화면에 전체 보임
2. Observer callback 실행:
   - entry.target: Line 10 (start)
   - entry.isIntersecting: true
   - But 아직 state가 없음
3. State 생성: { startVisible: false, endVisible: false }
4. 조건 체크: false !== true → 상태 업데이트
   - state.startVisible = true
5. 하지만 end line callback이 아직 실행 안 됨!
   - state.endVisible는 여전히 false
6. 조건 불만족: !true && false = false
   → 블록이 표시되지 않음 (실제로는 보임에도!)
```

**해결 방안**:

**Option A: 초기 상태를 undefined로 설정하고 첫 callback 결과 사용**
```typescript
// 초기 상태 생성 안 함
let state = blockVisibilityState.current.get(startLineNum);
if (!state) {
  // Observer callback이 실행될 때까지 대기
  return;  // 첫 callback에서 실제 값으로 초기화됨
}
```

**Option B: getBoundingClientRect로 초기 상태 확인**
```typescript
if (!state) {
  // 초기 visibility를 실제 위치로 계산
  const rect = entry.target.getBoundingClientRect();
  const headerHeight = headerRef.current?.offsetHeight ?? 0;
  const initialVisible = rect.top > headerHeight && rect.top < window.innerHeight;

  state = {
    startVisible: initialVisible,
    endVisible: initialVisible
  };
  blockVisibilityState.current.set(startLineNum, state);
}
```

**Option C: IntersectionObserver 생성 직후 모든 요소의 초기 상태 계산**
```typescript
// Observer 생성 후
observer.observe(element);

// 초기 상태를 entry 없이 계산
const rect = element.getBoundingClientRect();
const headerHeight = headerRef.current?.offsetHeight ?? 0;
const isVisible = rect.top > headerHeight && rect.top < window.innerHeight;

blockVisibilityState.current.set(lineNum, {
  startVisible: isVisible,
  endVisible: isVisible
});
```

---

### 🔴 문제 4: registerBlockRef의 stale closure

**위치**: `useVisibleFunctionBlocks.ts:159-170`

```typescript
const registerBlockRef = (lineNum: number, element: HTMLElement | null) => {
  if (element) {
    blockRefsMap.current.set(lineNum, element);
    observerRef.current?.observe(element);  // ← 문제: observer가 null일 수 있음
  } else {
    const existing = blockRefsMap.current.get(lineNum);
    if (existing) {
      observerRef.current?.unobserve(existing);
      blockRefsMap.current.delete(lineNum);
    }
  }
};
```

**문제점**:
1. `registerBlockRef`는 hook 최상위에서 생성되지만 **dependency가 없음**
2. `observerRef.current`는 useEffect 내부에서 설정됨
3. Timing:
   ```
   Component mount
     → registerBlockRef 생성 (observerRef.current = null)
       → CodeLineView mount
         → useEffect(() => registerBlockRef(10, element)) 실행
           → observerRef.current?.observe() ← null!
             → useVisibleFunctionBlocks의 useEffect 실행
               → observerRef.current = new IntersectionObserver()
   ```

4. `registerBlockRef`가 호출되는 시점에 observer가 아직 생성되지 않을 수 있음

**해결 방안**:

**Option A: registerBlockRef를 useCallback으로 감싸고 observer를 dependency에 추가**
```typescript
const registerBlockRef = useCallback((lineNum: number, element: HTMLElement | null) => {
  if (element) {
    blockRefsMap.current.set(lineNum, element);
    observerRef.current?.observe(element);
  } else {
    const existing = blockRefsMap.current.get(lineNum);
    if (existing) {
      observerRef.current?.unobserve(existing);
      blockRefsMap.current.delete(lineNum);
    }
  }
}, []);  // observer는 ref라서 dependency 불필요 (항상 최신 값)
```

**Option B: Map에 저장만 하고 useEffect에서 일괄 observe**
```typescript
// registerBlockRef는 Map에 저장만
const registerBlockRef = (lineNum: number, element: HTMLElement | null) => {
  if (element) {
    blockRefsMap.current.set(lineNum, element);
  } else {
    blockRefsMap.current.delete(lineNum);
  }
};

// useEffect에서 모든 등록된 ref를 observe
useEffect(() => {
  const observer = new IntersectionObserver(/*...*/);
  observerRef.current = observer;

  // 모든 등록된 요소를 observe
  blockRefsMap.current.forEach((el) => {
    observer.observe(el);
  });

  return () => observer.disconnect();
}, [processedLines]);
```

---

## 4. 무한 루프 발생 원인 분석

### 4.1 무한 루프가 발생했던 이유

사용자가 보고한 무한 루프:
```
[Entry] {startLine: '82', endLine: '86', isIntersecting: false, ...}
[Start Line 82] false → false
[Entry] {startLine: '82', endLine: '86', isIntersecting: false, ...}
[Start Line 82] false → false
... (무한 반복)
```

**원인**:

1. **Threshold 설정 문제** (이전 버전)
   ```typescript
   threshold: [0, 0.5, 1]  // ❌ 3개의 threshold
   ```
   - 요소가 0%, 50%, 100% visibility에 도달할 때마다 callback 실행
   - 스크롤 중 계속 visibility 변화 → callback 무한 실행

2. **setState로 인한 리렌더링 체인** (수정 전)
   ```typescript
   entries.forEach(entry => {
     // 상태가 같아도 무조건 업데이트
     state.startVisible = entry.isIntersecting;  // false → false
   });

   // 항상 setState 호출
   setVisibleBlocks(blocksToShow);  // 같은 배열이어도 호출
   ```
   - 상태 변화 없어도 `setVisibleBlocks()` 호출
   - 리렌더링 → DOM 변경 → IntersectionObserver 재트리거
   - 무한 루프!

3. **Observer callback 내부에서 observe() 호출** (최초 버전)
   ```typescript
   entries.forEach(entry => {
     // ...
     const endElement = document.querySelector(...);
     observer.observe(endElement);  // ❌ Callback 내부에서 observe!
   });
   ```
   - Callback 실행 → 새로운 요소 observe → 새로운 intersection event 발생 → Callback 다시 실행
   - 무한 재귀!

### 4.2 현재 적용된 무한 루프 방지책

✅ **수정 1: Threshold 단순화**
```typescript
threshold: 0  // Enter/Exit만 감지
```

✅ **수정 2: 상태 변경 시에만 업데이트**
```typescript
if (wasVisible !== entry.isIntersecting) {  // ← 변경됐을 때만
  state.startVisible = entry.isIntersecting;
  stateChanged = true;
}

if (!stateChanged) return;  // ← 변경 없으면 조기 리턴
```

✅ **수정 3: setState 중복 방지**
```typescript
setVisibleBlocks((prev) => {
  if (prev.length !== newBlocks.length) return newBlocks;
  const isDifferent = prev.some((block, idx) =>
    block.startLine !== newBlocks[idx]?.startLine
  );
  return isDifferent ? newBlocks : prev;  // ← 같으면 이전 상태 유지
});
```

✅ **수정 4: Observe를 useEffect 초기화 단계로 이동**
```typescript
// Callback 외부에서 한 번만 observe
functionBlocks.current.forEach((block) => {
  const endElement = document.querySelector(...);
  if (endElement) {
    observer.observe(endElement);
  }
});
```

---

## 5. 해결 방안 요약

### 5.1 즉시 수정 필요 (Critical)

#### Fix 1: End line을 ref callback으로 등록
**파일**: `CodeLineView.tsx`

```typescript
// 현재
const isBlockStartLine = line.foldInfo?.isFoldable && line.foldInfo.foldType !== 'import-block';

// ✅ 추가
const isBlockEndLine = line.foldInfo?.isEndLine;  // foldInfo에 추가 필요

useEffect(() => {
  if (registerBlockRef && isBlockStartLine && lineRef.current) {
    registerBlockRef(line.num, lineRef.current);
  }

  // ✅ End line도 등록
  if (registerEndLineRef && isBlockEndLine && lineRef.current) {
    registerEndLineRef(line.num, lineRef.current);
  }
}, [registerBlockRef, registerEndLineRef, isBlockStartLine, isBlockEndLine, line.num]);
```

**파일**: `useVisibleFunctionBlocks.ts`

```typescript
// ✅ End line ref callback 추가
const registerEndLineRef = (lineNum: number, element: HTMLElement | null) => {
  if (element) {
    endLineRefsMap.current.set(lineNum, element);
    observerRef.current?.observe(element);
  } else {
    const existing = endLineRefsMap.current.get(lineNum);
    if (existing) {
      observerRef.current?.unobserve(existing);
      endLineRefsMap.current.delete(lineNum);
    }
  }
};

return {
  visibleBlocks,
  registerBlockRef,
  registerEndLineRef,  // ✅ Export
  allBlocks: functionBlocks.current,
  visibilityState: blockVisibilityState.current,
};
```

#### Fix 2: 초기 상태를 실제 위치로 계산

```typescript
// State 생성 시 getBoundingClientRect로 초기값 설정
if (!state) {
  const rect = entry.target.getBoundingClientRect();
  const headerHeight = headerRef.current?.offsetHeight ?? 60;
  const isVisible = rect.top > headerHeight && rect.bottom > headerHeight;

  state = {
    startVisible: isVisible,
    endVisible: isVisible
  };
  blockVisibilityState.current.set(startLineNum, state);
}
```

### 5.2 성능 개선 (Nice to have)

#### Optimization 1: ResizeObserver로 header 높이 변화 감지

```typescript
useEffect(() => {
  if (!headerRef.current) return;

  let currentHeaderHeight = headerRef.current.offsetHeight;

  const resizeObserver = new ResizeObserver((entries) => {
    const newHeight = entries[0].contentRect.height;
    if (newHeight !== currentHeaderHeight) {
      currentHeaderHeight = newHeight;
      // Observer 재생성 (rootMargin 업데이트)
      setupObserver(newHeight);
    }
  });

  resizeObserver.observe(headerRef.current);

  return () => resizeObserver.disconnect();
}, [headerRef]);
```

#### Optimization 2: Debounce setState

```typescript
import { useDebounce } from '@/shared/hooks/useDebounce';

// setState를 debounce (16ms = 1 frame)
const debouncedSetVisibleBlocks = useDebounce(setVisibleBlocks, 16);
```

### 5.3 대안 접근법 (Alternative)

IntersectionObserver 대신 **Scroll Event + getBoundingClientRect** 사용:

**장점**:
- 정확한 위치 계산 가능
- Header 높이 변화에 즉시 대응

**단점**:
- 성능 저하 (스크롤마다 실행)
- Throttle/Debounce 필요

```typescript
useEffect(() => {
  const container = document.querySelector('.scroll-container');
  if (!container) return;

  const handleScroll = () => {
    const headerHeight = headerRef.current?.offsetHeight ?? 60;
    const blocksToShow: FunctionBlock[] = [];

    functionBlocks.current.forEach((block) => {
      const startElement = blockRefsMap.current.get(block.startLine);
      const endElement = blockRefsMap.current.get(block.endLine);

      if (!startElement || !endElement) return;

      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();

      // Start line이 header 위로 스크롤 && End line이 header 아래 보임
      if (startRect.top < headerHeight && endRect.top > headerHeight) {
        blocksToShow.push(block);
      }
    });

    setVisibleBlocks(blocksToShow);
  };

  // Throttle to 60fps
  const throttledScroll = throttle(handleScroll, 16);
  container.addEventListener('scroll', throttledScroll);

  return () => container.removeEventListener('scroll', throttledScroll);
}, [processedLines]);
```

---

## 6. 테스트 시나리오

### 6.1 기본 동작 테스트

```typescript
// Scenario 1: 함수 블록 전체가 화면에 보임
// Expected: visibleBlocks = []
// Reason: startVisible=true, endVisible=true → !true && true = false

// Scenario 2: 함수 시작 부분이 header 위로 스크롤
// Expected: visibleBlocks = [block]
// Reason: startVisible=false, endVisible=true → !false && true = true

// Scenario 3: 함수 끝 부분도 화면 밖으로 스크롤
// Expected: visibleBlocks = []
// Reason: startVisible=false, endVisible=false → !false && false = false
```

### 6.2 Edge Cases

```typescript
// Edge 1: Progressive rendering 중 end line이 없을 때
// Expected: endVisible=false 유지 (crash 없이)

// Edge 2: Header 높이 변경 (debug UI toggle)
// Expected: rootMargin 자동 업데이트, 블록 재계산

// Edge 3: 중첩된 함수 블록
// Expected: Depth 순서로 정렬, 최대 3개 표시

// Edge 4: 초기 렌더링 시 블록이 이미 스크롤된 상태
// Expected: 초기 상태가 올바르게 설정됨 (false, false 아님)
```

---

## 7. 결론

### 7.1 현재 상태

- ✅ 무한 루프는 해결됨 (`stateChanged` 플래그, threshold 단순화)
- ❌ `startVisible`/`endVisible`이 변경되지 않음 → **핵심 문제**

### 7.2 근본 원인

1. **End line DOM 쿼리 타이밍 이슈** (Progressive rendering)
2. **초기 상태 값 오류** (실제 위치와 무관하게 false로 초기화)
3. **Header 높이 변화 미반영** (rootMargin 고정)

### 7.3 권장 수정 순서

1. ✅ **[Critical]** End line을 ref callback으로 변경 (DOM 쿼리 제거)
2. ✅ **[Critical]** 초기 상태를 getBoundingClientRect로 계산
3. ⚠️ **[Important]** Header 높이 변화 감지 (ResizeObserver)
4. 📊 **[Optional]** 성능 모니터링 및 최적화

### 7.4 예상 결과

수정 후:
- ✅ Start line 스크롤 시 `startVisible` 정확히 변경
- ✅ End line visibility 올바르게 추적
- ✅ Sticky header에 현재 함수 블록 표시
- ✅ Header 높이 변경 시 자동 대응
- ✅ Progressive rendering과 호환

---

**작성자**: Claude Code
**검토 필요**: `useVisibleFunctionBlocks.ts`, `CodeLineView.tsx`, `FileSection.tsx`
**관련 이슈**: Sticky header 함수 블록 추적 기능
