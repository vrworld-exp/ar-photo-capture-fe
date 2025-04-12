import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// // Constants for the capture process
// export const CONSTANTS = {
//   degreesToCapture: 22.5, // Changed from 8 to 22.5 degrees
//   totalRotation: 360, // One full turn per level
//   totalLevels: 2, // Only low and top levels
//   photosPerPosition: 10, // 10 photos at each position
//   levelNames: ['LOW LEVEL', 'TOP LEVEL'], // Modified: removed middle level
//   angleToleranceDegrees: 10, // How close user needs to be to the target angle
//   // Ideal tilt parameters for each level - MODIFIED for 2 levels
//   idealPathParams: [
//     { beta: 70, height: 'low', colorHex: '#FF5733' },  // LOW LEVEL (looking down at object)
//     { beta: 20, height: 'high', colorHex: '#33FF57' }  // TOP LEVEL (looking slightly up at object)
//   ]
// };

// // Derived constants
// CONSTANTS.capturesPerLevel = Math.floor(CONSTANTS.totalRotation / CONSTANTS.degreesToCapture); // 16 positions per level
// CONSTANTS.totalPositions = CONSTANTS.capturesPerLevel * CONSTANTS.totalLevels; // 32 total positions
// CONSTANTS.totalPhotos = CONSTANTS.totalPositions * CONSTANTS.photosPerPosition; // 320 total photos
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
// Interface for the hook parameters
interface UseCaptureParams {
  deviceOrientation: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  };
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pathCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraReady: boolean;
  permissionGranted: boolean;
  setIsDownloading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Interface for the hook return value
interface UseCaptureReturn {
  capturedImages: string[];
  rotationProgress: number;
  levelProgress: number;
  currentLevel: number;
  currentPosition: number;
  photosAtPosition: number;
  targetAngle: number;
  isInPosition: boolean;
  captureInterval: number | null;
  guidanceMessage: string;
  setCaptureInterval: React.Dispatch<React.SetStateAction<number | null>>;
  toggleCapturing: () => void;
  skipPosition: () => void;
  downloadAllImages: () => Promise<void>;
  draw3DPathGuide: () => void;
}

export const useCapture = ({
  deviceOrientation,
  videoRef,
  canvasRef,
  pathCanvasRef,
  cameraReady,
  permissionGranted,
  setIsDownloading
}: UseCaptureParams): UseCaptureReturn => {
  // State variables
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [rotationProgress, setRotationProgress] = useState<number>(0);
  const [levelProgress, setLevelProgress] = useState<number>(0);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [guidanceMessage, setGuidanceMessage] = useState<string>('');
  
  // Position-based capturing state
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [photosAtPosition, setPhotosAtPosition] = useState<number>(0);
  const [isInPosition, setIsInPosition] = useState<boolean>(false);
  const [captureInterval, setCaptureInterval] = useState<number | null>(null);
  const [targetAngle, setTargetAngle] = useState<number>(0);

  // Reference to last angle
  const lastAngle = useRef<number | null>(null);

  // Capture a photo from the video stream
  const capturePhoto = (): void => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !video.videoWidth) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imgData = canvas.toDataURL('image/jpeg', 0.85); // Using 0.85 quality for better file size
    setCapturedImages((prev) => [...prev, imgData]);
    
    console.log(`Photo captured! (${capturedImages.length + 1}/${CONSTANTS.totalPhotos}) - Level: ${currentLevel + 1}/${CONSTANTS.totalLevels}, Position: ${currentPosition + 1}/${CONSTANTS.capturesPerLevel}, Photo: ${photosAtPosition + 1}/${CONSTANTS.photosPerPosition}`);
  };

  // Move to the next position
  const moveToNextPosition = () => {
    if (currentPosition + 1 < CONSTANTS.capturesPerLevel) {
      // Move to next position in current level
      setCurrentPosition(prev => prev + 1);
      setPhotosAtPosition(0);
      
      // Calculate new target angle
      const newAngle = (targetAngle + CONSTANTS.degreesToCapture) % 360;
      setTargetAngle(newAngle);
      
      setGuidanceMessage(`Move to position ${currentPosition + 2} - Turn RIGHT to ${Math.round(newAngle)}°`);
    } else {
      // Move to next level
      if (currentLevel + 1 < CONSTANTS.totalLevels) {
        setCurrentLevel(prev => prev + 1);
        setCurrentPosition(0);
        setPhotosAtPosition(0);
        // Reset to starting angle for new level
        setGuidanceMessage(`Great! Now move to ${CONSTANTS.levelNames[currentLevel + 1]} position`);
      } else {
        // All done!
        setGuidanceMessage("Capture complete! You can download all images.");
      }
    }
  };

  // Start or stop the auto capture sequence
  const toggleCapturing = () => {
    if (captureInterval) {
      // Stop capturing
      clearInterval(captureInterval);
      setCaptureInterval(null);
      setGuidanceMessage("Capture paused. Move to next position.");
    } else if (isInPosition) {
      // Start capturing
      setGuidanceMessage("HOLD STILL - Capturing photos");
      
      const interval = window.setInterval(() => {
        if (photosAtPosition < CONSTANTS.photosPerPosition) {
          capturePhoto();
          setPhotosAtPosition(prev => prev + 1);
        } else {
          // Stop capturing when we have enough photos
          clearInterval(interval);
          setCaptureInterval(null);
          
          // Move to next position or level
          moveToNextPosition();
        }
      }, 500); // Capture a photo every 500ms
      
      setCaptureInterval(interval);
    }
  };

  // Skip current position and move to next
  const skipPosition = () => {
    if (captureInterval) {
      clearInterval(captureInterval);
      setCaptureInterval(null);
    }
    moveToNextPosition();
  };

  // Function to download all images as a ZIP file
  const downloadAllImages = async (): Promise<void> => {
    setIsDownloading(true);
    
    try {
      // Create a new JSZip instance
      const zip = new JSZip();
      
      // Add each image to the zip file with better organization
      let photoIndex = 0;
      for (let level = 0; level < CONSTANTS.totalLevels; level++) {
        for (let position = 0; position < CONSTANTS.capturesPerLevel; position++) {
          for (let photo = 0; photo < CONSTANTS.photosPerPosition; photo++) {
            if (photoIndex < capturedImages.length) {
              // Calculate angle for this position
              const angle = (position * CONSTANTS.degreesToCapture).toFixed(1);
              
              // Create folder structure
              const folderName = `level-${level + 1}-${CONSTANTS.levelNames[level].toLowerCase().replace(' ', '-')}`;
              
              // Convert base64 image to blob
              const imageData = capturedImages[photoIndex].split(',')[1];
              const byteCharacters = atob(imageData);
              const byteNumbers = new Array(byteCharacters.length);
              
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });
              
              // Add file to zip with proper naming for sequence
              const fileName = `${folderName}/position_${(position + 1).toString().padStart(2, '0')}_${angle}deg/image_${(photo + 1).toString().padStart(2, '0')}.jpg`;
              zip.file(fileName, blob);
              
              photoIndex++;
            }
          }
        }
      }
      
      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Create a timestamp for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Save the zip file
      saveAs(content, `3d-object-scan-${timestamp}.zip`);
      
      alert(`Successfully created ZIP archive with ${capturedImages.length} images.`);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('There was an error creating the ZIP file. Check console for details.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Draw the 3D path guide with AR-like visualization
  const draw3DPathGuide = (): void => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Create 3D effect for the rings
    const drawRing = (yOffset: number, color: string, progress: number = 100, label: string = '', isActive: boolean = false) => {
      // Ring dimensions with perspective
      const radiusX = canvas.width * 0.4; // horizontal radius (ellipse)
      const radiusY = canvas.width * 0.1; // vertical radius (ellipse - gives perspective)
      
      // Draw ring - back half (behind the object)
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + yOffset, radiusX, radiusY, 0, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = isActive ? color : `${color}55`; // Dimmed if not active
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.setLineDash([5, 5]); // Dashed line for back half
      ctx.stroke();
      
      // Draw ring - front half (in front of object) - filled with progress
      if (isActive) {
        // Draw progress arc for active ring
        ctx.beginPath();
        const startAngle = 0;
        const endAngle = (progress / 100) * Math.PI;
        ctx.ellipse(centerX, centerY + yOffset, radiusX, radiusY, 0, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.setLineDash([]); // Solid line
        ctx.stroke();
        
        // Draw current target position more prominently
        // Calculate angle in radians based on target angle (relative to 0-360 compass)
        const normalizedTargetAngle = ((targetAngle % 360) / 180) * Math.PI;
        const targetX = centerX + radiusX * Math.cos(normalizedTargetAngle);
        const targetY = (centerY + yOffset) + radiusY * Math.sin(normalizedTargetAngle);
        
        // Capture zone visualization - to show target position more clearly
        ctx.beginPath();
        ctx.arc(targetX, targetY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = isInPosition ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = isInPosition ? 'green' : 'yellow';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Capture target inner dot
        ctx.beginPath();
        ctx.arc(targetX, targetY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = isInPosition ? 'green' : 'yellow';
        ctx.fill();
        
        // Show tolerance zone
        ctx.beginPath();
        const toleranceRadians = (CONSTANTS.angleToleranceDegrees / 180) * Math.PI;
        ctx.arc(centerX, centerY + yOffset, radiusX, normalizedTargetAngle - toleranceRadians, normalizedTargetAngle + toleranceRadians);
        ctx.strokeStyle = isInPosition ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 15;
        ctx.stroke();
      }
      
      // Draw front half outline
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + yOffset, radiusX, radiusY, 0, 0, Math.PI);
      ctx.strokeStyle = isActive ? color : `${color}99`; // Less dimmed for front half
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.setLineDash([]); // Solid line for front half
      ctx.stroke();
      
      // Label the ring
      if (label) {
        ctx.font = isActive ? 'bold 16px Arial' : '14px Arial';
        ctx.fillStyle = isActive ? 'white' : '#cccccc';
        ctx.textAlign = 'center';
        // Position label to the left side of the ring
        ctx.fillText(label, centerX - radiusX - 10, centerY + yOffset + 5);
      }
    };
    
    // Draw object indicator in center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 165, 0, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
    
    // Draw simplified 3D object representation
    // Top of object
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 15, 12, 6, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 165, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'orange';
    ctx.stroke();
    
    // Side of object
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY - 15);
    ctx.lineTo(centerX - 12, centerY + 15);
    ctx.arcTo(centerX - 12, centerY + 21, centerX, centerY + 21, 6);
    ctx.arcTo(centerX + 12, centerY + 21, centerX + 12, centerY + 15, 6);
    ctx.lineTo(centerX + 12, centerY - 15);
    ctx.strokeStyle = 'orange';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
    ctx.fill();
    
    // Calculate vertical offsets for the two rings
    const topOffset = -canvas.height * 0.15;    // Top ring (high level)
    const bottomOffset = canvas.height * 0.15;  // Bottom ring (low level)
    
    // Only draw the current active level ring with progress
    if (currentLevel === 0) {
      drawRing(bottomOffset, CONSTANTS.idealPathParams[0].colorHex, levelProgress, 'LOW LEVEL', true);
      // Draw top ring dimmed as it's not active yet
      drawRing(topOffset, CONSTANTS.idealPathParams[1].colorHex, 0, 'TOP LEVEL', false);
    } else if (currentLevel === 1) {
      // Draw bottom ring as completed
      drawRing(bottomOffset, CONSTANTS.idealPathParams[0].colorHex, 100, 'LOW LEVEL', false);
      // Draw top ring active
      drawRing(topOffset, CONSTANTS.idealPathParams[1].colorHex, levelProgress, 'TOP LEVEL', true);
    }
    
    // Draw device orientation indicator (camera alignment)
    if (deviceOrientation.beta !== null) {
      const beta = deviceOrientation.beta;
      const idealBeta = CONSTANTS.idealPathParams[currentLevel].beta;
      const diffBeta = beta - idealBeta;
      
      // Create a vertical alignment indicator on the right side
      const indicatorX = canvas.width - 40;
      const indicatorCenterY = canvas.height / 2;
      const indicatorHeight = canvas.height * 0.5;
      
      // Draw scale background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(indicatorX - 10, indicatorCenterY - indicatorHeight/2, 20, indicatorHeight);
      
      // Draw center line (ideal position)
      ctx.beginPath();
      ctx.moveTo(indicatorX - 15, indicatorCenterY);
      ctx.lineTo(indicatorX + 15, indicatorCenterY);
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Calculate position on scale
      // Clamp diffBeta to range of indicator
      const clampedDiff = Math.max(Math.min(diffBeta, 30), -30);
      const normalizedPos = (clampedDiff / 60) * indicatorHeight;
      const markerY = indicatorCenterY + normalizedPos;
      
      // Draw position marker
      ctx.beginPath();
      ctx.moveTo(indicatorX - 12, markerY);
      ctx.lineTo(indicatorX + 12, markerY);
      ctx.strokeStyle = Math.abs(diffBeta) < 10 ? 'green' : 'red';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Draw triangles on ends
      ctx.beginPath();
      ctx.moveTo(indicatorX - 12, markerY);
      ctx.lineTo(indicatorX - 18, markerY - 6);
      ctx.lineTo(indicatorX - 18, markerY + 6);
      ctx.closePath();
      ctx.fillStyle = Math.abs(diffBeta) < 10 ? 'green' : 'red';
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(indicatorX + 12, markerY);
      ctx.lineTo(indicatorX + 18, markerY - 6);
      ctx.lineTo(indicatorX + 18, markerY + 6);
      ctx.closePath();
      ctx.fill();
      
      // Label at top and bottom
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('UP', indicatorX, indicatorCenterY - indicatorHeight/2 - 10);
      ctx.fillText('DOWN', indicatorX, indicatorCenterY + indicatorHeight/2 + 20);
    }
    
    // Draw compass indicator for horizontal rotation
    if (deviceOrientation.alpha !== null) {
      const alpha = deviceOrientation.alpha;
      
      // Create a horizontal compass strip at the bottom
      const stripY = canvas.height - 40;
      const stripWidth = canvas.width * 0.8;
      const stripLeft = (canvas.width - stripWidth) / 2;
      
      // Draw strip background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(stripLeft, stripY, stripWidth, 20);
      
      // Calculate normalized position (0-360 degrees maps to strip width)
      const normalizedAlpha = ((alpha / 360) * stripWidth);
      const normalizedTarget = ((targetAngle / 360) * stripWidth);
      
      // Draw target angle marker on strip
      ctx.fillStyle = isInPosition ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 255, 0, 0.7)';
      ctx.fillRect(stripLeft + normalizedTarget - (stripWidth * CONSTANTS.angleToleranceDegrees/360), stripY, 
                  stripWidth * (CONSTANTS.angleToleranceDegrees*2)/360, 20);
      
      // Draw markers every 45 degrees
      ctx.font = '10px Arial';
      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'center';
      for (let i = 0; i < 8; i++) {
        const markerPos = stripLeft + (i * (stripWidth / 8));
        ctx.fillRect(markerPos, stripY, 1, 5);
        ctx.fillText((i * 45) + '°', markerPos, stripY + 15);
      }
      
      // Draw current position marker
      const markerX = stripLeft + normalizedAlpha;
      ctx.beginPath();
      ctx.moveTo(markerX, stripY - 5);
      ctx.lineTo(markerX - 5, stripY - 10);
      ctx.lineTo(markerX + 5, stripY - 10);
      ctx.closePath();
      ctx.fillStyle = isInPosition ? 'green' : 'yellow';
      ctx.fill();
    }
    
    // Draw guidance message if any
    if (guidanceMessage) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(centerX - 150, canvas.height - 80, 300, 40);
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = isInPosition ? 'green' : 'white';
      ctx.textAlign = 'center';
      ctx.fillText(guidanceMessage, centerX, canvas.height - 50);
    }
    
    // Draw current level info and height guidance
    const heightText = `Hold camera at ${CONSTANTS.idealPathParams[currentLevel].height} position`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 150, 20, 300, 40);
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = CONSTANTS.idealPathParams[currentLevel].colorHex;
    ctx.textAlign = 'center';
    ctx.fillText(CONSTANTS.levelNames[currentLevel], centerX, 45);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(heightText, centerX, 65);
    
    // Draw position and photo count info
    const positionText = `Position ${currentPosition + 1}/${CONSTANTS.capturesPerLevel} (${photosAtPosition}/${CONSTANTS.photosPerPosition} photos)`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 150, 75, 300, 30);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(positionText, centerX, 95);
  };

  // Motion tracking for position detection and guidance
  useEffect(() => {
    if (!permissionGranted || !cameraReady) return;
    
    // Check if we're at the right height (tilt)
    if (deviceOrientation.alpha !== null && deviceOrientation.beta !== null && deviceOrientation.gamma !== null) {
      const idealBeta = CONSTANTS.idealPathParams[currentLevel].beta;
      const diffBeta = deviceOrientation.beta - idealBeta;
      const isGoodHeight = Math.abs(diffBeta) < 15;
      
      // Check if we're at the right rotation angle
      let diffAngle = Math.abs(deviceOrientation.alpha - targetAngle);
      if (diffAngle > 180) {
        diffAngle = 360 - diffAngle; // Handle wraparound
      }
      const isGoodAngle = diffAngle < CONSTANTS.angleToleranceDegrees;
      
      // Update in-position state
      const newIsInPosition = isGoodHeight && isGoodAngle;
      setIsInPosition(newIsInPosition);
      
      // Update guidance message
      if (!newIsInPosition && !captureInterval) {
        if (!isGoodHeight) {
          if (diffBeta > 15) {
            setGuidanceMessage("Tilt camera DOWN");
          } else if (diffBeta < -15) {
            setGuidanceMessage("Tilt camera UP");
          }
        } else if (!isGoodAngle) {
          // Guide user to turn the right way (shortest path)
          const turnDirection = ((targetAngle - deviceOrientation.alpha + 360) % 360 < 180) ? "RIGHT" : "LEFT";
          setGuidanceMessage(`Turn ${turnDirection} to position ${currentPosition + 1}`);
        }
      } else if (newIsInPosition && !captureInterval) {
        setGuidanceMessage("Good position! Tap START to capture");
      }
    }
    
    // Redraw 3D path guide
    draw3DPathGuide();
  }, [deviceOrientation, captureInterval, currentLevel, currentPosition, targetAngle, cameraReady, permissionGranted]);

  // Update progress whenever captured images change
  useEffect(() => {
    const currentLevelPhotos = currentLevel * CONSTANTS.capturesPerLevel * CONSTANTS.photosPerPosition;
    const currentPositionPhotos = currentPosition * CONSTANTS.photosPerPosition;
    const expectedPhotos = currentLevelPhotos + currentPositionPhotos + photosAtPosition;
    
    // Ensure our progress calculation is based on actual captured photos
    const totalProgress = (capturedImages.length / CONSTANTS.totalPhotos) * 100;
    setRotationProgress(Math.min(Math.round(totalProgress), 100));
    
    // Calculate level progress
    const photosPerLevel = CONSTANTS.capturesPerLevel * CONSTANTS.photosPerPosition;
    const levelPhotos = capturedImages.length - (currentLevel * photosPerLevel);
    const newLevelProgress = (levelPhotos / photosPerLevel) * 100;
    setLevelProgress(Math.min(Math.round(newLevelProgress), 100));
    
    // Check if our expected photo count matches actual
    if (capturedImages.length !== expectedPhotos) {
      console.warn(`Photo count mismatch: expected ${expectedPhotos}, actual ${capturedImages.length}`);
    }
  }, [capturedImages, currentLevel, currentPosition, photosAtPosition]);

  // Setup targetAngle when orientation is available
  useEffect(() => {
    if (cameraReady && permissionGranted && deviceOrientation.alpha !== null && !lastAngle.current) {
      // Use current device orientation as starting point
      setTargetAngle(deviceOrientation.alpha);
      setGuidanceMessage(`Turn to starting position and hold still`);
      lastAngle.current = deviceOrientation.alpha;
    }
  }, [deviceOrientation.alpha, cameraReady, permissionGranted]);

  // Clean up interval if component unmounts
  useEffect(() => {
    return () => {
      if (captureInterval) {
        clearInterval(captureInterval);
      }
    };
  }, [captureInterval]);

  return {
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
  };
};