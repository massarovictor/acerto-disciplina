
import { useState, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useClasses } from '@/hooks/useData';
import { useTrajectoryStatistics } from '@/hooks/useTrajectoryStatistics';
import { formatNumber } from '@/hooks/useSchoolAnalytics';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { BookOpen, Users, X } from 'lucide-react';

interface TrajectoryComparisonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentClassId: string;
    selectedSubject: string | null;
}

export function TrajectoryComparisonDialog({
    open,
    onOpenChange,
    currentClassId,
    selectedSubject: initialSubject,
}: TrajectoryComparisonDialogProps) {
    const { classes } = useClasses();

    // UI State
    const [primaryClassId, setPrimaryClassId] = useState(currentClassId);
    const [comparisonClassIds, setComparisonClassIds] = useState<string[]>([]);
    const [internalSubject, setInternalSubject] = useState<string | 'all'>(initialSubject || 'all');

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setPrimaryClassId(currentClassId);
            setComparisonClassIds([]);
            setInternalSubject(initialSubject || 'all');
        }
    }, [open, currentClassId, initialSubject]);

    // Subjects List
    const subjects = ['Matemática', 'Língua Portuguesa', 'História', 'Geografia', 'Ciências', 'Inglês', 'Arte', 'Educação Física'];

    // Resolve IDs to Fetch
    const allIds = useMemo(() => {
        return Array.from(new Set([primaryClassId, ...comparisonClassIds])).filter(Boolean);
    }, [primaryClassId, comparisonClassIds]);

    // Fetch Data
    const { statsByClass, loading } = useTrajectoryStatistics({
        classIds: allIds,
        selectedSubject: internalSubject === 'all' ? null : internalSubject
    });

    const primaryClass = classes.find(c => c.id === primaryClassId);

    const availableForComparison = useMemo(() => {
        return classes
            .filter(c => c.active && c.id !== primaryClassId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [classes, primaryClassId]);

    // Handlers
    const handlePrimaryChange = (newId: string) => {
        setPrimaryClassId(newId);
        // Remove new primary from comparison list if it exists there
        if (comparisonClassIds.includes(newId)) {
            setComparisonClassIds(prev => prev.filter(id => id !== newId));
        }
    };

    const toggleComparison = (id: string) => {
        setComparisonClassIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    // Prepare Chart Data
    const chartData = useMemo(() => {
        const merged = new Map<string, any>();

        allIds.forEach(id => {
            const stats = statsByClass?.[id];
            if (!stats) return;

            stats.timelineData.forEach((item: any) => {
                const existing = merged.get(item.label) || {
                    label: item.label,
                    type: item.type,
                    sortKey: item.sortKey
                };

                existing[id] = item.grade;
                merged.set(item.label, existing);
            });
        });

        return Array.from(merged.values()).sort((a, b) => {
            if (a.type !== b.type) return a.type === 'Fundamental' ? -1 : 1;
            return (a.sortKey || 0) - (b.sortKey || 0);
        });

    }, [statsByClass, allIds]);

    // Color Palette
    const PALETTE = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
    const getClassColor = (id: string, index: number) => {
        if (id === primaryClassId) return '#2563eb'; // Blue for Primary
        return PALETTE[(index + 1) % PALETTE.length];
    };

    const MetricRow = ({ label, getter, suffix = '' }: { label: string, getter: (stats: any) => number, suffix?: string }) => (
        <div className="contents">
            <div className="py-3 px-2 text-sm font-medium text-muted-foreground border-b border-border/50">{label}</div>

            {/* Primary Class Column */}
            <div className="py-3 px-2 text-center font-bold text-info bg-info/10 border-b border-border/50">
                {statsByClass?.[primaryClassId] ? formatNumber(getter(statsByClass[primaryClassId])) + suffix : '-'}
            </div>

            {/* Comparison Columns */}
            {comparisonClassIds.map(id => (
                <div key={id} className="py-3 px-2 text-center text-muted-foreground dark:text-muted-foreground border-b border-border/50">
                    {statsByClass?.[id] ? formatNumber(getter(statsByClass[id])) + suffix : '-'}
                </div>
            ))}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Comparar Turmas
                    </DialogTitle>
                    <DialogDescription>
                        Análise comparativa tendo a turma {primaryClass?.name} como referência.
                    </DialogDescription>
                </DialogHeader>

                <div className={`space-y-6 mt-2 ${loading ? 'opacity-70 pointer-events-none transition-opacity' : ''}`}>
                    {/* Controls */}
                    <Card className="bg-muted/30">
                        <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
                            {/* Primary Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turma de Referência</label>
                                <Select value={primaryClassId} onValueChange={handlePrimaryChange}>
                                    <SelectTrigger className="w-full bg-background font-medium text-info border-info/30">
                                        <SelectValue placeholder="Selecione a referência..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.filter(c => c.active).sort((a, b) => a.name.localeCompare(b.name)).map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Comparison Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outras Turmas (Comparação)</label>
                                <Select value="" onValueChange={(val) => {
                                    if (val) toggleComparison(val);
                                }}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue placeholder="Adicionar turma..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableForComparison.map(cls => (
                                            <SelectItem
                                                key={cls.id}
                                                value={cls.id}
                                                disabled={comparisonClassIds.includes(cls.id)}
                                            >
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {comparisonClassIds.map(id => {
                                        const cls = classes.find(c => c.id === id);
                                        return (
                                            <Badge key={id} variant="secondary" className="gap-1 pr-1 pl-2 py-1">
                                                {cls?.name}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleComparison(id); }}
                                                    className="ml-1 hover:text-destructive hover:bg-destructive/15 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                    {comparisonClassIds.length === 0 && (
                                        <span className="text-xs text-muted-foreground italic pt-1">Nenhuma turma adicional selecionada</span>
                                    )}
                                </div>
                            </div>

                            {/* Subject Context Toggle - Full Width or Bottom */}
                            <div className="md:col-span-2 space-y-2 pt-2 border-t border-border/50">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contexto da Análise</label>
                                <Select value={internalSubject} onValueChange={setInternalSubject}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue placeholder="Contexto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Visão Geral (Todas as Disciplinas)</SelectItem>
                                        {subjects.map(subj => (
                                            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table View */}
                    <div>
                        <div className="rounded-lg border bg-card overflow-hidden">
                            {/* Header Grid */}
                            <div className="grid bg-muted/50" style={{ gridTemplateColumns: `200px 1fr ${comparisonClassIds.map(() => '1fr').join(' ')}` }}>
                                <div className="p-3 text-xs font-semibold uppercase text-muted-foreground flex items-center">
                                    Indicador
                                </div>
                                <div className="p-3 text-center font-bold text-info border-l border-border/50 bg-info/10">
                                    {primaryClass?.name}
                                </div>
                                {comparisonClassIds.map(id => (
                                    <div key={id} className="p-3 text-center font-medium text-muted-foreground dark:text-muted-foreground border-l border-border/50">
                                        {classes.find(c => c.id === id)?.name}
                                    </div>
                                ))}
                            </div>

                            {/* Body Grid */}
                            <div className="grid text-sm" style={{ gridTemplateColumns: `200px 1fr ${comparisonClassIds.map(() => '1fr').join(' ')}` }}>
                                <MetricRow label="Média Fundamental" getter={s => s.averages.fund} />
                                <MetricRow label="Média Ensino Médio" getter={s => s.averages.hs} />
                                <MetricRow label="Média Aval. Externas" getter={s => s.averages.ext} />
                                <MetricRow label="% Críticos" getter={s => s.counts.total > 0 ? (s.counts.critical / s.counts.total) * 100 : 0} suffix="%" />
                                <MetricRow label="% Excelência" getter={s => s.counts.total > 0 ? (s.counts.excellence / s.counts.total) * 100 : 0} suffix="%" />
                            </div>
                        </div>
                    </div>

                    {/* Chart View */}
                    <Card className="shadow-sm">
                        <CardContent className="h-[350px] pt-4">
                            {chartData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                                    <BookOpen className="h-8 w-8 opacity-20 mr-2" />
                                    {loading ? 'Carregando dados...' : 'Sem dados para o gráfico.'}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => value.toFixed(1)}
                                            labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                                        />
                                        <Legend verticalAlign="top" />
                                        <ReferenceLine y={6} stroke="#e74c3c" strokeDasharray="3 3" />

                                        {/* Primary Class Line */}
                                        <Line
                                            type="monotone"
                                            dataKey={primaryClassId}
                                            name={primaryClass?.name || 'Referência'}
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                            connectNulls
                                        />

                                        {/* Comparison Lines */}
                                        {comparisonClassIds.map((id, index) => (
                                            <Line
                                                key={id}
                                                type="monotone"
                                                dataKey={id}
                                                name={classes.find(c => c.id === id)?.name || 'Comparação'}
                                                stroke={getClassColor(id, index)}
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                                connectNulls
                                            />
                                        ))}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                </div>

            </DialogContent>
        </Dialog>
    );
}
