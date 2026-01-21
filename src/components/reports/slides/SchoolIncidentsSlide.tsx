/**
 * SchoolIncidentsSlide - School-wide incidents analysis
 * Shows incidents by severity and classes ranked by incident count
 */

import { useMemo } from 'react';
import { Class, Incident } from '@/types';
import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { AlertTriangle, AlertOctagon, AlertCircle, Info, Building2 } from 'lucide-react';

interface SchoolIncidentsSlideProps {
    schoolName: string;
    classes: Class[];
    incidents: Incident[];
    period: string;
}

const SEVERITY_CONFIG = {
    leve: { label: 'Leve', color: '#22C55E', icon: Info },
    intermediaria: { label: 'Intermediária', color: '#F59E0B', icon: AlertCircle },
    grave: { label: 'Grave', color: '#EF4444', icon: AlertTriangle },
    gravissima: { label: 'Gravíssima', color: '#7C2D12', icon: AlertOctagon },
};

export const SchoolIncidentsSlide = ({
    schoolName,
    classes,
    incidents,
    period,
}: SchoolIncidentsSlideProps) => {
    const incidentData = useMemo(() => {
        // Filter by period if needed (incidents have date, we'd need quarter mapping)
        // For simplicity, using all incidents for now
        const filteredIncidents = incidents;

        // Count by severity
        const bySeverity = {
            leve: filteredIncidents.filter(i => i.finalSeverity === 'leve').length,
            intermediaria: filteredIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
            grave: filteredIncidents.filter(i => i.finalSeverity === 'grave').length,
            gravissima: filteredIncidents.filter(i => i.finalSeverity === 'gravissima').length,
        };

        // Count by class
        const byClass = classes
            .map(cls => {
                const classIncidents = filteredIncidents.filter(i => i.classId === cls.id);
                return {
                    classId: cls.id,
                    className: cls.name,
                    total: classIncidents.length,
                    leve: classIncidents.filter(i => i.finalSeverity === 'leve').length,
                    intermediaria: classIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
                    grave: classIncidents.filter(i => i.finalSeverity === 'grave').length,
                    gravissima: classIncidents.filter(i => i.finalSeverity === 'gravissima').length,
                };
            })
            .filter(c => c.total > 0)
            .sort((a, b) => b.total - a.total);

        // Count by status
        const byStatus = {
            aberta: filteredIncidents.filter(i => i.status === 'aberta').length,
            acompanhamento: filteredIncidents.filter(i => i.status === 'acompanhamento').length,
            resolvida: filteredIncidents.filter(i => i.status === 'resolvida').length,
        };

        return {
            total: filteredIncidents.length,
            bySeverity,
            byClass,
            byStatus,
        };
    }, [classes, incidents, period]);

    return (
        <SlideLayout
            title={`${schoolName} — Análise de Ocorrências`}
            subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • ${incidentData.total} ocorrências registradas`}
            footer="MAVIC - Sistema de Acompanhamento Escolar"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32, height: '100%' }}>
                {/* Left: Severity Cards + Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Severity cards */}
                    {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        const count = incidentData.bySeverity[key as keyof typeof incidentData.bySeverity];
                        const percentage = incidentData.total > 0 ? (count / incidentData.total) * 100 : 0;

                        return (
                            <div
                                key={key}
                                style={{
                                    background: REPORT_COLORS.background.card,
                                    borderRadius: 16,
                                    border: `1px solid ${REPORT_COLORS.border}`,
                                    padding: 20,
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
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: REPORT_COLORS.text.primary }}>
                                        {config.label}
                                    </p>
                                    <div style={{
                                        marginTop: 8,
                                        height: 8,
                                        background: REPORT_COLORS.background.muted,
                                        borderRadius: 4,
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${percentage}%`,
                                            background: config.color,
                                            borderRadius: 4,
                                        }} />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: config.color }}>
                                        {count}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.tertiary }}>
                                        {percentage.toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Status summary */}
                    <div style={{
                        background: REPORT_COLORS.background.card,
                        borderRadius: 16,
                        border: `1px solid ${REPORT_COLORS.border}`,
                        padding: 20,
                    }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: REPORT_COLORS.text.secondary, textTransform: 'uppercase' }}>
                            Status das Ocorrências
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ textAlign: 'center', padding: 12, background: '#EF444415', borderRadius: 8 }}>
                                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#EF4444' }}>{incidentData.byStatus.aberta}</p>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: REPORT_COLORS.text.secondary }}>Abertas</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 12, background: '#F59E0B15', borderRadius: 8 }}>
                                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>{incidentData.byStatus.acompanhamento}</p>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: REPORT_COLORS.text.secondary }}>Acompanhamento</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 12, background: '#22C55E15', borderRadius: 8 }}>
                                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#22C55E' }}>{incidentData.byStatus.resolvida}</p>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: REPORT_COLORS.text.secondary }}>Resolvidas</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Classes ranking by incidents */}
                <div style={{
                    background: REPORT_COLORS.background.card,
                    borderRadius: 16,
                    border: `1px solid ${REPORT_COLORS.border}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '16px 24px',
                        background: REPORT_COLORS.background.surface,
                        borderBottom: `1px solid ${REPORT_COLORS.border}`,
                    }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Turmas por Número de Ocorrências</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: REPORT_COLORS.text.secondary }}>
                            Ordenadas da maior para menor quantidade
                        </p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                        {incidentData.byClass.map((cls, index) => (
                            <div
                                key={cls.classId}
                                style={{
                                    padding: '12px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    borderBottom: `1px solid ${REPORT_COLORS.border}20`,
                                }}
                            >
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: index < 3 ? '#EF4444' : REPORT_COLORS.primary,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 14,
                                    fontWeight: 700,
                                }}>
                                    {index + 1}
                                </div>
                                <Building2 size={20} color={REPORT_COLORS.text.secondary} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{cls.className}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {cls.gravissima > 0 && (
                                        <span style={{ padding: '4px 8px', borderRadius: 4, background: '#7C2D1215', color: '#7C2D12', fontSize: 12, fontWeight: 600 }}>
                                            {cls.gravissima} gravíss.
                                        </span>
                                    )}
                                    {cls.grave > 0 && (
                                        <span style={{ padding: '4px 8px', borderRadius: 4, background: '#EF444415', color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
                                            {cls.grave} graves
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: REPORT_COLORS.text.primary }}>
                                    {cls.total}
                                </p>
                            </div>
                        ))}

                        {incidentData.byClass.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: REPORT_COLORS.text.tertiary }}>
                                Nenhuma ocorrência registrada.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SlideLayout>
    );
};
