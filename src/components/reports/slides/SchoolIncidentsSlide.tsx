/**
 * SchoolIncidentsSlide - School-wide incidents analysis
 * Shows incidents by severity and classes ranked by incident count
 */

import { useMemo, useState } from 'react';
import { Class, Incident } from '@/types';
import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { AlertTriangle, AlertOctagon, AlertCircle, Info, Building2, List } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface SchoolIncidentsSlideProps {
    schoolName: string;
    classes: Class[];
    incidents: Incident[];
    period: string;
}

import {
    getSeverityLabel
} from '@/lib/incidentUtils';

const SEVERITY_ICONS = {
    leve: Info,
    intermediaria: AlertCircle,
    grave: AlertTriangle,
    gravissima: AlertOctagon,
};

export const SchoolIncidentsSlide = ({
    schoolName,
    classes,
    incidents,
    period,
}: SchoolIncidentsSlideProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const incidentData = useMemo(() => {
        // Incidents já chegam filtrados por período no componente pai (ClassSlides).
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
    }, [classes, incidents]);

    // Mostrar apenas top 5 no slide para caber o botão
    const displayClasses = incidentData.byClass.slice(0, 5);
    const hasMore = incidentData.byClass.length > 5;

    return (
        <>
            <SlideLayout
                title={`${schoolName} — Análise de Acompanhamentos`}
                subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • ${incidentData.total} acompanhamentos registrados`}
                footer="MAVIC - Sistema de Acompanhamento Escolar"
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32, height: '100%' }}>
                    {/* Left: Severity Cards + Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Severity cards */}
                        {(['leve', 'intermediaria', 'grave', 'gravissima'] as const).map((severity) => {
                            const Icon = SEVERITY_ICONS[severity];
                            const count = incidentData.bySeverity[severity];
                            const percentage = incidentData.total > 0 ? (count / incidentData.total) * 100 : 0;

                            // Map tailwind classes to hex colors for the slide style
                            const getColor = (sev: string) => {
                                switch (sev) {
                                    case 'leve': return '#3B82F6'; // blue-500
                                    case 'intermediaria': return '#F59E0B'; // amber-500
                                    case 'grave': return '#F97316'; // orange-500
                                    case 'gravissima': return '#EF4444'; // red-500
                                    default: return '#3B82F6';
                                }
                            };

                            const color = getColor(severity);
                            const label = getSeverityLabel(severity);

                            return (
                                <div
                                    key={severity}
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
                                            background: `${color}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Icon size={28} color={color} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: REPORT_COLORS.text.primary }}>
                                            {label}
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
                                                background: color,
                                                borderRadius: 4,
                                            }} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: color }}>
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
                                Status dos Acompanhamentos
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
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Turmas por Número de Acompanhamentos</h3>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: REPORT_COLORS.text.secondary }}>
                                Ordenadas da maior para menor quantidade
                            </p>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                            {displayClasses.map((cls, index) => (
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
                                            <span style={{ padding: '4px 8px', borderRadius: 4, background: '#F9731615', color: '#F97316', fontSize: 12, fontWeight: 600 }}>
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
                                    Nenhum acompanhamento registrado.
                                </div>
                            )}

                            {hasMore && (
                                <div style={{ padding: '16px 24px', textAlign: 'center' }}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsDialogOpen(true)}
                                        className="w-full gap-2"
                                    >
                                        <Building2 className="h-4 w-4" />
                                        Ver todas as {incidentData.byClass.length} turmas
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SlideLayout>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-full bg-primary/10">
                                <List className="h-5 w-5 text-primary" />
                            </div>
                            Ranking Completo de Turmas por Acompanhamentos
                        </DialogTitle>
                        <DialogDescription>
                            Listagem completa de turmas ordenada por volume de acompanhamentos
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pb-2">
                        <span>{incidentData.byClass.length} turmas com registros</span>
                    </div>

                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-y-auto flex-1">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center text-info">Leve</TableHead>
                                        <TableHead className="text-center text-warning">Intermed.</TableHead>
                                        <TableHead className="text-center text-warning">Grave</TableHead>
                                        <TableHead className="text-center text-destructive">Gravíssima</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incidentData.byClass.map((cls, index) => (
                                        <TableRow key={cls.classId}>
                                            <TableCell className="text-center font-medium">
                                                <Badge
                                                    variant={index < 3 ? 'default' : 'outline'}
                                                    className={index === 0 ? 'bg-destructive' : index === 1 ? 'bg-destructive/100' : index === 2 ? 'bg-warning/100' : ''}
                                                >
                                                    {index + 1}º
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{cls.className}</TableCell>
                                            <TableCell className="text-center font-bold text-lg">{cls.total}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{cls.leve || '-'}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{cls.intermediaria || '-'}</TableCell>
                                            <TableCell className="text-center font-medium text-warning">
                                                {cls.grave > 0 ? (
                                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                                        {cls.grave}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-destructive">
                                                {cls.gravissima > 0 ? (
                                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                                        {cls.gravissima}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
