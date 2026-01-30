
import { useMemo } from 'react';
import { useStudents, useGradesAnalytics, useHistoricalGrades, useExternalAssessments } from '@/hooks/useData';

export interface TrajectoryStatisticsProps {
    classIds: string[];
    selectedSubject: string | null;
}

export const useTrajectoryStatistics = ({ classIds, selectedSubject }: TrajectoryStatisticsProps) => {
    const { students } = useStudents();
    // We pass the list of classes to validade/filter if needed, 
    // but useGradesAnalytics usually takes a single class or scope. 
    // We need to check if useGradesAnalytics supports multiple classes directly 
    // or if we rely on the global cache/store.
    // The previous analysis showed `useGradesAnalytics` takes `GradesScope` which has `classIds`.
    const { grades: allGrades, loading: gradesLoading } = useGradesAnalytics({ classIds });

    // Historical and External hooks usually fetch all or filter internally?
    // `useHistoricalGrades` fetches everything usually? Let's check previous context.
    // Actually `useHistoricalGrades` might not filter by class in the hook call, 
    // so we filter in memory.
    const { historicalGrades, loading: historyLoading } = useHistoricalGrades();
    const { externalAssessments, loading: externalLoading } = useExternalAssessments();

    // 1. Group Data by Class
    const statsByClass = useMemo(() => {
        const result: Record<string, any> = {};

        classIds.forEach(classId => {
            const classStudentIds = students
                .filter(s => s.classId === classId && s.status === 'active')
                .map(s => s.id);

            if (classStudentIds.length === 0) {
                result[classId] = null;
                return;
            }

            // Filter Grades/Assessments for this class
            const filteredHistorical = historicalGrades.filter(h => classStudentIds.includes(h.studentId));
            const filteredExternal = externalAssessments.filter(e => classStudentIds.includes(e.studentId));
            const filteredGrades = allGrades.filter(g => g.classId === classId);

            // Calculate Stats
            let totalFund = 0, countFund = 0;
            let totalHS = 0, countHS = 0;
            let totalExt = 0, countExt = 0;

            const studentStats = classStudentIds.map(studentId => {
                const student = students.find(s => s.id === studentId);

                // Fundamental Avg
                const sFund = filteredHistorical.filter(h =>
                    h.studentId === studentId &&
                    (selectedSubject === 'all' || !selectedSubject || h.subject === selectedSubject)
                );
                const sFundAvg = sFund.length > 0 ? sFund.reduce((a, b) => a + b.grade, 0) / sFund.length : 0;

                // High School Avg
                const sHS = filteredGrades.filter(g =>
                    g.studentId === studentId &&
                    (selectedSubject === 'all' || !selectedSubject || g.subject === selectedSubject)
                );
                const sHSAvg = sHS.length > 0 ? sHS.reduce((a, b) => a + b.grade, 0) / sHS.length : 0;

                // External Avg
                const sExt = filteredExternal.filter(e =>
                    e.studentId === studentId &&
                    (selectedSubject === 'all' || !selectedSubject || e.subject === selectedSubject)
                );
                const sExtAvg = sExt.length > 0 ? sExt.reduce((a, b) => a + b.score, 0) / sExt.length : 0;

                if (sFundAvg > 0) { totalFund += sFundAvg; countFund++; }
                if (sHSAvg > 0) { totalHS += sHSAvg; countHS++; }
                if (sExtAvg > 0) { totalExt += sExtAvg; countExt++; }

                return {
                    id: studentId,
                    name: student?.name || 'Aluno Desconhecido',
                    fundAvg: sFundAvg,
                    highSchoolAvg: sHSAvg,
                    externalAvg: sExtAvg
                };
            });

            const avgFund = countFund > 0 ? totalFund / countFund : 0;
            const avgHS = countHS > 0 ? totalHS / countHS : 0;
            const avgExt = countExt > 0 ? totalExt / countExt : 0;

            const criticalCount = studentStats.filter(s => {
                const gradePoints = [];
                if (s.fundAvg) gradePoints.push(s.fundAvg);
                if (s.highSchoolAvg) gradePoints.push(s.highSchoolAvg);
                const avg = gradePoints.length ? gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length : 0;
                return avg > 0 && avg < 6;
            }).length;

            const excellenceCount = studentStats.filter(s => {
                const gradePoints = [];
                if (s.fundAvg) gradePoints.push(s.fundAvg);
                if (s.highSchoolAvg) gradePoints.push(s.highSchoolAvg);
                const avg = gradePoints.length ? gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length : 0;
                return avg >= 9;
            }).length;

            // Timeline Data Calculation (Per Class)
            const timelineData: any[] = [];

            // Fundamental
            [6, 7, 8, 9].forEach(year => {
                const gradesForYear = filteredHistorical.filter(h =>
                    h.gradeYear === year &&
                    (selectedSubject === 'all' || !selectedSubject || h.subject === selectedSubject)
                );
                if (gradesForYear.length > 0) {
                    const avg = gradesForYear.reduce((acc, curr) => acc + curr.grade, 0) / gradesForYear.length;
                    timelineData.push({
                        label: `${year}º Ano`,
                        grade: parseFloat(avg.toFixed(1)),
                        type: 'Fundamental',
                        sortKey: year,
                        classId: classId
                    });
                }
            });

            // High School
            const gradesByPeriod: Record<string, number[]> = {};
            filteredGrades.forEach(g => {
                if (selectedSubject !== 'all' && selectedSubject && g.subject !== selectedSubject) return;
                const key = `${g.schoolYear}º ano - ${g.quarter}`;
                if (!gradesByPeriod[key]) gradesByPeriod[key] = [];
                gradesByPeriod[key].push(g.grade);
            });

            Object.entries(gradesByPeriod).sort().forEach(([label, values]) => {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                timelineData.push({
                    label: label,
                    grade: parseFloat(avg.toFixed(1)),
                    type: 'Médio',
                    sortKey: 10 + (label.includes('1º') ? 0 : label.includes('2º') ? 1 : 2),
                    classId: classId
                });
            });

            result[classId] = {
                averages: { fund: avgFund, hs: avgHS, ext: avgExt },
                counts: { critical: criticalCount, excellence: excellenceCount, total: classStudentIds.length },
                studentStats,
                timelineData
            };
        });

        return result;
    }, [classIds, students, historicalGrades, allGrades, externalAssessments, selectedSubject]);

    // Distinct Assessments for specific context (based on first class or union?)
    // Let's take union of assessments found in the selected classes
    const distinctAssessments = useMemo(() => {
        const relevantStudentIds = students
            .filter(s => classIds.includes(s.classId))
            .map(s => s.id);

        return Array.from(new Set(externalAssessments
            .filter(e => relevantStudentIds.includes(e.studentId))
            .map(e => e.assessmentName)
        )).sort();
    }, [externalAssessments, students, classIds]);

    return {
        statsByClass,
        distinctAssessments,
        loading: gradesLoading || historyLoading || externalLoading
    };
};
