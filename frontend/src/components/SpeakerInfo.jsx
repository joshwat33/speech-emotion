import React from 'react';

function SpeakerInfo({ speakers }) {
  // Ensure speakers is an array
  const speakerList = Array.isArray(speakers) ? speakers : [];

  return (
    <div>
      <h3 className="text-lg font-medium mb-2 text-gray-600">Speakers Detected & Gender</h3>
      {speakerList.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {speakerList.map((speaker) => (
            <span key={speaker.id} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
              <span className="font-semibold">{speaker.id || 'N/A'}</span>: {speaker.gender || 'Unknown'}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No speaker information available.</p>
      )}
    </div>
  );
}

export default SpeakerInfo;