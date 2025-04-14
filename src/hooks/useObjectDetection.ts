import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';

interface ObjectPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  score: number;
}

interface UseObjectDetectionResult {
  objectDetected: boolean;
  objectPosition: ObjectPosition | null;
  isModelLoaded: boolean;
}

const useObjectDetection = (videoRef: React.RefObject<HTMLVideoElement | null>): UseObjectDetectionResult => {
  const [objectDetected, setObjectDetected] = useState<boolean>(false);
  const [objectPosition, setObjectPosition] = useState<ObjectPosition | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const modelRef = useRef<cocossd.ObjectDetection | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  
  // Load COCO-SSD model on component mount
  useEffect(() => {
    const loadModel = async (): Promise<void> => {
      try {
        await tf.ready();
        console.log('TensorFlow.js loaded');
        
        const model = await cocossd.load({
          base: 'mobilenet_v2' // Use MobileNet for better performance on mobile devices
        });
        
        modelRef.current = model;
        setIsModelLoaded(true);
        console.log('COCO-SSD model loaded');
      } catch (error) {
        console.error('Failed to load TensorFlow.js model:', error);
      }
    };
    
    loadModel();
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);
  
  // Run object detection when model is loaded and video is playing
  useEffect(() => {
    if (!isModelLoaded || !videoRef.current) return;
    
    const detectObjects = async (): Promise<void> => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !modelRef.current) return;
      
      try {
        // Predict objects in the video stream
        const predictions = await modelRef.current.detect(videoRef.current);
        
        // Filter predictions for common objects we might want to capture
        // Like cups, bottles, toys, electronics, etc.
        const validObjects: string[] = ['cup', 'bottle', 'cell phone', 'laptop', 'mouse', 'keyboard', 
                            'book', 'vase', 'bowl', 'sports ball', 'clock', 'chair', 'backpack',
                            'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'sports ball',
                            'teddy bear', 'remote'];
        
        // Find the most centered valid object with highest confidence
        let bestObject: cocossd.DetectedObject | undefined;
        let highestScore = 0;
        const centerX = videoRef.current.videoWidth / 2;
        const centerY = videoRef.current.videoHeight / 2;
        
        predictions.forEach(prediction => {
          // Check if it's a valid object to capture
          if (validObjects.includes(prediction.class) || prediction.score > 0.7) {
            // Calculate how centered the object is
            const objCenterX = prediction.bbox[0] + prediction.bbox[2] / 2;
            const objCenterY = prediction.bbox[1] + prediction.bbox[3] / 2;
            const distanceFromCenter = Math.sqrt(
              Math.pow(centerX - objCenterX, 2) + 
              Math.pow(centerY - objCenterY, 2)
            );
            
            // Prioritize centered objects with high confidence
            const combinedScore = prediction.score * (1 - distanceFromCenter / 1000);
            
            if (combinedScore > highestScore) {
              highestScore = combinedScore;
              bestObject = prediction;
            }
          }
        });
        
        if (bestObject && bestObject.score > 0.6) {
          setObjectDetected(true);
          setObjectPosition({
            x: bestObject.bbox[0],
            y: bestObject.bbox[1],
            width: bestObject.bbox[2],
            height: bestObject.bbox[3],
            class: bestObject.class,
            score: bestObject.score
          });
        } else {
          setObjectDetected(false);
          setObjectPosition(null);
        }
      } catch (error) {
        console.error('Object detection error:', error);
      }
    };
    
    // Run detection at a reasonable interval to avoid freezing the app
    detectionIntervalRef.current = window.setInterval(detectObjects, 200);
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isModelLoaded, videoRef]);
  
  return { objectDetected, objectPosition, isModelLoaded };
};

export default useObjectDetection;