import React, { useState } from 'react';

// Expects wordCloudData prop to be a base64 encoded PNG string
function WordCloud({ title, wordCloudData, triggerButtonText = "View Word Cloud" }) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div>
       <h3 className="text-lg font-medium mb-2 text-gray-600">{title}</h3>
      {!isVisible ? (
        <button
          onClick={toggleVisibility}
          disabled={!wordCloudData} // Disable button if no data
          className={`bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded text-sm transition-colors ${!wordCloudData ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {triggerButtonText}
        </button>
      ) : (
        <div className="border border-gray-200 rounded p-4 bg-gray-50 text-center">
          {wordCloudData ? (
            // Display base64 encoded image
            <img
              src={wordCloudData}
              alt="Word Cloud"
              className="max-w-full h-auto mx-auto block"
              style={{ maxWidth: '400px' }}
              onLoad={() => console.log("✅ Image loaded successfully")}
              onError={(e) => {
                console.error("❌ Failed to load image", e);
                console.error("Base64 string (truncated):", wordCloudData?.slice(0, 100));
              }}
            />

          ) : (
            // This case should technically not be reachable if button is disabled, but good fallback
            <p className="text-gray-500 italic">Word cloud data is not available.</p>
          )}
          <button
            onClick={toggleVisibility}
            className="mt-3 text-sm text-red-600 hover:text-red-800 focus:outline-none"
          >
            Hide Word Cloud
          </button>
        </div>
      )}
    </div>
  );
}

export default WordCloud;