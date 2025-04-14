import { useCallback, useState} from 'react';

interface UseImageCaptureResult {
  captureImage: () => string | null;
  processForBlur: () => Promise<number>;
  lastCapturedImage: string | null;
}

export const useImageCapture = (
    videoRef: React.RefObject<HTMLVideoElement | null>, 
    canvasRef: React.RefObject<HTMLCanvasElement | null>
): UseImageCaptureResult => {
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get the image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setLastCapturedImage(dataUrl);
    
    return dataUrl;
  }, [videoRef, canvasRef]);

  const processForBlur = useCallback(async (): Promise<number> => {
    if (!videoRef.current || !canvasRef.current) return 1; // Default to non-blurry
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return 1;
    
    // Set canvas dimensions - using a smaller size for faster processing
    const scaleFactor = 0.25; // Process at 25% resolution for speed
    canvas.width = video.videoWidth * scaleFactor;
    canvas.height = video.videoHeight * scaleFactor;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Calculate blur score using Laplacian variance
    // Higher variance = more in focus (sharp edges)
    // Lower variance = more blurry (soft edges)
    try {
      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale
      const gray = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        gray[j] = (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      
      // Simple Laplacian filter
      // [ 0,  1, 0]
      // [ 1, -4, 1]
      // [ 0,  1, 0]
      const width = canvas.width;
      const height = canvas.height;
      let sum = 0;
      let sumSquared = 0;
      let count = 0;
      
      // Apply Laplacian filter and calculate variance
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const pixel = 
            gray[y * width + x - 1] + 
            gray[(y - 1) * width + x] + 
            gray[(y + 1) * width + x] + 
            gray[y * width + x + 1] - 
            4 * gray[y * width + x];
          
          sum += pixel;
          sumSquared += pixel * pixel;
          count++;
        }
      }
      
      // Calculate variance
      const mean = sum / count;
      const variance = Math.sqrt(sumSquared / count - mean * mean);
      
      // Normalize to a 0-1 score (higher is better)
      // Based on typical variance values from testing
      const normalizedScore = Math.min(variance / 20, 1);
      return normalizedScore;
    } catch (error) {
      console.error('Error processing image for blur:', error);
      return 1; // Default to non-blurry on error
    }
  }, [videoRef, canvasRef]);

  return {
    captureImage,
    processForBlur,
    lastCapturedImage
  };
};