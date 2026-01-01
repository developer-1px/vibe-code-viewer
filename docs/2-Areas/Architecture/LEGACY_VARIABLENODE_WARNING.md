# ⚠️ VariableNode 레거시 경고

## 🚫 DEPRECATED: VariableNode는 더 이상 사용하지 마세요

### 상태: 폐기 예정 (Deprecated)

**폐기 날짜**: 2026-01-01
**제거 예정일**: 2026-02-01
**대체 타입**: `SourceFileNode`

---

## 문제 상황

현재 프로젝트에 **두 개의 다른 VariableNode**가 존재합니다:

### ❌ 잘못된 것 1: entities/VariableNode/model/types.ts
```typescript
// ⚠️ 이 파일은 사용되지 않는 데드 코드입니다!
export interface VariableNode {
  id: string;
  type: 'ref' | 'computed' | 'prop' | 'store' | 'function' | ...;
  // ...
}
```

**상태**: 데드 코드 (import 0건)
**조치**: 삭제 예정

---

### ❌ 잘못된 것 2: SourceFileNode의 Alias
```typescript
// entities/SourceFileNode/model/types.ts
export type VariableNode = SourceFileNode;  // ⚠️ 혼란을 야기하는 alias
```

**상태**: 하위 호환성을 위해 유지되었으나 폐기 예정
**조치**: 제거 예정

---

## ✅ 올바른 방법

### DO: SourceFileNode 직접 사용

```typescript
// ✅ 올바른 방법
import { SourceFileNode } from '@/entities/SourceFileNode';

function processFile(node: SourceFileNode) {
  console.log(node.filePath);
  console.log(node.sourceFile); // TypeScript AST
}
```

### DON'T: VariableNode 사용 금지

```typescript
// ❌ 잘못된 방법
import { VariableNode } from '@/entities/SourceFileNode';

function processFile(node: VariableNode) {  // ❌ 사용하지 마세요
  // ...
}
```

---

## 마이그레이션 가이드

### 1. Import 문 변경

**Before** (잘못됨):
```typescript
import { VariableNode } from '@/entities/SourceFileNode';
import type { VariableNode } from '../entities/SourceFileNode';
```

**After** (올바름):
```typescript
import { SourceFileNode } from '@/entities/SourceFileNode';
import type { SourceFileNode } from '../entities/SourceFileNode';
```

### 2. 타입 선언 변경

**Before**:
```typescript
const nodes: VariableNode[] = [];
function handleNode(node: VariableNode) { }
```

**After**:
```typescript
const nodes: SourceFileNode[] = [];
function handleNode(node: SourceFileNode) { }
```

### 3. 자동 변경 스크립트

```bash
# 모든 VariableNode를 SourceFileNode로 변경
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's/import { VariableNode }/import { SourceFileNode }/g'

find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's/import type { VariableNode }/import type { SourceFileNode }/g'

find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's/: VariableNode/: SourceFileNode/g'

# 타입 체크
npm run type-check
```

---

## FAQ

**Q: 왜 VariableNode를 제거하나요?**
A:
1. 두 개의 다른 정의가 존재하여 혼란을 야기
2. entities/VariableNode/는 사용되지 않는 데드 코드
3. SourceFileNode라는 명확한 이름이 더 적절
4. "파일 단위 노드"라는 의미를 명확히 전달

**Q: 기존 코드가 깨지나요?**
A: 아니요. VariableNode는 SourceFileNode의 alias이므로 타입상 동일합니다. 단순히 이름만 변경하면 됩니다.

**Q: GraphNode는 어떻게 하나요?**
A: GraphNode도 제거 예정입니다. 대신 `CanvasNode`를 사용하세요.

**Q: 언제까지 변경해야 하나요?**
A: 2026-02-01까지 모든 VariableNode를 SourceFileNode로 변경해야 합니다.

---

## 체크리스트

프로젝트에서 VariableNode 제거 상태 확인:

```bash
# 1. VariableNode 사용처 확인
grep -r "VariableNode" src/ --include="*.ts" --include="*.tsx"

# 2. Import 문 확인
grep -r "import.*VariableNode" src/

# 3. 타입 선언 확인
grep -r ": VariableNode" src/
```

**목표**: 모든 검색 결과가 0건

---

## 참고 자료

- [Entities 타입 분석 보고서](./ENTITIES_TYPE_ANALYSIS.md)
- [CONVENTIONS.md](../../../CONVENTIONS.md)
- [마이그레이션 이슈 #123](링크)
