import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="text-center">
      <h2 className="text-2xl mb-4">3D Object Scanner</h2>
      <p className="mb-4">This app will help you capture photos from all angles to create a 3D model.</p>
      <p className="mb-4 text-yellow-300">
        Place your object on a stool or table in the center of an open area.
        You'll need to physically stand at 16 specific positions around the object at 2 different height levels.
      </p>
      <button
        onClick={onStart}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
      >
        Start Capture
      </button>
    </div>
  );
};

export default IntroScreen;