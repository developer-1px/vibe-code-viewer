/**
 * UnifiedSearch Feature - Public API
 */

export { UnifiedSearchModal } from './ui/UnifiedSearchModal';
export type { SearchResult } from './model/types';
export type { CodeSymbolMetadata } from '../../entities/CodeSymbol';
export { searchResultsFuzzy } from './lib/searchService';
export { extractAllSearchableItems } from './lib/symbolExtractor';
