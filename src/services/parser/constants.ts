/**
 * Framework primitives to exclude from dependency graph
 */

export const REACT_PRIMITIVES = new Set([
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useDeferredValue',
  'useTransition',
  'useId',
  'useSyncExternalStore',
  'useInsertionEffect',
]);

export const VUE_PRIMITIVES = new Set([
  'ref',
  'computed',
  'reactive',
  'watch',
  'watchEffect',
  'onMounted',
  'onUnmounted',
  'onUpdated',
  'onBeforeMount',
  'onBeforeUnmount',
  'onBeforeUpdate',
  'provide',
  'inject',
  'toRefs',
  'storeToRefs',
  'defineProps',
  'defineEmits',
  'defineExpose',
  'withDefaults',
  'shallowRef',
  'triggerRef',
  'customRef',
  'shallowReactive',
  'toRef',
  'unref',
  'isRef',
  'isProxy',
  'isReactive',
  'isReadonly',
  'readonly',
]);

export const isPrimitive = (name: string): boolean =>
  REACT_PRIMITIVES.has(name) || VUE_PRIMITIVES.has(name);
