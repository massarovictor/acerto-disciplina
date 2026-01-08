/**
 * Componentes de Gráfico Reutilizáveis para Relatórios
 * Baseados em Recharts com estilo do Design System
 */

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    LineChart,
    Line,
} from 'recharts';
import { REPORT_COLORS, CHART_CONFIG, getChartColor, getGradeColor } from './reportDesignSystem';

// ================ TIPOS ================

interface ChartDataItem {
    name: string;
    value: number;
    [key: string]: any;
}

interface ChartProps {
    data: ChartDataItem[];
    width?: number | string;
    height?: number;
    title?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    animate?: boolean;
}

// ================ TOOLTIP CUSTOMIZADO ================

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
        <div
            style={{
                backgroundColor: CHART_CONFIG.tooltip.backgroundColor,
                border: `1px solid ${CHART_CONFIG.tooltip.borderColor}`,
                borderRadius: CHART_CONFIG.tooltip.borderRadius,
                padding: '8px 12px',
                boxShadow: CHART_CONFIG.tooltip.boxShadow,
            }}
        >
            <p style={{ margin: 0, fontWeight: 600, color: REPORT_COLORS.text.primary }}>
                {label}
            </p>
            {payload.map((entry: any, index: number) => (
                <p key={index} style={{ margin: '4px 0 0', color: entry.color }}>
                    {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</strong>
                </p>
            ))}
        </div>
    );
};

// ================ BAR CHART ================

interface BarChartProps extends ChartProps {
    layout?: 'horizontal' | 'vertical';
    colorByValue?: boolean;
}

export const ReportBarChart: React.FC<BarChartProps> = ({
    data,
    width = '100%',
    height = 250,
    showLegend = false,
    showGrid = true,
    animate = true,
    layout = 'vertical',
    colorByValue = true,
}) => {
    const isHorizontal = layout === 'horizontal';

    return (
        <ResponsiveContainer width={width} height={height}>
            <BarChart
                data={data}
                layout={isHorizontal ? 'vertical' : 'horizontal'}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray={CHART_CONFIG.grid.strokeDasharray}
                        stroke={CHART_CONFIG.grid.stroke}
                        vertical={!isHorizontal}
                        horizontal={isHorizontal}
                    />
                )}
                {isHorizontal ? (
                    <>
                        <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    </>
                ) : (
                    <>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    </>
                )}
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend />}
                <Bar
                    dataKey="value"
                    radius={[4, 4, 4, 4]}
                    isAnimationActive={animate}
                    animationDuration={CHART_CONFIG.animationDuration}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={colorByValue ? getGradeColor(entry.value) : getChartColor(index)}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// ================ PIE CHART ================

interface PieChartProps extends ChartProps {
    innerRadius?: number;
    outerRadius?: number;
    showLabels?: boolean;
}

export const ReportPieChart: React.FC<PieChartProps> = ({
    data,
    width = '100%',
    height = 250,
    showLegend = true,
    animate = true,
    innerRadius = 0,
    outerRadius = 80,
    showLabels = true,
}) => {
    const RADIAN = Math.PI / 180;

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={600}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <ResponsiveContainer width={width} height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    labelLine={false}
                    label={showLabels ? renderCustomizedLabel : undefined}
                    dataKey="value"
                    isAnimationActive={animate}
                    animationDuration={CHART_CONFIG.animationDuration}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color || getChartColor(index)}
                            stroke={REPORT_COLORS.background.card}
                            strokeWidth={2}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {showLegend && (
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => (
                            <span style={{ color: REPORT_COLORS.text.secondary, fontSize: 12 }}>{value}</span>
                        )}
                    />
                )}
            </PieChart>
        </ResponsiveContainer>
    );
};

// ================ RADAR CHART ================

interface RadarChartProps extends ChartProps {
    maxValue?: number;
}

export const ReportRadarChart: React.FC<RadarChartProps> = ({
    data,
    width = '100%',
    height = 250,
    animate = true,
    maxValue = 10,
}) => {
    return (
        <ResponsiveContainer width={width} height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke={CHART_CONFIG.grid.stroke} />
                <PolarAngleAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: REPORT_COLORS.text.secondary }}
                />
                <PolarRadiusAxis
                    angle={30}
                    domain={[0, maxValue]}
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                />
                <Radar
                    name="Média"
                    dataKey="value"
                    stroke={REPORT_COLORS.primary}
                    fill={REPORT_COLORS.primary}
                    fillOpacity={0.3}
                    isAnimationActive={animate}
                    animationDuration={CHART_CONFIG.animationDuration}
                />
                <Tooltip content={<CustomTooltip />} />
            </RadarChart>
        </ResponsiveContainer>
    );
};

// ================ LINE CHART ================

interface LineChartProps extends ChartProps {
    showDots?: boolean;
    curveType?: 'monotone' | 'linear';
}

export const ReportLineChart: React.FC<LineChartProps> = ({
    data,
    width = '100%',
    height = 250,
    showLegend = false,
    showGrid = true,
    animate = true,
    showDots = true,
    curveType = 'monotone',
}) => {
    return (
        <ResponsiveContainer width={width} height={height}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray={CHART_CONFIG.grid.strokeDasharray}
                        stroke={CHART_CONFIG.grid.stroke}
                    />
                )}
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend />}
                <Line
                    type={curveType}
                    dataKey="value"
                    stroke={REPORT_COLORS.primary}
                    strokeWidth={3}
                    dot={showDots ? { fill: REPORT_COLORS.primary, strokeWidth: 2, r: 4 } : false}
                    activeDot={{ r: 6, fill: REPORT_COLORS.primaryDark }}
                    isAnimationActive={animate}
                    animationDuration={CHART_CONFIG.animationDuration}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

// ================ DONUT CHART (Alias) ================

export const ReportDonutChart: React.FC<PieChartProps> = (props) => (
    <ReportPieChart {...props} innerRadius={50} outerRadius={80} />
);
