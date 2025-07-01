import React, { useState } from 'react';
import { FrameData, TRANSLATION_STEP, ROTATION_INCREMENT } from '@workspace/shared';
import { useUIContext } from '../../context/UIContext';
import { useFrameTransform } from '../../hooks/useFrameTransform';

interface FrameControlPanelProps {
  frame: FrameData;
}

export const FrameControlPanel: React.FC<FrameControlPanelProps> = ({ frame }) => {
  const {
    renameFrame,
    selectFrame,
    translateFrameRelative,
    rotateFrame,
    setOrientation,
    saveFrames,
    removeFrame
  } = useUIContext();
  
  const { isSelected } = useFrameTransform(frame.id);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(frame.label);
  
  const handleLabelSubmit = () => {
    if (labelValue.trim() && labelValue !== frame.label) {
      renameFrame(frame.id, labelValue.trim());
    } else {
      setLabelValue(frame.label);
    }
    setIsEditingLabel(false);
  };
  
  const handleCheckboxChange = () => {
    selectFrame(frame.id);
  };
  
  const handleTranslate = (x: number, y: number) => {
    translateFrameRelative(frame.id, { x, y });
  };
  
  const handleRotate = (delta: number) => {
    rotateFrame(frame.id, delta);
  };
  
  const handleOrientationChange = (value: string) => {
    const orientation = parseInt(value) as 0 | 90 | 180 | 270;
    setOrientation(frame.id, orientation);
  };
  
  return (
    <div className="space-y-3">
      {/* Header with checkbox and label */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
        />
        
        {isEditingLabel ? (
          <input
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit();
              if (e.key === 'Escape') {
                setLabelValue(frame.label);
                setIsEditingLabel(false);
              }
            }}
            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingLabel(true)}
            className="flex-1 text-left px-2 py-1 text-sm font-medium hover:bg-gray-700 rounded transition-colors"
          >
            {frame.label}
          </button>
        )}
      </div>
      
      {/* Position info */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
        <div>X: {Math.round(frame.x)}px</div>
        <div>Y: {Math.round(frame.y)}px</div>
        <div>W: {Math.round(frame.width)}px</div>
        <div>H: {Math.round(frame.height)}px</div>
        <div>Rotation: {frame.rotation.toFixed(1)}°</div>
        <div>Orientation: {frame.orientation}°</div>
      </div>
      
      {/* Translation controls */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Position</div>
        <div className="grid grid-cols-3 gap-1">
          <div></div>
          <button
            onClick={() => handleTranslate(0, -TRANSLATION_STEP)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Move Up"
          >
            ↑
          </button>
          <div></div>
          
          <button
            onClick={() => handleTranslate(-TRANSLATION_STEP, 0)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Move Left"
          >
            ←
          </button>
          <div className="p-2 text-center text-xs text-gray-500">{TRANSLATION_STEP}px</div>
          <button
            onClick={() => handleTranslate(TRANSLATION_STEP, 0)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Move Right"
          >
            →
          </button>
          
          <div></div>
          <button
            onClick={() => handleTranslate(0, TRANSLATION_STEP)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Move Down"
          >
            ↓
          </button>
          <div></div>
        </div>
      </div>
      
      {/* Rotation controls */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Rotation</div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRotate(-ROTATION_INCREMENT)}
            className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title={`Rotate -${ROTATION_INCREMENT}°`}
          >
            -
          </button>
          <div className="px-3 py-2 bg-gray-700 rounded text-sm">
            {frame.rotation.toFixed(1)}°
          </div>
          <button
            onClick={() => handleRotate(ROTATION_INCREMENT)}
            className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title={`Rotate +${ROTATION_INCREMENT}°`}
          >
            +
          </button>
        </div>
      </div>
      
      {/* Orientation controls */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Orientation</div>
        <select
          value={frame.orientation}
          onChange={(e) => handleOrientationChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="0">0° (Default)</option>
          <option value="90">90°</option>
          <option value="180">180°</option>
          <option value="270">270°</option>
        </select>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => saveFrames([frame.id])}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => removeFrame(frame.id)}
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}; 