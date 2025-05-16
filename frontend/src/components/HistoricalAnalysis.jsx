import React from 'react';
import TimeframeSelector from './TimeframeSelector';
import WordCloud from './WordCloud'; // Re-using the WordCloud component
import SatisfactionPrediction from './SatisfactionPrediction';

// Expects historicalData.wordCloudData to be base64
function HistoricalAnalysis({ selectedTimeframe, onTimeframeChange, historicalData, isLoading }) {

  // Helper to format timeframe label nicely
  const formatTimeframeLabel = (tf) => {
      return tf.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <section className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">
        Historical Call Analysis
      </h2>

      {/* Timeframe Selector */}
      <TimeframeSelector
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={onTimeframeChange}
        disabled={isLoading}
      />

      {/* Loading Indicator */}
       {isLoading && (
          <div className="text-center py-4">
             <div className="flex justify-center items-center space-x-2">
                 <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-blue-600">Loading historical data...</p>
             </div>
          </div>
       )}

       {/* Content Area when not loading */}
       {!isLoading && (
          <div className="space-y-4">
            {/* Aggregated Word Cloud (Conditional) */}
            {historicalData ? (
              <>
                {historicalData.wordCloudData ? (
                  <p className="text-green-600 text-sm">✅ Word Cloud Data Received</p>
                ) : (
                  <p className="text-red-600 text-sm">❌ No Word Cloud Data</p>
                )}

                <WordCloud
                  title={`Aggregated Word Cloud (${formatTimeframeLabel(selectedTimeframe)})`}
                  wordCloudData={historicalData.wordCloudData}
                  triggerButtonText="View Aggregated Word Cloud"
                />
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">No historical data loaded for the selected timeframe.</p>
            )}


            {/* Display other aggregated metrics if available */}
            {/*historicalData?.averageSatisfaction && (
                 <div>
                     <h3 className="text-lg font-medium mb-2 text-gray-600">Average Satisfaction ({formatTimeframeLabel(selectedTimeframe)})</h3>
                     <SatisfactionPrediction prediction={historicalData.averageSatisfaction} />
                 </div>
            )*/}

            {/* Placeholder for other historical charts/reports */}
            {/* <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-medium mb-2 text-gray-600">Other Aggregated Reports</h3>
              <p className="text-sm text-gray-500 italic">Future reports will appear here...</p>
            </div> */}
        </div>
       )}


    </section>
  );
}

export default HistoricalAnalysis;