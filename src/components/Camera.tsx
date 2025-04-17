// import React, { useRef, useState, useEffect, useCallback } from 'react';
// import CubeOverlay from './CubeOverlay';
// import useObjectDetection from '../hooks/useObjectDetection';
// import { useImageCapture } from '../hooks/useImageCapture';

// interface DeviceOrientation {
//   alpha: number;
//   beta: number;
//   gamma: number;
// }

// export interface CapturedImage {
//   dataUrl: string;
//   timestamp: number;
//   orientation: DeviceOrientation;
//   objectClass: string;
// }

// interface FeedbackMessage {
//   message: string;
//   type: 'info' | 'success' | 'warning' | 'error';
// }

// interface CameraProps {
//   onCapture: (imageData: CapturedImage) => void;
//   onUpdateFeedback: (feedback: FeedbackMessage) => void;
//   onStopCapture: () => void;
// }

// const Camera: React.FC<CameraProps> = ({ onCapture, onUpdateFeedback, onStopCapture }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [stream, setStream] = useState<MediaStream | null>(null);
//   const [isReady, setIsReady] = useState<boolean>(false);
//   const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>({ alpha: 0, beta: 0, gamma: 0 });
//   const [capturedAngles, setCapturedAngles] = useState<Set<string>>(new Set());
//   const [autoCaptureMode, setAutoCaptureMode] = useState<boolean>(false);
//   const [blurTimeout, setBlurTimeout] = useState<number | null>(null);
//   const [isImageBlurry, setIsImageBlurry] = useState<boolean>(false);
//   const [captureProgress, setCaptureProgress] = useState<number>(0);
//   const [showGuide, setShowGuide] = useState<boolean>(true);
//   const [capturePhase, setCapturePhase] = useState<'setup' | 'capturing' | 'completed'>('setup');
//   const [cubeDimensions, setCubeDimensions] = useState({ width: 60, height: 60, depth: 40 });
//   console.log(cubeDimensions);
  
//   // Generate path points (angles at which to capture images)
//   const lowerPathPoints = Array.from({ length: 12 }, (_, i) => i * 30);
//   const upperPathPoints = Array.from({ length: 12 }, (_, i) => i * 30);
//   const [completedPoints, setCompletedPoints] = useState<number[]>([]);
//   const [currentPathLevel, setCurrentPathLevel] = useState<number>(0);
  
//   // Target number of images to capture
//   const TARGET_IMAGES = 24; // 12 angles from lower path + 12 angles from upper path
//   const ANGLE_PRECISION = 15; // Degrees between capture points
  
//   const { objectDetected, objectPosition, isModelLoaded } = useObjectDetection(videoRef);
//   const { captureImage, processForBlur } = useImageCapture(videoRef, canvasRef);

//   useEffect(() => {
//     // Start camera
//     const startCamera = async (): Promise<void> => {
//       try {
//         const constraints = {
//           video: { 
//             facingMode: 'environment',
//             width: { ideal: 1280 },
//             height: { ideal: 720 },
//             frameRate: { ideal: 30 }
//           }
//         };
        
//         const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
//         setStream(mediaStream);
        
//         if (videoRef.current) {
//           videoRef.current.srcObject = mediaStream;
//           videoRef.current.onloadedmetadata = () => {
//             if (videoRef.current) {
//               videoRef.current.play();
//               setIsReady(true);
//               onUpdateFeedback({
//                 message: "Camera ready. Loading object detection model...",
//                 type: "info"
//               });
//             }
//           };
//         }
//       } catch (err) {
//         console.error("Error accessing camera:", err);
//         onUpdateFeedback({
//           message: "Camera access denied or not available",
//           type: "warning"
//         });
//       }
//     };

//     startCamera();

//     // Setup device orientation detection
//     const handleOrientationEvent = (event: DeviceOrientationEvent): void => {
//       setDeviceOrientation({
//         alpha: event.alpha || 0,
//         beta: event.beta || 0,
//         gamma: event.gamma || 0
//       });
//     };

//     if (window.DeviceOrientationEvent) {
//       window.addEventListener('deviceorientation', handleOrientationEvent);
//     }

//     return () => {
//       // Clean up
//       if (stream) {
//         stream.getTracks().forEach(track => track.stop());
//       }
//       window.removeEventListener('deviceorientation', handleOrientationEvent);
//       if (blurTimeout) {
//         clearTimeout(blurTimeout);
//       }
//     };
//   }, []);

//   // Display feedback based on model loading status
//   useEffect(() => {
//     if (isModelLoaded) {
//       onUpdateFeedback({
//         message: capturePhase === 'setup' 
//           ? "Position your object within the cube and adjust the cube size if needed"
//           : "Object detection ready! Position your object within the cube",
//         type: "success"
//       });
//     }
//   }, [isModelLoaded, onUpdateFeedback, capturePhase]);

//   // Handle object detection status changes
//   useEffect(() => {
//     if (!isModelLoaded || capturePhase === 'setup') return;
    
//     if (objectDetected && objectPosition) {
//       const positionMessage = getPositionMessage(objectPosition);
//       if (positionMessage) {
//         onUpdateFeedback({
//           message: positionMessage,
//           type: "warning"
//         });
//       } else {
//         checkImageBlur();
//         if (isImageBlurry) {
//           onUpdateFeedback({
//             message: "⚠️ Image is blurry – hold steady",
//             type: "warning"
//           });
//         } else {
//           onUpdateFeedback({
//             message: `✅ Perfect – object detected! Hold still...`,
//             type: "success"
//           });
          
//           if (autoCaptureMode) {
//             tryAutoCapture();
//           }
//         }
//       }
//     } else {
//       onUpdateFeedback({
//         message: "⚠️ Position object within the cube",
//         type: "warning"
//       });
//     }
//   }, [objectDetected, objectPosition, isModelLoaded, autoCaptureMode, isImageBlurry, capturePhase]);

//   const checkImageBlur = useCallback(() => {
//     if (!videoRef.current) return;
    
//     // Clear any existing blur check timeout
//     if (blurTimeout) {
//       clearTimeout(blurTimeout);
//     }
    
//     // Set a timeout to check for blur (avoids checking every frame)
//     const timeout = window.setTimeout(async () => {
//       const blurScore = await processForBlur();
//       setIsImageBlurry(blurScore < 0.5); // Threshold for blur detection
//     }, 300);
    
//     setBlurTimeout(timeout);
//   }, [processForBlur, blurTimeout]);

//   const getPositionMessage = (position: { x: number; y: number; width: number; height: number }): string | null => {
//     if (!position || !videoRef.current) return "⚠️ Object not detected";
    
//     const { x, y, width, height } = position;
//     const videoWidth = videoRef.current?.videoWidth || 640;
//     const videoHeight = videoRef.current?.videoHeight || 480;
    
//     // Check if object is outside the frame
//     if (x < videoWidth * 0.1) return "⚠️ Move object to the right";
//     if (x + width > videoWidth * 0.9) return "⚠️ Move object to the left";
//     if (y < videoHeight * 0.1) return "⚠️ Move object down";
//     if (y + height > videoHeight * 0.9) return "⚠️ Move object up";
    
//     // Check if object is too small or large
//     if (width < videoWidth * 0.2 || height < videoHeight * 0.2) return "⚠️ Move closer to the object";
//     if (width > videoWidth * 0.8 || height > videoHeight * 0.8) return "⚠️ Move further from the object";
    
//     return null; // No issues
//   };

//   const getAngleKey = (): string => {
//     // Normalize angles to positive values for consistent keys
//     const normalizedAlpha = Math.round(((deviceOrientation.alpha % 360) + 360) % 360 / ANGLE_PRECISION) * ANGLE_PRECISION;
//     const normalizedBeta = Math.round(((deviceOrientation.beta % 360) + 360) % 360 / ANGLE_PRECISION) * ANGLE_PRECISION;
//     const normalizedGamma = Math.round(((deviceOrientation.gamma % 360) + 360) % 360 / ANGLE_PRECISION) * ANGLE_PRECISION;
    
//     return `${normalizedAlpha}-${normalizedBeta}-${normalizedGamma}`;
//   };

//   const isNearPathPoint = (): number | null => {
//     // Get the current path points based on the current level
//     const currentPoints = currentPathLevel === 0 ? lowerPathPoints : upperPathPoints;
    
//     // Get the current orientation (alpha angle)
//     const alpha = ((deviceOrientation.alpha % 360) + 360) % 360;
    
//     // Find if we're near any path point
//     for (const point of currentPoints) {
//       // Calculate shortest distance on the circle
//       const distance = Math.min(
//         Math.abs(alpha - point),
//         360 - Math.abs(alpha - point)
//       );
      
//       // If we're close enough to a point and it's not already captured
//       if (distance <= ANGLE_PRECISION && !completedPoints.includes(point)) {
//         return point;
//       }
//     }
    
//     return null;
//   };

//   const isNewAngle = (): boolean => {
//     const angleKey = getAngleKey();
//     return !capturedAngles.has(angleKey);
//   };

//   const handleManualCapture = (): void => {
//     if (!isReady || !objectDetected || isImageBlurry) return;
    
//     performCapture();
//   };

//   const tryAutoCapture = (): void => {
//     if (!isReady || !objectDetected || isImageBlurry) return;
    
//     // Check if we're at a path point
//     const pathPoint = isNearPathPoint();
    
//     // Only capture if this is a new angle and we're at a path point
//     if (pathPoint !== null && isNewAngle()) {
//       performCapture(pathPoint);
//     }
//   };

//   const performCapture = (pathPoint?: number): void => {
//     // Capture the image
//     const imageData = captureImage();
    
//     if (imageData && objectPosition) {
//       // Record this angle as captured
//       const angleKey = getAngleKey();
//       setCapturedAngles(prev => new Set([...prev, angleKey]));
      
//       // Add to completed path points if we're at a path point
//       if (pathPoint !== undefined) {
//         setCompletedPoints(prev => [...prev, pathPoint]);
//       }
      
//       // Update progress
//       const newProgress = capturedAngles.size + 1;
//       setCaptureProgress(newProgress);
      
//       // Check if we should switch path level
//       if (currentPathLevel === 0 && newProgress >= lowerPathPoints.length) {
//         setCurrentPathLevel(1);
//         onUpdateFeedback({
//           message: "Lower path completed! Now move to capture the upper angles.",
//           type: "success"
//         });
//       }
      
//       // Check if we've completed all captures
//       if (newProgress >= TARGET_IMAGES) {
//         setCapturePhase('completed');
//         onUpdateFeedback({
//           message: "Capturing complete! Processing your 3D model...",
//           type: "success"
//         });
//       }
      
//       // Pass to parent component
//       onCapture({
//         dataUrl: imageData,
//         timestamp: Date.now(),
//         orientation: {...deviceOrientation},
//         objectClass: objectPosition?.class || 'object'
//       });
//     }
//   };

//   const toggleAutoCaptureMode = (): void => {
//     setAutoCaptureMode(prev => !prev);
//     onUpdateFeedback({
//       message: !autoCaptureMode 
//         ? "Auto-capture mode activated. Move around the object following the path." 
//         : "Auto-capture mode deactivated.",
//       type: "info"
//     });
//   };

//   const handleStartCapturing = (): void => {
//     setCapturePhase('capturing');
//     setAutoCaptureMode(true);
//     onUpdateFeedback({
//       message: "Auto-capture started. Move around the object following the lower path.",
//       type: "success"
//     });
//   };

//   const handleStopCapture = (): void => {
//     if (stream) {
//       stream.getTracks().forEach(track => track.stop());
//     }
//     onStopCapture();
//   };

//   const handleCubeDimensionsChange = (dimensions: any) => {
//     setCubeDimensions(dimensions);
//   };

//   return (
//     <div className="relative">
//       <video 
//         ref={videoRef} 
//         autoPlay 
//         playsInline 
//         muted 
//         className="w-full h-full  bg-black object-cover"
//       />
//       <canvas ref={canvasRef} className="hidden" />
      
//       <CubeOverlay 
        
//         onCubeChange={handleCubeDimensionsChange}
//         showGuide={showGuide}
//         pathHeight={currentPathLevel === 0 ? 40 : 30}
//         pathPoints={currentPathLevel === 0 ? lowerPathPoints : upperPathPoints}
//         completedPoints={completedPoints}
//         currentAngle={deviceOrientation.alpha}
//         pathLevel={currentPathLevel}
//       />
      
//       {/* Progress indicator */}
//       <div className="absolute top-4 left-4 bg-black bg-opacity-50 p-2 rounded-lg">
//         <div className="text-white text-sm">
//           Progress: {captureProgress}/{TARGET_IMAGES}
//         </div>
//         <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
//           <div 
//             className="h-2 bg-green-500 rounded-full" 
//             style={{ width: `${(captureProgress / TARGET_IMAGES) * 100}%` }}
//           ></div>
//         </div>
//       </div>
      
//       {/* Detection overlay */}
//       {/* {objectDetected && objectPosition && (
//         <div 
//           className="absolute border-2 border-green-500 rounded-md bg-green-500 bg-opacity-20"
//           style={{
//             left: `${(objectPosition.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
//             top: `${(objectPosition.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
//             width: `${(objectPosition.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
//             height: `${(objectPosition.height / (videoRef.current?.videoHeight || 1)) * 100}%`
//           }}
//         >
//            <div className="absolute top-0 left-0 bg-green-500 text-xs text-white px-1 rounded-br-md">
//             Object ({Math.round(objectPosition.score * 100)}%)
//           </div> 
//         </div>
//       )} */}
      
//       {/* Action buttons */}
//       <div className="absolute bottom-4 right-4 flex space-x-2">
//         {capturePhase === 'setup' ? (
//           <>
//             <button 
//               onClick={() => setShowGuide(!showGuide)}
//               className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
//             >
//               {showGuide ? 'Hide Guide' : 'Show Guide'}
//             </button>
//             <button 
//               onClick={handleStartCapturing}
//               disabled={!isReady || !objectDetected}
//               className={`px-4 py-2 ${isReady && objectDetected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded-lg transition-colors`}
//             >
//               Start Capturing
//             </button>
//           </>
//         ) : (
//           <>
//             <button 
//               onClick={handleManualCapture}
//               disabled={!isReady || !objectDetected || isImageBlurry}
//               className={`px-4 py-2 ${isReady && objectDetected && !isImageBlurry ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded-lg transition-colors`}
//             >
//               Capture
//             </button>
//             <button 
//               onClick={toggleAutoCaptureMode}
//               className={`px-4 py-2 ${autoCaptureMode ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-lg hover:bg-blue-700 transition-colors`}
//             >
//               {autoCaptureMode ? 'Auto: ON' : 'Auto: OFF'}
//             </button>
//           </>
//         )}
//         <button 
//           onClick={handleStopCapture}
//           className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//         >
//           {capturePhase === 'completed' ? 'Finish' : 'Stop'}
//         </button>
//       </div>
      
//       {/* Model loading indicator */}
//       {!isModelLoaded && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
//           <div className="text-center p-4">
//             <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
//             <p className="mt-2 text-white">Loading object detection model...</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Camera;

import React, { useRef, useState, useEffect, useCallback } from 'react';
import CubeOverlay from './CubeOverlay';
import useObjectDetection from '../hooks/useObjectDetection';
import { useImageCapture } from '../hooks/useImageCapture';
import { Camera as CameraIcon, Maximize, Minimize, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Check, RefreshCw } from 'lucide-react';

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
  // const [showGuide, setShowGuide] = useState<boolean>(true);
  const [capturePhase, setCapturePhase] = useState<'setup' | 'capturing' | 'review' | 'completed'>('setup');
  const [cubeDimensions, setCubeDimensions] = useState({ width: 60, height: 60, depth: 40, x: 50, y: 50, z: 0 });
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 3;
  console.log(cubeDimensions);
  const showGuide = true;
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
  
  // Audio feedback
  const shutterSoundRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Create audio element for shutter sound
    shutterSoundRef.current = new Audio('/sounds/shutter.mp3');
    
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

  // Step progression
  useEffect(() => {
    if (capturePhase === 'setup') {
      setCurrentStep(1);
    } else if (capturePhase === 'capturing') {
      setCurrentStep(2);
    } else if (capturePhase === 'review' || capturePhase === 'completed') {
      setCurrentStep(3);
    }
  }, [capturePhase]);

  // Display feedback based on model loading status
  useEffect(() => {
    if (isModelLoaded && capturePhase === 'setup') {
      onUpdateFeedback({
        message: "Position your object within the cube and adjust the cube size",
        type: "info"
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
            message: `✅ Perfect – object detected! ${autoCaptureMode ? 'Move around the object slowly' : 'Press capture when ready'}`,
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
    if (!isReady || !objectDetected || isImageBlurry || capturePhase !== 'capturing') return;
    
    performCapture();
  };

  const tryAutoCapture = (): void => {
    if (!isReady || !objectDetected || isImageBlurry || capturePhase !== 'capturing') return;
    
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
      // Play shutter sound
      if (shutterSoundRef.current) {
        shutterSoundRef.current.play().catch(() => {});
      }
      
      // Show flash effect
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);
      
      // Record this angle as captured
      const angleKey = getAngleKey();
      setCapturedAngles(prev => new Set([...prev, angleKey]));
      
      // Add to completed path points if we're at a path point
      if (pathPoint !== undefined) {
        setCompletedPoints(prev => [...prev, pathPoint]);
      }
      
      // Store the captured image data
      const capturedImage = {
        dataUrl: imageData,
        timestamp: Date.now(),
        orientation: {...deviceOrientation},
        objectClass: objectPosition?.class || 'object'
      };
      
      setCapturedImages(prev => [...prev, capturedImage]);
      setLastCapturedImage(imageData);
      
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
        setCapturePhase('review');
        onUpdateFeedback({
          message: "Capturing complete! Review your captures.",
          type: "success"
        });
      }
      
      // Pass to parent component
      onCapture(capturedImage);
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
    if (capturePhase === 'review') {
      setCapturePhase('completed');
      onUpdateFeedback({
        message: "Processing your 3D model...",
        type: "success"
      });
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onStopCapture();
    }
  };

  const handleCubeDimensionsChange = (dimensions: any) => {
    setCubeDimensions(dimensions);
  };

  const adjustCube = (action: 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'scaleUp' | 'scaleDown' | 'rotateClockwise') => {
    const step = 5; // Percentage step for movements
    const scaleStep = 10; // Percentage step for scaling
    // const rotateStep = 15; // Degrees step for rotation
    
    setCubeDimensions(prev => {
      const newDimensions = { ...prev };
      
      switch (action) {
        case 'moveUp':
          newDimensions.y = Math.max(0, prev.y - step);
          break;
        case 'moveDown':
          newDimensions.y = Math.min(100, prev.y + step);
          break;
        case 'moveLeft':
          newDimensions.x = Math.max(0, prev.x - step);
          break;
        case 'moveRight':
          newDimensions.x = Math.min(100, prev.x + step);
          break;
        case 'scaleUp':
          newDimensions.width = Math.min(90, prev.width + scaleStep);
          newDimensions.height = Math.min(90, prev.height + scaleStep);
          break;
        case 'scaleDown':
          newDimensions.width = Math.max(20, prev.width - scaleStep);
          newDimensions.height = Math.max(20, prev.height - scaleStep);
          break;
        case 'rotateClockwise':
          // Just a visual change, not actually applying 3D rotation yet
          break;
      }
      
      return newDimensions;
    });
  };

  // Render functions for different phases
  const renderSetupPhase = () => {
    return (
      <>
        {/* Cube adjustment controls */}
        <div className="absolute h-full left-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
          <button 
            onClick={() => adjustCube('moveUp')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <ArrowUp size={18} />
          </button>
          <button 
            onClick={() => adjustCube('moveDown')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <ArrowDown size={18} />
          </button>
          <button 
            onClick={() => adjustCube('moveLeft')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <button 
            onClick={() => adjustCube('moveRight')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
          <button 
            onClick={() => adjustCube('scaleUp')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <Maximize size={18} />
          </button>
          <button 
            onClick={() => adjustCube('scaleDown')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <Minimize size={18} />
          </button>
          <button 
            onClick={() => adjustCube('rotateClockwise')}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          >
            <RotateCw size={18} />
          </button>
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 rounded-lg px-4 py-2 text-white text-center w-5/6 max-w-md">
          <p className="text-sm">Align the cube to fit your object</p>
        </div>
        
        {/* Start button */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex">
          <button 
            onClick={handleStartCapturing}
            disabled={!isReady || !objectDetected}
            className={`px-6 py-3 rounded-lg text-white text-lg font-medium transition-colors ${
              isReady && objectDetected 
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            Begin Scan
          </button>
        </div>
      </>
    );
  };
  
  const renderCapturingPhase = () => {
    return (
      <>
        {/* Auto-capture toggle button */}
        <div className="absolute top-16 h-full right-4 flex">
          <button 
            onClick={toggleAutoCaptureMode}
            className={`px-3 py-1 rounded-lg text-white text-sm font-medium transition-colors ${
              autoCaptureMode ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            {autoCaptureMode ? 'Auto-Capture: ON' : 'Auto-Capture: OFF'}
          </button>
        </div>
        
        {/* Capture count display */}
        <div className="absolute top-4 h-full left-4 bg-black bg-opacity-70 p-2 rounded-lg text-white">
          <div className="flex items-center space-x-2">
            <CameraIcon size={16} />
            <span>{captureProgress}/{TARGET_IMAGES}</span>
          </div>
          <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
            <div 
              className="h-2 bg-green-500 rounded-full transition-all" 
              style={{ width: `${(captureProgress / TARGET_IMAGES) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Camera icons for completed captures */}
        <div className="absolute bottom-20 left-4 flex flex-wrap gap-1 max-w-xs">
          {Array.from({ length: captureProgress }).map((_, i) => (
            <div key={i} className="w-6 h-6 bg-green-500 bg-opacity-70 rounded-full flex items-center justify-center">
              <CameraIcon size={12} className="text-white" />
            </div>
          ))}
        </div>
        
        {/* Last captured image preview */}
        {lastCapturedImage && (
          <div className="absolute bottom-20 right-4 w-16 h-16 bg-white rounded-lg overflow-hidden border-2 border-white">
            <img src={lastCapturedImage} alt="Last capture" className="w-full h-full object-cover" />
          </div>
        )}
        
        {/* Instructions */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 rounded-lg px-4 py-2 text-white text-center w-5/6 max-w-md">
          <p className="text-sm">
            {currentPathLevel === 0 
              ? "Move slowly around the object, following the lower path" 
              : "Now capture the upper angles, following the upper path"}
          </p>
        </div>
        
        {/* Manual capture button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button 
            onClick={handleManualCapture}
            disabled={!isReady || !objectDetected || isImageBlurry}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isReady && objectDetected && !isImageBlurry 
                ? 'bg-white text-blue-600 hover:bg-gray-200'
                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
            }`}
          >
            <div className="w-12 h-12 rounded-full border-4 border-current"></div>
          </button>
        </div>
        
        {/* Stop button */}
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={() => setCapturePhase('review')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        </div>
        
        {/* Flash effect */}
        {showFlash && (
          <div className="absolute inset-0 bg-white animate-flash pointer-events-none"></div>
        )}
      </>
    );
  };
  
  const renderReviewPhase = () => {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
        <h2 className="text-white text-2xl font-bold mb-4">Capture Complete!</h2>
        
        <div className="bg-white rounded-lg p-4 w-full max-w-md">
          <div className="text-center mb-4">
            <p className="text-gray-800 text-lg font-medium">
              {capturedImages.length} images captured
            </p>
          </div>
          
          {/* Thumbnail gallery */}
          <div className="grid grid-cols-4 gap-2 mb-4 max-h-60 overflow-y-auto">
            {capturedImages.map((img, index) => (
              <div key={index} className="w-full aspect-square bg-gray-200 rounded overflow-hidden">
                <img src={img.dataUrl} alt={`Capture ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          
          <div className="flex justify-between gap-2 mt-4">
            <button 
              onClick={() => {
                setCapturePhase('capturing');
                onUpdateFeedback({
                  message: "Continue capturing images",
                  type: "info"
                });
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-1"
            >
              <div className="flex items-center justify-center">
                <RefreshCw size={16} className="mr-1" />
                Capture More
              </div>
            </button>
            <button 
              onClick={handleStopCapture}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-1"
            >
              <div className="flex items-center justify-center">
                <Check size={16} className="mr-1" />
                Generate Model
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full  bg-black object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* AR surface detection feedback (dots pattern) */}
      {capturePhase === 'setup' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-16 gap-4">
            {Array.from({ length: 192 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1 h-1 rounded-full bg-white opacity-30"
                style={{ 
                  transform: `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`,
                  opacity: Math.random() * 0.4 + 0.1 
                }}
              ></div>
            ))}
          </div>
        </div>
      )}
      
      {/* CubeOverlay with visual enhancements */}
      <CubeOverlay 
        onCubeChange={handleCubeDimensionsChange}
        showGuide={showGuide}
        pathHeight={currentPathLevel === 0 ? 40 : 30}
        pathPoints={currentPathLevel === 0 ? lowerPathPoints : upperPathPoints}
        completedPoints={completedPoints}
        currentAngle={deviceOrientation.alpha}
        pathLevel={currentPathLevel}
        capturePhase={capturePhase}
      />
      
      {/* Phase-specific UI */}
      {capturePhase === 'setup' && renderSetupPhase()}
      {capturePhase === 'capturing' && renderCapturingPhase()}
      {capturePhase === 'review' && renderReviewPhase()}
      
       <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 rounded-full px-4 py-1">
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full ${
                i + 1 === currentStep 
                  ? 'bg-blue-500' 
                  : i + 1 < currentStep 
                    ? 'bg-green-500' 
                    : 'bg-gray-400'
              }`}
            ></div>
          ))}
        </div>
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
      
      {/* Custom CSS for flash animation */}
      {/* <style jsx>{`
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 300ms ease-out forwards;
        }
      `}</style> */}
    </div>
  );
};

export default Camera;