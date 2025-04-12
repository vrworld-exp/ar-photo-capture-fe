// hooks/useCaptureCanvas.ts
import { useRef } from 'react';

export const useCaptureCanvas = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const setupCamera = async (setCameraReady: React.Dispatch<React.SetStateAction<boolean>>): Promise<void> => {
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
  
  const initializePathCanvas = (): void => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions to match video
    if (videoRef.current) {
      canvas.width = videoRef.current.offsetWidth;
      canvas.height = videoRef.current.offsetHeight;
    }
  };

  return {
    videoRef,
    canvasRef,
    pathCanvasRef,
    setupCamera
  };
};