// src/components/PieChart.jsx
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Re-use the hex color helper function
const getEmotionColorHex = (emotion) => {
    const emoLower = emotion?.toLowerCase() || 'unknown';
    switch (emoLower) {
        case 'happy': return '#4ade80'; case 'sad': return '#60a5fa';
        case 'angry': return '#f87171'; case 'fear': return '#facc15';
        case 'surprise': return '#f472b6'; case 'disgust': return '#a78bfa';
        case 'neutral': return '#9ca3af'; case 'other': return '#cbd5e1';
        case 'unknown': return '#e5e7eb'; default: return '#d1d5db';
    }
};

function PieChart({ data, title = "Distribution" }) {
  // Expect data like: { "Happy": 0.4, "Neutral": 0.3, "Angry": 0.2, "Sad": 0.1 }
  const labels = Object.keys(data || {});
  const values = Object.values(data || {});
  const backgroundColors = labels.map(label => getEmotionColorHex(label));

  if (labels.length === 0 || values.reduce((a, b) => a + b, 0) <= 0) {
     return (
         <div>
             <h4 className="text-md font-medium mb-1 text-gray-600">{title}</h4>
             <p className="text-sm text-gray-500 italic">No data available for chart.</p>
        </div>
     );
  }

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Emotion %',
        data: values.map(v => (v * 100).toFixed(1)), // Show percentages
        backgroundColor: backgroundColors,
        borderColor: '#ffffff', // White border
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Allow controlling size via container
    plugins: {
      legend: {
        position: 'right', // Position legend to the right
        labels: { boxWidth: 12, font: { size: 10 } }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) { label += ': '; }
            if (context.parsed !== null) {
              // Use the raw value (proportion) * 100 for tooltip percentage
               const rawValue = context.dataset.data[context.dataIndex]; // This is already percentage
               label += `${rawValue}%`;
            }
            return label;
          }
        }
      },
      title: { // Add chart title using plugin
           display: true,
           text: title,
           font: { size: 14, weight: '500' },
           padding: { bottom: 10 }
      }
    },
  };

  return (
     // Container to control chart size
     <div className="relative h-48 md:h-56">
        <Pie data={chartData} options={options} />
     </div>
  );
}

export default PieChart;