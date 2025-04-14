import React from 'react';

interface CubeOverlayProps {
  objectDetected?: boolean;
}

const CubeOverlay: React.FC<CubeOverlayProps> = ({ objectDetected = false }) => {
  const borderColor = objectDetected ? 'border-green-500' : 'border-white';
  const opacity = objectDetected ? 'border-opacity-80' : 'border-opacity-60';
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top square - dashed border with some transparency */}
      <div className={`absolute w-3/5 h-3/5 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed ${borderColor} ${opacity}`}></div>
      
      {/* Vertical lines connecting top square to bottom square */}
      <div className={`absolute w-1 h-1/5 border-l-2 border-dashed ${borderColor} ${opacity}`}
           style={{ top: '20%', left: '20%' }}></div>
      <div className={`absolute w-1 h-1/5 border-l-2 border-dashed ${borderColor} ${opacity}`}
           style={{ top: '20%', right: '20%' }}></div>
      <div className={`absolute w-1 h-1/5 border-l-2 border-dashed ${borderColor} ${opacity}`}
           style={{ bottom: '20%', left: '20%' }}></div>
      <div className={`absolute w-1 h-1/5 border-l-2 border-dashed ${borderColor} ${opacity}`}
           style={{ bottom: '20%', right: '20%' }}></div>
      
      {/* Small circles at corners */}
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ top: '20%', left: '20%' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ top: '20%', right: '20%' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ bottom: '20%', left: '20%' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ bottom: '20%', right: '20%' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ bottom: '20%', left: '50%', transform: 'translateX(-50%)' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ top: '50%', left: '20%', transform: 'translateY(-50%)' }}></div>
      <div className={`absolute w-2 h-2 ${objectDetected ? 'bg-green-500' : 'bg-white'} rounded-full`} style={{ top: '50%', right: '20%', transform: 'translateY(-50%)' }}></div>
    </div>
  );
};

export default CubeOverlay;