import { useUIStore } from '../stores';
import { FrameData } from '@workspace/shared';

interface UseFrameTransformReturn {
  frame: FrameData | null;
  transformStyle: string;     // `translate(...) rotate(...)`
  arrowRotation: number;      // frame.rotation + frame.orientation
  isSelected: boolean;
  selectionType: 'none' | 'single' | 'batch';  // single when only 1 selected, batch when multiple
}

export const useFrameTransform = (id: string): UseFrameTransformReturn => {
  const findFrameById = useUIStore((state) => state.findFrameById);
  const selectedFrameIds = useUIStore((state) => state.selectedFrameIds);
  const frame = findFrameById(id) || null;
  
  const isSelected = selectedFrameIds.includes(id);
  const selectionType: UseFrameTransformReturn['selectionType'] = 
    !isSelected ? 'none' :
    selectedFrameIds.length === 1 ? 'single' : 
    'batch';
  
  const transformStyle = frame 
    ? `translate(${frame.x}px, ${frame.y}px) rotate(${frame.rotation}deg)`
    : '';
    
  const arrowRotation = frame ? frame.rotation + frame.orientation : 0;
  
  return {
    frame,
    transformStyle,
    arrowRotation,
    isSelected,
    selectionType
  };
}; 