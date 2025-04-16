import React, { useState, useEffect, useRef } from 'react';

export interface CubeDimensions {
  width: number;   // Width percentage (0-100)
  height: number;  // Height percentage (0-100)
  depth: number;   // Depth percentage (0-100)
  x: number;       // X position percentage (0-100)
  y: number;       // Y position percentage (0-100)
  z: number;       // Z depth position (visual only)
}

interface CubeOverlayProps {
  onCubeChange?: (dimensions: CubeDimensions) => void;
  showGuide?: boolean;
  pathHeight?: number;          // Height position of the path (percentage from top)
  pathPoints?: number[];        // Array of angles (0-360) for capture points
  completedPoints?: number[];   // Array of completed angles
  currentAngle?: number;        // Current device orientation angle
  pathLevel?: number;           // 0 = lower path, 1 = upper path
}

const CubeOverlay: React.FC<CubeOverlayProps> = ({ 
  onCubeChange, 
  showGuide = false,
  pathHeight = 40, 
  pathPoints = [], 
  completedPoints = [],
  currentAngle = 0,
  pathLevel = 0
}) => {
  // Reference for drag handling
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const activeAxisRef = useRef<'x' | 'y' | 'z' | 'width' | 'height' | 'depth' | null>(null);
  const dragStartPosRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  // State for cube dimensions and position
  const [dimensions, setDimensions] = useState<CubeDimensions>({
    width: 60,
    height: 60,
    depth: 40,
    x: 50,    // Center position, percentage
    y: 50,    // Center position, percentage
    z: 0      // Depth position (for 3D visual effect)
  });

  // Path colors based on level
  const pathColors = {
    border: pathLevel === 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(147, 51, 234, 0.8)',  // Blue for lower, Purple for upper
    fill: pathLevel === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)',
    point: pathLevel === 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(147, 51, 234, 1)',
    completed: 'rgba(34, 197, 94, 1)',  // Green for completed points
    current: 'rgba(255, 255, 255, 1)'   // White for current position
  };

  // Notify parent of cube changes
  useEffect(() => {
    if (onCubeChange) {
      onCubeChange(dimensions);
    }
  }, [dimensions, onCubeChange]);

  // Calculate normalized current angle (0-360)
  const normalizedAngle = ((currentAngle % 360) + 360) % 360;
  
  // Find the nearest path point
  const getNearestPoint = (): number | null => {
    if (!pathPoints || pathPoints.length === 0) return null;
    
    let nearestPoint = pathPoints[0];
    let minDistance = 360;
    
    for (const point of pathPoints) {
      // Calculate shortest distance on the circle
      const distance = Math.min(
        Math.abs(normalizedAngle - point),
        360 - Math.abs(normalizedAngle - point)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    }
    
    // Only return if we're reasonably close
    return minDistance <= 30 ? nearestPoint : null;
  };
  
  const nearestPoint = getNearestPoint();
  
  // Handle cube resize
  // const handleResize = (dimension: keyof CubeDimensions, value: number) => {
  //   setDimensions(prev => ({
  //     ...prev,
  //     [dimension]: value
  //   }));
  // };
  
  // 3D Drag functionality
  const startDrag = (e: React.MouseEvent | React.TouchEvent, axis: 'x' | 'y' | 'z' | 'width' | 'height' | 'depth') => {
    e.preventDefault();
    
    // Get drag start position
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    dragStartPosRef.current = { x: clientX, y: clientY };
    activeAxisRef.current = axis;
    isDraggingRef.current = true;
    
    // Add event listeners for move and end events
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchend', endDrag);
    }
  };
  
  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !activeAxisRef.current) return;
    
    e.preventDefault();
    
    // Get current position
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate movement delta
    const deltaX = clientX - dragStartPosRef.current.x;
    const deltaY = clientY - dragStartPosRef.current.y;
    
    // Get container dimensions for scaling
    const containerWidth = containerRef.current?.clientWidth || 100;
    const containerHeight = containerRef.current?.clientHeight || 100;
    
    // Compute movement as percentage of container
    const deltaXPercent = (deltaX / containerWidth) * 100;
    const deltaYPercent = (deltaY / containerHeight) * 100;
    
    setDimensions(prev => {
      const newDimensions = { ...prev };
      
      // Handle based on which axis/dimension is being modified
      switch (activeAxisRef.current) {
        case 'x':
          newDimensions.x = Math.max(0, Math.min(100, prev.x + deltaXPercent));
          break;
        case 'y':
          newDimensions.y = Math.max(0, Math.min(100, prev.y + deltaYPercent));
          break;
        case 'z':
          // Z axis is more visual, smaller changes
          newDimensions.z = prev.z + deltaYPercent * 0.5;
          break;
        case 'width':
          // Width changes based on horizontal movement
          newDimensions.width = Math.max(20, Math.min(90, prev.width + deltaXPercent));
          break;
        case 'height':
          // Height changes based on vertical movement
          newDimensions.height = Math.max(20, Math.min(90, prev.height + deltaYPercent));
          break;
        case 'depth':
          // Depth changes based on vertical movement
          newDimensions.depth = Math.max(20, Math.min(80, prev.depth + deltaYPercent));
          break;
      }
      
      return newDimensions;
    });
    
    // Update drag start position
    dragStartPosRef.current = { x: clientX, y: clientY };
  };
  
  const endDrag = () => {
    isDraggingRef.current = false;
    activeAxisRef.current = null;
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchend', endDrag);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden" 
      style={{ touchAction: isDraggingRef.current ? 'none' : 'auto' }}
    >
      {/* 3D Cube with interactive handles */}
      <div 
        className="absolute border-2 border-white rounded transition-colors duration-300"
        style={{
          top: `${dimensions.y - dimensions.height / 2}%`,
          left: `${dimensions.x - dimensions.width / 2}%`,
          width: `${dimensions.width}%`,
          height: `${dimensions.height}%`,
          transform: `perspective(1000px) translateZ(${dimensions.z}px)`,
        }}
      >
        {/* Cube corner indicators with drag handles */}
        <div 
          className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white cursor-nwse-resize"
          onMouseDown={(e) => startDrag(e, 'width')}
          onTouchStart={(e) => startDrag(e, 'width')}
        ></div>
        <div 
          className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white cursor-nesw-resize"
          onMouseDown={(e) => startDrag(e, 'width')}
          onTouchStart={(e) => startDrag(e, 'width')}
        ></div>
        <div 
          className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white cursor-nesw-resize"
          onMouseDown={(e) => startDrag(e, 'height')}
          onTouchStart={(e) => startDrag(e, 'height')}
        ></div>
        <div 
          className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white cursor-nwse-resize"
          onMouseDown={(e) => startDrag(e, 'height')}
          onTouchStart={(e) => startDrag(e, 'height')}
        ></div>
        
        {/* Move handle (center) */}
        <div 
          className="absolute top-1/2 left-1/2 w-10 h-10 transform -translate-x-1/2 -translate-y-1/2 cursor-move"
          onMouseDown={(e) => startDrag(e, 'x')}
          onTouchStart={(e) => startDrag(e, 'x')}
        >
          <div className="w-full h-full rounded-full border-2 border-white bg-white bg-opacity-20"></div>
        </div>
        
        {/* Z-axis handle (depth) */}
        <div 
          className="absolute top-1/2 right-0 w-8 h-8 transform translate-x-1/2 -translate-y-1/2 cursor-col-resize"
          onMouseDown={(e) => startDrag(e, 'depth')}
          onTouchStart={(e) => startDrag(e, 'depth')}
        >
          <div className="w-full h-full border-2 border-white rounded-full bg-white bg-opacity-20 flex items-center justify-center">
            <span className="text-white font-bold text-xs">Z</span>
          </div>
        </div>
        
        {/* Depth visualization lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Perspective lines from corners */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0%" y1="0%" x2="10%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="100%" y1="0%" x2="90%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="0%" y1="100%" x2="10%" y2="90%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="100%" y1="100%" x2="90%" y2="90%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
            
            {/* Back face of cube */}
            <rect 
              x="10%" 
              y="10%" 
              width="80%" 
              height="80%" 
              fill="none" 
              stroke="white" 
              strokeWidth="1" 
              strokeDasharray="3,3" 
              opacity="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Path guide overlay */}
      {showGuide && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          {/* Horizontal path line */}
          <line
            x1="0%"
            y1={`${pathHeight}%`}
            x2="100%"
            y2={`${pathHeight}%`}
            stroke={pathColors.border}
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Path points */}
          {pathPoints.map((point, index) => {
            // Convert angle to x-position (0 degrees = center, progressing clockwise)
            const isCompleted = completedPoints ? completedPoints.includes(point) : false;
            const pointColor = isCompleted ? pathColors.completed : pathColors.point;
            const pointSize = isCompleted ? 8 : 6;
            
            // Calculate x position based on angle (0-360 maps to 0-100% width)
            const pointX = (point / 360) * 100;
            
            return (
              <g key={index}>
                <circle 
                  cx={`${pointX}%`}
                  cy={`${pathHeight}%`}
                  r={pointSize}
                  fill={pointColor}
                  opacity={0.8}
                />
                <text
                  x={`${pointX}%`}
                  y={`${pathHeight - 2}%`}
                  fill="white"
                  fontSize="10"
                  textAnchor="middle"
                  opacity={0.8}
                >
                  {point}°
                </text>
              </g>
            );
          })}
          
          {/* Current position indicator */}
          {nearestPoint !== null && (
            <g>
              <circle
                cx={`${(normalizedAngle / 360) * 100}%`}
                cy={`${pathHeight}%`}
                r="10"
                fill="none"
                stroke={pathColors.current}
                strokeWidth="2"
                opacity="0.8"
              />
              <circle
                cx={`${(normalizedAngle / 360) * 100}%`}
                cy={`${pathHeight}%`}
                r="4"
                fill={pathColors.current}
                opacity="0.8"
              />
            </g>
          )}
          
          {/* Direction indicator */}
          <polygon
            points={`${(normalizedAngle / 360) * 100}%,${pathHeight + 3}% ${(normalizedAngle / 360) * 100 - 1}%,${pathHeight + 6}% ${(normalizedAngle / 360) * 100 + 1}%,${pathHeight + 6}%`}
            fill="white"
            opacity="0.8"
          />
          
          {/* Path label */}
          <text
            x="5%"
            y={`${pathHeight - 5}%`}
            fill="white"
            fontSize="12"
            fontWeight="bold"
          >
            {pathLevel === 0 ? 'Lower Path' : 'Upper Path'}
          </text>
          
          {/* Visual guidance - target zones */}
          {pathPoints.map((point, index) => {
            const pointX = (point / 360) * 100;
            const isCompleted = completedPoints ? completedPoints.includes(point) : false;
            if (!isCompleted) {
              return (
                <rect
                  key={`guide-${index}`}
                  x={`${pointX - 2}%`}
                  y={`${pathHeight - 10}%`}
                  width="4%"
                  height="20%"
                  fill={pathColors.fill}
                  opacity={
                    Math.abs(normalizedAngle - point) < 15 || 
                    Math.abs(normalizedAngle - point - 360) < 15 || 
                    Math.abs(normalizedAngle - point + 360) < 15 
                      ? 0.5 : 0.2
                  }
                  rx="2"
                  ry="2"
                />
              );
            }
            return null;
          })}
        </svg>
      )}
      
      {/* 3D perspective guide */}
      {showGuide && (
        <div className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded pointer-events-none">
          <div className="text-white text-xs mb-1">Capture Paths:</div>
          <svg width="80" height="80" viewBox="0 0 100 100">
            {/* Lower path circle */}
            <ellipse 
              cx="50" 
              cy="60" 
              rx="40" 
              ry="15" 
              fill="none" 
              stroke={pathLevel === 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)'} 
              strokeWidth="2"
              strokeDasharray={pathLevel !== 0 ? "5,5" : "none"}
            />
            
            {/* Upper path circle */}
            <ellipse 
              cx="50" 
              cy="40" 
              rx="30" 
              ry="10" 
              fill="none" 
              stroke={pathLevel === 1 ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.4)'} 
              strokeWidth="2"
              strokeDasharray={pathLevel !== 1 ? "5,5" : "none"}
            />
            
            {/* Object representation */}
            <rect x="40" y="40" width="20" height="30" fill="rgba(255, 255, 255, 0.3)" />
            
            {/* Current position indicator */}
            {nearestPoint !== null && (
              <circle 
                cx={50 + 40 * Math.cos(normalizedAngle * Math.PI / 180)} 
                cy={pathLevel === 0 ? 60 + 15 * Math.sin(normalizedAngle * Math.PI / 180) : 40 + 10 * Math.sin(normalizedAngle * Math.PI / 180)} 
                r="4" 
                fill="white" 
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

export default CubeOverlay;