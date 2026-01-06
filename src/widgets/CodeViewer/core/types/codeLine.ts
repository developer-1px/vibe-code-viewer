/**
 * Code Line UI types
 * Domain types (CodeLine, etc.) are re-exported from entities layer
 */

export type { FoldInfo } from '../../../../entities/CodeFold/model/types';
// Re-export domain types from entities layer
export type { CodeLine, ExportSlot } from '../../../../entities/CodeLine/model/types';
// For backward compatibility (deprecated alias)
export type { CodeSegment, DefinitionLocation, SegmentKind } from '../../../../entities/CodeSegment/model/types';
