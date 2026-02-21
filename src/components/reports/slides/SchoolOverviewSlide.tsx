/**
 * SchoolOverviewSlide - School-wide metrics overview
 * Aggregates data from all classes to show school-level KPIs
 */

import { useMemo } from 'react';
import { Student, Grade, Incident, Class } from '@/types';
import { SlideLayout } from './SlideLayout';
import { ReportDonutChart } from '@/lib/reportCharts';
import { REPORT_COLORS, STATUS_COLORS, classifyStudent } from '@/lib/reportDesignSystem';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Award,
  Building2,
  type LucideIcon,
} from 'lucide-react';

interface SchoolOverviewSlideProps {
    schoolName: string;
    classes: Class[];
    students: Student[];
    grades: Grade[];
    incidents: Incident[];
    period: string;
}

export const SchoolOverviewSlide = ({
    schoolName,
    classes,
    students,
    grades,
    incidents,
    period,
}: SchoolOverviewSlideProps) => {
    const metrics = useMemo(() => {
        const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

        // Calculate per-student statistics
        const studentStats = students.map((student) => {
            const studentGrades = filteredGrades.filter((g) => g.studentId === student.id);

            if (studentGrades.length === 0) {
                return {
                    student,
                    recoveryCount: 0,
                    overallAvg: 0,
                    hasGrades: false,
                    classification: null as 'excellence' | 'approved' | 'attention' | 'critical' | null,
                };
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
            const classification = classifyStudent(overallAvg, recoveryCount);
            return { student, recoveryCount, overallAvg, hasGrades: true, classification };
        });

        const activeStudents = studentStats.filter((student) => student.hasGrades);
        const classifiedStudents = activeStudents.filter(
            (student): student is typeof student & {
                classification: 'excellence' | 'approved' | 'attention' | 'critical';
            } => student.classification !== null,
        );

        const excellence = classifiedStudents.filter((student) => student.classification === 'excellence').length;
        const approved = classifiedStudents.filter((student) => student.classification === 'approved').length;
        const attention = classifiedStudents.filter((student) => student.classification === 'attention').length;
        const critical = classifiedStudents.filter((student) => student.classification === 'critical').length;

        // School average (average of student averages)
        const schoolAverage = activeStudents.length > 0
            ? activeStudents.reduce((sum, s) => sum + s.overallAvg, 0) / activeStudents.length
            : 0;

        // Approval rate between students with grades in period.
        const approvalRate = activeStudents.length > 0
            ? ((excellence + approved) / activeStudents.length) * 100
            : 0;

        const criticalIncidents = incidents.filter(
            (i) => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
        ).length;

        return {
            average: schoolAverage,
            approvalRate,
            excellence,
            approved,
            attention,
            critical,
            criticalIncidents,
            totalGrades: filteredGrades.length,
            studentsWithGrades: activeStudents.length,
        };
    }, [grades, students, incidents, period]);

    const pieData = [
        { name: 'Excelência', value: metrics.excellence, color: STATUS_COLORS.excellence.solid },
        { name: 'Aprovado', value: metrics.approved, color: STATUS_COLORS.approved.solid },
        { name: 'Atenção', value: metrics.attention, color: STATUS_COLORS.attention.solid },
        { name: 'Crítico', value: metrics.critical, color: STATUS_COLORS.critical.solid },
    ];

    const activePieData = pieData.filter(d => d.value > 0);
    const hasStatusData = metrics.studentsWithGrades > 0;

    const KPICard = ({
        icon: Icon,
        label,
        value,
        color,
        suffix = '',
        subtext = ''
    }: {
        icon: LucideIcon;
        label: string;
        value: string | number;
        color: string;
        suffix?: string;
        subtext?: string;
    }) => (
        <div
            style={{
                background: REPORT_COLORS.background.card,
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                border: `1px solid ${REPORT_COLORS.border}`,
            }}
        >
            <div
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon size={28} color={color} />
            </div>
            <div>
                <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: REPORT_COLORS.text.secondary, margin: '0 0 4px 0' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <p style={{ fontSize: 36, fontWeight: 700, color: REPORT_COLORS.text.primary, margin: 0, lineHeight: 1 }}>
                        {value}
                        {suffix && <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 2 }}>{suffix}</span>}
                    </p>
                </div>
                {subtext && <p style={{ fontSize: 11, color: REPORT_COLORS.text.tertiary, margin: '4px 0 0' }}>{subtext}</p>}
            </div>
        </div>
    );

    return (
        <SlideLayout
            title={`${schoolName} — Visão Geral Institucional`}
            subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • ${classes.length} Turmas • ${students.length} Alunos`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 32, height: '100%' }}>
                {/* Left Column: KPIs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <KPICard
                            icon={Building2}
                            label="Turmas"
                            value={classes.length}
                            color={REPORT_COLORS.primary}
                            subtext="Ativas"
                        />
                        <KPICard
                            icon={Users}
                            label="Alunos"
                            value={students.length}
                            color={REPORT_COLORS.primary}
                            subtext="Matriculados"
                        />
                    </div>

                    <KPICard
                        icon={TrendingUp}
                        label="Média Geral da Escola"
                        value={metrics.average.toFixed(1)}
                        color={metrics.average >= 6 ? REPORT_COLORS.success : REPORT_COLORS.warning}
                        subtext="Média global"
                    />

                    <KPICard
                        icon={Award}
                        label="Taxa de Aprovação"
                        value={metrics.approvalRate.toFixed(1)}
                        suffix="%"
                        color={metrics.approvalRate >= 70 ? REPORT_COLORS.success : REPORT_COLORS.danger}
                        subtext="Aprovados + Excelência"
                    />

                    <KPICard
                        icon={AlertTriangle}
                        label="Acompanhamentos Críticos"
                        value={metrics.criticalIncidents}
                        color={REPORT_COLORS.danger}
                        subtext="Graves registrados"
                    />
                </div>

                {/* Right Column: Chart */}
                <div
                    style={{
                        background: REPORT_COLORS.background.card,
                        borderRadius: 24,
                        padding: 32,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.08)',
                        border: `1px solid ${REPORT_COLORS.border}`,
                        position: 'relative',
                    }}
                >
                    <div style={{ position: 'absolute', top: 32, left: 32 }}>
                        <h3
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: REPORT_COLORS.text.primary,
                                margin: 0,
                            }}
                        >
                            Status Acadêmico da Escola
                        </h3>
                    </div>

                    <div style={{ marginTop: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {hasStatusData ? (
                            <>
                                <div style={{
                                    width: 550,
                                    height: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.3)',
                                    borderRadius: 300,
                                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.02)'
                                }}>
                                    {activePieData.length > 0 ? (
                                        <ReportDonutChart
                                            data={activePieData}
                                            width={500}
                                            height={450}
                                            innerRadius={110}
                                            outerRadius={200}
                                            showLegend={false}
                                            animate={false}
                                        />
                                    ) : (
                                        <div style={{ padding: 40, textAlign: 'center' }}>
                                            <p style={{ fontSize: 20, color: REPORT_COLORS.text.secondary }}>Sem dados de status</p>
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    marginTop: 16,
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                    gap: 16,
                                    width: '100%',
                                    padding: '0 32px',
                                }}>
                                    {[
                                        { label: 'Crítico', color: STATUS_COLORS.critical.solid, count: metrics.critical },
                                        { label: 'Atenção', color: STATUS_COLORS.attention.solid, count: metrics.attention },
                                        { label: 'Aprovado', color: STATUS_COLORS.approved.solid, count: metrics.approved },
                                        { label: 'Excelência', color: STATUS_COLORS.excellence.solid, count: metrics.excellence },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                            <div style={{ width: 16, height: 16, borderRadius: 4, background: item.color }} />
                                            <div style={{ fontSize: 14, color: REPORT_COLORS.text.secondary }}>
                                                <span style={{ fontWeight: 700, color: REPORT_COLORS.text.primary }}>{item.label}</span>
                                                <span style={{ marginLeft: 4 }}>({item.count})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ opacity: 0.5, textAlign: 'center', fontSize: 20 }}>Sem dados suficientes para exibir o gráfico</div>
                        )}
                    </div>
                </div>
            </div>
        </SlideLayout>
    );
};
