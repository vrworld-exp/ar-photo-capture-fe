import React from 'react';

interface CaptureProgressProps {
  rotationProgress: number;
  levelProgress: number;
  currentLevel: number;
  currentPosition: number;
  photosAtPosition: number;
  capturedImages: string[];
  isInPosition: boolean;
  // Add missing props from constants
  levelNames: string[];
  capturesPerLevel: number;
  photosPerPosition: number;
  totalPhotos: number;
}

const CaptureProgress: React.FC<CaptureProgressProps> = ({
  rotationProgress,
  levelProgress,
  currentLevel,
  currentPosition,
  photosAtPosition,
  capturedImages,
  isInPosition,
  levelNames,
  capturesPerLevel,
  photosPerPosition,
  totalPhotos
}) => {
  return (
    <div className="mt-4 w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-medium">Overall: {rotationProgress}%</span>
        <span className="text-sm">{capturedImages.length}/{totalPhotos} photos</span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-blue-500 h-2.5 rounded-full" 
          style={{ width: `${rotationProgress}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between items-center mb-2 mt-2">
        <span className="text-sm font-medium">{levelNames[currentLevel]}: {levelProgress}%</span>
        <span className="text-xs">
          Position {currentPosition + 1}/{capturesPerLevel} • Photo {photosAtPosition}/{photosPerPosition}
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-green-500 h-1.5 rounded-full" 
          style={{ width: `${levelProgress}%` }}
        ></div>
      </div>
      
      <p className="text-sm text-gray-400 mt-2">
        {isInPosition 
          ? "You're in the correct position! Start capture when ready."
          : "Move to the highlighted position and angle following the guide."}
      </p>
      
      {/* Position progress indicator */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {Array(capturesPerLevel).fill(0).map((_, idx) => (
          <div 
            key={idx}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              idx < currentPosition ? 'bg-green-600' : 
              idx === currentPosition ? 'bg-yellow-500 border-2 border-white' : 
              'bg-gray-600'
            }`}
          >
            {idx + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaptureProgress;