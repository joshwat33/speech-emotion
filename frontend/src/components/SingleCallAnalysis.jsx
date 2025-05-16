import React from 'react';

// Import all necessary components
import AudioPlayer from './AudioPlayer';
import SpeakerSegments from './SpeakerSegments';
import PieChart from './PieChart';
import BarChart from './BarChart';
import EmotionLineGraph from './LineChart';
import EmotionTimeline from './EmotionTimeline';
import TranscriptionDisplay from './TranscriptionDisplay';
import SatisfactionPrediction from './SatisfactionPrediction';
import ComparisonTable from './ComparisonTable';
import WordCloud from './WordCloud';

function SingleCallAnalysis({ result }) {
  if (!result) return null; // Don't render if no result data

  // Construct full URL for original audio if needed (depends on backend response)
  // Example: const fullOriginalAudioUrl = API_BASE_URL + result.originalAudioUrl;
  const fullOriginalAudioUrl = result.originalAudioUrl; // Assuming backend provides full URL or relative path handled by server

  // Prepare data for Speech Emotion Pie Chart
  const speechEmotionPieData = result.speechEmotionOverall || {};
  console.log("Speech Emotion Pie Data:", speechEmotionPieData);
  console.log("Result Data:", result);
  const speechEmotionBarData = result.speechEmotionTimeline || {};
  // Prepare data for Overall Text Sentiment display
  const overallSentiment = result.textSentimentOverall || {};
  const dominantSentiment = overallSentiment.dominant || 'N/A';
  const dominantScore = overallSentiment.scores
        ? (overallSentiment.scores[dominantSentiment] * 100).toFixed(1)
        : 'N/A';

  return (
    <section className="bg-white p-4 md:p-6 rounded-lg shadow-md space-y-8"> {/* Added more spacing */}
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6">
        Analysis Results: <span className="font-normal text-xl">{result.fileName}</span>
      </h2>

      {/* --- Section 1: Original Audio & Diarization --- */}
      <div className="p-4 border rounded-md bg-gray-50 shadow-sm">
         <h3 className="text-xl font-semibold text-indigo-700 mb-4">Call Overview & Speakers</h3>
         <div className="space-y-4">
             {/* Playable Original Audio */}
             <div>
                 <h4 className="text-md font-medium mb-2 text-gray-600">Original Recording</h4>
                 <AudioPlayer src={fullOriginalAudioUrl} title={result.fileName || "Original Audio"}/>
             </div>
             {/* Speaker Segments */}
             <SpeakerSegments speakersData={result.speakers} />
         </div>
      </div>


      {/* --- Section 2: Speech Emotion Analysis --- */}
      <div className="p-4 border rounded-md bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-teal-700 mb-4">Speech Emotion Analysis</h3>
          <div className="space-y-6">
             {/* Overall Speech Emotion Pie Chart */}
             <PieChart data={speechEmotionPieData} title="Overall Speech Emotion Distribution"/>

             {/* Speech Emotion Timeline */}
             <EmotionTimeline
                  title="Speech Emotion Timeline (Per Turn)"
                  timelineData={result.speechEmotionTimeline}
                  showSpeakers={true}
                  totalDuration={result.audioDuration}
             />
             <EmotionLineGraph speechEmotionTimeline={result.speechEmotionTimeline} />
             {/* Optional: Display all scores */}
             {/* <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(result.speechEmotionTimeline, null, 2)}</pre> */}
          </div>
      </div>


      {/* --- Section 3: Sentiment Analysis (Text-Based) --- */}
       <div className="p-4 border rounded-md bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-blue-700 mb-4">Emotion Analysis (from Transcription)</h3>
          <div className="space-y-6">
             {/* Transcription */}
             <TranscriptionDisplay transcriptionText={result.transcription} />

             {/* Overall Text Sentiment */}
              <div>
                 <h4 className="text-md font-medium mb-2 text-gray-600">Overall Text Sentiment</h4>
                 {dominantSentiment !== 'N/A' ? (
                    <p className="text-lg font-semibold">
                        {dominantSentiment}
                        <span className="text-sm font-normal text-gray-600 ml-2">({dominantScore}%)</span>
                    </p>
                 ) : (
                     <p className="text-sm text-gray-500 italic">Overall sentiment not available.</p>
                 )}
                 {/* Optional: Display all scores */}
                 {/* <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(overallSentiment.scores, null, 2)}</pre> */}
             </div>


             {/* Text Emotion Timeline */}
             <EmotionTimeline
                  title="Text Sentiment Timeline (Approx.)"
                  timelineData={result.textEmotionTimeline}
                  showSpeakers={false}
                  totalDuration={result.audioDuration}
             />
          </div>
       </div>


       {/* --- Section 4: Final Report --- */}
       <div className="p-4 border rounded-md bg-indigo-50 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Analysis Report</h3>
           <div className="space-y-6">
             {/* Comparison Table */}
             <ComparisonTable comparisonData={result.emotionComparison} />

             {/* Word Cloud */}
             <WordCloud
                  title={`Word Cloud`} // Simplified title
                  wordCloudData={result.wordCloudData}
                  triggerButtonText="View Word Cloud"
             />

             {/* Satisfaction Prediction */}
             <SatisfactionPrediction prediction={result.satisfactionPrediction} />
           </div>
       </div>

    </section>
  );
}

export default SingleCallAnalysis;