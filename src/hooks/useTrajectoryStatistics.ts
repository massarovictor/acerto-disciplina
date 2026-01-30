
import { useMemo } from 'react';
import { useStudents, useGradesAnalytics, useHistoricalGrades, useExternalAssessments } from '@/hooks/useData';

export interface TrajectoryStatisticsProps {
    classIds: string[];
    selectedSubject: string | null;
    selectedAssessment?: string | null;
}

export const useTrajectoryStatistics = ({ classIds, selectedSubject, selectedAssessment }: TrajectoryStatisticsProps) => {
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

            // Filter External by Student AND Assessment Name logic
            const filteredExternal = externalAssessments.filter(e => {
                if (!classStudentIds.includes(e.studentId)) return false;
                if (selectedAssessment && selectedAssessment !== 'all' && e.assessmentName !== selectedAssessment) return false;
                return true;
            });

            const filteredGrades = allGrades.filter(g => g.classId === classId);

            // Calculate Stats
            let totalFund = 0, countFund = 0;
            let totalHS = 0, countHS = 0;
            let totalExt = 0, countExt = 0;

            const studentStats = classStudentIds.map(studentId => {
                const student = students.find(s => s.id === studentId);

                // Helper for consistent rounding
                const round = (val: number) => Number(val.toFixed(1));
                const normalize = (s: string) => s.toLowerCase().trim();
                const targetSubject = selectedSubject && selectedSubject !== 'all' ? normalize(selectedSubject) : null;

                // Fundamental Avg
                const sFund = filteredHistorical.filter(h => {
                    if (h.studentId !== studentId) return false;
                    if (!targetSubject) return true;
                    return normalize(h.subject) === targetSubject;
                });
                const rawFundAvg = sFund.length > 0 ? sFund.reduce((a, b) => a + b.grade, 0) / sFund.length : 0;
                const sFundAvg = round(rawFundAvg);

                // High School Avg
                const sHS = filteredGrades.filter(g => {
                    if (g.studentId !== studentId) return false;
                    if (!targetSubject) return true;
                    return normalize(g.subject) === targetSubject;
                });
                const rawHSAvg = sHS.length > 0 ? sHS.reduce((a, b) => a + b.grade, 0) / sHS.length : 0;
                const sHSAvg = round(rawHSAvg);

                // External Avg
                const sExt = filteredExternal.filter(e => {
                    if (e.studentId !== studentId) return false;

                    const eSubject = e.subject ? normalize(e.subject) : 'geral';
                    // If target subject is set, strict match (handling 'geral' or null subject as match only if needed?)
                    // Usually external assessments with specific subjects should match. If subject is 'geral', it might be included in all? 
                    // Current logic: strict match if selected.
                    return !targetSubject || eSubject === targetSubject || (!e.subject && targetSubject === 'geral');
                });

                const rawExtAvg = sExt.length > 0
                    ? sExt.reduce((a, b) => {
                        const score = b.maxScore > 0 ? (b.score / b.maxScore) * 10 : 0;
                        return a + score;
                    }, 0) / sExt.length
                    : 0;
                const sExtAvg = round(rawExtAvg);

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
            const normalize = (s: string) => s.toLowerCase().trim();
            const targetSubject = selectedSubject && selectedSubject !== 'all' ? normalize(selectedSubject) : null;

            // Helper to extract digit
            const getNumber = (s: string | undefined | null) => {
                if (!s) return '';
                const val = s.match(/\d/);
                return val ? val[0] : '';
            };

            // Fundamental
            [6, 7, 8, 9].forEach(year => {
                const gradesForYear = filteredHistorical.filter(h => {
                    if (h.gradeYear !== year) return false;
                    if (!targetSubject) return true;
                    return normalize(h.subject) === targetSubject;
                });

                const externalForYear = filteredExternal.filter(e => {
                    if (e.schoolLevel !== 'fundamental') return false;
                    if (e.gradeYear !== year) return false;

                    const eSubject = e.subject ? normalize(e.subject) : 'geral';
                    const isSubjectMatch = !targetSubject || eSubject === targetSubject || (!e.subject && targetSubject === 'geral');
                    return isSubjectMatch;
                });

                const fundAvg = gradesForYear.length > 0
                    ? gradesForYear.reduce((acc, curr) => acc + curr.grade, 0) / gradesForYear.length
                    : undefined;

                const extAvg = externalForYear.length > 0
                    ? externalForYear.reduce((acc, curr) => acc + (curr.maxScore > 0 ? (curr.score / curr.maxScore) * 10 : 0), 0) / externalForYear.length
                    : undefined;

                const validValues = [fundAvg, extAvg].filter(v => v !== undefined) as number[];
                const unified = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null;

                if (unified !== null) {
                    timelineData.push({
                        label: `${year}º Ano`,
                        fundamental: fundAvg ? parseFloat(fundAvg.toFixed(1)) : undefined,
                        external: extAvg ? parseFloat(extAvg.toFixed(1)) : undefined,
                        unified: parseFloat(unified.toFixed(1)),
                        type: 'Fundamental',
                        sortKey: year,
                        classId: classId
                    });
                }
            });

            // High School
            const gradesByPeriod: Record<string, { total: number, count: number }> = {};
            const externalByPeriod: Record<string, { total: number, count: number }> = {};

            // Internal Grades
            filteredGrades.forEach(g => {
                if (targetSubject && normalize(g.subject) !== targetSubject) return;
                const key = `${g.schoolYear}º ano - ${g.quarter}`;
                if (!gradesByPeriod[key]) gradesByPeriod[key] = { total: 0, count: 0 };
                gradesByPeriod[key].total += g.grade;
                gradesByPeriod[key].count += 1;
            });

            // External Assessments (High School)
            filteredExternal.forEach(e => {
                if (e.schoolLevel !== 'medio') return;

                const eSubject = e.subject ? normalize(e.subject) : 'geral';
                const isSubjectMatch = !targetSubject || eSubject === targetSubject || (!e.subject && targetSubject === 'geral');
                if (!isSubjectMatch) return;

                // Match Quarter Logic
                let targetQuarter = e.quarter;

                // If no quarter, try to infer from date
                if (!targetQuarter && e.appliedDate) {
                    try {
                        const month = new Date(e.appliedDate).getMonth() + 1;
                        if (month >= 1 && month <= 4) targetQuarter = '1º Bimestre';
                        else if (month >= 5 && month <= 7) targetQuarter = '2º Bimestre';
                        else if (month >= 8 && month <= 10) targetQuarter = '3º Bimestre';
                        else if (month >= 11 || month === 12) targetQuarter = '4º Bimestre';
                    } catch { /* ignore */ }
                }

                if (!targetQuarter) return; // Cannot place in timeline without period

                // Check formatting consistency (e.g. "1º Bimestre" vs "1")
                // We normalize internal keys as `${year}º ano - ${quarter}`
                // e.quarter usually comes as "1º Bimestre".
                // Internal grades use g.quarter matching.

                // Let's normalize data quarter format to "Xº Bimestre"
                // Assuming g.quarter is already like "1º Bimestre"

                // We need to map e.quarter (or inferred) to the key
                const qNum = getNumber(targetQuarter);
                if (!qNum) return;
                const normalizedQuarter = `${qNum}º Bimestre`;

                const key = `${e.gradeYear}º ano - ${normalizedQuarter}`;

                if (!externalByPeriod[key]) externalByPeriod[key] = { total: 0, count: 0 };

                const normalizedScore = e.maxScore > 0 ? (e.score / e.maxScore) * 10 : 0;
                externalByPeriod[key].total += normalizedScore;
                externalByPeriod[key].count += 1;
            });

            // Merge keys from both sources
            const allKeys = new Set([...Object.keys(gradesByPeriod), ...Object.keys(externalByPeriod)]);

            Array.from(allKeys).sort().forEach(label => {
                const gradeData = gradesByPeriod[label];
                const extData = externalByPeriod[label];

                const avgGrade = gradeData && gradeData.count > 0 ? gradeData.total / gradeData.count : undefined;
                const avgExt = extData && extData.count > 0 ? extData.total / extData.count : undefined;

                const validValues = [avgGrade, avgExt].filter(v => v !== undefined) as number[];
                const unified = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null;

                if (unified !== null) {
                    timelineData.push({
                        label: label,
                        medio: avgGrade ? parseFloat(avgGrade.toFixed(1)) : undefined,
                        external: avgExt ? parseFloat(avgExt.toFixed(1)) : undefined,
                        unified: parseFloat(unified.toFixed(1)),
                        type: 'Médio',
                        sortKey: (() => {
                            const yearMatch = label.match(/(\d+)º/);
                            const year = yearMatch ? parseInt(yearMatch[1]) : 0;
                            const quarterIdx = label.includes('1º') ? 1 : label.includes('2º') ? 2 : label.includes('3º') ? 3 : 4;
                            return year * 10 + quarterIdx;
                        })(),
                        classId: classId
                    });
                }
            });

            // Ensure chronological order
            timelineData.sort((a, b) => a.sortKey - b.sortKey);

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
