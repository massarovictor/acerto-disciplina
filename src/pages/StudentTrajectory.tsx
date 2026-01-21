import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClasses, useStudents, useGrades, useHistoricalGrades, useExternalAssessments, useIncidents } from '@/hooks/useData';
import { SUBJECT_AREAS, QUARTERS } from '@/lib/subjects';
import { useToast } from '@/hooks/use-toast';
import { HistoricalGrade, ExternalAssessment, ExternalAssessmentType } from '@/types';
import { predictFinalGrade, identifyTrend } from '@/lib/performancePrediction';
import { detectAnomalies, linearRegression } from '@/lib/mlAnalytics';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Scatter,
    ComposedChart,
    Area,
    Legend,
    LabelList
} from 'recharts';
import { TrajectoryImportDialog } from '@/components/trajectory/TrajectoryImportDialog';
import { ExternalAssessmentBatchDialog } from '@/components/trajectory/ExternalAssessmentBatchDialog';
import {
    GraduationCap,
    TrendingUp,
    Plus,
    User,
    School,
    Trash2,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Calendar,
    Activity,
    History,
    Target,
    CheckCircle2,
    ArrowRight,
    Lightbulb,
    Zap,
    BookOpen,
    FileSpreadsheet,
    Edit3,
    Save,
    Lock
} from 'lucide-react';

const FUNDAMENTAL_YEARS = [6, 7, 8, 9];
const MEDIO_YEARS = [1, 2, 3];
const FUNDAMENTAL_SUBJECTS = [
    'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 'Arte', 'Educação Física', 'Língua Inglesa'
];
const MEDIO_SUBJECTS = [...new Set(SUBJECT_AREAS.flatMap(a => a.subjects))].sort();
const ALL_SUBJECTS = [...new Set([...FUNDAMENTAL_SUBJECTS, ...MEDIO_SUBJECTS])].sort();

const StudentTrajectory = () => {
    const { classes } = useClasses();
    const { students } = useStudents();
    const { grades, addGrade } = useGrades();
    const { historicalGrades, addHistoricalGrade, deleteHistoricalGrade } = useHistoricalGrades();
    const { externalAssessments, addExternalAssessment, deleteExternalAssessment } = useExternalAssessments();
    const { incidents } = useIncidents();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [activeTab, setActiveTab] = useState('summary');
    const [showBatchAssessment, setShowBatchAssessment] = useState(false);
    const [showImport, setShowImport] = useState(false);

    // Grid Entry State (Now Fundamental Only)
    const [gridYear, setGridYear] = useState(6);
    const [gridQuarter, setGridQuarter] = useState('1º Bimestre');
    const [gridValues, setGridValues] = useState<Record<string, string>>({});

    // Simulation State
    const [simulationPoints, setSimulationPoints] = useState(1);
    const [showSimulation, setShowSimulation] = useState(false);


    // Basic Data Filters
    const studentData = useMemo(() => students.find(s => s.id === selectedStudent), [students, selectedStudent]);
    const studentRegularGrades = useMemo(() => grades.filter(g => g.studentId === selectedStudent), [grades, selectedStudent]);
    const studentHistorical = useMemo(() => historicalGrades.filter(g => g.studentId === selectedStudent), [historicalGrades, selectedStudent]);
    const studentExternal = useMemo(() => externalAssessments.filter(e => e.studentId === selectedStudent), [externalAssessments, selectedStudent]);
    const studentIncidents = useMemo(() => incidents.filter(i => i.studentIds.includes(selectedStudent)), [incidents, selectedStudent]);

    // Sync Grid Values with existing data
    useEffect(() => {
        if (!selectedStudent || activeTab !== 'entry') return;

        const newValues: Record<string, string> = {};
        FUNDAMENTAL_SUBJECTS.forEach(subject => {
            const existing = studentHistorical.find(
                h => h.gradeYear === gridYear && h.quarter === gridQuarter && h.subject === subject
            );
            newValues[subject] = existing ? String(existing.grade).replace('.', ',') : '';
        });
        setGridValues(newValues);
    }, [selectedStudent, gridYear, gridQuarter, activeTab, studentHistorical]);

    const filteredStudents = useMemo(() =>
        students.filter(s => s.classId === selectedClass).sort((a, b) => a.name.localeCompare(b.name)),
        [students, selectedClass]
    );

    // Holistic Analysis (Potencialidades e Dificuldades)
    const holisticSummary = useMemo(() => {
        if (!selectedStudent) return null;

        const subjectStats: Record<string, { total: number, count: number, trend: number }> = {};

        // Process all grades (Historical + Regular)
        [...studentHistorical, ...studentRegularGrades.map(g => ({ ...g, gradeYear: g.schoolYear }))].forEach(g => {
            if (!subjectStats[g.subject]) subjectStats[g.subject] = { total: 0, count: 0, trend: 0 };
            subjectStats[g.subject].total += g.grade;
            subjectStats[g.subject].count += 1;
        });

        const averages = Object.entries(subjectStats).map(([name, stats]) => ({
            name,
            avg: stats.total / stats.count,
            count: stats.count
        }));

        const strengths = averages.filter(a => a.avg >= 8).sort((a, b) => b.avg - a.avg);
        const difficulties = averages.filter(a => a.avg < 6).sort((a, b) => a.avg - b.avg);

        const fundAvg = studentHistorical.length > 0
            ? studentHistorical.reduce((s, g) => s + g.grade, 0) / studentHistorical.length
            : 0;

        const emAvg = studentRegularGrades.length > 0
            ? studentRegularGrades.reduce((s, g) => s + g.grade, 0) / studentRegularGrades.length
            : 0;

        const extAvg = studentExternal.length > 0
            ? studentExternal.reduce((s, e) => s + (e.score / e.maxScore) * 10, 0) / studentExternal.length
            : 0;

        const incidentCount = studentIncidents.length;
        const criticalIncidents = studentIncidents.filter(i => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima').length;

        return { strengths, difficulties, fundAvg, emAvg, extAvg, incidentCount, criticalIncidents };
    }, [studentHistorical, studentRegularGrades, studentExternal, studentIncidents, selectedStudent]);

    // Longitudinal Data per Subject
    const subjectTimeline = useMemo(() => {
        if (!selectedSubject || !selectedStudent) return [];

        const data: any[] = [];
        let idx = 0;

        // Helper to add data points
        const addPoints = (level: string, years: number[]) => {
            years.forEach(year => {
                QUARTERS.forEach(q => {
                    const g = level === 'fundamental'
                        ? studentHistorical.find(h => h.gradeYear === year && h.quarter === q && h.subject === selectedSubject)
                        : studentRegularGrades.find(r => (r.schoolYear || 1) === year && r.quarter === q && r.subject === selectedSubject);

                    const ext = studentExternal.find(e => e.schoolLevel === level && e.gradeYear === year && e.quarter === q && (e.subject === selectedSubject || e.subject === 'geral' || !e.subject));

                    // Incidents for this specific period (Simplified mapping)
                    // Note: Incidents don't always have a quarter/gradeYear in their schema, 
                    // ideally they would or we'd map by calendar_year. 
                    // For now, let's map by date if possible, but the current schema uses createdAt.
                    // This is an approximation.
                    const periodIncidents = studentIncidents.filter(i => {
                        const date = new Date(i.createdAt);
                        const month = date.getMonth();
                        const quarter = Math.floor(month / 3) + 1;
                        const quarterStr = `${quarter}º Bimestre`;

                        // We need to know if this incident happened during this year/level
                        // This would require a mapping of calendar years to grade years
                        return quarterStr === q; // Overly simplified for viz demo
                    });

                    if (g || ext || (periodIncidents.length > 0 && data.length > 0)) {
                        data.push({
                            idx: idx++,
                            label: `${year}º ${level === 'medio' ? 'EM' : 'Fund'} - ${q.replace(' Bimestre', 'B')}`,
                            fundGrade: level === 'fundamental' ? g?.grade : undefined,
                            emGrade: level === 'medio' ? g?.grade : undefined,
                            external: ext ? (ext.score / ext.maxScore) * 10 : undefined,
                            externalName: ext?.assessmentName,
                            incident: periodIncidents.length > 0 ? periodIncidents.length * 2 : undefined, // Viz scaling
                            incidentCount: periodIncidents.length,
                            type: g ? 'Escolar' : ext ? 'Externa' : 'Ocorrência',
                            continuousValue: g?.grade || (ext ? (ext.score / ext.maxScore) * 10 : undefined)
                        });
                    }
                });
            });
        };

        addPoints('fundamental', FUNDAMENTAL_YEARS);
        addPoints('medio', MEDIO_YEARS);

        return data;
    }, [selectedSubject, studentHistorical, studentRegularGrades, studentExternal, studentIncidents, selectedStudent]);

    // Simulation Logic
    const simulationData = useMemo(() => {
        if (!showSimulation || subjectTimeline.length < 2) return [];

        const gradesOnly = subjectTimeline.map(d => d.emGrade || d.fundGrade || d.external).filter(v => v !== undefined) as number[];
        const x = gradesOnly.map((_, i) => i);
        const reg = linearRegression(x, gradesOnly);

        const result = [...subjectTimeline.map(d => ({ ...d, isSimulated: false }))];
        const lastIdx = subjectTimeline.length > 0 ? subjectTimeline[subjectTimeline.length - 1].idx : 0;

        for (let i = 1; i <= simulationPoints; i++) {
            const nextIdx = lastIdx + i;
            const predictedValue = Math.max(0, Math.min(10, reg.slope * nextIdx + reg.intercept));
            result.push({
                idx: nextIdx,
                label: `Futuro +${i}`,
                emGrade: predictedValue,
                isSimulated: true,
                type: 'Simulado'
            });
        }

        return result;
    }, [subjectTimeline, showSimulation, simulationPoints]);


    const handleSaveGrid = async () => {
        if (!selectedStudent) return;

        const promises = Object.entries(gridValues).map(([subject, grade]) => {
            if (!grade) return null;
            const gradeNum = parseFloat(grade.replace(',', '.'));
            if (isNaN(gradeNum)) return null;

            return addHistoricalGrade({
                studentId: selectedStudent,
                schoolLevel: 'fundamental',
                gradeYear: gridYear,
                subject,
                quarter: gridQuarter,
                grade: gradeNum,
                calendarYear: new Date().getFullYear() - (10 - gridYear) // Heurística simples
            });
        });

        try {
            await Promise.all(promises.filter(p => p !== null));
            toast({ title: "Sucesso", description: "Notas fundamentais salvas com sucesso." });
            setGridValues({});
        } catch (e) {
            toast({ title: "Erro", description: "Falha ao salvar algumas notas.", variant: "destructive" });
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        Trajetória Longitudinal
                    </h1>
                    <p className="text-muted-foreground">Analítica avançada do 6º Fundamental ao 3º Médio</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImport(true)}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Importação
                    </Button>
                    <Button onClick={() => setShowBatchAssessment(true)} className="gap-2">
                        <Target className="h-4 w-4" /> Lançamento em Lote (Avaliações)
                    </Button>
                </div>
            </div>

            {/* Selectors */}
            <Card className="bg-primary/5 border-none shadow-sm">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-bold opacity-70">Turma</Label>
                        <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedStudent(''); setSelectedSubject(''); }}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a Turma" /></SelectTrigger>
                            <SelectContent>
                                {classes.filter(c => c.active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-bold opacity-70">Aluno</Label>
                        <Select value={selectedStudent} onValueChange={v => { setSelectedStudent(v); setSelectedSubject(''); setActiveTab('summary'); }}>
                            <SelectTrigger className="bg-white" disabled={!selectedClass}><SelectValue placeholder="Selecione o Aluno" /></SelectTrigger>
                            <SelectContent>
                                {filteredStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {!selectedStudent ? (
                <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground border-dashed">
                    <User className="h-12 w-12 mb-2 opacity-20" />
                    <p>Aguardando seleção de aluno...</p>
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-muted p-1 rounded-lg w-full justify-start overflow-x-auto">
                        <TabsTrigger value="summary" className="px-6">Resumo Holístico</TabsTrigger>
                        <TabsTrigger value="trajectory" className="px-6">Trajetória e Simulação</TabsTrigger>
                        <TabsTrigger value="entry" className="px-6 flex items-center gap-2 text-blue-600 font-bold">
                            <Edit3 className="h-4 w-4" /> Lançamento Rápido
                        </TabsTrigger>
                        <TabsTrigger value="history" className="px-6">Histórico Timeline</TabsTrigger>
                    </TabsList>

                    {/* TAB: SUMMARY (POTENCIALIDADES E DIFICULDADES) */}
                    <TabsContent value="summary" className="space-y-6">
                        {holisticSummary && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-4 gap-4">
                                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                                        <CardHeader className="py-2"><CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Média Fundamental</CardTitle></CardHeader>
                                        <CardContent><div className="text-2xl font-black">{holisticSummary.fundAvg.toFixed(1)}</div></CardContent>
                                    </Card>
                                    <Card className="border-l-4 border-l-violet-500 shadow-sm">
                                        <CardHeader className="py-2"><CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Média Médio</CardTitle></CardHeader>
                                        <CardContent><div className="text-2xl font-black">{holisticSummary.emAvg.toFixed(1)}</div></CardContent>
                                    </Card>
                                    <Card className="border-l-4 border-l-amber-500 shadow-sm">
                                        <CardHeader className="py-2"><CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Aval. Externas</CardTitle></CardHeader>
                                        <CardContent><div className="text-2xl font-black">{holisticSummary.extAvg.toFixed(1)}</div></CardContent>
                                    </Card>
                                    <Card className="border-l-4 border-l-red-500 shadow-sm">
                                        <CardHeader className="py-2"><CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Ocorrências</CardTitle></CardHeader>
                                        <CardContent className="flex items-center justify-between">
                                            <div className="text-2xl font-black">{holisticSummary.incidentCount}</div>
                                            {holisticSummary.criticalIncidents > 0 && (
                                                <Badge variant="destructive" className="h-5 px-1.5 animate-pulse text-[10px]">
                                                    {holisticSummary.criticalIncidents} Críticas
                                                </Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>


                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Potencialidades */}
                                    <Card className="bg-green-50/50 border-green-100 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-green-700 flex items-center gap-2">
                                                <Zap className="h-5 w-5" /> Potencialidades
                                            </CardTitle>
                                            <CardDescription>Onde o aluno mais se destaca historicamente</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {holisticSummary.strengths.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {holisticSummary.strengths.map(s => (
                                                        <Badge key={s.name} variant="outline" className="bg-green-100/50 text-green-800 border-green-200 py-1.5 px-3">
                                                            {s.name}: {s.avg.toFixed(1)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : <p className="text-sm text-muted-foreground">Analítica buscando pontos de excelência...</p>}
                                        </CardContent>
                                    </Card>

                                    {/* Dificuldades */}
                                    <Card className="bg-red-50/50 border-red-100 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-red-700 flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5" /> Áreas de Atenção
                                            </CardTitle>
                                            <CardDescription>Disciplinas com desempenho abaixo da média</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {holisticSummary.difficulties.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {holisticSummary.difficulties.map(d => (
                                                        <Badge key={d.name} variant="destructive" className="py-1.5 px-3">
                                                            {d.name}: {d.avg.toFixed(1)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : <p className="text-sm text-muted-foreground">Nenhuma dificuldade crítica detectada no histórico.</p>}
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* TAB: ENTRY (GRID DE LANÇAMENTO) */}
                    <TabsContent value="entry" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <History className="h-5 w-5 text-amber-600" />
                                            Histórico Fundamental (6º-9º Ano)
                                        </CardTitle>
                                        <CardDescription>Lance as notas do período fundamental para composição histórica</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="text-amber-600 bg-amber-50 gap-1.5 py-1 px-3">
                                        <Lock className="h-3 w-3" />
                                        Ensino Médio: Bloqueado
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Alert className="bg-blue-50 border-blue-200">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                    <AlertTitle>Importante</AlertTitle>
                                    <AlertDescription>
                                        As notas do Ensino Médio (1º ao 3º ano) são sincronizadas automaticamente da gestão de notas regular. Utilize esta aba apenas para registros do Fundamental II.
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                                    <div className="space-y-2">
                                        <Label>Série / Ano Fundamental</Label>
                                        <Select value={String(gridYear)} onValueChange={v => setGridYear(parseInt(v))}>
                                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {FUNDAMENTAL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}º ano</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bimestre</Label>
                                        <Select value={gridQuarter} onValueChange={setGridQuarter}>
                                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {FUNDAMENTAL_SUBJECTS.map(subject => (
                                        <div key={subject} className="space-y-1 p-3 border rounded-lg hover:border-primary transition-colors bg-white">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground truncate block">{subject}</Label>
                                            <Input
                                                className="h-8 font-bold border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary text-lg px-1"
                                                placeholder="0.0"
                                                value={gridValues[subject] || ''}
                                                onChange={e => setGridValues({ ...gridValues, [subject]: e.target.value })}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveGrid} className="gap-2">
                                        <Save className="h-4 w-4" /> Salvar / Atualizar Notas
                                    </Button>
                                </div>

                                {/* Historical Records Table */}
                                {studentHistorical.length > 0 && (
                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center gap-2 border-t pt-6">
                                            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                                            <h3 className="font-bold">Registros Salvos (Fundamental II)</h3>
                                        </div>
                                        <div className="border rounded-lg overflow-hidden bg-white">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Ano</TableHead>
                                                        <TableHead>Bimestre</TableHead>
                                                        <TableHead>Disciplina</TableHead>
                                                        <TableHead className="text-right">Nota</TableHead>
                                                        <TableHead className="w-10"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {studentHistorical
                                                        .sort((a, b) => b.gradeYear - a.gradeYear || b.quarter.localeCompare(a.quarter))
                                                        .map(record => (
                                                            <TableRow key={record.id} className="hover:bg-muted/30">
                                                                <TableCell className="font-medium text-xs">{record.gradeYear}º ano</TableCell>
                                                                <TableCell className="text-xs">{record.quarter}</TableCell>
                                                                <TableCell className="text-xs">{record.subject}</TableCell>
                                                                <TableCell className={`text-right font-bold ${record.grade >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {record.grade.toFixed(1)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => deleteHistoricalGrade(record.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: TRAJECTORY & SIMULATION */}
                    <TabsContent value="trajectory" className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/30 p-4 rounded-xl">
                            <div className="flex-1 space-y-2">
                                <Label>Selecione a Disciplina para Analítica</Label>
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="Escolha a disciplina" /></SelectTrigger>
                                    <SelectContent>
                                        {ALL_SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={showSimulation ? "default" : "outline"}
                                    onClick={() => setShowSimulation(!showSimulation)}
                                    disabled={!selectedSubject || subjectTimeline.length < 2}
                                >
                                    <Target className="h-4 w-4 mr-2" />
                                    {showSimulation ? "Parar Simulação" : "Simular Futuro"}
                                </Button>
                            </div>
                        </div>

                        {selectedSubject ? (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <Card className="lg:col-span-3 border-none shadow-sm bg-white">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {selectedSubject} - Evolução Longitudinal
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[450px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={showSimulation ? simulationData : subjectTimeline}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
                                                <XAxis dataKey="label" tick={{ fontSize: 10 }} height={60} interval={0} angle={-45} textAnchor="end" />
                                                <YAxis domain={[0, 10]} />
                                                <Tooltip />
                                                <Legend />
                                                <ReferenceLine y={6} stroke="#e74c3c" strokeDasharray="3 3" label={{ value: 'Média', position: 'right', fill: '#e74c3c' }} />

                                                <Line
                                                    type="monotone"
                                                    dataKey="fundGrade"
                                                    stroke="#8e44ad"
                                                    strokeWidth={3}
                                                    name="Histórico Fundamental"
                                                    activeDot={{ r: 6 }}
                                                    connectNulls
                                                />

                                                <Line
                                                    type="monotone"
                                                    dataKey="emGrade"
                                                    stroke="#3498db"
                                                    strokeWidth={3}
                                                    name="Ensino Médio"
                                                    activeDot={{ r: 6 }}
                                                    connectNulls
                                                />

                                                <Scatter dataKey="external" fill="#f39c12" name="Aval. Externa" />

                                                <Scatter dataKey="incident" fill="#e74c3c" name="Ocorrências" shape="triangle" />

                                                {showSimulation && (
                                                    <Line
                                                        type="monotone"
                                                        dataKey="emGrade"
                                                        stroke="#2ecc71"
                                                        strokeWidth={3}
                                                        strokeDasharray="5 5"
                                                        name="Projeção Futura"
                                                        data={simulationData}
                                                    />
                                                )}
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="lg:col-span-4 border-none shadow-sm bg-white overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                                            Pulso de Performance (Nuanças e Marcos)
                                        </CardTitle>
                                        <CardDescription>
                                            Visão contínua com a nota exibida em cada marco da trajetória
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={subjectTimeline}>
                                                <defs>
                                                    <linearGradient id="pulseGradientLight" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
                                                <XAxis dataKey="label" tick={{ fontSize: 9 }} height={50} interval={0} angle={-45} textAnchor="end" />
                                                <YAxis domain={[0, 11]} hide />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                />
                                                <Area type="monotone" dataKey="continuousValue" stroke="none" fill="url(#pulseGradientLight)" />
                                                <Line
                                                    type="monotone"
                                                    dataKey="continuousValue"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                                    activeDot={{ r: 6 }}
                                                    animationDuration={1500}
                                                >
                                                    <LabelList
                                                        dataKey="continuousValue"
                                                        position="top"
                                                        offset={10}
                                                        formatter={(val: number) => val?.toFixed(1)}
                                                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#059669' }}
                                                    />
                                                </Line>
                                                <ReferenceLine y={6} stroke="#e74c3c" strokeDasharray="3 3" opacity={0.2} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <Card className="border-none shadow-sm bg-primary/5">
                                        <CardHeader className="pb-2 text-center">
                                            <CardTitle className="text-xs uppercase text-primary opacity-70">Nota Final Projetada</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            {showSimulation ? (
                                                <div className="text-4xl font-black text-primary">
                                                    {simulationData[simulationData.length - 1]?.emGrade.toFixed(1)}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">Ative a simulação para ver a projeção</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <div className="h-96 flex flex-col items-center justify-center border rounded-xl border-dashed">
                                <BookOpen className="h-12 w-12 opacity-10 mb-2" />
                                <p className="text-muted-foreground">Escolha uma disciplina para visualizar a trajetória</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB: TIMELINE HISTORY */}
                    <TabsContent value="history">
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle>Jornada do Estudante (Continuidade)</CardTitle>
                                <CardDescription>Visão compacta horizontal de toda a trajetória acadêmica e disciplinar</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto pb-4 custom-scrollbar">
                                    <div className="flex gap-4 min-w-max p-2">
                                        {subjectTimeline.map((event, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2 group">
                                                <div className="text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {event.label.split(' - ')[0]}
                                                </div>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border-2 
                                                    ${event.incidentCount > 0 ? 'bg-red-50 border-red-200' :
                                                        event.external ? 'bg-amber-50 border-amber-200' :
                                                            'bg-blue-50 border-blue-100'}`}>

                                                    {event.incidentCount > 0 ? (
                                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                                    ) : event.external ? (
                                                        <Target className="h-6 w-6 text-amber-600" />
                                                    ) : (
                                                        <GraduationCap className="h-6 w-6 text-blue-600" />
                                                    )}
                                                </div>
                                                <div className="bg-white p-2 rounded-xl border shadow-sm min-w-[100px] text-center">
                                                    <div className="text-lg font-black leading-tight">
                                                        {(event.fundGrade || event.emGrade || event.external || 0).toFixed(1)}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold text-muted-foreground truncate max-w-[80px]">
                                                        {event.label.split(' - ')[1]}
                                                    </div>
                                                </div>
                                                {event.incidentCount > 0 && (
                                                    <Badge className="bg-red-500 text-[10px] h-4 px-1">{event.incidentCount} Ocor.</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {subjectTimeline.length === 0 && (
                                    <div className="text-center py-20 flex flex-col items-center opacity-30">
                                        <History className="h-16 w-16 mb-2" />
                                        <p>Nenhum registro para exibir nesta disciplina.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

            {/* Dialogs */}
            <ExternalAssessmentBatchDialog
                open={showBatchAssessment}
                onOpenChange={setShowBatchAssessment}
                classId={selectedClass}
                subjects={ALL_SUBJECTS}
            />
            <TrajectoryImportDialog open={showImport} onOpenChange={setShowImport} />
        </div>
    );
};

export default StudentTrajectory;
