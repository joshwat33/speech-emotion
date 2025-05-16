// frontend/src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import AudioUpload from './components/AudioUpload';
import SingleCallAnalysis from './components/SingleCallAnalysis'; // Uses the refactored version
import HistoricalAnalysis from './components/HistoricalAnalysis';
import Chatbot from './components/Chatbot';

// *** IMPORTANT: Make sure this matches where your backend is running ***
//const API_BASE_URL = "http://localhost:8000";
const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // For upload start and final result fetch
  const [isPolling, setIsPolling] = useState(false); // Specifically for status polling
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, pending, processing, complete, error
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedTimeframe, setSelectedTimeframe] = useState('last_7_days');
  const [historicalData, setHistoricalData] = useState(null);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you analyze your call data?' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const pollingIntervalRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // --- Polling Function ---
  const pollAnalysisStatus = useCallback(async (taskId) => {
    console.log(`Polling status for task: ${taskId}`);
    try {
      const response = await fetch(`${API_BASE_URL}/status/${taskId}`);
      if (!response.ok) {
        // Handle 404 specifically - task might have been cleaned up or ID is wrong
        if (response.status === 404) {
            throw new Error(`Task ID ${taskId} not found.`);
        }
        throw new Error(`HTTP error checking status! status: ${response.status}`);
      }
      const data = await response.json();

      // If component unmounted or task changed while polling, stop
      if (data.task_id !== currentTaskId) {
           console.log("Task ID changed during polling, stopping poll for", data.task_id);
           if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
           pollingIntervalRef.current = null;
           setIsPolling(false);
           return;
      }

      setUploadStatus(data.status); // Update status first

      if (data.status === 'complete') {
        console.log(`Task ${taskId} complete. Fetching results...`);
        if(pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
        setIsLoading(true); // Show loading while fetching final results

        try {
             const resultResponse = await fetch(`${API_BASE_URL}/analysis/${taskId}`);
             const resultData = await resultResponse.json(); // Attempt to parse JSON regardless of status code

             if (!resultResponse.ok) {
                 // Use error detail from backend response if available
                  throw new Error(resultData.detail || `Failed to fetch analysis results. Status: ${resultResponse.status}`);
             }

             // Check for error field within successful response (shouldn't happen if backend uses HTTP errors correctly)
             if (resultData.error) {
                 setUploadStatus('error');
                 setErrorMessage(resultData.error);
                 setAnalysisResult(null);
             } else {
                 // *** Process URLs: Prepend API base URL if backend provides relative paths ***
                 const processedResult = {
                      ...resultData,
                      // Example: If originalAudioUrl = /api/audio/task/file.wav
                      originalAudioUrl: resultData.originalAudioUrl ? `${API_BASE_URL}${resultData.originalAudioUrl}` : null,
                      speakers: (resultData.speakers || []).map(sp => ({
                           ...sp,
                           segments: (sp.segments || []).map(seg => ({
                               ...seg,
                               audioUrl: seg.audioUrl ? `${API_BASE_URL}${seg.audioUrl}` : null
                           }))
                      }))
                 };
                 setAnalysisResult(processedResult); // Set the processed result
                 setUploadStatus('complete'); // Ensure status is final
             }
        } catch(fetchError) {
             console.error("Error fetching analysis results:", fetchError);
             setUploadStatus('error');
             setErrorMessage(`Failed to load results: ${fetchError.message}`);
             setAnalysisResult(null);
        } finally {
             setIsLoading(false); // Done loading results (or failed)
        }


      } else if (data.status === 'error') {
        console.error(`Task ${taskId} failed on backend.`);
        if(pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
        setIsLoading(true); // Show loading while fetching error details
        setAnalysisResult(null);

        try {
            // Fetch error details from the analysis endpoint
            const errorDetailsResponse = await fetch(`${API_BASE_URL}/analysis/${taskId}`);
            const errorData = await errorDetailsResponse.json(); // Will contain 'detail' on error
             // Prefer detail from error response, fallback messages
            setErrorMessage(errorData.detail || 'Analysis failed with an unknown error.');
        } catch(errorDetailsError) {
             console.error("Could not fetch error details:", errorDetailsError)
             setErrorMessage('Analysis failed and error details could not be retrieved.');
        } finally {
            setIsLoading(false); // Done trying to load error details
        }


      } else if (data.status === 'pending' || data.status === 'processing') {
        // Continue polling
        setIsPolling(true); // Explicitly manage polling state
        setIsLoading(false); // Not loading final results yet
      } else {
           // Unknown status from backend
           console.warn("Received unknown status:", data.status);
           setUploadStatus('error');
           setErrorMessage(`Unknown analysis status received: ${data.status}`);
            if(pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setIsPolling(false);
            setIsLoading(false);
      }

    } catch (error) {
      console.error("Polling failed:", error);
      setErrorMessage(`Polling error: ${error.message}`);
      setUploadStatus('error');
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
       pollingIntervalRef.current = null;
      setIsPolling(false);
      setIsLoading(false);
      setAnalysisResult(null);
    }
  // Include currentTaskId in dependencies to re-evaluate if the task changes
  }, [currentTaskId]);

  // --- Effect to start/stop polling ---
  useEffect(() => {
    // Start polling only if we have a task ID, status is pollable, and not already polling
    if (currentTaskId && (uploadStatus === 'pending' || uploadStatus === 'processing') && !pollingIntervalRef.current) {
      setIsPolling(true);
      setErrorMessage(''); // Clear previous errors
      setAnalysisResult(null); // Clear previous results

      console.log(`Starting polling for task ${currentTaskId} with status ${uploadStatus}`);
      // Initial poll immediately
      pollAnalysisStatus(currentTaskId);

      // Set interval for subsequent polls
      pollingIntervalRef.current = setInterval(() => {
         // Check inside interval if we should still be polling
         if (currentTaskId && (uploadStatus === 'pending' || uploadStatus === 'processing')) {
              pollAnalysisStatus(currentTaskId);
         } else {
             console.log("Status changed, stopping interval timer.");
             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
             pollingIntervalRef.current = null;
             setIsPolling(false); // Ensure polling state is false
         }
      }, 5000); // Poll every 5 seconds
    }

    // Cleanup: Stop polling if status becomes final or task ID is cleared
    if (uploadStatus === 'complete' || uploadStatus === 'error' || !currentTaskId) {
       if (pollingIntervalRef.current) {
           console.log(`Clearing polling interval due to status (${uploadStatus}) or no task ID.`);
           clearInterval(pollingIntervalRef.current);
           pollingIntervalRef.current = null;
       }
       // Ensure polling state is false if interval is cleared
       if (isPolling) setIsPolling(false);
    }

    // Effect cleanup function also clears interval
    return () => {
      if (pollingIntervalRef.current) {
        console.log("Clearing polling interval on effect cleanup.");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // Add isPolling to dependencies? No, it causes loops. Rely on status/taskId.
  }, [currentTaskId, uploadStatus, pollAnalysisStatus]);


  // --- Handlers ---
  const handleFileUpload = async (file) => {
    if (!file || isLoading || isPolling) return; // Prevent new upload while busy

    // Reset state for new upload
    setUploadedFileName(file.name);
    setAnalysisResult(null);
    setCurrentTaskId(null); // Clear previous task ID
    setErrorMessage('');
    setIsLoading(true); // Set loading true for upload itself
    setUploadStatus('uploading');
    setIsPolling(false); // Ensure polling is reset
     if (pollingIntervalRef.current) { // Clear any previous polling interval
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
     }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json(); // Try parsing JSON always

      if (!response.ok) {
        throw new Error(data.detail || `Upload failed. Status: ${response.status}`);
      }

      console.log("Upload successful:", data);
      setCurrentTaskId(data.task_id); // Set the NEW task ID
      setUploadStatus('pending'); // Analysis is now pending, polling will start
      setIsLoading(false); // Upload finished, now waiting for polling

    } catch (error) {
      console.error("Upload failed:", error);
      setErrorMessage(`Upload failed: ${error.message}`);
      setUploadStatus('error');
      setIsLoading(false);
      setCurrentTaskId(null);
       setIsPolling(false); // Ensure polling is stopped on error
    }
  };

  // Fetch historical data
   useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsHistoricalLoading(true);
      setHistoricalData(null);
      console.log(`Fetching historical data for timeframe: ${selectedTimeframe}`);
      try {
        const response = await fetch(`${API_BASE_URL}/historical?timeframe=${selectedTimeframe}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Failed to fetch historical data."}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Pass base64 data directly if component expects it
        setHistoricalData(data);
      } catch (error) {
         console.error("Error fetching historical data:", error);
      } finally {
          setIsHistoricalLoading(false);
      }
    };
    fetchHistoricalData();
  }, [selectedTimeframe]);

  const handleSendMessage = async (message) => {
    if (!message.trim() || isChatLoading) return;
    const newUserMessage = { sender: 'user', text: message };
    setChatMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsChatLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: 'Failed to get chat response.',
        }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Chat API response:', data);
      const botText =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply
          : 'Sorry, no valid response received.';
      const botResponse = { sender: 'bot', text: botText };
      setChatMessages(prevMessages => [...prevMessages, botResponse]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorResponse = {
        sender: 'bot',
        text: `Sorry, I encountered an error: ${error.message}`,
      };
      setChatMessages(prevMessages => [...prevMessages, errorResponse]);
    } finally {
      setIsChatLoading(false);
    }
  };
  


  // --- Render Logic ---
  // Determine overall loading state for UI feedback
  const showProcessingIndicator = uploadStatus === 'pending' || uploadStatus === 'processing' || isPolling;
  const showAnalysisContent = analysisResult && uploadStatus === 'complete' && !isLoading && !isPolling;
  const showUploadError = uploadStatus === 'error' && !isLoading && !isPolling;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header title="Customer Call Analyzer" />

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* --- Upload Section --- */}
        <AudioUpload
          onFileUpload={handleFileUpload}
          status={uploadStatus}
          // Disable upload if loading, polling, or processing
          isLoading={isLoading || isPolling || uploadStatus === 'processing' || uploadStatus === 'pending' || uploadStatus === 'uploading'}
          fileName={uploadedFileName}
          taskId={currentTaskId}
          errorMessage={errorMessage} // Pass error message if needed by component
        />

        {/* --- Processing/Polling Indicator --- */}
        {showProcessingIndicator && (
          <div className="bg-white p-6 rounded-lg shadow-md text-center border border-blue-200 animate-pulse">
             <div className="flex justify-center items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg text-blue-600 font-medium">
                    {uploadStatus === 'pending' ? 'Analysis Queued...' : 'Analyzing Call...'}
                </p>
             </div>
             <p className="text-sm text-gray-500 mt-2">File: {uploadedFileName}</p>
          </div>
        )}

        {/* --- Analysis Results Section --- */}
        {showAnalysisContent && (
          <SingleCallAnalysis result={analysisResult} />
        )}

         {/* --- Error Display --- */}
         {showUploadError && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md relative" role="alert">
                <strong className="font-bold">Analysis Failed!</strong>
                <span className="block sm:inline ml-2">{errorMessage || 'An unknown error occurred.'}</span>
             </div>
         )}

        {/* --- Historical Analysis Section --- */}
        <HistoricalAnalysis
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
            // Pass base64 data directly if WordCloud expects it
            historicalData={historicalData}
            isLoading={isHistoricalLoading}
        />

        {/* --- Chatbot Section --- */}
        <Chatbot
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
        />
      </main>

      <footer className="text-center text-gray-500 text-sm py-6 mt-8 border-t border-gray-200">
        © {new Date().getFullYear()} Call Analysis Inc. - Internal Tool
      </footer>
    </div>
  );
}

export default App;