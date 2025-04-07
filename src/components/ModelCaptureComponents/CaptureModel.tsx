import { useEffect, useRef, useState } from 'react';

// Constants
const degreesToCapture = 8;
const totalRotation = 1080; // 3 full turns
const totalPhotos = Math.floor(totalRotation / degreesToCapture); // ≈135

const CaptureModel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastAngle = useRef<number | null>(null);
  //const zipRef = useRef<any>(null);

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [rotationProgress, setRotationProgress] = useState<number>(0);
  const [autoCapturing, setAutoCapturing] = useState<boolean>(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

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
        };
      }
    } catch (error) {
      console.error('Camera access denied or not available', error);
      alert('Camera access is required for this app to work. Please allow camera access and try again.');
    }
  };
  
  // Motion tracking for auto-capture
  useEffect(() => {
    if (!permissionGranted || !cameraReady) return;
    
    const handleOrientation = (e: DeviceOrientationEvent): void => {
      const angle = e.alpha; // Compass-like heading

      if (angle !== null && autoCapturing && capturedImages.length < totalPhotos) {
        if (lastAngle.current === null) {
          lastAngle.current = angle;
          return;
        }

        // Calculate the smallest angular difference (handling the 0/360 boundary)
        let delta = Math.abs(angle - lastAngle.current);
        if (delta > 180) {
          delta = 360 - delta;
        }

        if (delta >= degreesToCapture) {
          capturePhoto();
          lastAngle.current = angle;
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [capturedImages, autoCapturing, permissionGranted, cameraReady]);

  // Update progress whenever captured images change
  useEffect(() => {
    const progress = (capturedImages.length / totalPhotos) * 100;
    setRotationProgress(Math.min(Math.round(progress), 100));
  }, [capturedImages]);

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
    
    console.log(`Photo captured! (${capturedImages.length + 1}/${totalPhotos})`);
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
  const downloadSingleImage = (dataUrl: string, index: number): void => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `object-scan-${index.toString().padStart(3, '0')}.jpg`;
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
        downloadSingleImage(capturedImages[i], i + 1);
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

  // Function to capture a screenshot and offer to save it
  // const saveCurrentImage = (): void => {
  //   capturePhoto();
  //   const lastImage = capturedImages[capturedImages.length - 1];
  //   if (lastImage) {
  //     downloadSingleImage(lastImage, capturedImages.length);
  //   }
  // };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
      {!permissionGranted ? (
        <div className="text-center">
          <h2 className="text-xl mb-4">3D Object Scanner</h2>
          <p className="mb-4">This app will help you capture photos from all angles to create a 3D model.</p>
          <button
            onClick={requestMotionAccess}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Start Capture
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md rounded-xl"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div className="mt-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-medium">Progress: {rotationProgress}%</span>
              <span className="text-sm">{capturedImages.length}/{totalPhotos} photos</span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${rotationProgress}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-400 mt-2">
              {autoCapturing 
                ? "Rotate slowly around the object. Photos will capture automatically." 
                : "Tap the capture button as you move around the object."}
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
                onClick={() => downloadSingleImage(capturedImages[capturedImages.length - 1], capturedImages.length)}
                className="bg-purple-500 px-4 py-2 rounded-lg"
              >
                Save Last
              </button>
            )}
          </div>
          
          {capturedImages.length >= totalPhotos && (
            <div className="mt-6 text-green-400 font-bold text-center">
              ✅ Capture Complete! All {capturedImages.length} photos taken.
              <button 
                className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg block w-full"
                onClick={downloadAllImages}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download All Images'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CaptureModel;