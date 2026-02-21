/**
 * SchoolAreasSlide - School-wide performance by knowledge area
 * Shows bar chart with average performance across all areas
 */

import { useMemo } from 'react';
import { Grade } from '@/types';
import { SlideLayout } from './SlideLayout';
import { ReportBarChart } from '@/lib/reportCharts';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { SUBJECT_AREAS } from '@/lib/subjects';
import {
  BookOpen,
  Brain,
  FlaskConical,
  Calculator,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

interface SchoolAreasSlideProps {
    schoolName: string;
    grades: Grade[];
    period: string;
    professionalSubjects: string[];
}

const AREA_CONFIGS: Record<string, { icon: LucideIcon; color: string }> = {
    'Linguagens': { icon: BookOpen, color: '#3B82F6' },
    'Ciências Humanas': { icon: Brain, color: '#8B5CF6' },
    'Ciências da Natureza': { icon: FlaskConical, color: '#10B981' },
    'Matemática': { icon: Calculator, color: '#F59E0B' },
    'Formação Técnica': { icon: Briefcase, color: '#6366F1' },
};

export const SchoolAreasSlide = ({
    schoolName,
    grades,
    period,
    professionalSubjects,
}: SchoolAreasSlideProps) => {
    const areaData = useMemo(() => {
        const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

        const areas = [
            { name: 'Linguagens', subjects: SUBJECT_AREAS[0].subjects },
            { name: 'Ciências Humanas', subjects: SUBJECT_AREAS[1].subjects },
            { name: 'Ciências da Natureza', subjects: SUBJECT_AREAS[2].subjects },
            { name: 'Matemática', subjects: SUBJECT_AREAS[3].subjects },
            { name: 'Formação Técnica', subjects: professionalSubjects },
        ];

        return areas
            .map((area) => {
                const areaGrades = filteredGrades.filter((g) => area.subjects.includes(g.subject));
                if (areaGrades.length === 0) return null;

                const consolidatedStudentSubjectAverages: number[] = [];

                area.subjects.forEach((subject) => {
                    const subjectGrades = areaGrades.filter((grade) => grade.subject === subject);
                    if (subjectGrades.length === 0) return;

                    const studentIds = [...new Set(subjectGrades.map((grade) => grade.studentId))];
                    studentIds.forEach((studentId) => {
                        const studentSubjectGrades = subjectGrades.filter(
                            (grade) => grade.studentId === studentId,
                        );
                        const subjectAverage =
                            studentSubjectGrades.reduce((sum, grade) => sum + grade.grade, 0) /
                            studentSubjectGrades.length;
                        consolidatedStudentSubjectAverages.push(subjectAverage);
                    });
                });

                if (consolidatedStudentSubjectAverages.length === 0) return null;

                const average =
                    consolidatedStudentSubjectAverages.reduce((sum, value) => sum + value, 0) /
                    consolidatedStudentSubjectAverages.length;
                const approved = consolidatedStudentSubjectAverages.filter((value) => value >= 6).length;
                const failed = consolidatedStudentSubjectAverages.length - approved;

                return {
                    name: area.name,
                    value: parseFloat(average.toFixed(1)),
                    count: consolidatedStudentSubjectAverages.length,
                    approved,
                    failed,
                };
            })
            .filter(Boolean) as { name: string; value: number; count: number; approved: number; failed: number }[];
    }, [grades, period, professionalSubjects]);

    const hasData = areaData.length > 0;

    // Sort by value for the chart
    const sortedData = [...areaData].sort((a, b) => a.value - b.value);

    return (
        <SlideLayout
            title={`${schoolName} — Desempenho por Área`}
            subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • Média por área do conhecimento`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, height: '100%' }}>
                {/* Left: Bar Chart */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Médias por Área</h3>
                    </div>
                    {hasData ? (
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ReportBarChart data={sortedData} height={550} layout="horizontal" colorByValue />
                        </div>
                    ) : (
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: REPORT_COLORS.text.tertiary,
                                fontSize: 18,
                                border: `1px dashed ${REPORT_COLORS.border}`,
                                borderRadius: 8,
                            }}
                        >
                            Sem dados de notas para o período selecionado.
                        </div>
                    )}
                </div>

                {/* Right: Area Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {areaData.map((area) => {
                        const config = AREA_CONFIGS[area.name] || { icon: BookOpen, color: '#6B7280' };
                        const Icon = config.icon;
                        const approvalRate = area.count > 0 ? (area.approved / area.count) * 100 : 0;

                        return (
                            <div
                                key={area.name}
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
                                        width: 56,
                                        height: 56,
                                        borderRadius: 14,
                                        background: `${config.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon size={28} color={config.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: REPORT_COLORS.text.primary }}>
                                        {area.name}
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: REPORT_COLORS.text.secondary }}>
                                        {area.count} registros consolidados
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 36,
                                            fontWeight: 800,
                                            color: area.value >= 6 ? REPORT_COLORS.success : REPORT_COLORS.danger,
                                        }}
                                    >
                                        {area.value}
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: REPORT_COLORS.text.tertiary }}>
                                        {approvalRate.toFixed(0)}% aprovação
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {areaData.length === 0 && (
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: REPORT_COLORS.text.tertiary,
                                fontSize: 18,
                                border: `1px dashed ${REPORT_COLORS.border}`,
                                borderRadius: 16,
                            }}
                        >
                            Nenhuma área com dados disponíveis.
                        </div>
                    )}
                </div>
            </div>
        </SlideLayout>
    );
};
