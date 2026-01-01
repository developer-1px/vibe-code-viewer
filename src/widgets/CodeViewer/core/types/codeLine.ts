/**
 * Code Line UI types
 * Domain types (CodeLine, etc.) are re-exported from entities layer
 */

// Re-export domain types from entities layer
export type { CodeLine, ExportSlot } from '../../../../entities/CodeLine/model/types';
export type { CodeSegment, SegmentKind } from '../../../../entities/CodeSegment/model/types';
export type { FoldInfo } from '../../../../entities/CodeFold/model/types';

// For backward compatibility (deprecated alias)
export type { DefinitionLocation } from '../../../../entities/CodeSegment/model/types';
