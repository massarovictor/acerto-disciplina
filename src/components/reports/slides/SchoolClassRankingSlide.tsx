/**
 * SchoolClassRankingSlide - Ranking of all classes by average performance
 * Shows classes ordered from worst to best with key metrics
 */

import { useMemo } from 'react';
import { Class, Student, Grade } from '@/types';
import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS, STATUS_COLORS, classifyStudent } from '@/lib/reportDesignSystem';
import { Trophy, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface SchoolClassRankingSlideProps {
    schoolName: string;
    classes: Class[];
    students: Student[];
    grades: Grade[];
    period: string;
}

interface ClassRankingData {
    classId: string;
    className: string;
    average: number;
    studentCount: number;
    approvalRate: number;
    excellence: number;
    critical: number;
}

export const SchoolClassRankingSlide = ({
    schoolName,
    classes,
    students,
    grades,
    period,
}: SchoolClassRankingSlideProps) => {
    const rankingData = useMemo(() => {
        const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

        return classes
            .map((cls) => {
                const classStudents = students.filter((s) => s.classId === cls.id);
                const classGrades = filteredGrades.filter((g) => g.classId === cls.id);

                if (classStudents.length === 0) return null;

                // Calculate per-student stats
                let totalAvg = 0;
                let excellence = 0;
                let critical = 0;
                let studentsWithGrades = 0;

                classStudents.forEach((student) => {
                    const studentGrades = classGrades.filter((g) => g.studentId === student.id);
                    if (studentGrades.length === 0) return;

                    const subjects = [...new Set(studentGrades.map((g) => g.subject))];
                    const avgBySubject = subjects.map((sub) => {
                        const subGrades = studentGrades.filter((g) => g.subject === sub);
                        return subGrades.reduce((s, g) => s + g.grade, 0) / subGrades.length;
                    });

                    const studentAvg = avgBySubject.reduce((s, a) => s + a, 0) / avgBySubject.length;
                    const recoveryCount = avgBySubject.filter((a) => a < 6).length;

                    totalAvg += studentAvg;
                    studentsWithGrades++;

                    const classification = classifyStudent(studentAvg, recoveryCount);
                    if (classification === 'excellence') excellence++;
                    if (classification === 'critical') critical++;
                });

                const average = studentsWithGrades > 0 ? totalAvg / studentsWithGrades : 0;
                const approvalRate = classStudents.length > 0
                    ? ((classStudents.length - critical) / classStudents.length) * 100
                    : 0;

                return {
                    classId: cls.id,
                    className: cls.name,
                    average,
                    studentCount: classStudents.length,
                    approvalRate,
                    excellence,
                    critical,
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a?.average || 0) - (b?.average || 0)) as ClassRankingData[];
    }, [classes, students, grades, period]);

    const schoolAverage = useMemo(() => {
        if (rankingData.length === 0) return 0;
        return rankingData.reduce((sum, c) => sum + c.average, 0) / rankingData.length;
    }, [rankingData]);

    const getBarWidth = (value: number) => `${Math.min(100, (value / 10) * 100)}%`;
    const getBarColor = (value: number) => value >= 6 ? REPORT_COLORS.success : REPORT_COLORS.danger;

    return (
        <SlideLayout
            title={`${schoolName} — Ranking das Turmas`}
            subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • ${rankingData.length} turmas ordenadas por média`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, height: '100%' }}>
                {/* Header Stats */}
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                        background: REPORT_COLORS.background.card,
                        borderRadius: 12,
                        padding: '16px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        border: `1px solid ${REPORT_COLORS.border}`,
                    }}>
                        <Trophy size={28} color={REPORT_COLORS.primary} />
                        <div>
                            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary, textTransform: 'uppercase' }}>Média Geral</p>
                            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: schoolAverage >= 6 ? REPORT_COLORS.success : REPORT_COLORS.danger }}>
                                {schoolAverage.toFixed(1)}
                            </p>
                        </div>
                    </div>
                    <div style={{
                        background: REPORT_COLORS.background.card,
                        borderRadius: 12,
                        padding: '16px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        border: `1px solid ${REPORT_COLORS.border}`,
                    }}>
                        <TrendingUp size={28} color={STATUS_COLORS.excellence.solid} />
                        <div>
                            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary, textTransform: 'uppercase' }}>Melhor Turma</p>
                            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: REPORT_COLORS.text.primary }}>
                                {rankingData[rankingData.length - 1]?.className || '-'}
                            </p>
                        </div>
                    </div>
                    <div style={{
                        background: REPORT_COLORS.background.card,
                        borderRadius: 12,
                        padding: '16px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        border: `1px solid ${REPORT_COLORS.border}`,
                    }}>
                        <TrendingDown size={28} color={STATUS_COLORS.critical.solid} />
                        <div>
                            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary, textTransform: 'uppercase' }}>Precisa Atenção</p>
                            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: REPORT_COLORS.text.primary }}>
                                {rankingData[0]?.className || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ranking Table */}
                <div style={{
                    background: REPORT_COLORS.background.card,
                    borderRadius: 16,
                    border: `1px solid ${REPORT_COLORS.border}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 24px',
                        background: REPORT_COLORS.background.surface,
                        borderBottom: `1px solid ${REPORT_COLORS.border}`,
                        display: 'grid',
                        gridTemplateColumns: '60px 1.5fr 2fr 0.8fr 0.8fr 0.6fr 0.6fr',
                        gap: 16,
                        fontWeight: 700,
                        fontSize: 13,
                        color: REPORT_COLORS.text.secondary,
                        textTransform: 'uppercase',
                    }}>
                        <span style={{ textAlign: 'center' }}>Pos.</span>
                        <span>Turma</span>
                        <span>Desempenho</span>
                        <span style={{ textAlign: 'center' }}>Média</span>
                        <span style={{ textAlign: 'center' }}>Aprov.</span>
                        <span style={{ textAlign: 'center' }}>Excel.</span>
                        <span style={{ textAlign: 'center' }}>Crít.</span>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        {rankingData.map((cls, index) => {
                            const position = rankingData.length - index;
                            const isTop = position <= 3;
                            const isBottom = position > rankingData.length - 3;

                            return (
                                <div
                                    key={cls.classId}
                                    style={{
                                        padding: '12px 24px',
                                        display: 'grid',
                                        gridTemplateColumns: '60px 1.5fr 2fr 0.8fr 0.8fr 0.6fr 0.6fr',
                                        gap: 16,
                                        alignItems: 'center',
                                        borderBottom: `1px solid ${REPORT_COLORS.border}20`,
                                        background: isTop ? `${STATUS_COLORS.excellence.solid}08` : isBottom ? `${STATUS_COLORS.critical.solid}08` : 'transparent',
                                    }}
                                >
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        background: isTop ? STATUS_COLORS.excellence.solid : isBottom ? STATUS_COLORS.critical.solid : REPORT_COLORS.primary,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                        fontWeight: 800,
                                        margin: '0 auto',
                                    }}>
                                        {position}º
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{cls.className}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: REPORT_COLORS.text.secondary }}>
                                            <Users size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                            {cls.studentCount} alunos
                                        </p>
                                    </div>
                                    <div style={{ position: 'relative', height: 24, background: REPORT_COLORS.background.muted, borderRadius: 6, overflow: 'hidden' }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            height: '100%',
                                            width: getBarWidth(cls.average),
                                            background: getBarColor(cls.average),
                                            borderRadius: 6,
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: 'center', color: getBarColor(cls.average) }}>
                                        {cls.average.toFixed(1)}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textAlign: 'center', color: REPORT_COLORS.text.primary }}>
                                        {cls.approvalRate.toFixed(0)}%
                                    </p>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textAlign: 'center', color: STATUS_COLORS.excellence.solid }}>
                                        {cls.excellence}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textAlign: 'center', color: STATUS_COLORS.critical.solid }}>
                                        {cls.critical}
                                    </p>
                                </div>
                            );
                        })}

                        {rankingData.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: REPORT_COLORS.text.tertiary }}>
                                Nenhuma turma com dados disponíveis.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SlideLayout>
    );
};
