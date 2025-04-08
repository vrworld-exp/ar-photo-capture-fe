import { useEffect, useRef, useState } from 'react';

// Constants
const degreesToCapture = 8;
const totalRotation = 360; // One full turn per level
const capturesPerLevel = Math.floor(totalRotation / degreesToCapture); // ≈45 per level
const totalLevels = 3; // low, middle, and top levels
const totalPhotos = capturesPerLevel * totalLevels; // ≈135 total photos

// Level names for user guidance
const levelNames = ['LOW LEVEL', 'MIDDLE LEVEL', 'TOP LEVEL'];

const CaptureModel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastAngle = useRef<number | null>(null);
  
  // State variables
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [rotationProgress, setRotationProgress] = useState<number>(0);
  const [levelProgress, setLevelProgress] = useState<number>(0);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [autoCapturing, setAutoCapturing] = useState<boolean>(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [deviceOrientation, setDeviceOrientation] = useState<{alpha: number | null, beta: number | null, gamma: number | null}>({
    alpha: null, // compass direction (0-360)
    beta: null,  // front-to-back tilt (-180 to 180)
    gamma: null  // left-to-right tilt (-90 to 90)
  });
  const [guidanceMessage, setGuidanceMessage] = useState<string>('');
  const [userPosition, setUserPosition] = useState<{x: number, y: number} | null>(null);
  const [targetPosition, setTargetPosition] = useState<{x: number, y: number} | null>(null);
  console.log(deviceOrientation);
  
  // Ideal tilt parameters for each level
  const idealPathParams = [
    { beta: 70, gamma: 0, height: 'low' },      // LOW LEVEL (looking down at object)
    { beta: 45, gamma: 0, height: 'medium' },   // MIDDLE LEVEL (looking straight at object)
    { beta: 20, gamma: 0, height: 'high' }      // TOP LEVEL (looking slightly up at object)
  ];

  // Request motion access
  const requestMotionAccess = async (): Promise<void> => {
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
          setupCamera();
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
      setupCamera();
    }
  };
  
  // Camera setup
  const setupCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          initializePathCanvas();
        };
      }
    } catch (error) {
      console.error('Camera access denied or not available', error);
      alert('Camera access is required for this app to work. Please allow camera access and try again.');
    }
  };
  
  // Initialize the path canvas
  const initializePathCanvas = (): void => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions to match video
    if (videoRef.current) {
      canvas.width = videoRef.current.offsetWidth;
      canvas.height = videoRef.current.offsetHeight;
    }
    
    // Initialize user position at the bottom of the circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7; // 70% of the smaller dimension
    
    setUserPosition({
      x: centerX,
      y: centerY + radius
    });
    
    // Calculate first target position
    updateTargetPosition(0);
    
    // Initial draw of the path guide
    drawPathGuide();
  };
  
  // Update target position based on progress
  const updateTargetPosition = (progress: number): void => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    
    // Convert progress to angle (0-100% maps to 0-360 degrees)
    // Start from bottom (270 degrees) and move counter-clockwise
    const angle = ((progress / 100) * 2 * Math.PI) + (1.5 * Math.PI);
    
    // Calculate position on the circle
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    setTargetPosition({ x, y });
  };
  
  // Draw the circular path guide with level indicator
  const drawPathGuide = (): void => {
    const canvas = pathCanvasRef.current;
    if (!canvas || !userPosition || !targetPosition) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7; // 70% of the smaller dimension
    
    // Draw object indicator in center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw text "OBJECT" in center
    ctx.font = '12px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('OBJECT', centerX, centerY + 5);
    
    // Draw circular path
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 5]); // Dashed line
    ctx.stroke();
    
    // Calculate progress along the circle for current level
    const startAngle = 1.5 * Math.PI; // Start from bottom
    const progressAngle = startAngle + (levelProgress / 100) * (2 * Math.PI);
    
    // Draw progress arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressAngle, false);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.setLineDash([]); // Solid line
    ctx.stroke();
    
    // Draw target position indicator
    ctx.beginPath();
    ctx.arc(targetPosition.x, targetPosition.y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw "TARGET" text above target
    ctx.font = '12px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('TARGET', targetPosition.x, targetPosition.y - 15);
    
    // Draw user position indicator
    ctx.beginPath();
    ctx.arc(userPosition.x, userPosition.y, 15, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 128, 255, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw user icon
    ctx.fillStyle = 'white';
    // Draw stick figure head
    ctx.beginPath();
    ctx.arc(userPosition.x, userPosition.y - 5, 5, 0, 2 * Math.PI);
    ctx.fill();
    // Draw stick figure body
    ctx.fillRect(userPosition.x - 1, userPosition.y - 2, 2, 10);
    // Draw stick figure arms
    ctx.fillRect(userPosition.x - 5, userPosition.y, 10, 2);
    // Draw stick figure legs
    ctx.beginPath();
    ctx.moveTo(userPosition.x, userPosition.y + 8);
    ctx.lineTo(userPosition.x - 4, userPosition.y + 14);
    ctx.lineTo(userPosition.x + 4, userPosition.y + 14);
    ctx.closePath();
    ctx.fill();
    
    // Draw arrow from user to target if they're not close
    const dx = targetPosition.x - userPosition.x;
    const dy = targetPosition.y - userPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 20) {
      // Calculate direction
      const angle = Math.atan2(dy, dx);
      
      // Starting point just outside user icon
      const startX = userPosition.x + 20 * Math.cos(angle);
      const startY = userPosition.y + 20 * Math.sin(angle);
      
      // Endpoint just before target
      const endX = targetPosition.x - 15 * Math.cos(angle);
      const endY = targetPosition.y - 15 * Math.sin(angle);
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw arrowhead
      const arrowSize = 10;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI/6),
        endY - arrowSize * Math.sin(angle - Math.PI/6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI/6),
        endY - arrowSize * Math.sin(angle + Math.PI/6)
      );
      ctx.closePath();
      ctx.fillStyle = 'yellow';
      ctx.fill();
    }
    
    // Draw level indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 100, 20, 200, 40);
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(levelNames[currentLevel], centerX, 48);
    
    // Draw height indicator
    const heightText = `Hold camera at ${idealPathParams[currentLevel].height} position`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 150, 70, 300, 30);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(heightText, centerX, 90);
    
    // Draw guidance message if any
    if (guidanceMessage) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(centerX - 150, canvas.height - 60, 300, 40);
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(guidanceMessage, centerX, canvas.height - 30);
    }
  };
  
  // Move user position based on device orientation changes
  const updateUserPosition = (alpha: number | null): void => {
    if (alpha === null || !pathCanvasRef.current) return;
    
    const canvas = pathCanvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    
    // Convert alpha to radians and adjust start point
    // Alpha is 0-360, where 0/360 is North
    // We need to convert this to the canvas coordinate system
    const angleRad = ((360 - alpha) * Math.PI / 180) + (Math.PI / 2);
    
    // Calculate new position on the circle
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    
    setUserPosition({ x, y });
  };
  
  // Motion tracking for auto-capture and path guidance
  useEffect(() => {
    if (!permissionGranted || !cameraReady) return;
    
    const handleOrientation = (e: DeviceOrientationEvent): void => {
      const alpha = e.alpha; // Compass-like heading (0-360)
      const beta = e.beta;   // Front-to-back tilt (-180 to 180)
      const gamma = e.gamma; // Left-to-right tilt (-90 to 90)
      
      // Update orientation state
      setDeviceOrientation({alpha, beta, gamma});
      
      // Update user's position on path based on compass heading
      updateUserPosition(alpha);
      
      // Check if we need to provide guidance on camera angle
      if (beta !== null && gamma !== null) {
        const idealBeta = idealPathParams[currentLevel].beta;
        const idealGamma = idealPathParams[currentLevel].gamma;
        
        let guidance = '';
        
        // Calculate deviations
        const betaDiff = beta - idealBeta;
        const gammaDiff = gamma - idealGamma;
        
        // Provide guidance based on deviations
        if (Math.abs(betaDiff) > 10 || Math.abs(gammaDiff) > 10) {
          if (betaDiff > 10) guidance += "TILT DOWN ";
          else if (betaDiff < -10) guidance += "TILT UP ";
          
          if (gammaDiff > 10) guidance += "TILT LEFT ";
          else if (gammaDiff < -10) guidance += "TILT RIGHT";
          
          setGuidanceMessage(guidance.trim());
        } else {
          // Check if we're in position for auto-capture
          if (userPosition && targetPosition) {
            const dx = targetPosition.x - userPosition.x;
            const dy = targetPosition.y - userPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) {
              setGuidanceMessage("Perfect position! Taking photo...");
              
              // Only auto-capture if we're in the right position and tilting correctly
              if (autoCapturing && capturedImages.length < totalPhotos) {
                // Check if we've moved enough since last capture
                if (lastAngle.current === null) {
                  lastAngle.current = alpha;
                  capturePhoto();
                } else {
                  // Calculate the angular difference
                  let delta = Math.abs(alpha! - lastAngle.current);
                  if (delta > 180) {
                    delta = 360 - delta;
                  }
                  
                  if (delta >= degreesToCapture) {
                    capturePhoto();
                    lastAngle.current = alpha;
                    
                    // Update target position for next capture
                    updateTargetPosition(levelProgress + (100 / capturesPerLevel));
                  }
                }
              }
            } else {
              // Guide user to the target position
              setGuidanceMessage("Move to the green target position");
            }
          }
        }
      }
      
      // Redraw path guide
      drawPathGuide();
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [capturedImages, autoCapturing, permissionGranted, cameraReady, currentLevel, userPosition, targetPosition, levelProgress]);
  
  // Update progress whenever captured images change
  useEffect(() => {
    const totalProgress = (capturedImages.length / totalPhotos) * 100;
    setRotationProgress(Math.min(Math.round(totalProgress), 100));
    
    // Calculate current level and level progress
    const newCurrentLevel = Math.min(Math.floor(capturedImages.length / capturesPerLevel), totalLevels - 1);
    if (newCurrentLevel !== currentLevel) {
      setCurrentLevel(newCurrentLevel);
      // Reset last angle when changing levels
      lastAngle.current = null;
      
      // Reset target position for new level
      updateTargetPosition(0);
      
      // Show level transition message
      setGuidanceMessage(`Great! Now move to ${levelNames[newCurrentLevel]} position`);
      setTimeout(() => setGuidanceMessage('Move to the green target position'), 3000);
    }
    
    const levelCaptureCount = capturedImages.length - (newCurrentLevel * capturesPerLevel);
    const newLevelProgress = (levelCaptureCount / capturesPerLevel) * 100;
    setLevelProgress(Math.min(Math.round(newLevelProgress), 100));
    
    // Update target position based on level progress
    updateTargetPosition(newLevelProgress);
  }, [capturedImages, currentLevel]);
  
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
    
    console.log(`Photo captured! (${capturedImages.length + 1}/${totalPhotos}) - Level: ${currentLevel + 1}/3`);
  };
  
  const handleManualCapture = (): void => {
    if (capturedImages.length < totalPhotos) {
      capturePhoto();
      
      // Update target position for next photo
      const nextProgress = levelProgress + (100 / capturesPerLevel);
      updateTargetPosition(nextProgress);
    }
  };
  
  const toggleAutoCapture = (): void => {
    setAutoCapturing(!autoCapturing);
  };
  
  // Function to download a single image
  const downloadSingleImage = (dataUrl: string, index: number, level: number): void => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `object-scan-level${level+1}-${index.toString().padStart(3, '0')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Function to download all images
  const downloadAllImages = async (): Promise<void> => {
    setIsDownloading(true);
    
    try {
      // We'll download images one by one with short delays to not overwhelm the browser
      for (let i = 0; i < capturedImages.length; i++) {
        // Calculate which level this image belongs to
        const imageLevel = Math.floor(i / capturesPerLevel);
        // Calculate index within the level
        const levelIndex = i % capturesPerLevel;
        
        downloadSingleImage(capturedImages[i], levelIndex + 1, imageLevel);
        // Add a small delay between downloads
        if (i < capturedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      alert(`Successfully prepared ${capturedImages.length} images for download. Check your downloads folder.`);
    } catch (error) {
      console.error('Error downloading images:', error);
      alert('There was an error downloading the images.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
      {!permissionGranted ? (
        <div className="text-center">
          <h2 className="text-xl mb-4">3D Object Scanner</h2>
          <p className="mb-4">This app will help you capture photos from all angles to create a 3D model.</p>
          <p className="mb-4 text-yellow-300">
            Place your object on a stool or table in the center of an open area.
            You'll need to physically walk around the object 3 times at different height levels.
          </p>
          <button
            onClick={requestMotionAccess}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Start Capture
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <canvas 
            ref={pathCanvasRef} 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          
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
                {Math.min(capturedImages.length - (currentLevel * capturesPerLevel), capturesPerLevel)}/{capturesPerLevel}
              </span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${levelProgress}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-400 mt-2">
              {autoCapturing 
                ? "Walk around the object following the guide path. Photos capture automatically." 
                : "Walk around the object and tap capture at each target position."}
            </p>
          </div>
          
          <div className="flex space-x-4 mt-6">
            <button 
              onClick={toggleAutoCapture}
              className={`px-4 py-2 rounded-lg ${
                autoCapturing ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              Auto: {autoCapturing ? 'ON' : 'OFF'}
            </button>
            
            {!autoCapturing && (
              <button 
                onClick={handleManualCapture}
                className="bg-blue-500 px-4 py-2 rounded-lg"
                disabled={capturedImages.length >= totalPhotos}
              >
                Capture
              </button>
            )}
            
            {capturedImages.length > 0 && (
              <button 
                onClick={() => {
                  const imageLevel = Math.floor((capturedImages.length - 1) / capturesPerLevel);
                  const levelIndex = (capturedImages.length - 1) % capturesPerLevel;
                  downloadSingleImage(capturedImages[capturedImages.length - 1], levelIndex + 1, imageLevel);
                }}
                className="bg-purple-500 px-4 py-2 rounded-lg"
              >
                Save Last
              </button>
            )}
          </div>
          
          {capturedImages.length >= totalPhotos && (
            <div className="mt-6 text-green-400 font-bold text-center">
              ✅ Capture Complete! All {capturedImages.length} photos taken across 3 levels.
              <button 
                className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg block w-full"
                onClick={downloadAllImages}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download All Images'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CaptureModel;