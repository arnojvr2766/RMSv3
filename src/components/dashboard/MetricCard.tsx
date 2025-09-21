import React from 'react';
import Card from '../ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    data: number[];
    period: string;
  };
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  onClick
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `R${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `R${(val / 1000).toFixed(1)}K`;
      }
      return `R${val.toLocaleString()}`;
    }
    return val;
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'increase':
        return 'text-green-400';
      case 'decrease':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return '↗';
      case 'decrease':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <Card 
      className={`transition-all duration-200 hover:scale-105 hover:shadow-xl ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${iconBgColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          {change && (
            <div className={`text-sm font-medium ${getChangeColor(change.type)}`}>
              <span className="flex items-center gap-1">
                <span>{getChangeIcon(change.type)}</span>
                <span>{Math.abs(change.value)}%</span>
              </span>
              <div className="text-xs text-gray-400">{change.period}</div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            {title}
          </h3>
          <div className="text-3xl font-bold text-white">
            {formatValue(value)}
          </div>
          {change && (
            <div className={`text-sm ${getChangeColor(change.type)}`}>
              {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
              {change.value}% from {change.period}
            </div>
          )}
        </div>

        {trend && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Trend ({trend.period})</span>
              <span className="flex items-center gap-1">
                {trend.data.map((point, index) => (
                  <div
                    key={index}
                    className="w-1 bg-gray-600 rounded-full"
                    style={{ height: `${Math.max(point * 2, 4)}px` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MetricCard;
