import React from 'react';

interface CaptureDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pathCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const CaptureDisplay: React.FC<CaptureDisplayProps> = ({ 
  videoRef, 
  canvasRef, 
  pathCanvasRef 
}) => {
  return (
    <div className="relative w-full">
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
    </div>
  );
};

export default CaptureDisplay;