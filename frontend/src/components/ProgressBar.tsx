import React from 'react';

interface ProgressBarProps {
  total: number;
  completed: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ total, completed, className = '' }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-end mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Overall Compliance</h3>
          <p className="text-sm text-gray-500 mt-1">
            {completed} of {total} requirements met
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-blue-600">{percentage}%</span>
        </div>
      </div>
      
      <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs font-medium text-gray-400 mt-2 uppercase tracking-wide">
        <span>Start</span>
        <span>Target: 100%</span>
      </div>
    </div>
  );
};

export default ProgressBar;
