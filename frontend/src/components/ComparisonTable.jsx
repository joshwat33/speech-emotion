import React from 'react';

// Optional helper for consistent emotion styling in table
// *** Customize this to match your backend emotion labels ***
const EmotionCell = ({ emotion }) => {
    const emoLower = emotion?.toLowerCase() || 'n/a';
    let colorClass = 'text-gray-700'; // Default
    switch (emoLower) {
        case 'happy': colorClass = 'text-green-600'; break;
        case 'sad': colorClass = 'text-blue-600'; break;
        case 'angry': colorClass = 'text-red-600'; break;
        case 'fear': colorClass = 'text-yellow-600'; break;
        case 'surprise': colorClass = 'text-pink-600'; break;
        case 'disgust': colorClass = 'text-purple-600'; break;
        case 'neutral': colorClass = 'text-gray-600'; break;
        case 'other': colorClass = 'text-slate-500'; break;
        case 'n/a': colorClass = 'text-gray-400 italic'; break;
        case 'unknown': colorClass = 'text-gray-400 italic'; break;
        case 'oom error': colorClass = 'text-red-400 italic'; break; // Example for error
    }
    // Display the original label from backend
    return <span className={`font-medium ${colorClass}`}>{emotion || 'N/A'}</span>;
};


function ComparisonTable({ comparisonData }) {
   const safeComparisonData = Array.isArray(comparisonData) ? comparisonData : [];

  return (
    <div>
      <h3 className="text-lg font-medium mb-2 text-gray-600">Speech vs. Text Emotion Comparison</h3>
      {safeComparisonData.length > 0 ? (
        <div className="overflow-x-auto custom-scrollbar"> {/* Handle horizontal scroll on small screens */}
            <table className="w-full min-w-[500px] table-auto border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
                <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-600">Time Segment / Speaker</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-600">Speech Emotion</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-600">Text Emotion (Approx. Overlap)</th>
                </tr>
            </thead>
            <tbody className="bg-white">
                {safeComparisonData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-gray-700 whitespace-nowrap">{row.segment || `Segment ${index + 1}`}</td>
                    <td className="border border-gray-300 px-3 py-2"><EmotionCell emotion={row.speechEmotion} /></td>
                    <td className="border border-gray-300 px-3 py-2"><EmotionCell emotion={row.textEmotion} /></td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No comparison data available.</p>
      )}
    </div>
  );
}

export default ComparisonTable;