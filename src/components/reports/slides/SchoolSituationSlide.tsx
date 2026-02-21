/**
 * SchoolSituationSlide - School-wide student situation breakdown
 * Shows detailed breakdown by Critical, Attention, Approved, Excellence
 */

import { useMemo } from 'react';
import { Student, Grade, Class } from '@/types';
import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS, STATUS_COLORS, classifyStudent } from '@/lib/reportDesignSystem';
import { AlertOctagon, AlertTriangle, CheckCircle, Star } from 'lucide-react';

interface SchoolSituationSlideProps {
    schoolName: string;
    classes: Class[];
    students: Student[];
    grades: Grade[];
    period: string;
}

type SituationType = 'critical' | 'attention' | 'approved' | 'excellence';

interface ClassSituation {
    classId: string;
    className: string;
    critical: number;
    attention: number;
    approved: number;
    excellence: number;
    total: number;
}

export const SchoolSituationSlide = ({
    schoolName,
    classes,
    students,
    grades,
    period,
}: SchoolSituationSlideProps) => {
    const situationData = useMemo(() => {
        const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

        // Calculate per-student statistics
        const studentStats = students.map((student) => {
            const studentGrades = filteredGrades.filter((g) => g.studentId === student.id);

            if (studentGrades.length === 0) {
                return { student, classification: null as SituationType | null, hasGrades: false };
            }

            const subjects = [...new Set(studentGrades.map((g) => g.subject))];
            const avgBySubject = subjects.map((sub) => {
                const subGrades = studentGrades.filter((g) => g.subject === sub);
                return subGrades.length
                    ? subGrades.reduce((s, g) => s + g.grade, 0) / subGrades.length
                    : 0;
            });

            const overallAvg = avgBySubject.length > 0
                ? avgBySubject.reduce((sum, avg) => sum + avg, 0) / avgBySubject.length
                : 0;

            const recoveryCount = avgBySubject.filter((a) => a < 6).length;
            const classification = classifyStudent(overallAvg, recoveryCount) as SituationType;
            return { student, classification, hasGrades: true };
        });
        const activeStudentStats = studentStats.filter((student) => student.hasGrades && student.classification !== null);

        // Count by situation
        const counts = {
            critical: activeStudentStats.filter(s => s.classification === 'critical').length,
            attention: activeStudentStats.filter(s => s.classification === 'attention').length,
            approved: activeStudentStats.filter(s => s.classification === 'approved').length,
            excellence: activeStudentStats.filter(s => s.classification === 'excellence').length,
        };

        // Calculate per-class situation
        const classSituations: ClassSituation[] = classes.map((cls) => {
            const classStudents = activeStudentStats.filter(s => s.student.classId === cls.id);
            return {
                classId: cls.id,
                className: cls.name,
                critical: classStudents.filter(s => s.classification === 'critical').length,
                attention: classStudents.filter(s => s.classification === 'attention').length,
                approved: classStudents.filter(s => s.classification === 'approved').length,
                excellence: classStudents.filter(s => s.classification === 'excellence').length,
                total: classStudents.length,
            };
        });

        // Sort by critical count (most critical first)
        const sortedClasses = [...classSituations]
            .filter(c => c.total > 0)
            .sort((a, b) => b.critical - a.critical);

        return { counts, classSituations: sortedClasses, total: activeStudentStats.length };
    }, [grades, students, classes, period]);

    const situationConfigs = [
        {
            key: 'critical',
            label: 'Crítico',
            description: '3+ disciplinas abaixo de 6',
            icon: AlertOctagon,
            color: STATUS_COLORS.critical.solid,
            count: situationData.counts.critical,
        },
        {
            key: 'attention',
            label: 'Atenção',
            description: '1-2 disciplinas abaixo de 6',
            icon: AlertTriangle,
            color: STATUS_COLORS.attention.solid,
            count: situationData.counts.attention,
        },
        {
            key: 'approved',
            label: 'Aprovado',
            description: 'Todas disciplinas ≥ 6',
            icon: CheckCircle,
            color: STATUS_COLORS.approved.solid,
            count: situationData.counts.approved,
        },
        {
            key: 'excellence',
            label: 'Excelência',
            description: 'Todas ≥ 6 e média ≥ 8',
            icon: Star,
            color: STATUS_COLORS.excellence.solid,
            count: situationData.counts.excellence,
        },
    ];

    return (
        <SlideLayout
            title={`${schoolName} — Distribuição por Situação`}
            subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • Classificação de ${situationData.total} alunos com notas`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, height: '100%' }}>
                {/* Left: Situation Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {situationConfigs.map((config) => {
                        const Icon = config.icon;
                        const percentage = situationData.total > 0 ? (config.count / situationData.total) * 100 : 0;

                        return (
                            <div
                                key={config.key}
                                style={{
                                    background: REPORT_COLORS.background.card,
                                    borderRadius: 16,
                                    border: `1px solid ${REPORT_COLORS.border}`,
                                    padding: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 20,
                                }}
                            >
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 16,
                                        background: `${config.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon size={32} color={config.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: REPORT_COLORS.text.primary }}>
                                        {config.label}
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: REPORT_COLORS.text.secondary }}>
                                        {config.description}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 42,
                                            fontWeight: 800,
                                            color: config.color,
                                        }}
                                    >
                                        {config.count}
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: REPORT_COLORS.text.tertiary }}>
                                        {percentage.toFixed(1)}% do total
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: Classes with most critical students */}
                <div
                    style={{
                        background: REPORT_COLORS.background.card,
                        borderRadius: 20,
                        border: `1px solid ${REPORT_COLORS.border}`,
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700 }}>
                        Turmas com Maior Atenção
                    </h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: 13, color: REPORT_COLORS.text.secondary }}>
                        Ordenadas por número de alunos em situação crítica
                    </p>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {situationData.classSituations.slice(0, 8).map((cls, index) => (
                            <div
                                key={cls.classId}
                                style={{
                                    background: REPORT_COLORS.background.surface,
                                    borderRadius: 12,
                                    padding: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: REPORT_COLORS.primary,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        fontWeight: 700,
                                    }}
                                >
                                    {index + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{cls.className}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: REPORT_COLORS.text.secondary }}>
                                        {cls.total} alunos
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            background: `${STATUS_COLORS.critical.solid}15`,
                                            color: STATUS_COLORS.critical.solid,
                                            fontSize: 12,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {cls.critical} críticos
                                    </div>
                                    <div
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            background: `${STATUS_COLORS.attention.solid}15`,
                                            color: STATUS_COLORS.attention.solid,
                                            fontSize: 12,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {cls.attention} atenção
                                    </div>
                                </div>
                            </div>
                        ))}

                        {situationData.classSituations.length === 0 && (
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: REPORT_COLORS.text.tertiary,
                                    fontSize: 16,
                                }}
                            >
                                Nenhuma turma com dados disponíveis.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SlideLayout>
    );
};
