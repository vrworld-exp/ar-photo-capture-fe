import React, { useState } from 'react';
import { ImageData } from '../types';

interface ImageGalleryProps {
  images: ImageData[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [filter, setFilter] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  
  // Get unique object classes for filtering
  const uniqueClasses = [...new Set(images.map(img => img.objectClass || 'unknown'))];
  
  // Filter images based on selected filter
  const filteredImages = filter === 'all' 
    ? images 
    : images.filter(img => img.objectClass === filter);
  
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-700 rounded-lg">
        <p className="text-gray-400">No images captured yet</p>
      </div>
    );
  }
  
  const handleImageClick = (index: number): void => {
    setSelectedImage(filteredImages[index]);
  };
  
  return (
    <div>
      {/* Filters */}
      {uniqueClasses.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            All ({images.length})
          </button>
          
          {uniqueClasses.map(cls => (
            <button 
              key={cls} 
              onClick={() => setFilter(cls)}
              className={`px-2 py-1 text-xs rounded capitalize ${filter === cls ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              {cls} ({images.filter(img => img.objectClass === cls).length})
            </button>
          ))}
        </div>
      )}
      
      {/* Image Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-96 overflow-y-auto p-2 bg-gray-700 rounded-lg">
        {filteredImages.map((image, index) => (
          <div 
            key={index} 
            className="relative aspect-square cursor-pointer"
            onClick={() => handleImageClick(index)}
          >
            <img 
              src={image.dataUrl} 
              alt={`Captured ${image.objectClass || 'object'} ${index + 1}`}
              className="w-full h-full object-cover rounded-md hover:opacity-80 transition-opacity"
            />
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 px-1 rounded-tl-md text-xs">
              {index + 1}
            </div>
            {image.objectClass && (
              <div className="absolute top-0 left-0 bg-black bg-opacity-50 px-1 rounded-br-md text-xs capitalize truncate max-w-full">
                {image.objectClass}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-2xl max-h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage.dataUrl} 
              alt={`Captured ${selectedImage.objectClass || 'object'}`}
              className="w-full h-auto object-contain max-h-[80vh]"
            />
            <div className="bg-gray-800 p-3 text-sm">
              <p className="capitalize font-medium">{selectedImage.objectClass || 'Unknown object'}</p>
              <p className="text-gray-400">Captured: {new Date(selectedImage.timestamp).toLocaleString()}</p>
            </div>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-gray-800 p-2 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;