import React, { useRef, useState, useEffect, useCallback } from 'react';
import CubeOverlay from './CubeOverlay';
import useObjectDetection from '../hooks/useObjectDetection';
import { useImageCapture } from '../hooks/useImageCapture';

interface DeviceOrientation {
  alpha: number;
  beta: number;
  gamma: number;
}

export interface CapturedImage {
  dataUrl: string;
  timestamp: number;
  orientation: DeviceOrientation;
  objectClass: string;
}

interface FeedbackMessage {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface CameraProps {
  onCapture: (imageData: CapturedImage) => void;
  onUpdateFeedback: (feedback: FeedbackMessage) => void;
  onStopCapture: () => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onUpdateFeedback, onStopCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
  const [capturedAngles, setCapturedAngles] = useState<Set<string>>(new Set());
  const [autoCaptureMode, setAutoCaptureMode] = useState<boolean>(false);
  const [blurTimeout, setBlurTimeout] = useState<number | null>(null);
  const [isImageBlurry, setIsImageBlurry] = useState<boolean>(false);
  const [captureProgress, setCaptureProgress] = useState<number>(0);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [capturePhase, setCapturePhase] = useState<'setup' | 'capturing' | 'completed'>('setup');
  const [cubeDimensions, setCubeDimensions] = useState({ width: 60, height: 60, depth: 40 });
  console.log(cubeDimensions);
  
  // Generate path points (angles at which to capture images)
  const lowerPathPoints = Array.from({ length: 12 }, (_, i) => i * 30);
  const upperPathPoints = Array.from({ length: 12 }, (_, i) => i * 30);
  const [completedPoints, setCompletedPoints] = useState<number[]>([]);
  const [currentPathLevel, setCurrentPathLevel] = useState<number>(0);
  
  // Target number of images to capture
  const TARGET_IMAGES = 24; // 12 angles from lower path + 12 angles from upper path
  const ANGLE_PRECISION = 15; // Degrees between capture points
  
  const { objectDetected, objectPosition, isModelLoaded } = useObjectDetection(videoRef);
  const { captureImage, processForBlur } = useImageCapture(videoRef, canvasRef);

  useEffect(() => {
    // Start camera
    const startCamera = async (): Promise<void> => {
      try {
        const constraints = {
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play();
              setIsReady(true);
              onUpdateFeedback({
                message: "Camera ready. Loading object detection model...",
                type: "info"
              });
            }
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        onUpdateFeedback({
          message: "Camera access denied or not available",
          type: "warning"
        });
      }
    };

    startCamera();

    // Setup device orientation detection
    const handleOrientationEvent = (event: DeviceOrientationEvent): void => {
      setDeviceOrientation({
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0
      });
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientationEvent);
    }

    return () => {
      // Clean up
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      window.removeEventListener('deviceorientation', handleOrientationEvent);
      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }
    };
  }, []);

  // Display feedback based on model loading status
  useEffect(() => {
    if (isModelLoaded) {
      onUpdateFeedback({
        message: capturePhase === 'setup' 
          ? "Position your object within the cube and adjust the cube size if needed"
          : "Object detection ready! Position your object within the cube",
        type: "success"
      });
    }
  }, [isModelLoaded, onUpdateFeedback, capturePhase]);

  // Handle object detection status changes
  useEffect(() => {
    if (!isModelLoaded || capturePhase === 'setup') return;
    
    if (objectDetected && objectPosition) {
      const positionMessage = getPositionMessage(objectPosition);
      if (positionMessage) {
        onUpdateFeedback({
          message: positionMessage,
          type: "warning"
        });
      } else {
        checkImageBlur();
        if (isImageBlurry) {
          onUpdateFeedback({
            message: "⚠️ Image is blurry – hold steady",
            type: "warning"
          });
        } else {
          onUpdateFeedback({
            message: `✅ Perfect – object detected! Hold still...`,
            type: "success"
          });
          
          if (autoCaptureMode) {
            tryAutoCapture();
          }
        }
      }
    } else {
      onUpdateFeedback({
        message: "⚠️ Position object within the cube",
        type: "warning"
      });
    }
  }, [objectDetected, objectPosition, isModelLoaded, autoCaptureMode, isImageBlurry, capturePhase]);

  const checkImageBlur = useCallback(() => {
    if (!videoRef.current) return;
    
    // Clear any existing blur check timeout
    if (blurTimeout) {
      clearTimeout(blurTimeout);
    }
    
    // Set a timeout to check for blur (avoids checking every frame)
    const timeout = window.setTimeout(async () => {
      const blurScore = await processForBlur();
      setIsImageBlurry(blurScore < 0.5); // Threshold for blur detection
    }, 300);
    
    setBlurTimeout(timeout);
  }, [processForBlur, blurTimeout]);

  const getPositionMessage = (position: { x: number; y: number; width: number; height: number }): string | null => {
    if (!position || !videoRef.current) return "⚠️ Object not detected";
    
    const { x, y, width, height } = position;
    const videoWidth = videoRef.current?.videoWidth || 640;
    const videoHeight = videoRef.current?.videoHeight || 480;
    
    // Check if object is outside the frame
    if (x < videoWidth * 0.1) return "⚠️ Move object to the right";
    if (x + width > videoWidth * 0.9) return "⚠️ Move object to the left";
    if (y < videoHeight * 0.1) return "⚠️ Move object down";
    if (y + height > videoHeight * 0.9) return "⚠️ Move object up";
    
    // Check if object is too small or large
    if (width < videoWidth * 0.2 || height < videoHeight * 0.2) return "⚠️ Move closer to the object";
    if (width > videoWidth * 0.8 || height > videoHeight * 0.8) return "⚠️ Move further from the object";
    
    return null; // No issues
  };

  const getAngleKey = (): string => {
    // Normalize angles to positive values for consistent keys
    const normalizedAlpha = Math.round(((deviceOrientation.alpha % 360) + 360) % 360 / ANGLE_PRECISION) * ANGLE_PRECISION;
    const normalizedBeta = Math.round(((deviceOrientation.beta % 360) + 360) % 360 / ANGLE_PRECISION) * ANGLE_PRECISION;
    const normalizedGamma = Math.round(((deviceOrientation.gamma % 360) + 360) % 360 / ANGLE_PRECISION) * ANGLE_PRECISION;
    
    return `${normalizedAlpha}-${normalizedBeta}-${normalizedGamma}`;
  };

  const isNearPathPoint = (): number | null => {
    // Get the current path points based on the current level
    const currentPoints = currentPathLevel === 0 ? lowerPathPoints : upperPathPoints;
    
    // Get the current orientation (alpha angle)
    const alpha = ((deviceOrientation.alpha % 360) + 360) % 360;
    
    // Find if we're near any path point
    for (const point of currentPoints) {
      // Calculate shortest distance on the circle
      const distance = Math.min(
        Math.abs(alpha - point),
        360 - Math.abs(alpha - point)
      );
      
      // If we're close enough to a point and it's not already captured
      if (distance <= ANGLE_PRECISION && !completedPoints.includes(point)) {
        return point;
      }
    }
    
    return null;
  };

  const isNewAngle = (): boolean => {
    const angleKey = getAngleKey();
    return !capturedAngles.has(angleKey);
  };

  const handleManualCapture = (): void => {
    if (!isReady || !objectDetected || isImageBlurry) return;
    
    performCapture();
  };

  const tryAutoCapture = (): void => {
    if (!isReady || !objectDetected || isImageBlurry) return;
    
    // Check if we're at a path point
    const pathPoint = isNearPathPoint();
    
    // Only capture if this is a new angle and we're at a path point
    if (pathPoint !== null && isNewAngle()) {
      performCapture(pathPoint);
    }
  };

  const performCapture = (pathPoint?: number): void => {
    // Capture the image
    const imageData = captureImage();
    
    if (imageData && objectPosition) {
      // Record this angle as captured
      const angleKey = getAngleKey();
      setCapturedAngles(prev => new Set([...prev, angleKey]));
      
      // Add to completed path points if we're at a path point
      if (pathPoint !== undefined) {
        setCompletedPoints(prev => [...prev, pathPoint]);
      }
      
      // Update progress
      const newProgress = capturedAngles.size + 1;
      setCaptureProgress(newProgress);
      
      // Check if we should switch path level
      if (currentPathLevel === 0 && newProgress >= lowerPathPoints.length) {
        setCurrentPathLevel(1);
        onUpdateFeedback({
          message: "Lower path completed! Now move to capture the upper angles.",
          type: "success"
        });
      }
      
      // Check if we've completed all captures
      if (newProgress >= TARGET_IMAGES) {
        setCapturePhase('completed');
        onUpdateFeedback({
          message: "Capturing complete! Processing your 3D model...",
          type: "success"
        });
      }
      
      // Pass to parent component
      onCapture({
        dataUrl: imageData,
        timestamp: Date.now(),
        orientation: {...deviceOrientation},
        objectClass: objectPosition?.class || 'object'
      });
    }
  };

  const toggleAutoCaptureMode = (): void => {
    setAutoCaptureMode(prev => !prev);
    onUpdateFeedback({
      message: !autoCaptureMode 
        ? "Auto-capture mode activated. Move around the object following the path." 
        : "Auto-capture mode deactivated.",
      type: "info"
    });
  };

  const handleStartCapturing = (): void => {
    setCapturePhase('capturing');
    setAutoCaptureMode(true);
    onUpdateFeedback({
      message: "Auto-capture started. Move around the object following the lower path.",
      type: "success"
    });
  };

  const handleStopCapture = (): void => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onStopCapture();
  };

  const handleCubeDimensionsChange = (dimensions: any) => {
    setCubeDimensions(dimensions);
  };

  return (
    <div className="relative">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-64 sm:h-96 bg-black object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <CubeOverlay 
        
        onCubeChange={handleCubeDimensionsChange}
        showGuide={showGuide}
        pathHeight={currentPathLevel === 0 ? 40 : 30}
        pathPoints={currentPathLevel === 0 ? lowerPathPoints : upperPathPoints}
        completedPoints={completedPoints}
        currentAngle={deviceOrientation.alpha}
        pathLevel={currentPathLevel}
      />
      
      {/* Progress indicator */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 p-2 rounded-lg">
        <div className="text-white text-sm">
          Progress: {captureProgress}/{TARGET_IMAGES}
        </div>
        <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
          <div 
            className="h-2 bg-green-500 rounded-full" 
            style={{ width: `${(captureProgress / TARGET_IMAGES) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Detection overlay */}
      {/* {objectDetected && objectPosition && (
        <div 
          className="absolute border-2 border-green-500 rounded-md bg-green-500 bg-opacity-20"
          style={{
            left: `${(objectPosition.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
            top: `${(objectPosition.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
            width: `${(objectPosition.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
            height: `${(objectPosition.height / (videoRef.current?.videoHeight || 1)) * 100}%`
          }}
        >
           <div className="absolute top-0 left-0 bg-green-500 text-xs text-white px-1 rounded-br-md">
            Object ({Math.round(objectPosition.score * 100)}%)
          </div> 
        </div>
      )} */}
      
      {/* Action buttons */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        {capturePhase === 'setup' ? (
          <>
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {showGuide ? 'Hide Guide' : 'Show Guide'}
            </button>
            <button 
              onClick={handleStartCapturing}
              disabled={!isReady || !objectDetected}
              className={`px-4 py-2 ${isReady && objectDetected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded-lg transition-colors`}
            >
              Start Capturing
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleManualCapture}
              disabled={!isReady || !objectDetected || isImageBlurry}
              className={`px-4 py-2 ${isReady && objectDetected && !isImageBlurry ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded-lg transition-colors`}
            >
              Capture
            </button>
            <button 
              onClick={toggleAutoCaptureMode}
              className={`px-4 py-2 ${autoCaptureMode ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-lg hover:bg-blue-700 transition-colors`}
            >
              {autoCaptureMode ? 'Auto: ON' : 'Auto: OFF'}
            </button>
          </>
        )}
        <button 
          onClick={handleStopCapture}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {capturePhase === 'completed' ? 'Finish' : 'Stop'}
        </button>
      </div>
      
      {/* Model loading indicator */}
      {!isModelLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="text-center p-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            <p className="mt-2 text-white">Loading object detection model...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Camera;