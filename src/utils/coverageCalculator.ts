import { ImageData } from '../types';

/**
 * Calculate image coverage across different angles
 * @param capturedImages Array of captured image data
 * @param requiredAngles Target number of unique angles to capture
 * @returns Percentage of coverage (0-100)
 */
export const calculateCoverage = (capturedImages: ImageData[], requiredAngles: number = 150): number => {
  if (capturedImages.length === 0) return 0;
  
  // Create a set of angle keys to track unique angles captured
  const uniqueAngleKeys = new Set<string>();
  
  // Track orientation for each image
  capturedImages.forEach(image => {
    if (image.orientation) {
      const { alpha, beta, gamma } = image.orientation;
      
      // Round to nearest 15 degrees to create angle buckets
      const normalizedAlpha = Math.round(((alpha % 360) + 360) % 360 / 15) * 15;
      const normalizedBeta = Math.round(((beta % 360) + 360) % 360 / 15) * 15;
      const normalizedGamma = Math.round(((gamma % 360) + 360) % 360 / 15) * 15;
      
      const angleKey = `${normalizedAlpha}-${normalizedBeta}-${normalizedGamma}`;
      uniqueAngleKeys.add(angleKey);
    }
  });
  
  // Calculate coverage based on unique angles rather than raw image count
  const uniqueAnglesCount = uniqueAngleKeys.size;
  const estimatedTotalAngles = Math.min(24, requiredAngles / 5); // 24 primary angles provide good coverage
  
  const coverage = Math.min((uniqueAnglesCount / estimatedTotalAngles) * 100, 100);
  return Math.floor(coverage);
};