// src/components/EmotionLineGraph.jsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// Helper: map emotions to numeric levels
const emotionToLevel = (emotion) => {
  const map = {
    Calm : 6,
    Surprise: 5,
    Happy: 4,
    Neutral: 3,
    Fear: 2,
    Sad: 1,
    Angry: 0,
  };
  return map[emotion] ?? 0;
};

// Helper: reverse map for Y-axis ticks
const levelToEmotion = {
  0: 'Angry',
  1: 'Sad',
  2: 'Fear',
  3: 'Neutral',
  4: 'Happy',
  5: 'Surprise',
  6: 'Calm'
};

// 1. Sort the data by start time
//const sortedTimeline = [...speechEmotionTimeline].sort((a, b) => a.start - b.start);

// Assign each speaker a color
const getSpeakerColor = (speaker) => {
  const colors = {
    SPEAKER_00: 'rgba(75, 192, 192, 1)',
    SPEAKER_01: 'rgba(255, 99, 132, 1)',
    SPEAKER_02: 'rgba(153, 102, 255, 1)',
  };
  return colors[speaker] || 'rgba(100, 100, 100, 1)';
};

function EmotionLineGraph({ speechEmotionTimeline }) {
  // ✅ Sort data by start time inside the component
  const sortedTimeline = [...speechEmotionTimeline].sort((a, b) => a.start - b.start);

  const speakers = [...new Set(sortedTimeline.map(item => item.speaker))];

  const datasets = speakers.map(speaker => {
    const speakerData = sortedTimeline.filter(item => item.speaker === speaker);

    return {
      label: speaker,
      data: speakerData.map(item => ({
        x: item.start,
        y: emotionToLevel(item.emotion),
        label: `${item.start.toFixed(2)}s - ${item.end.toFixed(2)}s` // optional, for tooltip
      })),      
      borderColor: getSpeakerColor(speaker),
      backgroundColor: getSpeakerColor(speaker),
      tension: 0.3
    };
  });

  const chartData = {
    datasets
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            const emotion = levelToEmotion[context.parsed.y];
            const time = context.raw.label || `${context.parsed.x}s`;
            return `${context.dataset.label}: ${emotion} (${time})`;
          }          
        }
      },
      title: {
        display: true,
        text: 'Emotions Over Time (Line Chart)'
      }
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Start Time (s)' },
        ticks: {
          callback: function(value) {
            return `${value}s`;
          }
        }
      },
      y: {
        title: { display: true, text: 'Emotion' },
        ticks: {
          callback: function(value) {
            return levelToEmotion[value] || '';
          },
          stepSize: 1,
          min: 0,
          max: 6
        }
      }
    }
  };

  return (
    <div className="w-full h-[400px]">
      <Line data={chartData} options={options} />
    </div>
  );
}


export default EmotionLineGraph;
