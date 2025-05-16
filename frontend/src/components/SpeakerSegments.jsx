import React from 'react';
import AudioPlayer from './AudioPlayer'; // Import the player component

function SpeakerSegments({ speakersData = [] }) { // Default to empty array
  if (!Array.isArray(speakersData) || speakersData.length === 0) {
    return <p className="text-sm text-gray-500 italic">Speaker segmentation data not available.</p>;
  }

  const numSpeakers = speakersData.length;

  return (
    <div>
       <h3 className="text-lg font-medium mb-2 text-gray-600">Speaker Diarization</h3>
       <p className="text-sm text-gray-700 mb-3">
           Detected <span className="font-semibold">{numSpeakers}</span> speaker{numSpeakers !== 1 ? 's' : ''}.
       </p>
       <div className="space-y-4">
         {speakersData.map((speaker) => (
           <div key={speaker.id} className="border rounded p-3 bg-white shadow-sm">
             <p className="font-semibold text-gray-800 mb-2">
               {speaker.id || 'Unknown Speaker'}
               {speaker.gender && ` (${speaker.gender})`}
             </p>
             {Array.isArray(speaker.segments) && speaker.segments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                   {speaker.segments.map((segment, index) => (
                      <AudioPlayer
                          key={`${speaker.id}-${index}`}
                          // IMPORTANT: Construct full URL if backend provides relative paths
                          src={segment.audioUrl} // Assuming backend gives full or relative URL
                          title={`Turn ${index + 1} (${segment.start?.toFixed(1)}s - ${segment.end?.toFixed(1)}s)`}
                      />
                   ))}
                </div>
             ) : (
                 <p className="text-xs text-gray-500 italic">No audio segments found for this speaker.</p>
             )}
           </div>
         ))}
       </div>
    </div>
  );
}

export default SpeakerSegments;