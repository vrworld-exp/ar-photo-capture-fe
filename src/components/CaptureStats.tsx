import React from 'react';
import { CaptureStats as CaptureStatsType } from '../types';

interface CaptureStatsProps {
  stats: CaptureStatsType;
}

const CaptureStats: React.FC<CaptureStatsProps> = ({ stats }) => {
  const { angles, detectedClasses } = stats;
  
  return (
    <div className="bg-gray-700 p-3 rounded-lg text-sm">
      <h3 className="font-medium mb-2">Capture Stats:</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-gray-300 mb-1">Angles Coverage:</h4>
          <ul className="space-y-1">
            <li className="flex justify-between">
              <span>Top view:</span>
              <span>{angles.top || 0} images</span>
            </li>
            <li className="flex justify-between">
              <span>Side views:</span>
              <span>{(angles.side || 0) + (angles.left || 0) + (angles.right || 0)} images</span>
            </li>
            <li className="flex justify-between">
              <span>Bottom view:</span>
              <span>{angles.bottom || 0} images</span>
            </li>
            <li className="flex justify-between">
              <span>Front view:</span>
              <span>{angles.front || 0} images</span>
            </li>
            <li className="flex justify-between">
              <span>Back view:</span>
              <span>{angles.back || 0} images</span>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-gray-300 mb-1">Detected Objects:</h4>
          <ul className="space-y-1">
            {Object.entries(detectedClasses).map(([className, count]) => (
              <li key={className} className="flex justify-between">
                <span className="capitalize">{className}:</span>
                <span>{count} images</span>
              </li>
            ))}
            {Object.keys(detectedClasses).length === 0 && (
              <li className="text-gray-400">No objects detected yet</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CaptureStats;