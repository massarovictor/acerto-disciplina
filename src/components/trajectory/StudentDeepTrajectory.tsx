import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrajectoryAnalytics } from '@/hooks/useTrajectoryAnalytics';
import { useExternalAssessmentsScoped, useHistoricalGradesScoped } from '@/hooks/useData';
import {
    ComposedChart, Line, Bar, BarChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter
} from 'recharts';
import { PERFORMANCE_BUCKETS, classifyAverage } from '@/lib/analytics/clusters';
import { Brain, TrendingUp, Target, GraduationCap } from 'lucide-react';

interface StudentDeepTrajectoryProps {
    studentId: string;
    classId?: string;
}

export const StudentDeepTrajectory = ({ studentId }: StudentDeepTrajectoryProps) => {
    // 1. Fetch High School Data (Current Context)
    const { intervalPoints: highSchoolPoints, pointTotals: highSchoolTotals } = useTrajectoryAnalytics({
        classIds: [],
        studentIds: [studentId],
        startYear: 1, // 1st Year High School
        endYear: 3,   // 3rd Year High School
        startQuarter: '1º Bimestre',
        endQuarter: '4º Bimestre',
        subject: 'all'
    });

    // 2. Fetch Fundamental Data (Historical Context)
    const { historicalGrades } = useHistoricalGradesScoped(studentId);

    // 3. Fetch External Assessments
    const { externalAssessments } = useExternalAssessmentsScoped(studentId);

    // --- DATA PROCESSING & UNIFICATION ---

    // A. Process Fundamental Data (6-9)
    const fundamentalData = useMemo(() => {
        const points = [];
        for (let year = 6; year <= 9; year++) {
            const yearGrades = historicalGrades.filter(g => g.gradeYear === year && g.schoolLevel === 'fundamental');
            if (yearGrades.length === 0) continue;

            const total = yearGrades.reduce((sum, g) => sum + g.grade, 0);
            const avg = total / yearGrades.length;

            points.push({
                year,
                level: 'Fundamental',
                shortLabel: `${year}º Ano`,
                index: year, // Simple index for sorting
                avgLegacy: Number(avg.toFixed(1)),
                avgCurrent: null,
                externalScore: null,
                type: 'fundamental'
            });
        }
        return points;
    }, [historicalGrades]);

    // B. Process High School Data (1-3)
    const highSchoolData = useMemo(() => {
        if (!highSchoolTotals?.totalsByStudent) return [];
        const studentStats = highSchoolTotals.totalsByStudent.get(studentId);

        return highSchoolPoints.map(point => {
            const stats = studentStats?.get(point.key);
            const avg = stats && stats.count > 0 ? (stats.total / stats.count) : null;

            return {
                year: point.year,
                level: 'Médio',
                shortLabel: `${point.year}º-${point.quarter.replace('º Bimestre', 'B')}`,
                index: 10 + point.index, // Offset to place after fundamental
                avgLegacy: null,
                avgCurrent: avg ? Number(avg.toFixed(1)) : null,
                externalScore: null,
                type: 'medio'
            };
        }).filter(p => p.avgCurrent !== null); // Only show existing points
    }, [highSchoolPoints, highSchoolTotals, studentId]);

    // C. Process External Assessments
    const assessmentData = useMemo(() => {
        return externalAssessments.map((a, idx) => ({
            name: a.assessmentName,
            date: new Date(a.appliedDate).toLocaleDateString('pt-BR'),
            score: (a.score / a.maxScore) * 10, // Normalize to 0-10 scale
            rawScore: a.score,
            maxScore: a.maxScore,
            type: a.assessmentType,
            subject: a.subject,
            index: idx // Just for keying
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [externalAssessments]);

    // D. Unified Timeline Data
    const unifiedTimelineData = useMemo(() => {
        // We merge data based on a rough chronological order
        // Fundamental first, then High School.
        // External assessments are tricky to place exactly on the X-axis without a date scale,
        // so for the "Unified Chart" we might overlap them or just show them in the separate chart.
        // For this view, let's keep Fundamental and High School connected.
        return [...fundamentalData, ...highSchoolData];
    }, [fundamentalData, highSchoolData]);


    // --- SUAMMARY STATISTICS ---

    const stats = useMemo(() => {
        const funAvg = fundamentalData.reduce((acc, curr) => acc + (curr.avgLegacy || 0), 0) / (fundamentalData.length || 1);
        const medAvg = highSchoolData.reduce((acc, curr) => acc + (curr.avgCurrent || 0), 0) / (highSchoolData.length || 1);
        const extAvg = assessmentData.reduce((acc, curr) => acc + curr.score, 0) / (assessmentData.length || 1);

        // Current Status (Last High School point or Last Fundamental point)
        const lastPoint = highSchoolData[highSchoolData.length - 1] || fundamentalData[fundamentalData.length - 1];
        const currentScore = lastPoint ? (lastPoint.avgCurrent || lastPoint.avgLegacy || 0) : 0;
        const bucket = classifyAverage(currentScore);

        return {
            fundamental: funAvg || 0,
            medio: medAvg || 0,
            external: extAvg || 0,
            current: currentScore,
            bucket: PERFORMANCE_BUCKETS.find(b => b.key === bucket)
        };
    }, [fundamentalData, highSchoolData, assessmentData]);


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={`border-none shadow-sm rounded-xl border-l-4 ${stats.bucket ? stats.bucket.tone.replace('text-', 'border-') : 'border-slate-200'}`}>
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Desempenho Atual</CardTitle>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-3xl font-black ${stats.bucket?.tone}`}>{stats.current.toFixed(1)}</span>
                            <Badge variant="outline" className={`font-semibold ${stats.bucket?.bg}`}>{stats.bucket?.label}</Badge>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="border-none shadow-sm rounded-xl border-l-4 border-blue-500">
                    <CardHeader className="py-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-blue-100 rounded text-blue-600"><GraduationCap className="h-4 w-4" /></div>
                            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Média Fundamental</CardTitle>
                        </div>
                        <span className="text-2xl font-black text-slate-700">{stats.fundamental > 0 ? stats.fundamental.toFixed(1) : '-'}</span>
                    </CardHeader>
                </Card>

                <Card className="border-none shadow-sm rounded-xl border-l-4 border-violet-500">
                    <CardHeader className="py-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-violet-100 rounded text-violet-600"><TrendingUp className="h-4 w-4" /></div>
                            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Média Ensino Médio</CardTitle>
                        </div>
                        <span className="text-2xl font-black text-slate-700">{stats.medio > 0 ? stats.medio.toFixed(1) : '-'}</span>
                    </CardHeader>
                </Card>

                <Card className="border-none shadow-sm rounded-xl border-l-4 border-emerald-500">
                    <CardHeader className="py-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-emerald-100 rounded text-emerald-600"><Target className="h-4 w-4" /></div>
                            <CardTitle className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Média Aval. Externas</CardTitle>
                        </div>
                        <span className="text-2xl font-black text-slate-700">{stats.external > 0 ? stats.external.toFixed(1) : '-'}</span>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="timeline" className="gap-2"><TrendingUp className="h-4 w-4" /> Trajetória Unificada</TabsTrigger>
                    <TabsTrigger value="external" className="gap-2"><Brain className="h-4 w-4" /> Avaliações Externas</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Linha do Tempo Educacional</CardTitle>
                            <CardDescription>Evolução integrada: Fundamental (Histórico) e Ensino Médio (Atual)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={unifiedTimelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="shortLabel" tick={{ fontSize: 12, fill: '#64748B' }} />
                                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 12, fill: '#64748B' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <ReferenceLine y={6} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Mínimo', fill: '#EF4444', fontSize: 10 }} />

                                    <Area
                                        type="monotone"
                                        dataKey="avgLegacy"
                                        name="Fundamental"
                                        fill="#93C5FD"
                                        stroke="#3B82F6"
                                        fillOpacity={0.2}
                                        connectNulls
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avgCurrent"
                                        name="Ensino Médio"
                                        stroke="#7C3AED"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#7C3AED", strokeWidth: 2, stroke: '#fff' }}
                                        connectNulls
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="external">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Histórico de Avaliações Externas</CardTitle>
                            <CardDescription>Desempenho em simulados, SAEB e diagnósticas (Normalizado 0-10)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            {assessmentData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    Nenhuma avaliação externa registrada.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={assessmentData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <Tooltip
                                            cursor={{ fill: '#F1F5F9' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                                                            <p className="font-semibold text-sm">{data.name}</p>
                                                            <p className="text-xs text-muted-foreground mb-2">{data.date} • {data.type}</p>
                                                            <div className="flex gap-2 text-sm">
                                                                <span className="font-bold text-slate-700">Nota: {data.rawScore}</span>
                                                                <span className="text-slate-400">/ {data.maxScore}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="score" name="Nota Normalizada (0-10)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
