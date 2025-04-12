// hooks/useDeviceOrientation.ts
import { useState, useEffect } from 'react';

export const useDeviceOrientation = (permissionGranted: boolean, cameraReady: boolean) => {
  const [deviceOrientation, setDeviceOrientation] = useState<{
    alpha: number | null; 
    beta: number | null; 
    gamma: number | null;
  }>({
    alpha: null, // compass direction (0-360)
    beta: null,  // front-to-back tilt (-180 to 180)
    gamma: null  // left-to-right tilt (-90 to 90)
  });

  useEffect(() => {
    if (!permissionGranted || !cameraReady) return;
    
    const handleOrientation = (e: DeviceOrientationEvent): void => {
      const alpha = e.alpha; // Compass-like heading (0-360)
      const beta = e.beta;   // Front-to-back tilt (-180 to 180)
      const gamma = e.gamma; // Left-to-right tilt (-90 to 90)
      
      // Update orientation state
      setDeviceOrientation({alpha, beta, gamma});
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, cameraReady]);

  return deviceOrientation;
};