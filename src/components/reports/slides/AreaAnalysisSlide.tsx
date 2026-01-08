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

                const avg = subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length;
                return { name: subject, value: parseFloat(avg.toFixed(1)) };
            })
            .filter(Boolean) as { name: string; value: number }[];
    }, [grades, period, subjects]);

    const areaAverage = useMemo(() => {
        if (chartData.length === 0) return null;
        return chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;
    }, [chartData]);

    const bestSubject = chartData.length > 0 ? chartData.reduce((a, b) => (a.value > b.value ? a : b)) : null;
    const worstSubject = chartData.length > 0 ? chartData.reduce((a, b) => (a.value < b.value ? a : b)) : null;
    const hasData = chartData.length > 0;

    return (
        <SlideLayout
            title={areaName}
            subtitle={`Análise detalhada • ${period === 'all' ? 'Ano Letivo' : period}`}
            footer="Acerto Disciplina System"
        >
            <div style={{ display: 'flex', gap: 24, height: '100%' }}>
                {/* Left: Chart */}
                <div
                    style={{
                        flex: 2,
                        background: REPORT_COLORS.background.card,
                        borderRadius: 12,
                        padding: 32,
                        border: `1px solid ${REPORT_COLORS.border}`,
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
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Médias por Disciplina</h3>
                            <p style={{ margin: 0, fontSize: 14, color: REPORT_COLORS.text.secondary }}>
                                {chartData.length} disciplina(s) com dados
                            </p>
                        </div>
                    </div>
                    {hasData ? (
                        <ReportBarChart data={chartData} height={300} layout="horizontal" colorByValue />
                    ) : (
                        <div
                            style={{
                                height: 300,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: REPORT_COLORS.text.tertiary,
                                fontSize: 14,
                                border: `1px dashed ${REPORT_COLORS.border}`,
                                borderRadius: 8,
                            }}
                        >
                            Sem dados de notas para esta área no período.
                        </div>
                    )}
                </div>

                {/* Right: Insights */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Average Card */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)`,
                            borderRadius: 12,
                            padding: 28,
                            color: 'white',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>MÉDIA DA ÁREA</p>
                        <p style={{ margin: '8px 0 0', fontSize: 56, fontWeight: 800 }}>
                            {areaAverage === null ? '--' : areaAverage.toFixed(1)}
                        </p>
                    </div>

                    {/* Best Subject */}
                    {hasData && bestSubject && (
                        <div
                            style={{
                                background: REPORT_COLORS.background.card,
                                borderRadius: 12,
                                padding: 24,
                                border: `1px solid ${REPORT_COLORS.border}`,
                            }}
                        >
                            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.tertiary }}>DESTAQUE POSITIVO</p>
                            <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: REPORT_COLORS.success }}>
                                {bestSubject.name}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 700 }}>{bestSubject.value}</p>
                        </div>
                    )}

                    {/* Worst Subject */}
                    {hasData && worstSubject && worstSubject.name !== bestSubject?.name && (
                        <div
                            style={{
                                background: REPORT_COLORS.background.card,
                                borderRadius: 12,
                                padding: 24,
                                border: `1px solid ${REPORT_COLORS.border}`,
                            }}
                        >
                            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.tertiary }}>PONTO DE ATENÇÃO</p>
                            <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: REPORT_COLORS.danger }}>
                                {worstSubject.name}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 700 }}>{worstSubject.value}</p>
                        </div>
                    )}
                </div>
            </div>
        </SlideLayout>
    );
};
