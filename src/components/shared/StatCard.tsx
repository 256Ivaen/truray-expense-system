import React from 'react';
import { type LucideProps } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<LucideProps>;
  color?: "default" | "lime";
  loading?: boolean;
}

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "default",
  loading = false 
}: StatCardProps) => {
  const cardClasses = color === "lime" 
    ? "bg-lime-50 dark:bg-lime-900/30 border-lime-200 dark:border-lime-800"
    : "bg-white border-gray-200";

  const textClasses = color === "lime"
    ? "text-lime-900 dark:text-lime-200"
    : "text-gray-500";

  const valueClasses = color === "lime"
    ? "text-lime-950 dark:text-lime-50"
    : "text-gray-900";

  const iconClasses = color === "lime"
    ? "text-lime-900 dark:text-lime-200"
    : "text-gray-400";

  return (
    <div className={`rounded-xl border p-4 h-full overflow-hidden ${cardClasses}`}>
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <p className={`font-medium text-xs ${textClasses}`}>
            {loading ? <SkeletonBox className="h-3 w-16" /> : title}
          </p>
          {loading ? (
            <SkeletonBox className="h-4 w-4 rounded-full" />
          ) : (
            <Icon className={`w-4 h-4 ${iconClasses}`} />
          )}
        </div>
        <div className="mb-2">
          {loading ? (
            <SkeletonBox className="h-6 w-12 mb-1" />
          ) : (
            <span className={`text-xl font-bold ${valueClasses}`}>
              {value}
            </span>
          )}
        </div>
        {loading ? (
          <SkeletonBox className="h-3 w-20" />
        ) : (
          <p className={`text-xs ${textClasses}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

