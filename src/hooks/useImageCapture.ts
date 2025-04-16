import { useCallback } from 'react';

interface UseImageCaptureResult {
  captureImage: () => string | null;
  processForBlur: () => Promise<number>;
  checkImageQuality: () => Promise<{
    isBlurry: boolean;
    brightness: number;
    contrast: number;
    qualityScore: number;
  }>;
}

export const useImageCapture = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): UseImageCaptureResult => {
  // Capture image from video stream
  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL (JPEG format with high quality)
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [videoRef, canvasRef]);
  
  // Process image to calculate blur score
  // Returns a value between 0 (very blurry) and 1 (very sharp)
  const processForBlur = useCallback(async (): Promise<number> => {
    if (!canvasRef.current) return 0;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale for simpler processing
    const grayscale = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < data.length; i += 4) {
      // Standard grayscale conversion
      grayscale[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    
    // Laplacian filter for edge detection
    // High variance in Laplacian suggests sharp image, low variance suggests blurry
    const width = canvas.width;
    const height = canvas.height;
    // let laplacianVariance = 0;
    let sum = 0;
    
    // Apply a simple 3x3 Laplacian filter
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        // 8-neighbor Laplacian filter
        const laplacian = 
          grayscale[idx - width - 1] + grayscale[idx - width] + grayscale[idx - width + 1] +
          grayscale[idx - 1] + (-8 * grayscale[idx]) + grayscale[idx + 1] +
          grayscale[idx + width - 1] + grayscale[idx + width] + grayscale[idx + width + 1];
        
        sum += Math.abs(laplacian);
      }
    }
    
    // Average Laplacian value
    const avgLaplacian = sum / ((width - 2) * (height - 2));
    
    // Normalize to 0-1 range (empirically determined thresholds)
    let blurScore = avgLaplacian / 30;
    blurScore = Math.min(Math.max(blurScore, 0), 1); // Clamp to 0-1
    
    return blurScore;
  }, [canvasRef]);
  
  // Comprehensive image quality check including brightness, contrast, etc.
  const checkImageQuality = useCallback(async (): Promise<{
    isBlurry: boolean;
    brightness: number;
    contrast: number;
    qualityScore: number;
  }> => {
    if (!canvasRef.current) {
      return {
        isBlurry: true,
        brightness: 0,
        contrast: 0,
        qualityScore: 0
      };
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        isBlurry: true,
        brightness: 0,
        contrast: 0,
        qualityScore: 0
      };
    }
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check blur
    const blurScore = await processForBlur();
    const isBlurry = blurScore < 0.5;
    
    // Calculate brightness and contrast
    let brightnessSum = 0;
    let values = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Perceived brightness formula
      const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      brightnessSum += brightness;
      values[brightness]++;
    }
    
    // Average brightness (0-255)
    const avgBrightness = brightnessSum / (data.length / 4);
    
    // Normalize to 0-1 range
    const normalizedBrightness = avgBrightness / 255;
    
    // Calculate contrast using histogram
    const pixelCount = canvas.width * canvas.height;
    let minValue = 0;
    while (minValue < 256 && values[minValue] < pixelCount * 0.01) minValue++;
    
    let maxValue = 255;
    while (maxValue > 0 && values[maxValue] < pixelCount * 0.01) maxValue--;
    
    // Contrast ratio
    const contrast = maxValue > minValue ? (maxValue - minValue) / 255 : 0;
    
    // Overall quality score combining factors
    // Weighted average of blur score, brightness optimality, and contrast
    const brightnessOptimality = 1 - Math.abs(normalizedBrightness - 0.5) * 2; // 0.5 is ideal brightness
    const contrastWeight = contrast > 0.3 ? 1 : contrast / 0.3;
    
    const qualityScore = (
      blurScore * 0.6 + 
      brightnessOptimality * 0.2 + 
      contrastWeight * 0.2
    );
    
    return {
      isBlurry,
      brightness: normalizedBrightness,
      contrast,
      qualityScore
    };
  }, [canvasRef, processForBlur]);
  
  return {
    captureImage,
    processForBlur,
    checkImageQuality
  };
};