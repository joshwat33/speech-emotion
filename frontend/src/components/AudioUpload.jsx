import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

// Added taskId and errorMessage props
function AudioUpload({ onFileUpload, status, isLoading, fileName, taskId, errorMessage }) {

  const onDrop = useCallback((acceptedFiles) => {
    if (isLoading) return; // Don't allow drop if already processing
    if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        // Basic audio type check (can be enhanced on backend too)
        if (file.type.startsWith('audio/')) {
            onFileUpload(file); // Trigger the upload process passed from App
        } else {
            alert("Please upload a valid audio file (e.g., wav, mp3, m4a).");
        }
    }
  }, [onFileUpload, isLoading]); // Added isLoading dependency

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { // Define acceptable MIME types for better user feedback
          'audio/wav': ['.wav'],
          'audio/mpeg': ['.mp3'],
          'audio/ogg': ['.ogg'],
          'audio/aac': ['.aac'],
          'audio/flac': ['.flac'],
          'audio/x-m4a': ['.m4a'], // Common for m4a
          'audio/*': [] // Fallback for others
      },
      multiple: false,
      disabled: isLoading // Disable dropzone while loading/processing
  });

   const handleManualUpload = (event) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('audio/')) {
          onFileUpload(file);
      } else if (file) {
           alert("Please upload a valid audio file.");
           event.target.value = null; // Reset input
      }
  }

  // Status message logic (simplified as main status/error shown in App.jsx)
  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return <p className="text-blue-600 font-medium mt-2">Uploading: {fileName}...</p>;
      case 'pending':
         // Show Task ID briefly
        return <p className="text-purple-600 font-medium mt-2">Analysis Queued: {fileName} (Task: {taskId?.substring(0, 8)}...)</p>;
      case 'complete':
        return <p className="text-green-600 font-medium mt-2">Analysis Complete: {fileName}</p>;
      // Processing and Error states are handled more prominently in App.jsx
      case 'processing':
      case 'error':
        return null;
      default: // idle
         return fileName ? <p className="text-gray-600 mt-2">Ready to upload: {fileName}</p> : null;
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload New Call Recording</h2>

      {/* Drag-and-drop Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ease-in-out
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`} // Added disabled style
      >
        <input {...getInputProps()} disabled={isLoading} />
        {isLoading ? (
             <p className="text-gray-500">Processing previous upload...</p>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop the audio file here...</p>
        ) : (
          <p className="text-gray-500">Drag 'n' drop audio file here, or click to select</p>
        )}
         <p className="text-xs text-gray-400 mt-1">(WAV, MP3, M4A, etc.)</p>
      </div>

      {/* Fallback/Alternative File Input */}
       <div className="mt-4 text-center">
          <label htmlFor="file-upload" className={`
              inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded cursor-pointer transition-colors
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
              Or Choose File
          </label>
          <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="audio/*" // Keep broad accept here for the button
              onChange={handleManualUpload}
              disabled={isLoading}
          />
      </div>

      {/* Status Indicator */}
      <div className="mt-4 text-center h-6"> {/* Reserve space for status */}
        {getStatusMessage()}
      </div>

    </section>
  );
}

export default AudioUpload;