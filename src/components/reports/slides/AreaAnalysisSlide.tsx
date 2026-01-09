/**
 * AreaAnalysisSlide - Slide Dinâmico Consolidado para Áreas
 * Substitui: LanguagesAreaSlide, HumanitiesAreaSlide, SciencesAreaSlide, MathAreaSlide, ProfessionalAreaSlide
 */

import { useMemo } from 'react';
import { Grade } from '@/types';
import { SlideLayout } from './SlideLayout';
import { ReportBarChart } from '@/lib/reportCharts';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { BookOpen, Brain, FlaskConical, Calculator, Briefcase } from 'lucide-react';
import { SUBJECT_AREAS } from '@/lib/subjects';

// Configuração das áreas com ícones e cores
const AREA_CONFIG: Record<string, { icon: any; color: string; subjects: string[] }> = {
    'Linguagens': {
        icon: BookOpen,
        color: '#3B82F6', // Blue
        subjects: SUBJECT_AREAS[0]?.subjects ?? [],
    },
    'Ciências Humanas': {
        icon: Brain,
        color: '#8B5CF6', // Violet
        subjects: SUBJECT_AREAS[1]?.subjects ?? [],
    },
    'Ciências da Natureza': {
        icon: FlaskConical,
        color: '#10B981', // Emerald
        subjects: SUBJECT_AREAS[2]?.subjects ?? [],
    },
    'Matemática': {
        icon: Calculator,
        color: '#F59E0B', // Amber
        subjects: SUBJECT_AREAS[3]?.subjects ?? [],
    },
    'Formação Técnica': {
        icon: Briefcase,
        color: '#EC4899', // Pink
        subjects: [], // Será preenchido dinamicamente
    },
};

interface AreaAnalysisSlideProps {
    areaName: string;
    grades: Grade[];
    period: string;
    professionalSubjects?: string[];
}

export const AreaAnalysisSlide = ({
    areaName,
    grades,
    period,
    professionalSubjects = [],
}: AreaAnalysisSlideProps) => {
    const config = AREA_CONFIG[areaName] || AREA_CONFIG['Formação Técnica'];
    const Icon = config.icon;

    // Para área técnica, usar disciplinas dinâmicas
    const subjects = areaName === 'Formação Técnica' ? professionalSubjects : config.subjects;

    const chartData = useMemo(() => {
        const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

        return subjects
            .map((subject) => {
                const subjectGrades = filteredGrades.filter((g) => g.subject === subject);
                if (subjectGrades.length === 0) return null;

                const approvedCount = subjectGrades.filter(g => g.grade >= 6).length;
                const failedCount = subjectGrades.filter(g => g.grade < 6).length;
                const avg = subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length;

                return {
                    name: subject,
                    value: parseFloat(avg.toFixed(1)),
                    approved: approvedCount,
                    failed: failedCount
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a?.value || 0) - (b?.value || 0)) as { name: string; value: number; approved: number; failed: number }[];
    }, [grades, period, subjects]);

    const areaAverage = useMemo(() => {
        if (chartData.length === 0) return null;
        return chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;
    }, [chartData]);

    const hasData = chartData.length > 0;

    return (
        <SlideLayout
            title={areaName}
            subtitle={`Análise detalhada • ${period === 'all' ? 'Ano Letivo' : period}`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'flex', gap: 24, height: '100%' }}>
                {/* Left: Chart */}
                <div
                    style={{
                        flex: 1.5,
                        background: REPORT_COLORS.background.card,
                        borderRadius: 12,
                        padding: 32,
                        border: `1px solid ${REPORT_COLORS.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                background: `${config.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon size={26} color={config.color} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Médias por Disciplina</h3>
                            <p style={{ margin: 0, fontSize: 16, color: REPORT_COLORS.text.secondary }}>
                                {chartData.length} disciplina(s) analisada(s)
                            </p>
                        </div>
                    </div>
                    {hasData ? (
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ReportBarChart data={chartData} height={550} layout="horizontal" colorByValue />
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
                            Sem dados de notas para esta área no período.
                        </div>
                    )}
                </div>

                {/* Right: Detailed Table/List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Area Summary Card */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)`,
                            borderRadius: 16,
                            padding: 24,
                            color: 'white',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>Média Geral da Área</p>
                        <p style={{ margin: '4px 0 0', fontSize: 64, fontWeight: 900 }}>
                            {areaAverage === null ? '--' : areaAverage.toFixed(1)}
                        </p>
                    </div>

                    {/* Detailed List */}
                    <div style={{
                        flex: 1,
                        background: REPORT_COLORS.background.card,
                        borderRadius: 16,
                        border: `1px solid ${REPORT_COLORS.border}`,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            background: REPORT_COLORS.background.surface,
                            borderBottom: `1px solid ${REPORT_COLORS.border}`,
                            fontWeight: 700,
                            fontSize: 14,
                            color: REPORT_COLORS.text.secondary,
                            display: 'grid',
                            gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr',
                            gap: 12,
                        }}>
                            <span>Disciplina</span>
                            <span style={{ textAlign: 'center' }}>Aprov.</span>
                            <span style={{ textAlign: 'center' }}>Reprov.</span>
                            <span style={{ textAlign: 'right' }}>Média</span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                            {chartData.map((item, idx) => (
                                <div key={idx} style={{
                                    padding: '16px 20px',
                                    display: 'grid',
                                    gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr',
                                    gap: 12,
                                    alignItems: 'center',
                                    borderBottom: idx === chartData.length - 1 ? 'none' : `1px solid ${REPORT_COLORS.border}50`,
                                    background: idx % 2 === 0 ? 'transparent' : `${REPORT_COLORS.background.surface}50`
                                }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: REPORT_COLORS.text.primary }}>{item.name}</span>
                                    <span style={{ textAlign: 'center', fontSize: 20, fontWeight: 600, color: REPORT_COLORS.success }}>
                                        {item.approved}
                                    </span>
                                    <span style={{ textAlign: 'center', fontSize: 20, fontWeight: 600, color: item.failed > 0 ? REPORT_COLORS.danger : REPORT_COLORS.text.tertiary }}>
                                        {item.failed}
                                    </span>
                                    <span style={{ textAlign: 'right', fontSize: 22, fontWeight: 800, color: item.value >= 6 ? REPORT_COLORS.success : REPORT_COLORS.danger }}>
                                        {item.value.toFixed(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        padding: 16,
                        background: `${REPORT_COLORS.background.surface}`,
                        borderRadius: 12,
                        border: `1px solid ${REPORT_COLORS.border}80`,
                        fontSize: 14,
                        color: REPORT_COLORS.text.secondary,
                        textAlign: 'center',
                        fontStyle: 'italic'
                    }}>
                        Disciplinas ordenadas por menor desempenho
                    </div>
                </div>
            </div>
        </SlideLayout>
    );
};
