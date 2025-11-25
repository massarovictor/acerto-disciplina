// Reusable Horizontal Bar Chart Component for Reports

import { Badge } from '@/components/ui/badge';

interface HorizontalBarChartProps {
  data: {
    label: string;
    value: number;
    maxValue?: number;
  }[];
  height?: number;
  showValues?: boolean;
  colorFunction?: (value: number) => string;
}

export const HorizontalBarChart = ({
  data,
  height = 300,
  showValues = true,
  colorFunction = (value: number) => {
    if (value >= 7) return 'bg-green-500';
    if (value >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  },
}: HorizontalBarChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Sem dados para exibir
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.maxValue || d.value), 10);

  return (
    <div className="space-y-3" style={{ maxHeight: height, overflowY: 'auto' }}>
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const barColor = colorFunction(item.value);

        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate flex-1 mr-2">{item.label}</span>
              {showValues && (
                <Badge
                  variant={item.value >= 7 ? 'default' : item.value >= 6 ? 'secondary' : 'destructive'}
                  className="ml-2"
                >
                  {item.value.toFixed(1)}
                </Badge>
              )}
            </div>
            <div className="w-full bg-secondary h-6 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
              {percentage > 15 && showValues && (
                <span className="absolute inset-0 flex items-center justify-start pl-3 text-xs font-medium text-white">
                  {item.value.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};







