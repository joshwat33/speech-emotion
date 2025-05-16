import React from 'react';
import MessageDisplay from './MessageDisplay';
import ChatInput from './ChatInput';

function Chatbot({ messages, onSendMessage, isLoading }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
        Chat with your Data
      </h2>
      {/* Flex container to manage height */}
      <div className="flex flex-col h-[450px] border border-gray-200 rounded">
          {/* Message display takes available space */}
          <MessageDisplay messages={messages} />
          {/* Input is at the bottom */}
          <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>
    </section>
  );
}

export default Chatbot;