# AI 코딩 어시스턴트용 레거시 코드 감지 프롬프트

## 목적
Claude Code, GitHub Copilot, Cursor 등 AI 코딩 어시스턴트가 레거시 코드(`VariableNode`)를 자동으로 감지하고 경고하도록 하는 프롬프트입니다.

---

## 📋 프롬프트

### 버전 1: 간단한 경고

```markdown
# ⚠️ CRITICAL: VariableNode 사용 금지

당신이 코드를 작성하거나 수정할 때, 다음 규칙을 **반드시** 준수하세요:

## 🚫 절대 사용 금지
- `VariableNode` 타입 사용 금지
- `import { VariableNode }` 금지
- `entities/VariableNode/` 폴더 참조 금지

## ✅ 대신 사용
- **항상** `SourceFileNode`를 사용하세요
- `import { SourceFileNode } from '@/entities/SourceFileNode'`

## 예시

❌ 잘못된 코드:
```typescript
import { VariableNode } from '@/entities/SourceFileNode';
const node: VariableNode = ...;
```

✅ 올바른 코드:
```typescript
import { SourceFileNode } from '@/entities/SourceFileNode';
const node: SourceFileNode = ...;
```

## 이유
- VariableNode는 **폐기 예정**(Deprecated)입니다
- 두 개의 다른 정의가 존재하여 혼란을 야기합니다
- SourceFileNode가 정확하고 명확한 이름입니다
```

---

### 버전 2: 상세한 검사 프롬프트

```markdown
# 코드 검토 체크리스트: 레거시 타입 감지

코드를 작성하거나 리뷰할 때, 다음 항목을 **자동으로 검사**하세요:

## 1️⃣ VariableNode 감지

### 검사 패턴
- [ ] `import.*VariableNode` 패턴 검색
- [ ] `: VariableNode` 타입 선언 검색
- [ ] `<VariableNode>` 제네릭 타입 검색
- [ ] `entities/VariableNode/` 경로 참조 검색

### 발견 시 조치
```typescript
// ❌ 발견된 코드
import { VariableNode } from '@/entities/SourceFileNode';
function process(node: VariableNode) { ... }

// ✅ 자동 수정 제안
import { SourceFileNode } from '@/entities/SourceFileNode';
function process(node: SourceFileNode) { ... }
```

**경고 메시지**:
```
⚠️ DEPRECATED: VariableNode는 폐기 예정입니다.
→ SourceFileNode로 변경하세요.
→ 상세: docs/2-Areas/Architecture/LEGACY_VARIABLENODE_WARNING.md
```

## 2️⃣ GraphNode 감지

### 검사 패턴
- [ ] `GraphNode` 타입 사용

### 발견 시 조치
```typescript
// ❌ 발견된 코드
const node: GraphNode = { x: 0, y: 0, ... };

// ✅ 자동 수정 제안
const node: CanvasNode = { x: 0, y: 0, ... };
```

**경고 메시지**:
```
⚠️ DEPRECATED: GraphNode는 사용되지 않습니다.
→ CanvasNode로 변경하세요.
```

## 3️⃣ 렌더링 타입 레이어 위반 감지

### 검사 패턴
- [ ] `entities/SourceFileNode/lib/types.ts`에서 import
- [ ] `TokenRange`, `LineSegment`, `ProcessedLine` 사용

### 발견 시 조치
```typescript
// ❌ 레이어 위반
import { TokenRange } from '@/entities/SourceFileNode/lib/types';

// ✅ 올바른 레이어
import { CodeSegment } from '@/widgets/CodeViewer/core/types';
```

**경고 메시지**:
```
⚠️ LAYER VIOLATION: 렌더링 타입은 widgets 레이어에 있어야 합니다.
→ 상세: docs/2-Areas/Architecture/ENTITIES_TYPE_ANALYSIS.md
```

## 4️⃣ 자동 수정 스크립트 제공

레거시 코드 발견 시, 다음 스크립트 제안:

```bash
# VariableNode → SourceFileNode 일괄 변경
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's/import { VariableNode }/import { SourceFileNode }/g'

find src -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs sed -i '' \
  's/: VariableNode/: SourceFileNode/g'

# 타입 체크
npm run type-check
```
```

---

### 버전 3: 컨텍스트 인식 프롬프트 (가장 강력)

```markdown
# AI Assistant Rules: Legacy Code Detection

## Context
이 프로젝트는 `VariableNode`를 **완전히 폐기**하고 `SourceFileNode`로 마이그레이션 중입니다.

## Your Role
당신은 코드 작성/수정 시 레거시 패턴을 **자동으로 감지하고 수정**해야 합니다.

## Detection Rules

### Rule 1: VariableNode Detection (CRITICAL)

**IF** 다음 중 하나를 발견하면:
- `import.*VariableNode`
- `type.*VariableNode`
- `interface.*VariableNode`
- `: VariableNode`
- `<VariableNode>`

**THEN** 즉시 중단하고 경고:
```
🚨 CRITICAL: VariableNode 감지됨!

발견된 위치: [파일명:줄번호]
발견된 코드: [코드 스니펫]

⚠️ VariableNode는 폐기 예정입니다 (Deprecated).
→ 모든 VariableNode를 SourceFileNode로 변경하세요.

자동 수정 제안:
[수정된 코드]

관련 문서:
- docs/2-Areas/Architecture/LEGACY_VARIABLENODE_WARNING.md
- docs/2-Areas/Architecture/ENTITIES_TYPE_ANALYSIS.md
```

**THEN** 사용자에게 확인 요청:
```
다음 중 하나를 선택하세요:
1. 자동 수정 적용 (권장)
2. 수동으로 수정하겠습니다
3. 이 경고 무시 (비권장)
```

### Rule 2: Forbidden Imports

**절대 사용 금지 목록**:
```typescript
// 🚫 FORBIDDEN
import { VariableNode } from '@/entities/SourceFileNode';
import { VariableNode } from '../entities/SourceFileNode';
import { GraphNode } from '@/entities/SourceFileNode';
import { TokenRange } from '@/entities/SourceFileNode/lib/types';
import { LineSegment } from '@/entities/SourceFileNode/lib/types';
import { ProcessedLine } from '@/entities/SourceFileNode/lib/types';
```

**발견 시 동작**:
1. 코드 작성 중단
2. 경고 메시지 표시
3. 올바른 대안 제시
4. 자동 수정 옵션 제공

### Rule 3: Proactive Replacement

**새 코드 작성 시**:
- VariableNode를 타이핑하려고 하면 → 자동으로 SourceFileNode로 변경
- GraphNode를 타이핑하려고 하면 → 자동으로 CanvasNode로 변경

**예시**:
```typescript
// 사용자가 타이핑: const node: Vari
// AI 자동 완성: const node: SourceFileNode
//                                ^^^^^^^^^^^^^^ (VariableNode가 아님!)
```

### Rule 4: Code Review Mode

**기존 코드 리뷰 시**:

1️⃣ **파일 열기 시** 자동 스캔:
```
📊 레거시 코드 스캔 결과:
- VariableNode 사용: 3건 발견 ⚠️
- GraphNode 사용: 1건 발견 ⚠️
- 레이어 위반: 0건 ✅

일괄 수정하시겠습니까? [Yes/No]
```

2️⃣ **파일 저장 시** 자동 검증:
```
❌ 저장 차단: 레거시 코드 감지됨

다음 항목을 수정해야 저장할 수 있습니다:
- Line 15: VariableNode → SourceFileNode
- Line 23: GraphNode → CanvasNode

자동 수정 후 저장 [Enter]
수동 수정 [Esc]
```

### Rule 5: Context-Aware Suggestions

**사용자가 "node" 또는 "파일" 관련 코드 작성 시**:

```typescript
// 사용자 입력: "파일 노드를 처리하는 함수를 만들어줘"

// ❌ 생성하지 말 것
function processNode(node: VariableNode) { ... }

// ✅ 항상 이렇게 생성
function processNode(node: SourceFileNode) {
  // SourceFileNode는 파일 단위 노드입니다
  console.log(node.filePath);
  console.log(node.sourceFile); // TypeScript AST
}
```

## Examples

### Example 1: Code Generation

**사용자**: "SourceFileNode 배열을 필터링하는 함수 만들어줘"

**AI Response**:
```typescript
// ✅ 올바른 생성
import { SourceFileNode } from '@/entities/SourceFileNode';

function filterNodes(nodes: SourceFileNode[]): SourceFileNode[] {
  return nodes.filter(node => node.filePath.endsWith('.tsx'));
}

// 💡 Note: VariableNode가 아닌 SourceFileNode를 사용했습니다.
// VariableNode는 폐기 예정입니다.
```

### Example 2: Code Refactoring

**사용자**: "이 함수를 리팩토링해줘"
```typescript
function process(nodes: VariableNode[]) {
  return nodes.map(n => n.filePath);
}
```

**AI Response**:
```typescript
// ⚠️ 레거시 타입 감지: VariableNode
// 자동으로 SourceFileNode로 변경합니다.

import { SourceFileNode } from '@/entities/SourceFileNode';

function process(nodes: SourceFileNode[]): string[] {
  return nodes.map(node => node.filePath);
}

// ✅ 변경 사항:
// - VariableNode → SourceFileNode
// - 반환 타입 명시 추가 (string[])
// - 변수명 개선 (n → node)
```

### Example 3: Import Suggestion

**사용자**: "VariableNode를 import해줘"

**AI Response**:
```
🚨 요청 거부: VariableNode는 폐기 예정입니다.

대신 다음을 사용하세요:

```typescript
import { SourceFileNode } from '@/entities/SourceFileNode';
```

이유:
- VariableNode는 2026-02-01에 제거 예정입니다
- SourceFileNode가 정확하고 명확한 이름입니다
- 두 타입은 동일하므로 안전하게 변경 가능합니다

자동으로 SourceFileNode를 import하시겠습니까? [Yes/No]
```

## Error Prevention

### Before Writing Code

**체크리스트**:
- [ ] VariableNode 사용하지 않았는가?
- [ ] GraphNode 대신 CanvasNode를 사용했는가?
- [ ] entities/SourceFileNode/lib/types.ts에서 import하지 않았는가?

### After Writing Code

**자동 검증**:
```bash
# 저장 전 자동 실행
grep -n "VariableNode" [현재 파일]
grep -n "GraphNode" [현재 파일]

# 발견 시 → 저장 차단 + 경고 표시
```

## Success Criteria

**목표**: 프로젝트에서 VariableNode 완전 제거

**측정**:
```bash
# 0건이 되어야 함
grep -r "VariableNode" src/ --include="*.ts" --include="*.tsx" | wc -l
```

**현재 진행률 표시**:
```
📊 VariableNode 제거 진행률: 87% (24/28 파일 완료)

남은 파일:
- src/widgets/PipelineCanvas/utils.ts
- src/features/UnifiedSearch/lib/symbolExtractor.ts
- src/shared/symbolMetadataExtractor.ts
- src/store/atoms.ts
```

## Quick Reference

| ❌ 사용 금지 | ✅ 올바른 대안 | 이유 |
|--------------|----------------|------|
| `VariableNode` | `SourceFileNode` | 폐기 예정 |
| `GraphNode` | `CanvasNode` | 미사용 |
| `entities/VariableNode/` | `entities/SourceFileNode/` | 데드 코드 |
| `TokenRange` (from entities) | `CodeSegment` (from widgets) | 레이어 위반 |
| `ProcessedLine` | `CodeLine` | 중복 |

## Related Documentation

- [LEGACY_VARIABLENODE_WARNING.md](docs/2-Areas/Architecture/LEGACY_VARIABLENODE_WARNING.md)
- [ENTITIES_TYPE_ANALYSIS.md](docs/2-Areas/Architecture/ENTITIES_TYPE_ANALYSIS.md)
- [CONVENTIONS.md](CONVENTIONS.md)
```

---

## 사용 방법

### Claude Code에 추가
1. 프로젝트 루트의 `CLAUDE.md`에 "버전 1" 프롬프트 추가
2. 또는 별도 파일로 `.claude/legacy-detection.md` 생성

### GitHub Copilot에 추가
1. `.github/copilot-instructions.md` 생성
2. "버전 2" 프롬프트 복사

### Cursor에 추가
1. `.cursorrules` 파일에 "버전 3" 프롬프트 추가
2. Settings에서 "Always use custom rules" 활성화

---

## 테스트

### 테스트 케이스 1: 감지 테스트
```typescript
// 이 코드를 작성하면 AI가 경고해야 함
import { VariableNode } from '@/entities/SourceFileNode';
const node: VariableNode = {};
```

**예상 결과**: 🚨 경고 메시지 + 자동 수정 제안

### 테스트 케이스 2: 자동 완성 테스트
```typescript
// "const node: Vari"를 타이핑하면
// AI가 "VariableNode"가 아닌 "SourceFileNode"를 제안해야 함
```

**예상 결과**: `SourceFileNode` 자동 완성

### 테스트 케이스 3: 코드 생성 테스트
```
프롬프트: "파일 노드를 처리하는 함수 만들어줘"
```

**예상 결과**:
```typescript
// ✅ SourceFileNode 사용
function processFile(node: SourceFileNode) { ... }

// ❌ VariableNode 사용 안 함
```

---

## 효과 측정

**Before**:
- 개발자가 실수로 VariableNode 사용
- 코드 리뷰에서 발견
- 수동으로 수정

**After**:
- AI가 실시간으로 감지 및 차단
- 자동 수정 제안
- 레거시 코드 0건 유지

**기대 효과**:
- 🕐 리뷰 시간 90% 감소
- 🐛 타입 혼란 버그 100% 방지
- 📈 코드 품질 향상
