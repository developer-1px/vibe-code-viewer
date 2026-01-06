/**
 * Code Segment UI types
 * Domain types (CodeSegment, SegmentKind) are re-exported from entities layer
 */

import type React from 'react';

// Re-export domain types from entities layer
export type { CodeSegment, DefinitionLocation, SegmentKind } from '../../../../entities/CodeSegment/model/types';

/**
 * Segment style definition for rendering (UI-specific)
 */
export interface SegmentStyle {
  className: string;
  title?: string;
  clickable: boolean;
  clickType?: 'close' | 'expand' | 'external' | 'definition' | 'local-variable';
  hoverTooltip?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  'data-token'?: string;
}
