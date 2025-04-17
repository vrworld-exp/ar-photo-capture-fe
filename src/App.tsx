import { useState, useEffect } from 'react';
import Camera from './components/Camera';
// import ProgressTracker from './components/ProgressTracker';
// import FeedbackMessage from './components/FeedbackMessage';
import ImageGallery from './components/ImageGallery';
// import CaptureStats from './components/CaptureStats';
import { ImageData, Feedback, CoverageStatus, CaptureStats as CaptureStatsType } from './types';

function App() {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedImages, setCapturedImages] = useState<ImageData[]>([]);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus>({
    coveredPercentage: 0,
    requiredImages: 150,
    capturedCount: 0
  });
  const [feedback, setFeedback] = useState<Feedback>({
    message: "Press Start to begin capturing",
    type: "info" 
  });
  // const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [captureStats, setCaptureStats] = useState<CaptureStatsType>({
    angles: {
      top: 0,
      side: 0,
      bottom: 0,
      front: 0,
      back: 0,
      right: 0,
      left: 0
    },
    detectedClasses: {}
  });
  console.log(feedback, captureStats);
  
  // Update coverage whenever new images are added
  useEffect(() => {
    const newCount = capturedImages.length;
    const percentage = Math.min(Math.floor((newCount / coverageStatus.requiredImages) * 100), 100);
    
    setCoverageStatus(prev => ({
      ...prev,
      capturedCount: newCount,
      coveredPercentage: percentage
    }));
    
    // Update capture statistics
    updateCaptureStats();
  }, [capturedImages, coverageStatus.requiredImages]);

  // Add an effect to handle fullscreen mode
  useEffect(() => {
    // Apply body style when capturing to prevent scrolling
    if (isCapturing) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isCapturing]);

  const updateCaptureStats = (): void => {
    // Count detected object classes
    const classCount: Record<string, number> = {};
    capturedImages.forEach(img => {
      const objectClass = img.objectClass || 'unknown';
      classCount[objectClass] = (classCount[objectClass] || 0) + 1;
    });
    
    // Categorize angles based on device orientation
    const angles = {
      top: 0,
      side: 0,
      bottom: 0,
      front: 0,
      back: 0,
      right: 0,
      left: 0
    };
    
    capturedImages.forEach(img => {
      if (img.orientation) {
        const { beta, gamma } = img.orientation;
        
        // Categorize based on device tilt
        if (beta < -30) {
          angles.top++;
        } else if (beta > 60) {
          angles.bottom++;
        } else if (gamma > 30) {
          angles.right++;
        } else if (gamma < -30) {
          angles.left++;
        } else {
          angles.front++;
        }
      }
    });
    
    setCaptureStats({
      angles,
      detectedClasses: classCount
    });
  };

  const startCapture = (): void => {
    setIsCapturing(true);
    setFeedback({
      message: "Loading camera...",
      type: "info"
    });
  };

  const stopCapture = (): void => {
    setIsCapturing(false);
    setFeedback({
      message: "Capture stopped",
      type: "info"
    });
  };

  const handleImageCapture = (imageData: ImageData): void => {
    setCapturedImages(prev => [...prev, imageData]);
    
    // Update feedback based on progress
    if (capturedImages.length + 1 >= coverageStatus.requiredImages) {
      setFeedback({
        message: "✅ Target number of images reached! You can stop or continue capturing.",
        type: "success"
      });
    } else {
      setFeedback({
        message: `Image captured! Continue moving around the object.`,
        type: "success"
      });
    }
  };

  // const downloadImages = async (): Promise<void> => {
  //   setIsProcessing(true);
  //   setFeedback({
  //     message: "Preparing images for download...",
  //     type: "info"
  //   });
    
  //   try {
  //     // Create a zip file of all images and download
  //     const JSZip = (await import('jszip')).default;
  //     const zip = new JSZip();
  //     const imgFolder = zip.folder("object_images");
      
  //     if (!imgFolder) {
  //       throw new Error("Could not create zip folder");
  //     }
      
  //     // Add a metadata JSON file with capture information
  //     const metadata = {
  //       captureDate: new Date().toISOString(),
  //       imageCount: capturedImages.length,
  //       objectClasses: captureStats.detectedClasses,
  //       coverageStats: captureStats.angles
  //     };
      
  //     zip.file("metadata.json", JSON.stringify(metadata, null, 2));
      
  //     // Add each image to the zip
  //     capturedImages.forEach((image, index) => {
  //       // Remove the data URL prefix
  //       const base64Data = image.dataUrl.split(',')[1];
  //       const fileName = `object_${image.objectClass || 'item'}_${index + 1}.jpg`;
  //       imgFolder.file(fileName, base64Data, {base64: true});
  //     });
      
  //     // Generate and download the zip
  //     const content = await zip.generateAsync({type: 'blob'});
  //     const url = window.URL.createObjectURL(content);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = 'object_capture_images.zip';
  //     link.click();
  //     window.URL.revokeObjectURL(url);
      
  //     setFeedback({
  //       message: "Images downloaded successfully!",
  //       type: "success"
  //     });
  //   } catch (error) {
  //     console.error("Error creating zip file:", error);
  //     setFeedback({
  //       message: "Error creating download. Please try again.",
  //       type: "error"
  //     });
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };

  // const resetCapture = (): void => {
  //   setCapturedImages([]);
  //   setCoverageStatus({
  //     coveredPercentage: 0,
  //     requiredImages: 150,
  //     capturedCount: 0
  //   });
  //   setCaptureStats({
  //     angles: {
  //       top: 0,
  //       side: 0,
  //       bottom: 0,
  //       front: 0,
  //       back: 0,
  //       right: 0,
  //       left: 0
  //     },
  //     detectedClasses: {}
  //   });
  //   setFeedback({
  //     message: "Reset complete. Press Start to begin capturing",
  //     type: "info"
  //   });
  // };

  // Apply a different layout completely when capturing
  if (isCapturing) {
    return (
      <div className="fixed inset-0 flex flex-col bg-black z-50">
        {/* Camera container - give it most of the screen */}
        <div className="absolute inset-0">
          <Camera 
            onCapture={handleImageCapture} 
            onUpdateFeedback={setFeedback}
            onStopCapture={stopCapture}
          />
        </div>
        
        {/* Floating header */}
        {/* <div className="relative z-10 flex justify-between items-center bg-black bg-opacity-70 p-2">
          <h1 className="text-white font-bold">Camera Capture</h1>
          <button 
            onClick={stopCapture}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded"
          >
            Exit
          </button>
        </div> */}
        
        {/* Floating footer */}
        {/* <div className="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-70 p-2">
          <FeedbackMessage message={feedback.message} type={feedback.type} />
          <div className="py-1">
            <ProgressTracker 
              coveredPercentage={coverageStatus.coveredPercentage}
              capturedCount={coverageStatus.capturedCount}
              requiredImages={coverageStatus.requiredImages}
            />
            <div className="text-center text-white text-sm mt-1">
              Captured {coverageStatus.capturedCount} / {coverageStatus.requiredImages} images
            </div>
          </div>
        </div> */}
      </div>
    );
  }

  // Normal layout when not capturing
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold text-center">Smart Object Capture</h1>
      </header>
      
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="flex items-center justify-center h-64 sm:h-96 bg-gray-700">
              <button 
                onClick={startCapture}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Capture
              </button>
            </div>
            
            {/* <FeedbackMessage message={feedback.message} type={feedback.type} />
            
            <ProgressTracker 
              coveredPercentage={coverageStatus.coveredPercentage}
              capturedCount={coverageStatus.capturedCount}
              requiredImages={coverageStatus.requiredImages}
            /> */}
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            {/* <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Captured Images</h2>
              <div className="space-x-2">
                {capturedImages.length > 0 && (
                  <>
                    <button 
                      onClick={downloadImages}
                      disabled={isProcessing}
                      className={`px-4 py-2 ${isProcessing ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded transition-colors`}
                    >
                      {isProcessing ? 'Processing...' : 'Download ZIP'}
                    </button>
                    <button 
                      onClick={resetCapture}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div> */}
            
            {/* {capturedImages.length > 0 && (
              <CaptureStats stats={captureStats} />
            )}
             */}
            <div className="mt-4">
              <ImageGallery images={capturedImages} />
            </div>
          </div>
        </div>
      </main>
      
      <footer className="p-4 bg-gray-800 text-center text-gray-400">
        <p>Smart Object Capture System v1.0</p>
      </footer>
    </div>
  );
}

export default App;