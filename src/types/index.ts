// Define shared types for use across the application

export interface ImageData {
    dataUrl: string;
    timestamp: number;
    orientation?: {
      alpha: number;
      beta: number;
      gamma: number;
    };
    objectClass?: string;
  }
  
  export interface Feedback {
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }
  
  export interface CoverageStatus {
    coveredPercentage: number;
    requiredImages: number;
    capturedCount: number;
  }
  
  export interface ObjectPosition {
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
    score: number;
  }
  
  export interface CaptureStats {
    angles: {
      top: number;
      side?: number;
      bottom: number;
      front: number;
      back: number;
      left?: number;
      right?: number;
    };
    detectedClasses: Record<string, number>;
  }