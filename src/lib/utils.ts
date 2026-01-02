/**
 * cn() - Class Name utility
 * Combines clsx and tailwind-merge for optimal className handling
 *
 * Used by LIMN design system components for variant-based styling
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with proper Tailwind CSS conflict resolution
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-2 removed due to conflict)
 * cn('text-red-500', condition && 'text-blue-500') // conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
