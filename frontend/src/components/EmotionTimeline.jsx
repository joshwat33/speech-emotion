import React from 'react';

// Helper to get Tailwind background color class based on emotion
// *** IMPORTANT: Customize this switch to match the exact labels
//     returned by YOUR specific backend model/pipeline ***
const getEmotionColorClass = (emotion) => {
    const emoLower = emotion?.toLowerCase() || 'unknown';
    // Using the colors defined in tailwind.config.js
    switch (emoLower) {
        case 'happy': return 'bg-emotion-happy text-black'; // Added text color for contrast if needed
        case 'sad': return 'bg-emotion-sad text-white';
        case 'angry': return 'bg-emotion-angry text-white';
        case 'fear': return 'bg-emotion-fear text-black';
        case 'surprise': return 'bg-emotion-surprise text-black';
        case 'disgust': return 'bg-emotion-disgust text-white';
        case 'neutral': return 'bg-emotion-neutral text-black';
        case 'other': return 'bg-emotion-other text-black';
        case 'unknown': return 'bg-emotion-unknown text-gray-600';
        case 'oom error': return 'bg-emotion-oom-error text-red-700'; // Example for error
        default: return 'bg-gray-300 text-black'; // Fallback
    }
};

// Added totalDuration prop for accurate scaling
function EmotionTimeline({ title, timelineData, showSpeakers = false, totalDuration }) {
  // Ensure timelineData is an array
  const safeTimelineData = Array.isArray(timelineData) ? timelineData : [];

  if (safeTimelineData.length === 0) {
    return (
        <div>
             <h3 className="text-lg font-medium mb-2 text-gray-600">{title}</h3>
             <p className="text-sm text-gray-500 italic">No timeline data available.</p>
        </div>
    );
  }

  // Use provided totalDuration or calculate from data if not provided (less accurate if gaps exist)
  const effectiveTotalDuration = totalDuration > 0
        ? totalDuration
        : Math.max(...safeTimelineData.map(seg => seg.end || 0), 0); // Fallback calculation

  return (
    <div>
      <h3 className="text-lg font-medium mb-2 text-gray-600">{title}</h3>
      <div className="w-full bg-gray-100 rounded p-3 border border-gray-200">
        {/* Timeline bar container */}
        <div className="flex h-8 items-stretch relative mb-1 bg-gray-200 rounded overflow-hidden">
          {safeTimelineData.map((segment, index) => {
            // Ensure start/end are numbers
            const start = typeof segment.start === 'number' ? segment.start : 0;
            const end = typeof segment.end === 'number' ? segment.end : start;
            const segmentDuration = Math.max(0, end - start); // Avoid negative duration

            // Calculate width percentage based on effectiveTotalDuration
            const widthPercentage = effectiveTotalDuration > 0
              ? (segmentDuration / effectiveTotalDuration) * 100
              : 0;

             // Minimum width to ensure visibility, adjust as needed
            const minWidthStyle = widthPercentage < 1 ? { minWidth: '4px' } : {};

            // Tooltip text
            const tooltip = `${segment.emotion || 'N/A'} (${start.toFixed(1)}s - ${end.toFixed(1)}s)${showSpeakers && segment.speaker ? ' - ' + segment.speaker : '' }`;

            return (
              <div
                key={index}
                className={`flex items-center justify-center text-xs font-medium overflow-hidden transition-colors duration-150 ${getEmotionColorClass(segment.emotion)}`}
                style={{ width: `${widthPercentage}%`, ...minWidthStyle }}
                title={tooltip}
              >
                {/* Display text only if segment is reasonably wide */}
                 {(widthPercentage > (showSpeakers ? 10 : 5)) && (
                     <span className="truncate px-1 opacity-90 text-xs leading-tight">
                         {showSpeakers && segment.speaker ? `${segment.speaker}: ` : ''}
                         {segment.emotion || 'N/A'}
                     </span>
                 )}
              </div>
            );
          })}
           {/* Display message if duration is zero or invalid */}
           {effectiveTotalDuration <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">Invalid duration</div>
           )}
        </div>
         {/* Time Axis Labels */}
         <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
            <span>0s</span>
            {effectiveTotalDuration > 0 && (
                <span>{effectiveTotalDuration.toFixed(1)}s</span>
            )}
         </div>
      </div>
    </div>
  );
}

export default EmotionTimeline;