import React from 'react';

interface ProgressTrackerProps {
  coveredPercentage: number;
  capturedCount: number;
  requiredImages: number;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ coveredPercentage, capturedCount, requiredImages }) => {
  // Define color based on progress
  const getProgressColor = (): string => {
    if (coveredPercentage < 30) return 'bg-red-600';
    if (coveredPercentage < 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };
  
  // Calculate remaining images
  const remainingImages = Math.max(0, requiredImages - capturedCount);
  
  return (
    <div className="p-4 bg-gray-800">
      <div className="mb-2 flex justify-between items-center">
        <span>Coverage Progress:</span>
        <span className={coveredPercentage >= 100 ? 'text-green-500 font-bold' : ''}>
          {coveredPercentage}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4">
        <div 
          className={`${getProgressColor()} h-4 rounded-full transition-all duration-300`}
          style={{ width: `${coveredPercentage}%` }}
        ></div>
      </div>
      <div className="mt-2 text-center">
        <span className={capturedCount >= requiredImages ? 'text-green-500 font-bold' : 'text-gray-300'}>
          Captured {capturedCount} / {requiredImages} images
        </span>
        
        {remainingImages > 0 && (
          <p className="text-sm text-gray-400 mt-1">
            {remainingImages} more {remainingImages === 1 ? 'image' : 'images'} needed
          </p>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;