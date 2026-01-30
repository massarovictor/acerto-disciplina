import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CriticalityAnalysis } from './CriticalityAnalysis';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList
} from 'recharts';
import { Users, GraduationCap, Target, School, TrendingUp, BookOpen, Activity, BarChart2 } from 'lucide-react';
import { useTrajectoryStatistics } from '@/hooks/useTrajectoryStatistics';
import { Button } from '@/components/ui/button';
import { TrajectoryComparisonDialog } from './TrajectoryComparisonDialog';

interface ClassTrajectoryViewProps {
    classId: string;
    selectedSubject: string;
}

export const ClassTrajectoryView = ({ classId, selectedSubject }: ClassTrajectoryViewProps) => {
    // UI State
    const [selectedExternalAssessment, setSelectedExternalAssessment] = useState<string>('all');
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);

    // Data Hook (Aggregated logic extracted)
    const {
        statsByClass,
        distinctAssessments,
        loading
    } = useTrajectoryStatistics({ classIds: [classId], selectedSubject });

    const aggregatedData = statsByClass?.[classId];
    const timelineData = aggregatedData?.timelineData || [];

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando dados da turma...</div>;
    }

    if (!aggregatedData) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-20" />
                <p>Nenhum dado encontrado para esta turma.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header / Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Visão Geral da Turma
                    </h2>
                    <p className="text-muted-foreground">
                        Análise agregada de desempenho e distribuição de criticidade.
                    </p>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => setIsComparisonOpen(true)}>
                    <BarChart2 className="h-4 w-4" />
                    Comparar Turmas
                </Button>
            </div>

            <TrajectoryComparisonDialog
                open={isComparisonOpen}
                onOpenChange={setIsComparisonOpen}
                currentClassId={classId}
                selectedSubject={selectedSubject}
            />

            {/* Holistic Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Média Fundamental</CardTitle>
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {aggregatedData.averages.fund.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Média histórica da turma</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Média Ensino Médio</CardTitle>
                        <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            <School className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                            {aggregatedData.averages.hs.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Média acum. atual</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Média Aval. Externas</CardTitle>
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Target className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {aggregatedData.averages.ext.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {selectedExternalAssessment === 'all' ? 'Todas avaliações' : selectedExternalAssessment}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="criticality" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="criticality" className="gap-2">
                        <Target className="h-4 w-4" /> Análise de Criticidade
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-2">
                        <TrendingUp className="h-4 w-4" /> Evolução da Média
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="criticality">
                    <CriticalityAnalysis
                        studentsData={aggregatedData.studentStats}
                        externalFilter={
                            <div className="w-[200px]">
                                <Select value={selectedExternalAssessment} onValueChange={setSelectedExternalAssessment}>
                                    <SelectTrigger className="h-8 text-xs bg-background">
                                        <SelectValue placeholder="Filtrar Avaliação Externa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Avaliações</SelectItem>
                                        {distinctAssessments.map(name => (
                                            <SelectItem key={name} value={name}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        }
                    />
                </TabsContent>

                <TabsContent value="timeline" className="space-y-6">
                    {/* Linha do Tempo (Chart Principal) */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Trajetória Média da Turma</CardTitle>
                            <CardDescription>Evolução das médias do Fundamental ao Ensino Médio</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            {timelineData.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                                    <BookOpen className="h-10 w-10 opacity-20" />
                                    <p>Sem dados suficientes para gerar o gráfico.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => value.toFixed(1)}
                                        />
                                        <Legend />
                                        <ReferenceLine y={6} stroke="#e74c3c" strokeDasharray="3 3" />

                                        <Line
                                            type="monotone"
                                            dataKey="grade"
                                            name="Média Turma"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            connectNulls
                                            activeDot={{ r: 6 }}
                                        >
                                            <LabelList dataKey="grade" position="top" formatter={(v: number) => v.toFixed(1)} style={{ fontSize: 10, fill: '#2563eb', fontWeight: 'bold' }} />
                                        </Line>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pulso de Performance */}
                    <Card className="border-none shadow-sm bg-card/60">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Pulso de Performance - Turma
                            </CardTitle>
                            <CardDescription>
                                Visão contínua com notas em cada período da trajetória
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            {timelineData.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                                    <BookOpen className="h-10 w-10 opacity-20" />
                                    <p>Sem dados suficientes.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={timelineData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="pulseGradientClass" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10 }}
                                            angle={-30}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => value.toFixed(1)}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="grade"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fill="url(#pulseGradientClass)"
                                            activeDot={{ r: 6, fill: "#3b82f6" }}
                                            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
