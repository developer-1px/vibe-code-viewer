# Focus Mode Feature

Local variable을 클릭하면 해당 변수만 강조하고 나머지 코드를 grayscale로 처리하여 노이즈를 줄이는 기능.

## 주요 기능

### 1. Variable Focus Toggle
- **일반 클릭**: Local variable을 클릭하면 해당 변수의 모든 usage를 highlight
- **Declaration 포함**: 변수 선언(const, let, var)도 함께 highlight
- **Multi-select**: 여러 변수를 동시에 focus 가능
- **Toggle Off**: 활성화된 변수를 다시 클릭하면 비활성화

### 2. Go to Definition
- **Cmd+Click**: Local variable을 Cmd+Click하면 정의로 이동

### 3. Focus Mode Visual Feedback

**Focused Variable**:
- Declaration: Purple super-glow (`shadow-[0_0_8px_rgba(139,92,246,0.7)] bg-vibe-accent/30`)
- Usage: Cyan super-glow (`shadow-[0_0_12px_rgba(34,211,238,0.6)] bg-cyan-400/30`)
- Line number: Purple bold (`text-vibe-accent font-bold`)

**Non-focused (Grayscale)**:
- All syntax: `text-slate-600`
- External imports: `text-slate-600 border-slate-700`
- Parameters: `text-slate-600 border-slate-700`
- Line number: `text-slate-700`

## Architecture

### State Management (`model/atoms.ts`)
```typescript
activeLocalVariablesAtom: Map<nodeId, Set<variableName>>
```
- 각 노드별로 활성화된 변수 이름을 Set으로 관리
- 노드별로 독립적인 focus 상태 유지

### UI Component (`ui/LocalVariableSegment.tsx`)
- Local variable 및 declaration 렌더링
- 일반 클릭 → Toggle handler
- Cmd+Click → Go to Definition handler

### Styling Logic (`entities/CodeSegment/lib/styleBuilder.ts`)
- Focus mode 체크 (`hasFocusMode && isFocused`)
- 모든 segment type에 대한 grayscale 처리
- Focused variable에 대한 super-highlight

### Integration
- `SegmentRenderer.tsx`: focusedVariables 전달
- `CodeCardLine.tsx`: Line number focus 처리

## Usage Example

```typescript
// Focus Mode 사용
import { activeLocalVariablesAtom } from '@/features/FocusMode';

const MyComponent = () => {
  const activeVars = useAtomValue(activeLocalVariablesAtom);

  // 특정 노드의 focused variables 확인
  const focusedVars = activeVars.get(nodeId);
  const hasFocusMode = focusedVars && focusedVars.size > 0;
  const isFocused = hasFocusMode && focusedVars.has(variableName);

  // ...
};
```

## Design Decisions

### Why Feature-Based Architecture?
- **캡슐화**: Focus mode 관련 로직을 한 곳에 모음
- **재사용성**: 다른 프로젝트에서도 쉽게 사용 가능
- **유지보수**: Focus mode 수정 시 한 폴더만 확인

### Why Map<nodeId, Set<variableName>>?
- 노드별 독립적인 focus 상태 관리
- Set을 사용하여 중복 제거 및 빠른 조회
- Toggle 동작 구현이 간단 (add/delete)

### Why Grayscale Everything?
- Focused variable에만 집중할 수 있도록 주변 노이즈 최소화
- 색상 대비로 focused variable이 더욱 돋보임
- 코드 구조는 유지하면서 시각적 방해 요소 제거
