import React, { useState } from 'react';

function ChatInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage(''); // Clear input after sending
    }
  };

  const handleKeyDown = (e) => {
      // Send message on Enter key press, unless Shift+Enter is pressed
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault(); // Prevent newline in input
          handleSubmit(e);
      }
  };

  return (
    // Added border-t for visual separation
    <form onSubmit={handleSubmit} className="flex p-3 space-x-2 items-center border-t bg-gray-100 rounded-b">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown} // Handle Enter key press
        placeholder="Ask about your call data..."
        disabled={isLoading}
        className={`flex-grow border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-opacity text-sm ${ // Made text sm
            isLoading ? 'opacity-50 bg-gray-200 cursor-not-allowed' : 'bg-white'
        }`}
        aria-label="Chat message input"
      />
      <button
        type="submit"
        disabled={isLoading || !message.trim()}
        className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    ${isLoading || !message.trim() ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}
        `}
        aria-label="Send chat message"
      >
         {isLoading ? (
             // Simple loading dots
             <span className="inline-block w-16 text-center">
                <span className="animate-pulse">...</span>
             </span>
         ) : (
           'Send'
         )}
      </button>
    </form>
  );
}

export default ChatInput;