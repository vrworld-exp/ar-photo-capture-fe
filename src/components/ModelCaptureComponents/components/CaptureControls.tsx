import React from 'react';

interface CaptureControlsProps {
  captureInterval: number | null;
  isInPosition: boolean;
  toggleCapturing: () => void;
  skipPosition: () => void;
  deviceOrientation: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  };
  targetAngle: number;
  currentLevel: number;
  capturedImages: string[];
  isDownloading: boolean;
  downloadAllImages: () => Promise<void>;
  guidanceMessage: string;
  // Add missing props from constants
  idealPathParams: Array<{
    beta: number;
    height: string;
    colorHex: string;
  }>;
  angleToleranceDegrees: number;
  totalPhotos: number;
}

const CaptureControls: React.FC<CaptureControlsProps> = ({
  captureInterval,
  isInPosition,
  toggleCapturing,
  skipPosition,
  deviceOrientation,
  targetAngle,
  currentLevel,
  capturedImages,
  isDownloading,
  downloadAllImages,
  guidanceMessage,
  idealPathParams,
  angleToleranceDegrees,
  totalPhotos
}) => {
  return (
    <>
      {/* Guidance message display */}
      {guidanceMessage && (
        <div className="mt-2 p-2 bg-black bg-opacity-70 rounded text-center">
          <p className="text-lg font-bold">{guidanceMessage}</p>
        </div>
      )}
      
      <div className="flex space-x-4 mt-6">
        <button 
          onClick={toggleCapturing}
          className={`px-4 py-2 rounded-lg flex-1 ${
            captureInterval 
              ? 'bg-red-600' 
              : (isInPosition ? 'bg-green-600' : 'bg-gray-600')
          }`}
          disabled={!isInPosition && !captureInterval}
        >
          {captureInterval ? 'STOP' : 'START CAPTURE'}
        </button>
        
        <button 
          onClick={skipPosition}
          className="bg-yellow-600 px-4 py-2 rounded-lg"
          disabled={captureInterval !== null}
        >
          Skip Position
        </button>
      </div>
      
      {/* Current level info */}
      <div className="mt-4 bg-gray-800 p-3 rounded-lg">
        <div className="flex justify-between">
          <span>Current angle: {Math.round(deviceOrientation.alpha || 0)}°</span>
          <span>Target angle: {Math.round(targetAngle)}° ±{angleToleranceDegrees}°</span>
        </div>
        <div className="flex justify-between">
          <span>Current tilt: {Math.round(deviceOrientation.beta || 0)}°</span>
          <span>Target tilt: {idealPathParams[currentLevel].beta}° ±15°</span>
        </div>
      </div>
      
      {capturedImages.length >= totalPhotos / 2 && (
        <div className="mt-6 text-center">
          <button 
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg w-full mb-2"
            onClick={downloadAllImages}
            disabled={isDownloading || captureInterval !== null}
          >
            {isDownloading ? 'Creating ZIP...' : 'Download Current Images as ZIP'}
          </button>
          <p className="text-xs text-gray-400">
            You can download your progress at any time
          </p>
        </div>
      )}
      
      {capturedImages.length >= totalPhotos && (
        <div className="mt-6 text-green-400 font-bold text-center">
          ✅ Capture Complete! All {capturedImages.length} photos taken across 2 levels.
          <button 
            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg block w-full"
            onClick={downloadAllImages}
            disabled={isDownloading}
          >
            {isDownloading ? 'Creating ZIP...' : 'Download All Images as ZIP'}
          </button>
        </div>
      )}
    </>
  );
};

export default CaptureControls;