import React, { useRef, useState } from 'react';

function AudioPlayer({ src, title = "Audio Player" }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  if (!src) {
    return <p className="text-sm text-gray-500 italic">Audio source not available.</p>;
  }

  const handlePlayPause = () => {
     if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                 console.error("Audio play error:", err);
                 setError(`Error playing audio: ${err.message}`);
            });
        }
     }
  };

  const handleAudioError = (e) => {
     console.error("Audio Element Error:", e.target.error);
     setError(`Could not load/play audio. Code: ${e.target.error?.code}`);
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded border border-gray-300">
       <button
           onClick={handlePlayPause}
           className="p-1 text-blue-600 hover:text-blue-800 focus:outline-none"
           aria-label={isPlaying ? "Pause" : "Play"}
           title={isPlaying ? "Pause" : "Play"}
           disabled={!!error} // Disable if error
       >
          {/* Basic Play/Pause Icon */}
          {isPlaying ? (
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
             </svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
             </svg>
          )}
       </button>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata" // Load only metadata initially
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={handleAudioError}
        className="hidden" // Hide default controls, use custom button
      />
      <span className="text-sm text-gray-700 truncate" title={title}>{title}</span>
      {error && <span className="text-xs text-red-600 ml-auto">{error}</span>}
    </div>
  );
}

export default AudioPlayer;