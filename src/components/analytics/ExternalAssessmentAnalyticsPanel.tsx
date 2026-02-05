/**
 * Painel de Analytics de Avaliações Externas
 * 
 * Exibe dados agregados de avaliações externas (SAEB, SIGE, Diagnóstica, Simulado):
 * - Cards de resumo (total, médias PT/MAT)
 * - Gráfico de médias por tipo de avaliação
 * - Ranking de turmas por desempenho
 * - Tendência temporal
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    ClipboardList,
    BookOpen,
    Calculator,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Users,
    List,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    LineChart,
    Line,
} from 'recharts';
import { ExternalAssessment, ExternalAssessmentType, Student, Class } from '@/types';
import { AnalyticsFilters } from '@/hooks/useSchoolAnalytics';
import { CRITICALITY_BUCKETS, getCriticalityLevel, CriticalityLevel } from '@/lib/analytics/criticality';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Target, Filter } from 'lucide-react';
import { Cell, LabelList } from 'recharts';

interface ExternalAssessmentAnalyticsPanelProps {
    assessments: ExternalAssessment[];
    students: Student[];
    classes: Class[];
    filters: AnalyticsFilters;
}

// Helper para detectar disciplina (PT ou MAT) - mais abrangente
const isPortugues = (subject?: string | null): boolean => {
    if (!subject) return false;
    const s = subject.toLowerCase().trim();
    return s.includes('portugu') ||
        s.includes('língua portuguesa') ||
        s.includes('lingua portuguesa') ||
        s.includes('leitura') ||
        s.includes('redação') ||
        s.includes('redacao') ||
        s === 'pt' ||
        s === 'lp';
};

const isMatematica = (subject?: string | null): boolean => {
    if (!subject) return false;
    const s = subject.toLowerCase().trim();
    return s.includes('matem') ||
        s.includes('matemat') ||
        s === 'mat' ||
        s === 'mt';
};

// Helper para calcular porcentagem
const calcPercent = (score: number, maxScore: number): number => {
    if (maxScore === 0) return 0;
    return (score / maxScore) * 100;
};

// Labels para tipos de avaliação
const ASSESSMENT_TYPE_LABELS: Record<ExternalAssessmentType, string> = {
    'SAEB': 'SAEB',
    'SIGE': 'SIGE',
    'SPAECE': 'SPAECE',
    'Diagnóstica': 'Diagnóstica',
    'Simulado': 'Simulado',
    'Outro': 'Outro',
};

export function ExternalAssessmentAnalyticsPanel({
    assessments,
    students,
    classes,
    filters,
}: ExternalAssessmentAnalyticsPanelProps) {
    const [isClassRankingOpen, setIsClassRankingOpen] = useState(false);
    const [isPtRankingOpen, setIsPtRankingOpen] = useState(false);
    const [isMatRankingOpen, setIsMatRankingOpen] = useState(false);
    const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);
    const [selectedCriticalityLevel, setSelectedCriticalityLevel] = useState<CriticalityLevel | null>(null);
    const [selectedAssessmentName, setSelectedAssessmentName] = useState<string>('all');
    // Filtros separados para criticidade PT e MAT
    const [ptCriticalityFilter, setPtCriticalityFilter] = useState<string>('all');
    const [matCriticalityFilter, setMatCriticalityFilter] = useState<string>('all');
    const [activeCriticalitySubject, setActiveCriticalitySubject] = useState<'PT' | 'MAT'>('PT');

    // TODAS as avaliações (para totais gerais)
    const allAssessments = assessments;

    // Nomes de avaliação disponíveis (de TODAS as avaliações)
    const availableNames = useMemo(() => {
        const names = new Set<string>();
        allAssessments.forEach(a => names.add(a.assessmentName));
        return Array.from(names).sort();
    }, [allAssessments]);

    // Separar por disciplina (de TODAS as avaliações)
    const ptAssessments = useMemo(() =>
        allAssessments.filter(a => isPortugues(a.subject)),
        [allAssessments]
    );
    const matAssessments = useMemo(() =>
        allAssessments.filter(a => isMatematica(a.subject)),
        [allAssessments]
    );

    // Calcular médias gerais (usando 0-10 em vez de %)
    const calcAverage = (items: ExternalAssessment[]): number => {
        if (items.length === 0) return 0;
        const sum = items.reduce((acc, a) => acc + (a.score / a.maxScore) * 10, 0);
        return sum / items.length;
    };

    const overallAverage = calcAverage(allAssessments);
    const ptAverage = calcAverage(ptAssessments);
    const matAverage = calcAverage(matAssessments);

    // Ranking de turmas - PORTUGUÊS
    const ptClassRanking = useMemo(() => {
        const classMap = new Map<string, {
            classData: Class;
            scores: number[];
            total: number;
        }>();

        ptAssessments.forEach(a => {
            const student = students.find(s => s.id === a.studentId);
            if (!student?.classId) return;

            const cls = classes.find(c => c.id === student.classId);
            if (!cls) return;

            if (!classMap.has(cls.id)) {
                classMap.set(cls.id, {
                    classData: cls,
                    scores: [],
                    total: 0,
                });
            }

            const entry = classMap.get(cls.id)!;
            // Usar escala 0-10 em vez de porcentagem
            entry.scores.push((a.score / a.maxScore) * 10);
            entry.total++;
        });

        return Array.from(classMap.values())
            .map(entry => ({
                classData: entry.classData,
                average: entry.scores.length > 0 ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length : 0,
                total: entry.total,
            }))
            .sort((a, b) => b.average - a.average);
    }, [ptAssessments, students, classes]);

    // Ranking de turmas - MATEMÁTICA
    const matClassRanking = useMemo(() => {
        const classMap = new Map<string, {
            classData: Class;
            scores: number[];
            total: number;
        }>();

        matAssessments.forEach(a => {
            const student = students.find(s => s.id === a.studentId);
            if (!student?.classId) return;

            const cls = classes.find(c => c.id === student.classId);
            if (!cls) return;

            if (!classMap.has(cls.id)) {
                classMap.set(cls.id, {
                    classData: cls,
                    scores: [],
                    total: 0,
                });
            }

            const entry = classMap.get(cls.id)!;
            // Usar escala 0-10 em vez de porcentagem
            entry.scores.push((a.score / a.maxScore) * 10);
            entry.total++;
        });

        return Array.from(classMap.values())
            .map(entry => ({
                classData: entry.classData,
                average: entry.scores.length > 0 ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length : 0,
                total: entry.total,
            }))
            .sort((a, b) => b.average - a.average);
    }, [matAssessments, students, classes]);

    // Helper function para calcular criticidade de alunos
    const computeCriticalityData = (assessmentList: ExternalAssessment[]) => {
        const studentMap = new Map<string, {
            student: Student;
            scores: number[];
            average: number;
        }>();

        assessmentList.forEach(a => {
            const student = students.find(s => s.id === a.studentId);
            if (!student) return;

            if (!studentMap.has(student.id)) {
                studentMap.set(student.id, {
                    student,
                    scores: [],
                    average: 0,
                });
            }

            const entry = studentMap.get(student.id)!;
            // Converter para escala 0-10
            const gradeScale = (a.score / a.maxScore) * 10;
            entry.scores.push(gradeScale);
        });

        // Calcular médias
        studentMap.forEach(entry => {
            entry.average = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
        });

        // Agrupar por nível de criticidade
        const buckets: Record<CriticalityLevel, { student: Student; average: number }[]> = {
            'MUITO CRITICO': [],
            'CRITICO': [],
            'INTERMEDIARIO': [],
            'ADEQUADO': [],
        };

        studentMap.forEach(entry => {
            const level = getCriticalityLevel(entry.average);
            buckets[level].push({ student: entry.student, average: entry.average });
        });

        // Ordenar por média (do pior para o melhor dentro de cada bucket)
        Object.values(buckets).forEach(bucket => {
            bucket.sort((a, b) => a.average - b.average);
        });

        // Formatar para gráfico
        const chartData = CRITICALITY_BUCKETS.map(bucket => ({
            name: bucket.label,
            fullLabel: bucket.level,
            value: buckets[bucket.level].length,
            students: buckets[bucket.level],
            color: bucket.level === 'MUITO CRITICO' ? '#991b1b' :
                bucket.level === 'CRITICO' ? '#d97706' :
                    bucket.level === 'INTERMEDIARIO' ? '#059669' : '#2563eb',
        }));

        return { buckets, chartData, totalStudents: studentMap.size };
    };

    // Avaliações de PT filtradas pelo filtro de criticidade PT (por NOME)
    const ptCriticalityAssessments = useMemo(() => {
        const baseAssessments = allAssessments.filter(a => isPortugues(a.subject));
        if (ptCriticalityFilter === 'all') return baseAssessments;
        return baseAssessments.filter(a => a.assessmentName === ptCriticalityFilter);
    }, [allAssessments, ptCriticalityFilter]);

    // Avaliações de MAT filtradas pelo filtro de criticidade MAT (por NOME)
    const matCriticalityAssessments = useMemo(() => {
        const baseAssessments = allAssessments.filter(a => isMatematica(a.subject));
        if (matCriticalityFilter === 'all') return baseAssessments;
        return baseAssessments.filter(a => a.assessmentName === matCriticalityFilter);
    }, [allAssessments, matCriticalityFilter]);

    // Criticidade PT
    const ptCriticalityData = useMemo(() => {
        return computeCriticalityData(ptCriticalityAssessments);
    }, [ptCriticalityAssessments, students]);

    // Criticidade MAT
    const matCriticalityData = useMemo(() => {
        return computeCriticalityData(matCriticalityAssessments);
    }, [matCriticalityAssessments, students]);

    // Alunos a exibir no dialog
    const selectedStudents = useMemo(() => {
        if (!selectedCriticalityLevel) return [];
        const data = activeCriticalitySubject === 'PT' ? ptCriticalityData : matCriticalityData;
        return data.buckets[selectedCriticalityLevel] || [];
    }, [selectedCriticalityLevel, activeCriticalitySubject, ptCriticalityData, matCriticalityData]);


    if (allAssessments.length === 0) {
        return (
            <Card className="border-none shadow-none">
                <CardContent className="px-0">
                    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
                        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nenhuma Avaliação Externa</h3>
                        <p className="text-muted-foreground max-w-md">
                            Não há avaliações externas cadastradas.
                            Acesse a Trajetória do Aluno para registrar avaliações.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-none">
            <CardContent className="px-0 space-y-6">
                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <ClipboardList className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{allAssessments.length}</p>
                                    <p className="text-xs text-muted-foreground">Total de Avaliações</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{overallAverage.toFixed(1)}%</p>
                                    <p className="text-xs text-muted-foreground">Média Geral</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-violet-500/10">
                                    <BookOpen className="h-5 w-5 text-violet-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{ptAverage.toFixed(1)}%</p>
                                    <p className="text-xs text-muted-foreground">Média Português</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <Calculator className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{matAverage.toFixed(1)}%</p>
                                    <p className="text-xs text-muted-foreground">Média Matemática</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>


                {/* Ranking por Disciplina */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Ranking de Português */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-violet-500/10">
                                    <BookOpen className="h-4 w-4 text-violet-500" />
                                </div>
                                Ranking de Turmas - Português
                            </CardTitle>
                            <CardDescription>
                                Ordenado pela média geral
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ptClassRanking.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhuma turma com avaliações
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {ptClassRanking.slice(0, 5).map((item, index) => (
                                        <div
                                            key={item.classData.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant={index < 3 ? 'default' : 'outline'}
                                                    className={
                                                        index === 0 ? 'bg-amber-500' :
                                                            index === 1 ? 'bg-slate-400' :
                                                                index === 2 ? 'bg-amber-700' : ''
                                                    }
                                                >
                                                    {index + 1}º
                                                </Badge>
                                                <div>
                                                    <p className="text-sm font-medium">{item.classData.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.total} avaliações
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-bold text-violet-600">
                                                {item.average.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {ptClassRanking.length > 5 && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsPtRankingOpen(true)}
                                        className="text-xs"
                                    >
                                        Ver ranking completo
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ranking de Matemática */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-amber-500/10">
                                    <Calculator className="h-4 w-4 text-amber-500" />
                                </div>
                                Ranking de Turmas - Matemática
                            </CardTitle>
                            <CardDescription>
                                Ordenado pela média geral
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {matClassRanking.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhuma turma com avaliações
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {matClassRanking.slice(0, 5).map((item, index) => (
                                        <div
                                            key={item.classData.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant={index < 3 ? 'default' : 'outline'}
                                                    className={
                                                        index === 0 ? 'bg-amber-500' :
                                                            index === 1 ? 'bg-slate-400' :
                                                                index === 2 ? 'bg-amber-700' : ''
                                                    }
                                                >
                                                    {index + 1}º
                                                </Badge>
                                                <div>
                                                    <p className="text-sm font-medium">{item.classData.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.total} avaliações
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-bold text-amber-600">
                                                {item.average.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {matClassRanking.length > 5 && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMatRankingOpen(true)}
                                        className="text-xs"
                                    >
                                        Ver ranking completo
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Análise de Criticidade - Português */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-violet-500/10">
                                    <BookOpen className="h-4 w-4 text-violet-500" />
                                </div>
                                Análise de Criticidade - Português
                            </CardTitle>
                            <Select
                                value={ptCriticalityFilter}
                                onValueChange={(v) => setPtCriticalityFilter(v as ExternalAssessmentType | 'all')}
                            >
                                <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {availableNames.map(name => (
                                        <SelectItem key={name} value={name}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <CardDescription>
                            Distribuição por níveis de desempenho (Nota 0-10)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {ptCriticalityData.totalStudents === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhum aluno com avaliações de Português
                            </p>
                        ) : (
                            <>
                                {/* Gráfico de Distribuição */}
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ptCriticalityData.chartData} layout="horizontal">
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value: number) => [`${value} aluno(s)`]}
                                            />
                                            <Bar
                                                dataKey="value"
                                                radius={[4, 4, 0, 0]}
                                                cursor="pointer"
                                                onClick={(data) => {
                                                    setActiveCriticalitySubject('PT');
                                                    setSelectedCriticalityLevel(data.fullLabel as CriticalityLevel);
                                                    setIsStudentDetailsOpen(true);
                                                }}
                                            >
                                                {ptCriticalityData.chartData.map((entry, index) => (
                                                    <Cell key={`cell-pt-${index}`} fill={entry.color} />
                                                ))}
                                                <LabelList dataKey="value" position="top" fontSize={11} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Cards por Nível */}
                                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                                    {ptCriticalityData.chartData.map(bucket => (
                                        <Card
                                            key={`pt-${bucket.fullLabel}`}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => {
                                                setActiveCriticalitySubject('PT');
                                                setSelectedCriticalityLevel(bucket.fullLabel as CriticalityLevel);
                                                setIsStudentDetailsOpen(true);
                                            }}
                                        >
                                            <CardContent className="pt-3 pb-2 px-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5"
                                                        style={{ borderColor: bucket.color, color: bucket.color }}
                                                    >
                                                        {bucket.name}
                                                    </Badge>
                                                    <span className="text-xl font-bold" style={{ color: bucket.color }}>
                                                        {bucket.value}
                                                    </span>
                                                </div>
                                                {bucket.students.length > 0 && (
                                                    <div className="space-y-0.5 mt-2">
                                                        {bucket.students.slice(0, 2).map(s => (
                                                            <div key={s.student.id} className="flex items-center justify-between text-[10px]">
                                                                <span className="truncate max-w-[80px]">{s.student.name}</span>
                                                                <span className="font-mono text-muted-foreground">{s.average.toFixed(1)}</span>
                                                            </div>
                                                        ))}
                                                        {bucket.students.length > 2 && (
                                                            <p className="text-[10px] text-muted-foreground text-center">
                                                                +{bucket.students.length - 2}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Análise de Criticidade - Matemática */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-amber-500/10">
                                    <Calculator className="h-4 w-4 text-amber-500" />
                                </div>
                                Análise de Criticidade - Matemática
                            </CardTitle>
                            <Select
                                value={matCriticalityFilter}
                                onValueChange={(v) => setMatCriticalityFilter(v as ExternalAssessmentType | 'all')}
                            >
                                <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {availableNames.map(name => (
                                        <SelectItem key={name} value={name}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <CardDescription>
                            Distribuição por níveis de desempenho (Nota 0-10)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {matCriticalityData.totalStudents === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhum aluno com avaliações de Matemática
                            </p>
                        ) : (
                            <>
                                {/* Gráfico de Distribuição */}
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={matCriticalityData.chartData} layout="horizontal">
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value: number) => [`${value} aluno(s)`]}
                                            />
                                            <Bar
                                                dataKey="value"
                                                radius={[4, 4, 0, 0]}
                                                cursor="pointer"
                                                onClick={(data) => {
                                                    setActiveCriticalitySubject('MAT');
                                                    setSelectedCriticalityLevel(data.fullLabel as CriticalityLevel);
                                                    setIsStudentDetailsOpen(true);
                                                }}
                                            >
                                                {matCriticalityData.chartData.map((entry, index) => (
                                                    <Cell key={`cell-mat-${index}`} fill={entry.color} />
                                                ))}
                                                <LabelList dataKey="value" position="top" fontSize={11} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Cards por Nível */}
                                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                                    {matCriticalityData.chartData.map(bucket => (
                                        <Card
                                            key={`mat-${bucket.fullLabel}`}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => {
                                                setActiveCriticalitySubject('MAT');
                                                setSelectedCriticalityLevel(bucket.fullLabel as CriticalityLevel);
                                                setIsStudentDetailsOpen(true);
                                            }}
                                        >
                                            <CardContent className="pt-3 pb-2 px-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5"
                                                        style={{ borderColor: bucket.color, color: bucket.color }}
                                                    >
                                                        {bucket.name}
                                                    </Badge>
                                                    <span className="text-xl font-bold" style={{ color: bucket.color }}>
                                                        {bucket.value}
                                                    </span>
                                                </div>
                                                {bucket.students.length > 0 && (
                                                    <div className="space-y-0.5 mt-2">
                                                        {bucket.students.slice(0, 2).map(s => (
                                                            <div key={s.student.id} className="flex items-center justify-between text-[10px]">
                                                                <span className="truncate max-w-[80px]">{s.student.name}</span>
                                                                <span className="font-mono text-muted-foreground">{s.average.toFixed(1)}</span>
                                                            </div>
                                                        ))}
                                                        {bucket.students.length > 2 && (
                                                            <p className="text-[10px] text-muted-foreground text-center">
                                                                +{bucket.students.length - 2}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </CardContent>

            {/* Dialog de Ranking Completo - Português */}
            <Dialog open={isPtRankingOpen} onOpenChange={setIsPtRankingOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-full bg-violet-500/10">
                                <BookOpen className="h-5 w-5 text-violet-500" />
                            </div>
                            Ranking de Turmas - Português
                        </DialogTitle>
                        <DialogDescription>
                            Listagem completa ordenada por média geral
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pb-2">
                        <span>{ptClassRanking.length} turmas com registros</span>
                    </div>

                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-y-auto flex-1">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead className="text-center">Avaliações</TableHead>
                                        <TableHead className="text-center text-violet-600">Média</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ptClassRanking.map((item, index) => (
                                        <TableRow key={item.classData.id}>
                                            <TableCell className="text-center font-medium">
                                                <Badge
                                                    variant={index < 3 ? 'default' : 'outline'}
                                                    className={
                                                        index === 0 ? 'bg-amber-500' :
                                                            index === 1 ? 'bg-slate-400' :
                                                                index === 2 ? 'bg-amber-700' : ''
                                                    }
                                                >
                                                    {index + 1}º
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{item.classData.name}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{item.total}</TableCell>
                                            <TableCell className="text-center font-bold text-lg text-violet-600">
                                                {item.average.toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Ranking Completo - Matemática */}
            <Dialog open={isMatRankingOpen} onOpenChange={setIsMatRankingOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-full bg-amber-500/10">
                                <Calculator className="h-5 w-5 text-amber-500" />
                            </div>
                            Ranking de Turmas - Matemática
                        </DialogTitle>
                        <DialogDescription>
                            Listagem completa ordenada por média geral
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pb-2">
                        <span>{matClassRanking.length} turmas com registros</span>
                    </div>

                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-y-auto flex-1">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead className="text-center">Avaliações</TableHead>
                                        <TableHead className="text-center text-amber-600">Média</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {matClassRanking.map((item, index) => (
                                        <TableRow key={item.classData.id}>
                                            <TableCell className="text-center font-medium">
                                                <Badge
                                                    variant={index < 3 ? 'default' : 'outline'}
                                                    className={
                                                        index === 0 ? 'bg-amber-500' :
                                                            index === 1 ? 'bg-slate-400' :
                                                                index === 2 ? 'bg-amber-700' : ''
                                                    }
                                                >
                                                    {index + 1}º
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{item.classData.name}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{item.total}</TableCell>
                                            <TableCell className="text-center font-bold text-lg text-amber-600">
                                                {item.average.toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Detalhamento por Aluno */}
            <Dialog open={isStudentDetailsOpen} onOpenChange={setIsStudentDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div
                                className="p-2 rounded-full"
                                style={{
                                    backgroundColor: selectedCriticalityLevel === 'MUITO CRITICO' ? 'rgba(153, 27, 27, 0.1)' :
                                        selectedCriticalityLevel === 'CRITICO' ? 'rgba(217, 119, 6, 0.1)' :
                                            selectedCriticalityLevel === 'INTERMEDIARIO' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(37, 99, 235, 0.1)'
                                }}
                            >
                                <AlertTriangle
                                    className="h-5 w-5"
                                    style={{
                                        color: selectedCriticalityLevel === 'MUITO CRITICO' ? '#991b1b' :
                                            selectedCriticalityLevel === 'CRITICO' ? '#d97706' :
                                                selectedCriticalityLevel === 'INTERMEDIARIO' ? '#059669' : '#2563eb'
                                    }}
                                />
                            </div>
                            Detalhamento por Aluno - {
                                selectedCriticalityLevel === 'MUITO CRITICO' ? 'Muito Crítico' :
                                    selectedCriticalityLevel === 'CRITICO' ? 'Crítico' :
                                        selectedCriticalityLevel === 'INTERMEDIARIO' ? 'Intermediário' : 'Adequado'
                            }
                        </DialogTitle>
                        <DialogDescription>
                            Lista nominal de alunos ordenada por média de avaliações externas (escala 0-10)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pb-2">
                        <span>{selectedStudents.length} aluno(s) nesta categoria</span>
                    </div>

                    <div className="flex-1 border rounded-md overflow-y-auto min-h-0">
                        <div className="p-4 space-y-2">
                            {selectedStudents.map((s, index) => (
                                <div
                                    key={s.student.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="w-8 justify-center">
                                            {index + 1}
                                        </Badge>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{s.student.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {classes.find(c => c.id === s.student.classId)?.name || 'Sem turma'}
                                            </span>
                                        </div>
                                    </div>
                                    <span
                                        className="text-lg font-bold font-mono"
                                        style={{
                                            color: selectedCriticalityLevel === 'MUITO CRITICO' ? '#991b1b' :
                                                selectedCriticalityLevel === 'CRITICO' ? '#d97706' :
                                                    selectedCriticalityLevel === 'INTERMEDIARIO' ? '#059669' : '#2563eb'
                                        }}
                                    >
                                        {s.average.toFixed(1)}
                                    </span>
                                </div>
                            ))}
                            {selectedStudents.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Nenhum aluno nesta categoria
                                </p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
