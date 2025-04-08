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
  
  // Ideal tilt parameters for each level
  const idealPathParams = [
    { beta: 70, height: 'low', colorHex: '#FF5733' },      // LOW LEVEL (looking down at object)
    { beta: 45, height: 'medium', colorHex: '#33A1FF' },   // MIDDLE LEVEL (looking straight at object)
    { beta: 20, height: 'high', colorHex: '#33FF57' }      // TOP LEVEL (looking slightly up at object)
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
    
    // Initial draw of the 3D path guide
    draw3DPathGuide();
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
        
        // Draw current target position
        const targetAngle = (progress / 100) * Math.PI;
        const targetX = centerX + radiusX * Math.cos(targetAngle);
        const targetY = (centerY + yOffset) + radiusY * Math.sin(targetAngle);
        
        // Capture zone visualization
        ctx.beginPath();
        ctx.arc(targetX, targetY, 15, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Capture target inner dot
        ctx.beginPath();
        ctx.arc(targetX, targetY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'yellow';
        ctx.fill();
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
    
    // Calculate vertical offsets for the three rings
    const topOffset = -canvas.height * 0.15;    // Top ring (high level)
    const middleOffset = 0;                     // Middle ring
    const bottomOffset = canvas.height * 0.15;  // Bottom ring (low level)
    
    // Draw all three rings with appropriate colors and active states
    drawRing(bottomOffset, idealPathParams[0].colorHex, 
             currentLevel === 0 ? levelProgress : (currentLevel > 0 ? 100 : 0), 
             'LOW LEVEL', currentLevel === 0);
             
    drawRing(middleOffset, idealPathParams[1].colorHex, 
             currentLevel === 1 ? levelProgress : (currentLevel > 1 ? 100 : 0), 
             'MIDDLE LEVEL', currentLevel === 1);
             
    drawRing(topOffset, idealPathParams[2].colorHex, 
             currentLevel === 2 ? levelProgress : 0, 
             'TOP LEVEL', currentLevel === 2);
    
    // Draw device orientation indicator (camera alignment)
    if (deviceOrientation.beta !== null) {
      const beta = deviceOrientation.beta;
      const idealBeta = idealPathParams[currentLevel].beta;
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
      ctx.fillStyle = 'yellow';
      ctx.fill();
    }
    
    // Draw guidance message if any
    if (guidanceMessage) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(centerX - 150, canvas.height - 80, 300, 40);
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(guidanceMessage, centerX, canvas.height - 50);
    }
    
    // Draw current level info and height guidance
    const heightText = `Hold camera at ${idealPathParams[currentLevel].height} position`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 150, 20, 300, 40);
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = idealPathParams[currentLevel].colorHex;
    ctx.textAlign = 'center';
    ctx.fillText(levelNames[currentLevel], centerX, 45);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(heightText, centerX, 65);
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
      
      // Check if we need to provide guidance on camera angle
      if (alpha !== null && beta !== null && gamma !== null) {
        const idealBeta = idealPathParams[currentLevel].beta;
        const diffBeta = beta - idealBeta;
        
        // Calculate if we're in the right position to capture
        const isGoodAngle = Math.abs(diffBeta) < 15;
        
        // For auto-capture, we check if we've moved enough degrees since last capture
        if (isGoodAngle && autoCapturing && capturedImages.length < totalPhotos) {
          if (lastAngle.current === null) {
            lastAngle.current = alpha;
            capturePhoto();
            setGuidanceMessage("Good angle! Photo captured.");
          } else {
            // Calculate the angular difference
            let delta = Math.abs(alpha - lastAngle.current);
            if (delta > 180) {
              delta = 360 - delta;
            }
            
            if (delta >= degreesToCapture) {
              capturePhoto();
              lastAngle.current = alpha;
              setGuidanceMessage("Good angle! Photo captured.");
            }
          }
        } else if (!isGoodAngle) {
          // Provide tilt guidance
          if (diffBeta > 15) {
            setGuidanceMessage("Tilt camera DOWN");
          } else if (diffBeta < -15) {
            setGuidanceMessage("Tilt camera UP");
          }
        }
      }
      
      // Redraw 3D path guide
      draw3DPathGuide();
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [capturedImages, autoCapturing, permissionGranted, cameraReady, currentLevel]);
  
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
      
      // Show level transition message
      setGuidanceMessage(`Great! Now move to ${levelNames[newCurrentLevel]} position`);
      setTimeout(() => setGuidanceMessage(''), 3000);
    }
    
    const levelCaptureCount = capturedImages.length - (newCurrentLevel * capturesPerLevel);
    const newLevelProgress = (levelCaptureCount / capturesPerLevel) * 100;
    setLevelProgress(Math.min(Math.round(newLevelProgress), 100));
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
          <h2 className="text-2xl mb-4">3D Object Scanner</h2>
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
                ? "Walk around the object following the 3D guide. Photos capture automatically." 
                : "Walk around the object and tap capture button as you move around."}
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