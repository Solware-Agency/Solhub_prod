import React from 'react';
import { Card } from '@shared/components/ui/card';
import { cn } from '@shared/lib/cn';
import type { StatType } from '@shared/components/ui/stat-detail-panel';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    icon: React.ReactNode;
    positive?: boolean;
  };
  onClick?: () => void;
  className?: string;
  statType: StatType;
  isSelected?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  onClick,
  className,
  statType,
  isSelected = false,
}) => {
  return (
    <Card 
      className={cn(
        "col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 shadow-lg cursor-pointer",
        isSelected && "border-primary shadow-lg shadow-primary/20",
        className,
        "transition-transform duration-300"
      )}
      onClick={onClick}
      data-stat-type={statType}
    >
      <div className="bg-white dark:bg-background rounded-lg p-3 sm:p-4 md:p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="p-1 sm:p-1.5 md:p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {icon}
          </div>
          {trend && (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`flex items-center ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend.icon}
                <span className="text-xs sm:text-sm font-medium">{trend.value}</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300">{value}</p>
          {description && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;