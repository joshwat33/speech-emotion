import React, { useRef, useEffect } from 'react';

function MessageDisplay({ messages }) {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [messages]);

    return (
        <div ref={containerRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {Array.isArray(messages) && messages.map((msg, index) => {
                if (!msg || typeof msg.text !== 'string') {
                    console.warn('Skipped malformed message:', msg); // Helpful log
                    return null; // Skip rendering
                }

                return (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[80%] md:max-w-[70%] px-4 py-2 rounded-lg shadow-sm text-sm ${
                                msg.sender === 'user'
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                            }`}
                        >
                            {msg.text.split('\n').map((line, i) => (
                                <span key={i} className="block">{line}</span>
                            ))}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageDisplay;
