
export interface TokenRange {
  start: number;
  end: number;
  type: 'self' | 'dependency' | 'other-known' | 'text';
  text: string;
}

export interface TemplateTokenRange {
  startOffset: number;  // Absolute position in template content
  endOffset: number;    // Absolute position in template content
  text: string;
  tokenIds: string[];
}

export type SegmentType = 'text' | 'self' | 'token';

export interface LineSegment {
    text: string;
    type: SegmentType;
    tokenId?: string; // Valid only if type is 'token' or 'self'
}

export interface ProcessedLine {
    num: number;
    segments: LineSegment[];
    hasInput: boolean;
}
