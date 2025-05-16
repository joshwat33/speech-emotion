import React from 'react';

function TimeframeSelector({ selectedTimeframe, onTimeframeChange, disabled }) {
  // Define timeframe options directly
  const timeframes = [
    { value: 'last_24_hours', label: 'Last 24 Hours' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'all_time', label: 'All Time' },
    // Example: Add custom date range option if needed later
    // { value: 'custom', label: 'Custom Range...' },
  ];

  return (
    <div>
      <label htmlFor="timeframe-select" className="block text-sm font-medium text-gray-700 mb-1">
        Analyze Data From:
      </label>
      <select
        id="timeframe-select"
        value={selectedTimeframe}
        onChange={(e) => onTimeframeChange(e.target.value)}
        disabled={disabled}
        className={`mt-1 block w-full md:w-auto pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-opacity ${
          disabled ? 'opacity-50 bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'
        }`}
      >
        {timeframes.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TimeframeSelector;