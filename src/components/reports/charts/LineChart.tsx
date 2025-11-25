// Reusable Line Chart Component for Reports

interface LineChartProps {
  data: {
    label: string;
    value: number;
  }[];
  height?: number;
  color?: string;
  showPoints?: boolean;
  showGrid?: boolean;
}

export const LineChart = ({
  data,
  height = 120,
  color = 'rgb(59, 130, 246)', // blue-500
  showPoints = true,
  showGrid = true,
}: LineChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Sem dados para exibir
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Calcular pontos do gráfico
  const width = 100; // porcentagem
  const padding = 5;
  const chartWidth = width - (padding * 2);
  const stepX = chartWidth / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padding + (i * stepX);
    const y = 100 - ((d.value - minValue) / range) * 80 - 10; // 10% padding top/bottom
    return { x, y, value: d.value, label: d.label };
  });

  // Criar path SVG
  const pathData = points.reduce((path, point, i) => {
    const command = i === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x},${point.y}`;
  }, '');

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 25, 50, 75, 100].map(y => (
              <line
                key={y}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Area under curve */}
        <path
          d={`${pathData} L ${width - padding},100 L ${padding},100 Z`}
          fill={color}
          opacity="0.1"
        />

        {/* Points */}
        {showPoints && points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className="text-center" style={{ width: `${100 / data.length}%` }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};







