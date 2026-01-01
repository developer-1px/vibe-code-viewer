/**
 * Code Line UI types
 * Domain types (CodeLine, etc.) are re-exported from entities layer
 */

// Re-export domain types from entities layer
export type { CodeLine, ExportSlot } from '../../../../entities/CodeLine';
export type { CodeSegment, SegmentKind } from '../../../../entities/CodeSegment';
export type { FoldInfo } from '../../../../entities/CodeFold';

// For backward compatibility (deprecated alias)
export type { DefinitionLocation } from '../../../../entities/CodeSegment';
