import React, { useState } from 'react';

function TranscriptionDisplay({ transcriptionText }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle potential null/undefined text
  const text = transcriptionText || "";

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const previewLength = 300; // Number of characters for preview
  const isLongText = text.length > previewLength;
  const displayText = isExpanded ? text : `${text.substring(0, previewLength)}${isLongText ? '...' : ''}`;

  return (
    <div>
      <h3 className="text-lg font-medium mb-2 text-gray-600">Transcription</h3>
      {text ? (
        <>
          <div
            className={`bg-gray-50 border border-gray-200 rounded p-4 text-gray-800 text-sm leading-relaxed transition-all duration-300 ease-in-out overflow-hidden prose prose-sm max-w-none ${ // Added prose for basic formatting
              isExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-32' // Tailwind classes for height control
            }`}
          >
            {/* Render paragraphs for better readability if text contains newlines */}
            {displayText.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph || '\u00A0'}</p> // Use non-breaking space for empty lines
            ))}
          </div>
          {isLongText && (
            <button
              onClick={toggleExpansion}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {isExpanded ? 'Collapse Transcription' : 'Expand Full Transcription'}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 italic">Transcription not available.</p>
      )}
    </div>
  );
}

export default TranscriptionDisplay;

// Optional: Install prose plugin for Tailwind if needed for better text formatting
// npm install -D @tailwindcss/typography
// Then add require('@tailwindcss/typography') to plugins in tailwind.config.js