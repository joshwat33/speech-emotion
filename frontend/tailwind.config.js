/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // Include all relevant file types
    ],
    theme: {
      extend: {
         colors: {
          emotion: { // Match backend mapping or adjust as needed
            happy: '#4ade80',    // green-400
            sad: '#60a5fa',      // blue-400
            angry: '#f87171',    // red-400
            fear: '#facc15',     // yellow-400
            surprise: '#f472b6', // pink-400
            disgust: '#a78bfa', // violet-400
            neutral: '#9ca3af', // gray-400
            other: '#cbd5e1',    // slate-300
            'oom error': '#fecaca', // red-200 (Example for error state)
            'unknown': '#e5e7eb', // gray-200
          },
        },
      },
    },
    plugins: [],
  }