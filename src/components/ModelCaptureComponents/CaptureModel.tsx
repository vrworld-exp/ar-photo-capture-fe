import { useEffect, useState } from 'react';
import { useCaptureCanvas } from './hooks/useCaptureCanvas';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import { useCapture } from './hooks/useCapture';
import CaptureDisplay from './components/CaptureDisplay';
import IntroScreen from './components/IntroScreen';
import CaptureProgress from './components/CaptureProgress';
import CaptureControls from './components/CaptureControls';

// Constants for the capture process
export const CONSTANTS = (() => {
  const baseConstants = {
    degreesToCapture: 22.5, // Changed from 8 to 22.5 degrees
    totalRotation: 360, // One full turn per level
    totalLevels: 2, // Only low and top levels
    photosPerPosition: 10, // 10 photos at each position
    levelNames: ['LOW LEVEL', 'TOP LEVEL'], // Modified: removed middle level
    angleToleranceDegrees: 10, // How close user needs to be to the target angle
    // Ideal tilt parameters for each level - MODIFIED for 2 levels
    idealPathParams: [
      { beta: 70, height: 'low', colorHex: '#FF5733' },  // LOW LEVEL (looking down at object)
      { beta: 20, height: 'high', colorHex: '#33FF57' }  // TOP LEVEL (looking slightly up at object)
    ]
  };

  // Calculate derived constants
  const capturesPerLevel = Math.floor(baseConstants.totalRotation / baseConstants.degreesToCapture); // 16 positions per level
  const totalPositions = capturesPerLevel * baseConstants.totalLevels; // 32 total positions
  const totalPhotos = totalPositions * baseConstants.photosPerPosition; // 320 total photos

  // Return combined constants
  return {
    ...baseConstants,
    capturesPerLevel,
    totalPositions,
    totalPhotos
  };
})();

const CaptureModel: React.FC = () => {
  // Common state
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  // Paths and canvas state from custom hooks
  const { videoRef, canvasRef, pathCanvasRef, setupCamera } = useCaptureCanvas();
  
  // Device orientation hook
  const deviceOrientation = useDeviceOrientation(permissionGranted, cameraReady);
  
  // Main capture hook with all related state and functions
  const {
    capturedImages,
    rotationProgress,
    levelProgress,
    currentLevel,
    currentPosition,
    photosAtPosition,
    targetAngle,
    isInPosition,
    captureInterval,
    guidanceMessage,
    setCaptureInterval,
    toggleCapturing,
    skipPosition,
    downloadAllImages,
    draw3DPathGuide
  } = useCapture({
    deviceOrientation,
    videoRef,
    canvasRef,
    pathCanvasRef,
    cameraReady,
    permissionGranted,
    setIsDownloading
  });

  // Request motion access
  const requestMotionAccess = async (): Promise<void> => {
    console.log(setCaptureInterval);
    
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        // iOS requires explicit permission
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          console.log('Motion permission granted!');
          setupCamera(setCameraReady);
        } else {
          alert('Motion permission was denied.');
        }
      } catch (err) {
        console.error('Error requesting motion permission:', err);
      }
    } else {
      // Android or devices that don't require explicit permission
      setPermissionGranted(true);
      console.log('Motion permission not required or not supported.');
      setupCamera(setCameraReady);
    }
  };

  // Update the path guide when device orientation changes
  useEffect(() => {
    if (cameraReady && permissionGranted) {
      draw3DPathGuide();
    }
  }, [deviceOrientation, cameraReady, permissionGranted, draw3DPathGuide]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
      {!permissionGranted ? (
        <IntroScreen onStart={requestMotionAccess} />
      ) : (
        <div className="relative w-full max-w-md">
          <CaptureDisplay 
            videoRef={videoRef}
            canvasRef={canvasRef}
            pathCanvasRef={pathCanvasRef}
          />
          
          <CaptureProgress
            rotationProgress={rotationProgress}
            levelProgress={levelProgress}
            currentLevel={currentLevel}
            currentPosition={currentPosition}
            photosAtPosition={photosAtPosition}
            capturedImages={capturedImages}
            isInPosition={isInPosition}
            levelNames={CONSTANTS.levelNames}
            capturesPerLevel={CONSTANTS.capturesPerLevel}
            photosPerPosition={CONSTANTS.photosPerPosition}
            totalPhotos={CONSTANTS.totalPhotos}
          />
          
          <CaptureControls
            captureInterval={captureInterval}
            isInPosition={isInPosition}
            toggleCapturing={toggleCapturing}
            skipPosition={skipPosition}
            deviceOrientation={deviceOrientation}
            targetAngle={targetAngle}
            currentLevel={currentLevel}
            capturedImages={capturedImages}
            isDownloading={isDownloading}
            downloadAllImages={downloadAllImages}
            guidanceMessage={guidanceMessage}
            idealPathParams={CONSTANTS.idealPathParams}
            angleToleranceDegrees={CONSTANTS.angleToleranceDegrees}
            totalPhotos={CONSTANTS.totalPhotos}
          />
        </div>
      )}
    </div>
  );
};

export default CaptureModel;