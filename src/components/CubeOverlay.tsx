// import React, { useState, useEffect, useRef } from 'react';

// export interface CubeDimensions {
//   width: number;   // Width percentage (0-100)
//   height: number;  // Height percentage (0-100)
//   depth: number;   // Depth percentage (0-100)
//   x: number;       // X position percentage (0-100)
//   y: number;       // Y position percentage (0-100)
//   z: number;       // Z depth position (visual only)
// }

// interface CubeOverlayProps {
//   onCubeChange?: (dimensions: CubeDimensions) => void;
//   showGuide?: boolean;
//   pathHeight?: number;          // Height position of the path (percentage from top)
//   pathPoints?: number[];        // Array of angles (0-360) for capture points
//   completedPoints?: number[];   // Array of completed angles
//   currentAngle?: number;        // Current device orientation angle
//   pathLevel?: number;           // 0 = lower path, 1 = upper path
// }

// const CubeOverlay: React.FC<CubeOverlayProps> = ({ 
//   onCubeChange, 
//   showGuide = false,
//   pathHeight = 40, 
//   pathPoints = [], 
//   completedPoints = [],
//   currentAngle = 0,
//   pathLevel = 0
// }) => {
//   // Reference for drag handling
//   const containerRef = useRef<HTMLDivElement>(null);
//   const isDraggingRef = useRef<boolean>(false);
//   const activeAxisRef = useRef<'x' | 'y' | 'z' | 'width' | 'height' | 'depth' | null>(null);
//   const dragStartPosRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  
//   // State for cube dimensions and position
//   const [dimensions, setDimensions] = useState<CubeDimensions>({
//     width: 60,
//     height: 60,
//     depth: 40,
//     x: 50,    // Center position, percentage
//     y: 50,    // Center position, percentage
//     z: 0      // Depth position (for 3D visual effect)
//   });

//   // Path colors based on level
//   const pathColors = {
//     border: pathLevel === 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(147, 51, 234, 0.8)',  // Blue for lower, Purple for upper
//     fill: pathLevel === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)',
//     point: pathLevel === 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(147, 51, 234, 1)',
//     completed: 'rgba(34, 197, 94, 1)',  // Green for completed points
//     current: 'rgba(255, 255, 255, 1)'   // White for current position
//   };

//   // Notify parent of cube changes
//   useEffect(() => {
//     if (onCubeChange) {
//       onCubeChange(dimensions);
//     }
//   }, [dimensions, onCubeChange]);

//   // Calculate normalized current angle (0-360)
//   const normalizedAngle = ((currentAngle % 360) + 360) % 360;
  
//   // Find the nearest path point
//   const getNearestPoint = (): number | null => {
//     if (!pathPoints || pathPoints.length === 0) return null;
    
//     let nearestPoint = pathPoints[0];
//     let minDistance = 360;
    
//     for (const point of pathPoints) {
//       // Calculate shortest distance on the circle
//       const distance = Math.min(
//         Math.abs(normalizedAngle - point),
//         360 - Math.abs(normalizedAngle - point)
//       );
      
//       if (distance < minDistance) {
//         minDistance = distance;
//         nearestPoint = point;
//       }
//     }
    
//     // Only return if we're reasonably close
//     return minDistance <= 30 ? nearestPoint : null;
//   };
  
//   const nearestPoint = getNearestPoint();
  
//   // Handle cube resize
//   // const handleResize = (dimension: keyof CubeDimensions, value: number) => {
//   //   setDimensions(prev => ({
//   //     ...prev,
//   //     [dimension]: value
//   //   }));
//   // };
  
//   // 3D Drag functionality
//   const startDrag = (e: React.MouseEvent | React.TouchEvent, axis: 'x' | 'y' | 'z' | 'width' | 'height' | 'depth') => {
//     e.preventDefault();
    
//     // Get drag start position
//     let clientX: number, clientY: number;
    
//     if ('touches' in e) {
//       clientX = e.touches[0].clientX;
//       clientY = e.touches[0].clientY;
//     } else {
//       clientX = e.clientX;
//       clientY = e.clientY;
//     }
    
//     dragStartPosRef.current = { x: clientX, y: clientY };
//     activeAxisRef.current = axis;
//     isDraggingRef.current = true;
    
//     // Add event listeners for move and end events
//     if (typeof window !== 'undefined') {
//       window.addEventListener('mousemove', handleDrag);
//       window.addEventListener('touchmove', handleDrag);
//       window.addEventListener('mouseup', endDrag);
//       window.addEventListener('touchend', endDrag);
//     }
//   };
  
//   const handleDrag = (e: MouseEvent | TouchEvent) => {
//     if (!isDraggingRef.current || !activeAxisRef.current) return;
    
//     e.preventDefault();
    
//     // Get current position
//     let clientX: number, clientY: number;
    
//     if ('touches' in e) {
//       clientX = e.touches[0].clientX;
//       clientY = e.touches[0].clientY;
//     } else {
//       clientX = e.clientX;
//       clientY = e.clientY;
//     }
    
//     // Calculate movement delta
//     const deltaX = clientX - dragStartPosRef.current.x;
//     const deltaY = clientY - dragStartPosRef.current.y;
    
//     // Get container dimensions for scaling
//     const containerWidth = containerRef.current?.clientWidth || 100;
//     const containerHeight = containerRef.current?.clientHeight || 100;
    
//     // Compute movement as percentage of container
//     const deltaXPercent = (deltaX / containerWidth) * 100;
//     const deltaYPercent = (deltaY / containerHeight) * 100;
    
//     setDimensions(prev => {
//       const newDimensions = { ...prev };
      
//       // Handle based on which axis/dimension is being modified
//       switch (activeAxisRef.current) {
//         case 'x':
//           newDimensions.x = Math.max(0, Math.min(100, prev.x + deltaXPercent));
//           break;
//         case 'y':
//           newDimensions.y = Math.max(0, Math.min(100, prev.y + deltaYPercent));
//           break;
//         case 'z':
//           // Z axis is more visual, smaller changes
//           newDimensions.z = prev.z + deltaYPercent * 0.5;
//           break;
//         case 'width':
//           // Width changes based on horizontal movement
//           newDimensions.width = Math.max(20, Math.min(90, prev.width + deltaXPercent));
//           break;
//         case 'height':
//           // Height changes based on vertical movement
//           newDimensions.height = Math.max(20, Math.min(90, prev.height + deltaYPercent));
//           break;
//         case 'depth':
//           // Depth changes based on vertical movement
//           newDimensions.depth = Math.max(20, Math.min(80, prev.depth + deltaYPercent));
//           break;
//       }
      
//       return newDimensions;
//     });
    
//     // Update drag start position
//     dragStartPosRef.current = { x: clientX, y: clientY };
//   };
  
//   const endDrag = () => {
//     isDraggingRef.current = false;
//     activeAxisRef.current = null;
    
//     // Remove event listeners
//     if (typeof window !== 'undefined') {
//       window.removeEventListener('mousemove', handleDrag);
//       window.removeEventListener('touchmove', handleDrag);
//       window.removeEventListener('mouseup', endDrag);
//       window.removeEventListener('touchend', endDrag);
//     }
//   };

//   return (
//     <div 
//       ref={containerRef}
//       className="absolute inset-0 overflow-hidden" 
//       style={{ touchAction: isDraggingRef.current ? 'none' : 'auto' }}
//     >
//       {/* 3D Cube with interactive handles */}
//       <div 
//         className="absolute border-2 border-white rounded transition-colors duration-300"
//         style={{
//           top: `${dimensions.y - dimensions.height / 2}%`,
//           left: `${dimensions.x - dimensions.width / 2}%`,
//           width: `${dimensions.width}%`,
//           height: `${dimensions.height}%`,
//           transform: `perspective(1000px) translateZ(${dimensions.z}px)`,
//         }}
//       >
//         {/* Cube corner indicators with drag handles */}
//         <div 
//           className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white cursor-nwse-resize"
//           onMouseDown={(e) => startDrag(e, 'width')}
//           onTouchStart={(e) => startDrag(e, 'width')}
//         ></div>
//         <div 
//           className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white cursor-nesw-resize"
//           onMouseDown={(e) => startDrag(e, 'width')}
//           onTouchStart={(e) => startDrag(e, 'width')}
//         ></div>
//         <div 
//           className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white cursor-nesw-resize"
//           onMouseDown={(e) => startDrag(e, 'height')}
//           onTouchStart={(e) => startDrag(e, 'height')}
//         ></div>
//         <div 
//           className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white cursor-nwse-resize"
//           onMouseDown={(e) => startDrag(e, 'height')}
//           onTouchStart={(e) => startDrag(e, 'height')}
//         ></div>
        
//         {/* Move handle (center) */}
//         <div 
//           className="absolute top-1/2 left-1/2 w-10 h-10 transform -translate-x-1/2 -translate-y-1/2 cursor-move"
//           onMouseDown={(e) => startDrag(e, 'x')}
//           onTouchStart={(e) => startDrag(e, 'x')}
//         >
//           <div className="w-full h-full rounded-full border-2 border-white bg-white bg-opacity-20"></div>
//         </div>
        
//         {/* Z-axis handle (depth) */}
//         <div 
//           className="absolute top-1/2 right-0 w-8 h-8 transform translate-x-1/2 -translate-y-1/2 cursor-col-resize"
//           onMouseDown={(e) => startDrag(e, 'depth')}
//           onTouchStart={(e) => startDrag(e, 'depth')}
//         >
//           <div className="w-full h-full border-2 border-white rounded-full bg-white bg-opacity-20 flex items-center justify-center">
//             <span className="text-white font-bold text-xs">Z</span>
//           </div>
//         </div>
        
//         {/* Depth visualization lines */}
//         <div className="absolute inset-0 pointer-events-none">
//           {/* Perspective lines from corners */}
//           <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
//             <line x1="0%" y1="0%" x2="10%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
//             <line x1="100%" y1="0%" x2="90%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
//             <line x1="0%" y1="100%" x2="10%" y2="90%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
//             <line x1="100%" y1="100%" x2="90%" y2="90%" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
            
//             {/* Back face of cube */}
//             <rect 
//               x="10%" 
//               y="10%" 
//               width="80%" 
//               height="80%" 
//               fill="none" 
//               stroke="white" 
//               strokeWidth="1" 
//               strokeDasharray="3,3" 
//               opacity="0.5"
//             />
//           </svg>
//         </div>
//       </div>

//       {/* Path guide overlay */}
//       {showGuide && (
//         <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
//           {/* Horizontal path line */}
//           <line
//             x1="0%"
//             y1={`${pathHeight}%`}
//             x2="100%"
//             y2={`${pathHeight}%`}
//             stroke={pathColors.border}
//             strokeWidth="2"
//             strokeDasharray="5,5"
//           />
          
//           {/* Path points */}
//           {pathPoints.map((point, index) => {
//             // Convert angle to x-position (0 degrees = center, progressing clockwise)
//             const isCompleted = completedPoints ? completedPoints.includes(point) : false;
//             const pointColor = isCompleted ? pathColors.completed : pathColors.point;
//             const pointSize = isCompleted ? 8 : 6;
            
//             // Calculate x position based on angle (0-360 maps to 0-100% width)
//             const pointX = (point / 360) * 100;
            
//             return (
//               <g key={index}>
//                 <circle 
//                   cx={`${pointX}%`}
//                   cy={`${pathHeight}%`}
//                   r={pointSize}
//                   fill={pointColor}
//                   opacity={0.8}
//                 />
//                 <text
//                   x={`${pointX}%`}
//                   y={`${pathHeight - 2}%`}
//                   fill="white"
//                   fontSize="10"
//                   textAnchor="middle"
//                   opacity={0.8}
//                 >
//                   {point}°
//                 </text>
//               </g>
//             );
//           })}
          
//           {/* Current position indicator */}
//           {nearestPoint !== null && (
//             <g>
//               <circle
//                 cx={`${(normalizedAngle / 360) * 100}%`}
//                 cy={`${pathHeight}%`}
//                 r="10"
//                 fill="none"
//                 stroke={pathColors.current}
//                 strokeWidth="2"
//                 opacity="0.8"
//               />
//               <circle
//                 cx={`${(normalizedAngle / 360) * 100}%`}
//                 cy={`${pathHeight}%`}
//                 r="4"
//                 fill={pathColors.current}
//                 opacity="0.8"
//               />
//             </g>
//           )}
          
//           {/* Direction indicator */}
//           <polygon
//             points={`${(normalizedAngle / 360) * 100}%,${pathHeight + 3}% ${(normalizedAngle / 360) * 100 - 1}%,${pathHeight + 6}% ${(normalizedAngle / 360) * 100 + 1}%,${pathHeight + 6}%`}
//             fill="white"
//             opacity="0.8"
//           />
          
//           {/* Path label */}
//           <text
//             x="5%"
//             y={`${pathHeight - 5}%`}
//             fill="white"
//             fontSize="12"
//             fontWeight="bold"
//           >
//             {pathLevel === 0 ? 'Lower Path' : 'Upper Path'}
//           </text>
          
//           {/* Visual guidance - target zones */}
//           {pathPoints.map((point, index) => {
//             const pointX = (point / 360) * 100;
//             const isCompleted = completedPoints ? completedPoints.includes(point) : false;
//             if (!isCompleted) {
//               return (
//                 <rect
//                   key={`guide-${index}`}
//                   x={`${pointX - 2}%`}
//                   y={`${pathHeight - 10}%`}
//                   width="4%"
//                   height="20%"
//                   fill={pathColors.fill}
//                   opacity={
//                     Math.abs(normalizedAngle - point) < 15 || 
//                     Math.abs(normalizedAngle - point - 360) < 15 || 
//                     Math.abs(normalizedAngle - point + 360) < 15 
//                       ? 0.5 : 0.2
//                   }
//                   rx="2"
//                   ry="2"
//                 />
//               );
//             }
//             return null;
//           })}
//         </svg>
//       )}
      
//       {/* 3D perspective guide */}
//       {showGuide && (
//         <div className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded pointer-events-none">
//           <div className="text-white text-xs mb-1">Capture Paths:</div>
//           <svg width="80" height="80" viewBox="0 0 100 100">
//             {/* Lower path circle */}
//             <ellipse 
//               cx="50" 
//               cy="60" 
//               rx="40" 
//               ry="15" 
//               fill="none" 
//               stroke={pathLevel === 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)'} 
//               strokeWidth="2"
//               strokeDasharray={pathLevel !== 0 ? "5,5" : "none"}
//             />
            
//             {/* Upper path circle */}
//             <ellipse 
//               cx="50" 
//               cy="40" 
//               rx="30" 
//               ry="10" 
//               fill="none" 
//               stroke={pathLevel === 1 ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.4)'} 
//               strokeWidth="2"
//               strokeDasharray={pathLevel !== 1 ? "5,5" : "none"}
//             />
            
//             {/* Object representation */}
//             <rect x="40" y="40" width="20" height="30" fill="rgba(255, 255, 255, 0.3)" />
            
//             {/* Current position indicator */}
//             {nearestPoint !== null && (
//               <circle 
//                 cx={50 + 40 * Math.cos(normalizedAngle * Math.PI / 180)} 
//                 cy={pathLevel === 0 ? 60 + 15 * Math.sin(normalizedAngle * Math.PI / 180) : 40 + 10 * Math.sin(normalizedAngle * Math.PI / 180)} 
//                 r="4" 
//                 fill="white" 
//               />
//             )}
//           </svg>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CubeOverlay;
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
  capturePhase?: 'setup' | 'capturing' | 'review' | 'completed'; // Current phase of capture
}

const CubeOverlay: React.FC<CubeOverlayProps> = ({ 
  onCubeChange, 
  showGuide = false,
  pathHeight = 40, 
  pathPoints = [], 
  completedPoints = [],
  currentAngle = 0,
  pathLevel = 0,
  capturePhase = 'setup'
}) => {
  // Reference for drag handling
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const activeAxisRef = useRef<'x' | 'y' | 'z' | 'width' | 'height' | 'depth' | null>(null);
  const dragStartPosRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  // Animation state
  const [pulseEffect, setPulseEffect] = useState<boolean>(false);
  
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
  
  // Pulse animation for target zones
  useEffect(() => {
    if (capturePhase === 'capturing') {
      const pulseInterval = setInterval(() => {
        setPulseEffect(prev => !prev);
      }, 1500);
      
      return () => clearInterval(pulseInterval);
    }
  }, [capturePhase]);
  
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

  // Get cube transparency based on capture phase
  const getCubeOpacity = () => {
    switch (capturePhase) {
      case 'setup':
        return 'border-white border-opacity-80';
      case 'capturing':
        return 'border-blue-400 border-opacity-60';
      default:
        return 'border-white border-opacity-50';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden" 
      style={{ touchAction: isDraggingRef.current ? 'none' : 'auto' }}
    >
      {/* AR grid pattern in setup phase */}
      {capturePhase === 'setup' && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
      )}
      
      {/* 3D Cube with interactive handles */}
      <div 
        className={`absolute border-2 ${getCubeOpacity()} rounded transition-all duration-300 ${
          capturePhase === 'capturing' ? 'bg-blue-400 bg-opacity-10' : ''
        }`}
        style={{
          top: `${dimensions.y - dimensions.height / 2}%`,
          left: `${dimensions.x - dimensions.width / 2}%`,
          width: `${dimensions.width}%`,
          height: `${dimensions.height}%`,
          transform: `perspective(1000px) translateZ(${dimensions.z}px)`,
        }}
      >
        {/* Only show handles during setup phase */}
        {capturePhase === 'setup' && (
          <>
            {/* Cube corner indicators with drag handles */}
            <div 
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white cursor-nwse-resize transition-opacity hover:opacity-100 opacity-70"
              onMouseDown={(e) => startDrag(e, 'width')}
              onTouchStart={(e) => startDrag(e, 'width')}
            ></div>
            <div 
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white cursor-nesw-resize transition-opacity hover:opacity-100 opacity-70"
              onMouseDown={(e) => startDrag(e, 'width')}
              onTouchStart={(e) => startDrag(e, 'width')}
            ></div>
            <div 
              className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white cursor-nesw-resize transition-opacity hover:opacity-100 opacity-70"
              onMouseDown={(e) => startDrag(e, 'height')}
              onTouchStart={(e) => startDrag(e, 'height')}
            ></div>
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white cursor-nwse-resize transition-opacity hover:opacity-100 opacity-70"
              onMouseDown={(e) => startDrag(e, 'height')}
              onTouchStart={(e) => startDrag(e, 'height')}
            ></div>
            
            {/* Move handle (center) */}
            <div 
              className="absolute top-1/2 left-1/2 w-12 h-12 transform -translate-x-1/2 -translate-y-1/2 cursor-move"
              onMouseDown={(e) => startDrag(e, 'x')}
              onTouchStart={(e) => startDrag(e, 'x')}
            >
              <div className="w-full h-full rounded-full border-2 border-white bg-white bg-opacity-20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M5 9l7-7 7 7M5 15l7 7 7-7"/>
                </svg>
              </div>
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
          </>
        )}
        
        {/* Depth visualization lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Perspective lines from corners */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0%" y1="0%" x2="10%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.7" />
            <line x1="100%" y1="0%" x2="90%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.7" />
            <line x1="0%" y1="100%" x2="10%" y2="90%" stroke="white" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.7" />
            <line x1="100%" y1="100%" x2="90%" y2="90%" stroke="white" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.7" />
            
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
            
            {/* Center point and crosshair for alignment */}
            {capturePhase === 'setup' && (
              <g>
                <circle cx="50%" cy="50%" r="2" fill="white" opacity="0.8" />
                <line x1="48%" y1="50%" x2="52%" y2="50%" stroke="white" strokeWidth="1" opacity="0.8" />
                <line x1="50%" y1="48%" x2="50%" y2="52%" stroke="white" strokeWidth="1" opacity="0.8" />
              </g>
            )}
          </svg>
        </div>
        
        {/* Animated pulse effect during capture */}
        {capturePhase === 'capturing' && (
          <div className={`absolute inset-0 border-2 border-blue-400 rounded-sm transition-opacity duration-1000 ${
            pulseEffect ? 'opacity-50' : 'opacity-10'
          }`}></div>
        )}
      </div>

      {/* Path guide overlay - only show during capturing phase */}
      {showGuide && capturePhase === 'capturing' && (
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
          
          {/* Current position indicator with animation */}
          <circle
            cx={`${(normalizedAngle / 360) * 100}%`}
            cy={`${pathHeight}%`}
            r="10"
            fill="none"
            stroke={pathColors.current}
            strokeWidth="2"
            opacity={pulseEffect ? "0.9" : "0.5"}
            className="transition-opacity duration-1000"
          />
          <circle
            cx={`${(normalizedAngle / 360) * 100}%`}
            cy={`${pathHeight}%`}
            r="4"
            fill={pathColors.current}
            opacity="0.8"
          />
          
          {/* Direction indicator */}
          <polygon
            points={`${(normalizedAngle / 360) * 100}%,${pathHeight + 3}% ${(normalizedAngle / 360) * 100 - 1}%,${pathHeight + 6}% ${(normalizedAngle / 360) * 100 + 1}%,${pathHeight + 6}%`}
            fill="white"
            opacity="0.8"
          />
          
          {/* Path label with level indicator */}
          <text
            x="5%"
            y={`${pathHeight - 5}%`}
            fill="white"
            fontSize="12"
            fontWeight="bold"
          >
            {pathLevel === 0 ? 'Lower Path' : 'Upper Path'}
          </text>
          
          {/* Visual guidance - target zones with animation */}
          {pathPoints.map((point, index) => {
            const pointX = (point / 360) * 100;
            const isCompleted = completedPoints ? completedPoints.includes(point) : false;
            
            // Calculate if this point is the nearest target
            const isNearTarget = 
              Math.abs(normalizedAngle - point) < 15 || 
              Math.abs(normalizedAngle - point - 360) < 15 || 
              Math.abs(normalizedAngle - point + 360) < 15;
            
            if (!isCompleted) {
              return (
                <rect
                  key={`guide-${index}`}
                  x={`${pointX - 2}%`}
                  y={`${pathHeight - 10}%`}
                  width="4%"
                  height="20%"
                  fill={pathColors.fill}
                  opacity={isNearTarget ? (pulseEffect ? 0.7 : 0.3) : 0.2}
                  rx="2"
                  ry="2"
                  className="transition-opacity duration-700"
                />
              );
            }
            return null;
          })}
          
          {/* Visual guidance for capture readiness */}
          {nearestPoint !== null && (
            <g>
              <circle
                cx={`${(nearestPoint / 360) * 100}%`}
                cy={`${pathHeight}%`}
                r="12"
                fill="none"
                stroke={pulseEffect ? "rgba(34, 197, 94, 0.9)" : "rgba(34, 197, 94, 0.5)"}
                strokeWidth="2"
                strokeDasharray={pulseEffect ? "none" : "3,3"}
                className="transition-all duration-700"
              />
              {/* Ready indicator */}
              {Math.abs(normalizedAngle - nearestPoint) < 10 || 
                Math.abs(normalizedAngle - nearestPoint - 360) < 10 || 
                Math.abs(normalizedAngle - nearestPoint + 360) < 10 ? (
                <text
                  x={`${(nearestPoint / 360) * 100}%`}
                  y={`${pathHeight + 15}%`}
                  fill="rgba(34, 197, 94, 1)"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="bold"
                  className={pulseEffect ? "opacity-100" : "opacity-70"}
                >
                  READY
                </text>
              ) : null}
            </g>
          )}
        </svg>
      )}
      
      {/* 3D perspective guide - enhanced for better understanding */}
      {showGuide && capturePhase === 'capturing' && (
        <div className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-lg pointer-events-none">
          <div className="text-white text-xs mb-1 font-medium">Capture View:</div>
          <svg width="80" height="80" viewBox="0 0 100 100">
            {/* Object platform */}
            <ellipse cx="50" cy="70" rx="45" ry="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            
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
            
            {/* Object representation - 3D box */}
            <rect x="40" y="45" width="20" height="25" fill="rgba(255, 255, 255, 0.2)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
            <line x1="40" y1="45" x2="35" y2="40" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
            <line x1="60" y1="45" x2="65" y2="40" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
            <line x1="40" y1="70" x2="35" y2="65" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
            <line x1="60" y1="70" x2="65" y2="65" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
            <rect x="35" y="40" width="30" height="25" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="2,2" />
            
            {/* Camera position indicator */}
            <circle 
              cx={50 + (pathLevel === 0 ? 40 : 30) * Math.cos(normalizedAngle * Math.PI / 180)} 
              cy={pathLevel === 0 ? 60 + 15 * Math.sin(normalizedAngle * Math.PI / 180) : 40 + 10 * Math.sin(normalizedAngle * Math.PI / 180)} 
              r="4" 
              fill="white" 
            />
            {/* Camera icon */}
            <g transform={`translate(${50 + (pathLevel === 0 ? 40 : 30) * Math.cos(normalizedAngle * Math.PI / 180) - 3}, ${(pathLevel === 0 ? 60 : 40) + (pathLevel === 0 ? 15 : 10) * Math.sin(normalizedAngle * Math.PI / 180) - 3})`}>
              <rect width="6" height="6" rx="1" fill="white" />
              <circle cx="3" cy="3" r="1" fill="black" />
            </g>
            
            {/* Capture points */}
            {pathPoints.filter((_, i) => i % 3 === 0).map((point, index) => {
              const isCompleted = completedPoints ? completedPoints.includes(point) : false;
              const angleRad = point * Math.PI / 180;
              const cx = 50 + (pathLevel === 0 ? 40 : 30) * Math.cos(angleRad);
              const cy = (pathLevel === 0 ? 60 : 40) + (pathLevel === 0 ? 15 : 10) * Math.sin(angleRad);
              
              return (
                <circle 
                  key={index}
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill={isCompleted ? "rgba(34, 197, 94, 1)" : "rgba(255, 255, 255, 0.5)"}
                />
              );
            })}
            
            {/* Direction label */}
            <text x="50" y="90" fill="white" fontSize="6" textAnchor="middle">
              {pathLevel === 0 ? "Lower Path" : "Upper Path"} ({Math.round(normalizedAngle)}°)
            </text>
          </svg>
        </div>
      )}
      
      {/* Enhanced helpful AR indicators during setup */}
      {capturePhase === 'setup' && (
        <div className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 rounded-lg pointer-events-none flex items-center space-x-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 12l10 10 10-10-10-10z"/>
            <path d="M12 22v-8"/>
            <path d="M12 8V2"/>
            <path d="M12 12L2 12"/>
            <path d="M12 12l10 0"/>
          </svg>
          <span className="text-white text-xs font-medium">Align Object</span>
        </div>
      )}
    </div>
  );
};

export default CubeOverlay;