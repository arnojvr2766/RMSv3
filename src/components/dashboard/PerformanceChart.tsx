import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from '../ui/Card';

interface ChartData {
  label: string;
  value: number;
  change?: number;
  color?: string;
}

interface PerformanceChartProps {
  title: string;
  data: ChartData[];
  type: 'bar' | 'line' | 'donut';
  height?: number;
  showTrend?: boolean;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title,
  data,
  type,
  height = 200,
  showTrend = true
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getTrendIcon = (change?: number) => {
    if (!change) return <Minus className="w-3 h-3" />;
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = (change?: number) => {
    if (!change) return 'text-gray-400';
    return change > 0 ? 'text-green-400' : 'text-red-400';
  };

  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">{item.label}</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">R{item.value.toLocaleString()}</span>
              {showTrend && item.change !== undefined && (
                <div className={`flex items-center space-x-1 ${getTrendColor(item.change)}`}>
                  {getTrendIcon(item.change)}
                  <span className="text-xs">{Math.abs(item.change)}%</span>
                </div>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${item.color || 'bg-blue-500'}`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderLineChart = () => (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <line
            key={index}
            x1="0"
            y1={height * ratio}
            x2="100%"
            y2={height * ratio}
            stroke="rgb(55, 65, 81)"
            strokeWidth="1"
          />
        ))}
        
        {/* Data line */}
        <polyline
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
          points={data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = height - (item.value / maxValue) * height;
            return `${x},${y}`;
          }).join(' ')}
        />
        
        {/* Data points */}
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = height - (item.value / maxValue) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="rgb(59, 130, 246)"
              className="hover:r-6 transition-all duration-200"
            />
          );
        })}
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400">
        {data.map((item, index) => (
          <span key={index}>{item.label}</span>
        ))}
      </div>
    </div>
  );

  const renderDonutChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;
    
    return (
      <div className="flex items-center space-x-6">
        <div className="relative w-32 h-32">
          <svg width="128" height="128" className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const circumference = 2 * Math.PI * 50; // radius = 50
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
              
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx="64"
                  cy="64"
                  r="50"
                  fill="none"
                  stroke={item.color || `hsl(${index * 60}, 70%, 50%)`}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{total.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span className="text-sm text-gray-300">{item.label}</span>
              <span className="text-sm font-semibold text-white">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'donut':
        return renderDonutChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="text-sm text-gray-400">
            {data.length} data points
          </div>
        </div>
        
        <div style={{ minHeight: `${height}px` }}>
          {renderChart()}
        </div>
        
        {type === 'line' && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Latest: R{data[data.length - 1]?.value.toLocaleString()}</span>
              <span>Peak: R{maxValue.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PerformanceChart;
