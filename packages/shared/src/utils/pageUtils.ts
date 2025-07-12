/**
 * Generates a consistent page ID from an image path
 * Uses a simple hash function that produces the same ID for the same path
 */
export const generatePageId = (imagePath: string): string => {
  // Simple hash function - consistent across runs
  let hash = 0;
  for (let i = 0; i < imagePath.length; i++) {
    const char = imagePath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `page-${Math.abs(hash).toString(16)}`;
}; 