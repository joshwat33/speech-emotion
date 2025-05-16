import React from 'react';

function SatisfactionPrediction({ prediction }) {
  if (!prediction || typeof prediction.value !== 'number') {
    return (
        <div>
            <h3 className="text-lg font-medium mb-2 text-gray-600">Predicted Customer Satisfaction</h3>
            <p className="text-sm text-gray-500 italic">Prediction not available.</p>
        </div>
    );
  }

  // Use label if provided, otherwise infer from value
  const { value, label: providedLabel } = prediction;
  const percentage = (value * 100).toFixed(1);

  let inferredLabel = 'Neutral';
  let textClass = 'text-yellow-700';
  let bgClass = 'bg-yellow-100';

  if (value >= 0.7) {
    inferredLabel = 'Satisfied';
    textClass = 'text-green-700';
    bgClass = 'bg-green-100';
  } else if (value <= 0.4) {
    inferredLabel = 'Unsatisfied';
    textClass = 'text-red-700';
    bgClass = 'bg-red-100';
  }

  // Prefer backend label if it exists and makes sense, otherwise use inferred
  const displayLabel = providedLabel || inferredLabel;

  // Adjust colors based on the FINAL displayLabel if needed (optional refinement)
  if (displayLabel === 'Satisfied') { textClass = 'text-green-700'; bgClass = 'bg-green-100'; }
  else if (displayLabel === 'Unsatisfied') { textClass = 'text-red-700'; bgClass = 'bg-red-100'; }
  else { textClass = 'text-yellow-700'; bgClass = 'bg-yellow-100'; }


  return (
    <div>
      <h3 className="text-lg font-medium mb-2 text-gray-600">Predicted Customer Satisfaction</h3>
      <div className={`p-3 rounded inline-block ${bgClass} border ${textClass.replace('text-', 'border-').replace('-700', '-300')}`}> {/* Added border */}
        <span className={`text-xl font-bold ${textClass}`}>{displayLabel}</span>
        <span className={`ml-2 text-sm font-medium ${textClass}`}>({percentage}%)</span>
      </div>
    </div>
  );
}

export default SatisfactionPrediction;