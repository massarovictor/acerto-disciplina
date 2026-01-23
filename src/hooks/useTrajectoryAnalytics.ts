import { useMemo } from 'react';
import { useGradesAnalytics, useHistoricalGradesAnalytics } from '@/hooks/useData';
import { QUARTERS } from '@/lib/subjects';
import { PERFORMANCE_BUCKETS, classifyAverage, PerformanceBucketKey } from '@/lib/analytics/clusters';

const FUNDAMENTAL_YEARS = [6, 7, 8, 9];
const MEDIO_YEARS = [1, 2, 3];
const YEARS_ORDER = [...FUNDAMENTAL_YEARS, ...MEDIO_YEARS];

interface UseTrajectoryAnalyticsProps {
    classIds: string[];
    studentIds: string[];
    startYear: number;
    endYear: number;
    startQuarter: string;
    endQuarter: string;
    subject?: string;
}

// Helper para normalização de nomes de disciplinas
const normalizeSubjectName = (name: string): string => {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const getQuarterIndex = (quarter: string) => {
    const idx = QUARTERS.indexOf(quarter);
    if (idx >= 0) return idx;
    if (quarter.toLowerCase() === 'anual') return QUARTERS.length - 1;
    return -1;
};

export function useTrajectoryAnalytics({
    classIds,
    studentIds,
    startYear,
    endYear,
    startQuarter,
    endQuarter,
    subject = 'all'
}: UseTrajectoryAnalyticsProps) {
    const yearsInRange = useMemo(() => {
        const startIdx = Math.max(0, YEARS_ORDER.indexOf(startYear));
        const endIdx = Math.max(0, YEARS_ORDER.indexOf(endYear));
        const actualStart = Math.min(startIdx, endIdx);
        const actualEnd = Math.max(startIdx, endIdx);
        return YEARS_ORDER.slice(actualStart, actualEnd + 1);
    }, [startYear, endYear]);

    const includesFundamental = yearsInRange.some((y) => FUNDAMENTAL_YEARS.includes(y));
    const includesMedio = yearsInRange.some((y) => MEDIO_YEARS.includes(y));

    // Fetch Data
    const { grades: medioGrades, loading: medioLoading } = useGradesAnalytics({
        classIds: includesMedio ? classIds : [],
        schoolYear: (startYear === endYear && MEDIO_YEARS.includes(startYear)) ? (startYear as 1 | 2 | 3) : undefined,
    });

    const { historicalGrades, loading: histLoading } = useHistoricalGradesAnalytics({
        studentIds: includesFundamental ? studentIds : [],
    });

    // Combine & Filter Data
    const filteredGrades = useMemo(() => {
        const normalizeGradeValue = (value: number | string | null | undefined) => {
            const parsed = typeof value === 'string'
                ? Number(value.replace(',', '.'))
                : Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const middleGrades = medioGrades.flatMap((grade) => {
            const normalized = normalizeGradeValue(grade.grade);
            if (normalized === null) return [];
            return [{
                studentId: grade.studentId,
                subject: grade.subject,
                grade: normalized,
                quarter: grade.quarter,
                schoolYear: grade.schoolYear ?? 1,
            }];
        });

        const fundamentalGrades = historicalGrades.flatMap((grade) => {
            const normalized = normalizeGradeValue(grade.grade);
            if (normalized === null) return [];
            return [{
                studentId: grade.studentId,
                subject: grade.subject,
                grade: normalized,
                quarter: grade.quarter,
                schoolYear: grade.gradeYear,
            }];
        });

        const combined = [...middleGrades, ...fundamentalGrades];

        const rawStartIndex = YEARS_ORDER.indexOf(startYear) * QUARTERS.length + getQuarterIndex(startQuarter);
        const rawEndIndex = YEARS_ORDER.indexOf(endYear) * QUARTERS.length + getQuarterIndex(endQuarter);
        const startIndex = Math.min(rawStartIndex, rawEndIndex);
        const endIndex = Math.max(rawStartIndex, rawEndIndex);
        const subjectFilter = subject === 'all' ? null : normalizeSubjectName(subject);

        return combined.filter((grade) => {
            const yearIndex = YEARS_ORDER.indexOf(grade.schoolYear);
            if (yearIndex < 0) return false;
            if (subjectFilter && normalizeSubjectName(grade.subject) !== subjectFilter) return false;

            const quarterIndex = getQuarterIndex(grade.quarter);
            if (quarterIndex < 0) return false;

            const pointIndex = yearIndex * QUARTERS.length + quarterIndex;
            return pointIndex >= startIndex && pointIndex <= endIndex;
        });
    }, [medioGrades, historicalGrades, startYear, endYear, startQuarter, endQuarter, subject]);

    // Interval Points (Time Series Keys)
    const intervalPoints = useMemo(() => {
        const points: Array<{
            year: number;
            quarter: string;
            index: number;
            label: string;
            shortLabel: string;
            key: string;
        }> = [];

        const rawStartIndex = YEARS_ORDER.indexOf(startYear) * QUARTERS.length + getQuarterIndex(startQuarter);
        const rawEndIndex = YEARS_ORDER.indexOf(endYear) * QUARTERS.length + getQuarterIndex(endQuarter);
        const startIndex = Math.min(rawStartIndex, rawEndIndex);
        const endIndex = Math.max(rawStartIndex, rawEndIndex);

        YEARS_ORDER.forEach((year, yearIndex) => {
            QUARTERS.forEach((quarter, qIndex) => {
                const index = yearIndex * QUARTERS.length + qIndex;
                if (index < startIndex || index > endIndex) return;
                const shortQuarter = quarter.replace('º Bimestre', 'B');
                points.push({
                    year,
                    quarter,
                    index,
                    label: `${quarter} • ${year}º ano`,
                    shortLabel: `${year}º-${shortQuarter}`,
                    key: `${year}|${qIndex}`,
                });
            });
        });
        return points;
    }, [startYear, endYear, startQuarter, endQuarter]);

    // Calculate Point Totals (Grouped by Student -> Point)
    const pointTotals = useMemo(() => {
        const pointKeySet = new Set(intervalPoints.map((point) => point.key));
        const totalsByStudent = new Map<string, Map<string, { total: number; count: number }>>();

        filteredGrades.forEach((grade) => {
            const quarterIndex = getQuarterIndex(grade.quarter);
            if (quarterIndex < 0) return;
            const pointKey = `${grade.schoolYear}|${quarterIndex}`;
            if (!pointKeySet.has(pointKey)) return;

            const statsByPoint = totalsByStudent.get(grade.studentId) ?? new Map();
            const stats = statsByPoint.get(pointKey) ?? { total: 0, count: 0 };
            stats.total += grade.grade;
            stats.count += 1;
            statsByPoint.set(pointKey, stats);
            totalsByStudent.set(grade.studentId, statsByPoint);
        });

        return { totalsByStudent, pointKeySet };
    }, [filteredGrades, intervalPoints]);

    return {
        loading: medioLoading || histLoading,
        intervalPoints,
        pointTotals,
        filteredGrades,
        classifyAverage
    };
}
