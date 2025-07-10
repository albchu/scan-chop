import { CursorStyle } from '../types/canvas.types';

export const getCursorStyle = (
  isDragging: boolean, 
  isCommandPressed: boolean
): CursorStyle => {
  if (isDragging) return 'cursor-grabbing select-none';
  if (isCommandPressed) return 'cursor-grab';
  return 'cursor-grab';
};

export const getTransformStyle = (
  panOffset: { x: number; y: number }, 
  totalScale: number, 
  isDragging: boolean
): React.CSSProperties => ({
  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${totalScale})`,
  transformOrigin: 'center center',
  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
}); 