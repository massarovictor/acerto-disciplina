/**
 * AreasComparisonSlide - Gráfico Radar comparando todas as áreas
 * Visão holística do desempenho em todas as áreas do conhecimento.
 */

import { useMemo } from 'react';
import { Grade } from '@/types';
import { SlideLayout } from './SlideLayout';
import { ReportRadarChart, ReportBarChart } from '@/lib/reportCharts';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { Target } from 'lucide-react';

interface AreasComparisonSlideProps {
    grades: Grade[];
    period: string;
    professionalSubjects?: string[];
    className?: string;
}

const AREAS = [
    { name: 'Linguagens', subjects: ['Português', 'Inglês', 'Espanhol', 'Arte', 'Educação Física', 'Literatura', 'Redação'] },
    { name: 'Humanas', subjects: ['História', 'Geografia', 'Filosofia', 'Sociologia'] },
    { name: 'Natureza', subjects: ['Biologia', 'Física', 'Química'] },
    { name: 'Matemática', subjects: ['Matemática'] },
];

export const AreasComparisonSlide = ({
    grades,
    period,
    professionalSubjects = [],
    className = '',
}: AreasComparisonSlideProps) => {
    const areaData = useMemo(() => {
        const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

        const areas = [...AREAS];
        if (professionalSubjects.length > 0) {
            areas.push({ name: 'Técnico', subjects: professionalSubjects });
        }

        return areas
            .map((area) => {
                const areaGrades = filteredGrades.filter((g) => area.subjects.includes(g.subject));
                if (areaGrades.length === 0) return null;

                const avg = areaGrades.reduce((sum, g) => sum + g.grade, 0) / areaGrades.length;
                return { name: area.name, value: parseFloat(avg.toFixed(1)) };
            })
            .filter(Boolean) as { name: string; value: number }[];
    }, [grades, period, professionalSubjects]);

    const globalAverage = useMemo(() => {
        if (areaData.length === 0) return 0;
        return areaData.reduce((sum, d) => sum + d.value, 0) / areaData.length;
    }, [areaData]);

    const sortedAreas = [...areaData].sort((a, b) => b.value - a.value);
    const bestArea = sortedAreas[0];
    const worstArea = sortedAreas[sortedAreas.length - 1];

    return (
        <SlideLayout
            title="Comparativo Entre Áreas"
            subtitle={`Visão holística do desempenho • ${period === 'all' ? 'Ano Letivo' : period}`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'flex', gap: 24, height: '100%' }}>
                {/* Left: Radar Chart */}
                <div
                    style={{
                        flex: 1,
                        background: REPORT_COLORS.background.card,
                        borderRadius: 12,
                        padding: 24,
                        border: `1px solid ${REPORT_COLORS.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, width: '100%' }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: `${REPORT_COLORS.primary}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Target size={22} color={REPORT_COLORS.primary} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Radar de Competências</h3>
                            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary }}>
                                Comparação visual entre áreas
                            </p>
                        </div>
                    </div>
                    <ReportRadarChart data={areaData} height={280} maxValue={10} />
                </div>

                {/* Right: Bar Chart + Insights */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Bar Chart */}
                    <div
                        style={{
                            background: REPORT_COLORS.background.card,
                            borderRadius: 12,
                            padding: 20,
                            border: `1px solid ${REPORT_COLORS.border}`,
                            flex: 1,
                        }}
                    >
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Ranking de Áreas</h4>
                        <ReportBarChart data={sortedAreas} height={160} layout="horizontal" colorByValue />
                    </div>

                    {/* Insights Row */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        {/* Global Average */}
                        <div
                            style={{
                                flex: 1,
                                background: `linear-gradient(135deg, ${REPORT_COLORS.primary} 0%, ${REPORT_COLORS.primaryDark} 100%)`,
                                borderRadius: 12,
                                padding: 16,
                                color: 'white',
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ margin: 0, fontSize: 10, opacity: 0.9 }}>MÉDIA GERAL</p>
                            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800 }}>{globalAverage.toFixed(1)}</p>
                        </div>

                        {/* Best Area */}
                        {bestArea && (
                            <div
                                style={{
                                    flex: 1,
                                    background: `${REPORT_COLORS.success}15`,
                                    borderRadius: 12,
                                    padding: 16,
                                    textAlign: 'center',
                                    border: `1px solid ${REPORT_COLORS.success}30`,
                                }}
                            >
                                <p style={{ margin: 0, fontSize: 10, color: REPORT_COLORS.success }}>DESTAQUE</p>
                                <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>{bestArea.name}</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: REPORT_COLORS.success }}>
                                    {bestArea.value}
                                </p>
                            </div>
                        )}

                        {/* Worst Area */}
                        {worstArea && worstArea.name !== bestArea?.name && (
                            <div
                                style={{
                                    flex: 1,
                                    background: `${REPORT_COLORS.danger}15`,
                                    borderRadius: 12,
                                    padding: 16,
                                    textAlign: 'center',
                                    border: `1px solid ${REPORT_COLORS.danger}30`,
                                }}
                            >
                                <p style={{ margin: 0, fontSize: 10, color: REPORT_COLORS.danger }}>ATENÇÃO</p>
                                <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>{worstArea.name}</p>
                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: REPORT_COLORS.danger }}>
                                    {worstArea.value}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SlideLayout>
    );
};
