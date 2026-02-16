export type PerformanceBucketKey = 'critico' | 'atencao' | 'adequado' | 'excelencia';

export interface PerformanceBucket {
    key: PerformanceBucketKey;
    label: string;
    min: number;
    max: number;
    tone: string;
    bg: string;
    color: string;
}

export const PERFORMANCE_BUCKETS: PerformanceBucket[] = [
    { key: 'critico', label: 'Crítico', min: 0, max: 5.99, tone: 'text-destructive', bg: 'bg-destructive/10', color: '#ef4444' },
    { key: 'atencao', label: 'Atenção', min: 6.0, max: 6.99, tone: 'text-warning', bg: 'bg-warning/10', color: '#f59e0b' },
    { key: 'adequado', label: 'Adequado', min: 7.0, max: 7.99, tone: 'text-success', bg: 'bg-success/10', color: '#10b981' },
    { key: 'excelencia', label: 'Excelência', min: 8.0, max: 10, tone: 'text-info', bg: 'bg-info/10', color: '#3b82f6' },
];

export const BUCKET_COLORS: Record<PerformanceBucketKey, string> = {
    critico: '#ef4444',
    atencao: '#f59e0b',
    adequado: '#10b981',
    excelencia: '#3b82f6',
};

export const classifyAverage = (avg: number): PerformanceBucketKey => {
    if (!Number.isFinite(avg)) return 'critico';
    const clamped = Math.max(0, Math.min(10, avg));
    if (clamped < 6) return 'critico';
    if (clamped < 7) return 'atencao';
    if (clamped < 8) return 'adequado';
    return 'excelencia';
};
