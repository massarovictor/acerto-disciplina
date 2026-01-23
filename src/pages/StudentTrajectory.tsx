import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClasses, useStudents, useGrades, useHistoricalGrades, useExternalAssessments, useIncidents } from '@/hooks/useData';
import { SUBJECT_AREAS, QUARTERS, FUNDAMENTAL_SUBJECT_AREAS, getFundamentalEquivalent, getEquivalentSubjects } from '@/lib/subjects';
import { useToast } from '@/hooks/use-toast';
import { HistoricalGrade, ExternalAssessment, ExternalAssessmentType } from '@/types';
import { predictFinalGrade, identifyTrend } from '@/lib/performancePrediction';
import { detectAnomalies, linearRegression } from '@/lib/mlAnalytics';
import { useUIStore } from '@/stores/useUIStore';
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

// Helper para normalização de nomes de disciplinas (comparação robusta)
const normalizeSubjectName = (name: string): string => {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const StudentTrajectory = () => {
    const { classes } = useClasses();
    const { students } = useStudents();
    const { grades, addGrade } = useGrades();
    const { historicalGrades, addHistoricalGrade, deleteHistoricalGrade } = useHistoricalGrades();
    const { externalAssessments, deleteExternalAssessment, updateExternalAssessment } = useExternalAssessments();
    const { incidents } = useIncidents();
    const { toast } = useToast();

    // ✅ Usando Zustand store para persistir seleções entre navegações
    const { trajectoryUI, setTrajectoryUI } = useUIStore();
    const selectedClass = trajectoryUI.selectedClassId;
    const selectedStudent = trajectoryUI.selectedStudentId;
    const selectedSubject = trajectoryUI.selectedSubject;
    const activeTab = trajectoryUI.activeTab;
    const gridYear = trajectoryUI.gridYear;
    const gridQuarter = trajectoryUI.gridQuarter;
    const gridCalendarYear = trajectoryUI.gridCalendarYear;

    const setSelectedClass = (value: string) => setTrajectoryUI({ selectedClassId: value, selectedStudentId: '' });
    const setSelectedStudent = (value: string) => setTrajectoryUI({ selectedStudentId: value });
    const setSelectedSubject = (value: string) => setTrajectoryUI({ selectedSubject: value });
    const setActiveTab = (value: string) => setTrajectoryUI({ activeTab: value });
    const setGridYear = (value: number) => setTrajectoryUI({ gridYear: value });
    const setGridQuarter = (value: string) => setTrajectoryUI({ gridQuarter: value });
    const setGridCalendarYear = (value: number) => setTrajectoryUI({ gridCalendarYear: value });

    const [showBatchAssessment, setShowBatchAssessment] = useState(false);
    const [showImport, setShowImport] = useState(false);

    // Grid Entry State
    const [gridValues, setGridValues] = useState<Record<string, string>>({});
    const [editingRecord, setEditingRecord] = useState<{ id: string, subject: string, gradeYear: number, quarter: string, grade: number } | null>(null);
    const [editGradeValue, setEditGradeValue] = useState<string>('');
    const [editingExternalAssessment, setEditingExternalAssessment] = useState<ExternalAssessment | null>(null);
    const [externalForm, setExternalForm] = useState({
        assessmentType: 'Simulado' as ExternalAssessmentType,
        assessmentName: '',
        subject: '',
        score: '',
        maxScore: '',
        appliedDate: '',
        schoolLevel: 'medio' as 'fundamental' | 'medio',
        gradeYear: '',
        quarter: '',
        notes: ''
    });

    // Simulation State
    const [simulationPoints, setSimulationPoints] = useState(1);
    const [showSimulation, setShowSimulation] = useState(false);
    const [simulationScenario, setSimulationScenario] = useState<'optimistic' | 'realistic' | 'pessimistic'>('realistic');
    const [targetGrade, setTargetGrade] = useState<string>('');


    // Basic Data Filters
    const studentData = useMemo(() => students.find(s => s.id === selectedStudent), [students, selectedStudent]);
    const studentRegularGrades = useMemo(() => grades.filter(g => g.studentId === selectedStudent), [grades, selectedStudent]);
    const studentHistorical = useMemo(() => historicalGrades.filter(g => g.studentId === selectedStudent), [historicalGrades, selectedStudent]);
    const studentExternal = useMemo(() => externalAssessments.filter(e => e.studentId === selectedStudent), [externalAssessments, selectedStudent]);
    const studentIncidents = useMemo(() => incidents.filter(i => i.studentIds.includes(selectedStudent)), [incidents, selectedStudent]);
    const studentExternalSorted = useMemo(() => {
        return [...studentExternal].sort((a, b) => {
            const aDate = new Date(a.appliedDate).getTime();
            const bDate = new Date(b.appliedDate).getTime();
            return bDate - aDate;
        });
    }, [studentExternal]);

    const isStudentFundamental = useMemo(() => {
        if (!studentData) return false;
        // Se temos histórico do fundamental para este ano, ou se o ID da turma sugere fundamental
        const cls = classes.find(c => c.id === studentData.classId);
        if (!cls) return false;
        return ['6', '7', '8', '9'].some(s => cls.series.includes(s));
    }, [studentData, classes]);

    // Sync Grid Values with existing data
    useEffect(() => {
        if (!selectedStudent || activeTab !== 'entry') return;

        const newValues: Record<string, string> = {};
        const s2 = normalizeSubjectName(''); // precompute normalized search if needed

        FUNDAMENTAL_SUBJECTS.forEach(subject => {
            const normalizedSubject = normalizeSubjectName(subject);
            const existing = studentHistorical.find(
                h => h.gradeYear === gridYear &&
                    h.quarter === gridQuarter &&
                    normalizeSubjectName(h.subject) === normalizedSubject
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
        const displayNamesMap: Record<string, string> = {};

        // Process all grades (Historical + Regular)
        [...studentHistorical, ...studentRegularGrades.map(g => ({ ...g, gradeYear: g.schoolYear }))].forEach(g => {
            const normalized = normalizeSubjectName(g.subject);
            if (!displayNamesMap[normalized]) displayNamesMap[normalized] = g.subject;

            if (!subjectStats[normalized]) subjectStats[normalized] = { total: 0, count: 0, trend: 0 };
            subjectStats[normalized].total += g.grade;
            subjectStats[normalized].count += 1;
        });

        const averages = Object.entries(subjectStats).map(([normalized, stats]) => ({
            name: displayNamesMap[normalized],
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
        const isAllSubjects = selectedSubject === 'all';
        const average = (values: number[]) => {
            const valid = values.filter((value) => Number.isFinite(value));
            if (valid.length === 0) return null;
            return valid.reduce((sum, value) => sum + value, 0) / valid.length;
        };

        // Helper to add data points
        const addPoints = (level: string, years: number[]) => {
            years.forEach(year => {
                if (level === 'fundamental') {
                    if (isAllSubjects) {
                        const annualGrades = studentHistorical.filter(h =>
                            h.gradeYear === year && h.quarter === 'Anual'
                        );
                        const annualAvg = average(annualGrades.map(h => h.grade));

                        if (annualAvg !== null) {
                            data.push({
                                idx: idx++,
                                label: `${year}º Fund (Anual)`,
                                fundGrade: annualAvg,
                                type: 'Escolar',
                                continuousValue: annualAvg
                            });
                            return;
                        }

                        QUARTERS.forEach(q => {
                            const periodGrades = studentHistorical.filter(h =>
                                h.gradeYear === year && h.quarter === q
                            );
                            const gradeAvg = average(periodGrades.map(h => h.grade));

                            const externalScores = studentExternal
                                .filter(e => e.schoolLevel === level && e.gradeYear === year && e.quarter === q)
                                .map(e => (e.maxScore ? (e.score / e.maxScore) * 10 : NaN));
                            const externalAvg = average(externalScores);

                            if (gradeAvg !== null || externalAvg !== null) {
                                data.push({
                                    idx: idx++,
                                    label: `${year}º Fund - ${q.replace(' Bimestre', 'B')}`,
                                    fundGrade: gradeAvg ?? undefined,
                                    external: externalAvg ?? undefined,
                                    externalName: externalScores.length > 1 ? 'Avaliações' : undefined,
                                    type: gradeAvg !== null ? 'Escolar' : 'Externa',
                                    continuousValue: gradeAvg ?? externalAvg ?? undefined
                                });
                            }
                        });
                        return;
                    }

                    // Para fundamental, buscar a disciplina selecionada OU equivalente
                    const fundamentalEquiv = getFundamentalEquivalent(selectedSubject);

                    // Primeiro: tentar buscar nota anual (formato da importação)
                    const annualGrade = studentHistorical.find(h => {
                        const s1 = normalizeSubjectName(h.subject);
                        const s2 = normalizeSubjectName(selectedSubject);
                        const sEquiv = fundamentalEquiv ? normalizeSubjectName(fundamentalEquiv) : null;

                        const isMatch = s1 === s2 || (sEquiv && s1 === sEquiv);

                        // Fallback para nomes legados
                        const isPortugueseMatch = (s2.includes('portugues') && s1.includes('portugues'));

                        return h.gradeYear === year &&
                            h.quarter === 'Anual' &&
                            (isMatch || isPortugueseMatch);
                    });

                    if (annualGrade) {
                        // Se tem nota anual, adicionar como ponto único
                        data.push({
                            idx: idx++,
                            label: `${year}º Fund (Anual)`,
                            fundGrade: annualGrade.grade,
                            type: 'Escolar',
                            continuousValue: annualGrade.grade
                        });
                    } else {
                        // Se não tem anual, buscar por bimestre
                        QUARTERS.forEach(q => {
                            const g = studentHistorical.find(h => {
                                const s1 = normalizeSubjectName(h.subject);
                                const s2 = normalizeSubjectName(selectedSubject);
                                const sEquiv = fundamentalEquiv ? normalizeSubjectName(fundamentalEquiv) : null;

                                const isMatch = s1 === s2 || (sEquiv && s1 === sEquiv);
                                const isPortugueseMatch = (s2.includes('portugues') && s1.includes('portugues'));

                                return h.gradeYear === year && h.quarter === q && (isMatch || isPortugueseMatch);
                            });

                            const ext = studentExternal.find(e =>
                                e.schoolLevel === level &&
                                e.gradeYear === year &&
                                e.quarter === q &&
                                (e.subject === selectedSubject || e.subject === 'geral' || !e.subject)
                            );

                            if (g || ext) {
                                data.push({
                                    idx: idx++,
                                    label: `${year}º Fund - ${q.replace(' Bimestre', 'B')}`,
                                    fundGrade: g?.grade,
                                    external: ext ? (ext.score / ext.maxScore) * 10 : undefined,
                                    externalName: ext?.assessmentName,
                                    type: g ? 'Escolar' : 'Externa',
                                    continuousValue: g?.grade || (ext ? (ext.score / ext.maxScore) * 10 : undefined)
                                });
                            }
                        });
                    }
                } else {
                    // Ensino Médio: buscar por bimestre
                    QUARTERS.forEach(q => {
                        if (isAllSubjects) {
                            const periodGrades = studentRegularGrades.filter(r =>
                                (r.schoolYear || 1) === year && r.quarter === q
                            );
                            const gradeAvg = average(periodGrades.map(r => r.grade));

                            const externalScores = studentExternal
                                .filter(e => e.schoolLevel === level && e.gradeYear === year && e.quarter === q)
                                .map(e => (e.maxScore ? (e.score / e.maxScore) * 10 : NaN));
                            const externalAvg = average(externalScores);

                            const periodIncidents = studentIncidents.filter(i => {
                                const date = new Date(i.createdAt);
                                const month = date.getMonth();
                                const quarter = Math.floor(month / 3) + 1;
                                const quarterStr = `${quarter}º Bimestre`;
                                return quarterStr === q;
                            });

                            if (gradeAvg !== null || externalAvg !== null || (periodIncidents.length > 0 && data.length > 0)) {
                                data.push({
                                    idx: idx++,
                                    label: `${year}º EM - ${q.replace(' Bimestre', 'B')}`,
                                    emGrade: gradeAvg ?? undefined,
                                    external: externalAvg ?? undefined,
                                    externalName: externalScores.length > 1 ? 'Avaliações' : undefined,
                                    incident: periodIncidents.length > 0 ? periodIncidents.length * 2 : undefined,
                                    incidentCount: periodIncidents.length,
                                    type: gradeAvg !== null ? 'Escolar' : externalAvg !== null ? 'Externa' : 'Ocorrência',
                                    continuousValue: gradeAvg ?? externalAvg ?? undefined
                                });
                            }
                            return;
                        }

                        const g = studentRegularGrades.find(r =>
                            (r.schoolYear || 1) === year &&
                            r.quarter === q &&
                            normalizeSubjectName(r.subject) === normalizeSubjectName(selectedSubject)
                        );

                        const ext = studentExternal.find(e =>
                            e.schoolLevel === level &&
                            e.gradeYear === year &&
                            e.quarter === q &&
                            (e.subject === selectedSubject || e.subject === 'geral' || !e.subject)
                        );

                        // Incidents for this specific period
                        const periodIncidents = studentIncidents.filter(i => {
                            const date = new Date(i.createdAt);
                            const month = date.getMonth();
                            const quarter = Math.floor(month / 3) + 1;
                            const quarterStr = `${quarter}º Bimestre`;
                            return quarterStr === q;
                        });

                        if (g || ext || (periodIncidents.length > 0 && data.length > 0)) {
                            data.push({
                                idx: idx++,
                                label: `${year}º EM - ${q.replace(' Bimestre', 'B')}`,
                                emGrade: g?.grade,
                                external: ext ? (ext.score / ext.maxScore) * 10 : undefined,
                                externalName: ext?.assessmentName,
                                incident: periodIncidents.length > 0 ? periodIncidents.length * 2 : undefined,
                                incidentCount: periodIncidents.length,
                                type: g ? 'Escolar' : ext ? 'Externa' : 'Ocorrência',
                                continuousValue: g?.grade || (ext ? (ext.score / ext.maxScore) * 10 : undefined)
                            });
                        }
                    });
                }
            });
        };

        addPoints('fundamental', FUNDAMENTAL_YEARS);
        addPoints('medio', MEDIO_YEARS);

        return data;
    }, [selectedSubject, studentHistorical, studentRegularGrades, studentExternal, studentIncidents, selectedStudent]);

    // Simulation Logic
    const simulationData = useMemo(() => {
        if (!showSimulation || subjectTimeline.length < 2) return [];

        const gradesOnly = subjectTimeline.map(d => d.continuousValue).filter(v => v !== undefined) as number[];
        if (gradesOnly.length < 2) return [];

        const x = gradesOnly.map((_, i) => i);
        const reg = linearRegression(x, gradesOnly);

        // Copiar dados existentes
        const result = [...subjectTimeline.map(d => ({ ...d, isSimulated: false, simulatedGrade: undefined }))];
        const lastIdx = gradesOnly.length - 1;

        for (let i = 1; i <= simulationPoints; i++) {
            const nextIdx = lastIdx + i;
            // Aplicar cenário
            const scenarioMultiplier = simulationScenario === 'optimistic' ? 1.1 : simulationScenario === 'pessimistic' ? 0.9 : 1;
            const predictedValue = Math.max(0, Math.min(10, (reg.slope * nextIdx + reg.intercept) * scenarioMultiplier));
            result.push({
                idx: result.length,
                label: `Proj +${i}`,
                simulatedGrade: predictedValue,
                continuousValue: predictedValue,
                isSimulated: true,
                type: 'Simulado'
            });
        }

        return result;
    }, [subjectTimeline, showSimulation, simulationPoints, simulationScenario]);

    // ============ ANÁLISE DE TENDÊNCIA ============
    const trendAnalysis = useMemo(() => {
        if (subjectTimeline.length < 2) return null;

        const gradesOnly = subjectTimeline
            .map(d => d.emGrade || d.fundGrade || d.external)
            .filter(v => v !== undefined) as number[];

        if (gradesOnly.length < 2) return null;

        const firstGrade = gradesOnly[0];
        const lastGrade = gradesOnly[gradesOnly.length - 1];
        const variation = lastGrade - firstGrade;
        const variationPercent = ((lastGrade - firstGrade) / firstGrade) * 100;

        // Calcular regressão para tendência
        const x = gradesOnly.map((_, i) => i);
        const reg = linearRegression(x, gradesOnly);

        let trend: 'ascending' | 'stable' | 'descending';
        let trendLabel: string;
        let trendIcon: string;
        let trendColor: string;

        if (reg.slope > 0.15) {
            trend = 'ascending';
            trendLabel = 'Em Ascensão';
            trendIcon = '↑';
            trendColor = 'text-emerald-600';
        } else if (reg.slope < -0.15) {
            trend = 'descending';
            trendLabel = 'Em Declínio';
            trendIcon = '↓';
            trendColor = 'text-red-600';
        } else {
            trend = 'stable';
            trendLabel = 'Estável';
            trendIcon = '→';
            trendColor = 'text-amber-600';
        }

        return {
            trend,
            trendLabel,
            trendIcon,
            trendColor,
            variation,
            variationPercent,
            slope: reg.slope,
            firstGrade,
            lastGrade
        };
    }, [subjectTimeline]);

    // ============ MÉTRICAS ENRIQUECIDAS ============
    const enrichedMetrics = useMemo(() => {
        if (subjectTimeline.length === 0) return null;

        const gradesOnly = subjectTimeline
            .map(d => ({ grade: d.emGrade || d.fundGrade || d.external, label: d.label }))
            .filter(v => v.grade !== undefined) as { grade: number; label: string }[];

        if (gradesOnly.length === 0) return null;

        const grades = gradesOnly.map(g => g.grade);
        const sum = grades.reduce((a, b) => a + b, 0);
        const avg = sum / grades.length;

        // Melhor e pior nota
        const maxGrade = Math.max(...grades);
        const minGrade = Math.min(...grades);
        const bestPeriod = gradesOnly.find(g => g.grade === maxGrade)?.label || '';
        const worstPeriod = gradesOnly.find(g => g.grade === minGrade)?.label || '';

        // Coeficiente de variação (desvio padrão / média * 100)
        const variance = grades.reduce((acc, g) => acc + Math.pow(g - avg, 2), 0) / grades.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / avg) * 100;

        // Classificação de consistência
        let consistency: 'alta' | 'media' | 'baixa';
        let consistencyLabel: string;
        if (cv < 10) {
            consistency = 'alta';
            consistencyLabel = 'Muito Consistente';
        } else if (cv < 20) {
            consistency = 'media';
            consistencyLabel = 'Moderada';
        } else {
            consistency = 'baixa';
            consistencyLabel = 'Irregular';
        }

        // Percentual acima da média (6)
        const aboveAverage = grades.filter(g => g >= 6).length;
        const aboveAveragePercent = (aboveAverage / grades.length) * 100;

        return {
            average: avg,
            maxGrade,
            minGrade,
            bestPeriod,
            worstPeriod,
            stdDev,
            cv,
            consistency,
            consistencyLabel,
            aboveAveragePercent,
            totalGrades: grades.length
        };
    }, [subjectTimeline]);

    // ============ INSIGHTS INTELIGENTES ============
    const insights = useMemo(() => {
        const result: { type: 'positive' | 'negative' | 'neutral' | 'warning'; message: string }[] = [];

        if (!trendAnalysis || !enrichedMetrics || subjectTimeline.length < 3) return result;

        // Insight de tendência
        if (trendAnalysis.trend === 'ascending' && trendAnalysis.variationPercent > 15) {
            result.push({
                type: 'positive',
                message: `Excelente evolução! A nota subiu ${trendAnalysis.variationPercent.toFixed(0)}% desde o início.`
            });
        } else if (trendAnalysis.trend === 'descending' && trendAnalysis.variationPercent < -15) {
            result.push({
                type: 'negative',
                message: `Atenção: queda de ${Math.abs(trendAnalysis.variationPercent).toFixed(0)}% no desempenho.`
            });
        }

        // Insight de consistência
        if (enrichedMetrics.consistency === 'alta') {
            result.push({
                type: 'positive',
                message: `Desempenho ${enrichedMetrics.consistencyLabel.toLowerCase()} - baixa variação entre notas.`
            });
        } else if (enrichedMetrics.consistency === 'baixa') {
            result.push({
                type: 'warning',
                message: `Desempenho irregular - alta variação entre as notas.`
            });
        }

        // Insight de média
        if (enrichedMetrics.average >= 8) {
            result.push({
                type: 'positive',
                message: `Média histórica excelente: ${enrichedMetrics.average.toFixed(1)}`
            });
        } else if (enrichedMetrics.average < 6) {
            result.push({
                type: 'negative',
                message: `Média histórica abaixo do esperado: ${enrichedMetrics.average.toFixed(1)}`
            });
        }

        // Insight de aprovação
        if (enrichedMetrics.aboveAveragePercent >= 80) {
            result.push({
                type: 'positive',
                message: `${enrichedMetrics.aboveAveragePercent.toFixed(0)}% das notas acima da média mínima.`
            });
        } else if (enrichedMetrics.aboveAveragePercent < 50) {
            result.push({
                type: 'warning',
                message: `Apenas ${enrichedMetrics.aboveAveragePercent.toFixed(0)}% das notas acima da média mínima.`
            });
        }

        // Detectar queda significativa
        const gradesOnly = subjectTimeline
            .map(d => d.emGrade || d.fundGrade || d.external)
            .filter(v => v !== undefined) as number[];

        for (let i = 1; i < gradesOnly.length; i++) {
            const drop = gradesOnly[i - 1] - gradesOnly[i];
            if (drop > 2) {
                result.push({
                    type: 'warning',
                    message: `Queda significativa detectada no ${subjectTimeline[i]?.label || `período ${i + 1}`}.`
                });
                break; // Apenas uma queda significativa
            }
        }

        return result.slice(0, 4); // Máximo 4 insights
    }, [trendAnalysis, enrichedMetrics, subjectTimeline]);

    const selectedSubjectLabel = selectedSubject === 'all' ? 'Todas as disciplinas' : selectedSubject;



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
                quarter: 'Anual', // Fundamental usa notas anuais
                grade: gradeNum,
                calendarYear: gridCalendarYear
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

    const formatDateInput = (value?: string) => {
        if (!value) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toISOString().slice(0, 10);
    };

    const openExternalEdit = (assessment: ExternalAssessment) => {
        setEditingExternalAssessment(assessment);
        setExternalForm({
            assessmentType: assessment.assessmentType,
            assessmentName: assessment.assessmentName,
            subject: assessment.subject ?? '',
            score: String(assessment.score),
            maxScore: String(assessment.maxScore),
            appliedDate: formatDateInput(assessment.appliedDate),
            schoolLevel: assessment.schoolLevel,
            gradeYear: String(assessment.gradeYear),
            quarter: assessment.quarter ?? '',
            notes: assessment.notes ?? ''
        });
    };

    const handleExternalSave = async () => {
        if (!editingExternalAssessment) return;
        const score = Number(externalForm.score);
        const maxScore = Number(externalForm.maxScore);
        const gradeYear = Number(externalForm.gradeYear);

        if (!externalForm.assessmentName.trim()) {
            toast({ title: "Nome obrigatório", description: "Informe o nome da avaliação.", variant: "destructive" });
            return;
        }
        if (!externalForm.appliedDate) {
            toast({ title: "Data obrigatória", description: "Informe a data de aplicação.", variant: "destructive" });
            return;
        }
        if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
            toast({ title: "Valores inválidos", description: "Informe nota e pontuação máxima válidas.", variant: "destructive" });
            return;
        }
        if (!Number.isFinite(gradeYear)) {
            toast({ title: "Ano inválido", description: "Informe o ano escolar.", variant: "destructive" });
            return;
        }

        try {
            await updateExternalAssessment({
                ...editingExternalAssessment,
                assessmentType: externalForm.assessmentType,
                assessmentName: externalForm.assessmentName.trim(),
                subject: externalForm.subject.trim() || undefined,
                score,
                maxScore,
                appliedDate: externalForm.appliedDate,
                schoolLevel: externalForm.schoolLevel,
                gradeYear,
                quarter: externalForm.quarter || undefined,
                notes: externalForm.notes.trim() || undefined,
            });
            toast({ title: "Avaliação atualizada", description: "Registro atualizado com sucesso." });
            setEditingExternalAssessment(null);
        } catch (e) {
            toast({ title: "Erro ao atualizar", description: "Não foi possível salvar a avaliação.", variant: "destructive" });
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Trajetória Estudantil</h1>
                    <p className="text-muted-foreground">
                        Acompanhamento longitudinal e simulação de desempenho
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" /> Importação
                    </Button>
                    <Button onClick={() => setShowBatchAssessment(true)} className="gap-2">
                        <Target className="h-4 w-4" /> Lançamento em Lote
                    </Button>
                </div>
            </div>
            {/* Main Filters Card */}
            <Card className="bg-muted/50 border-muted">
                <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Turma</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a turma" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.length === 0 ? (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                            Nenhuma turma cadastrada
                                        </div>
                                    ) : (
                                        classes
                                            .filter(cls => cls.active && !cls.archived)
                                            .map(cls => (
                                                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                            ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aluno</Label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o aluno" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredStudents.length === 0 ? (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                            {selectedClass ? 'Nenhum aluno nesta turma' : 'Selecione uma turma primeiro'}
                                        </div>
                                    ) : (
                                        filteredStudents.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Disciplina</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Escolha a disciplina" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    <SelectItem value="all">Todas as disciplinas</SelectItem>
                                    {/* Áreas conforme o nível do aluno */}
                                    {(isStudentFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS).map(area => (
                                        <SelectGroup key={area.name}>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-bold text-primary bg-primary/5 uppercase tracking-wider">
                                                {area.name.replace(', Códigos e suas Tecnologias', '').replace(' e suas Tecnologias', '')}
                                            </SelectLabel>
                                            {area.subjects.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                    {/* Mostrar Histórico Fundamental se estiver no Ensino Médio, caso tenha dados */}
                                    {!isStudentFundamental && (
                                        <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-bold text-amber-600 bg-amber-500/10 uppercase tracking-wider">
                                                Histórico Fundamental
                                            </SelectLabel>
                                            <SelectItem value="Ciências">
                                                Ciências <span className="text-muted-foreground text-[10px]">(+ Natureza)</span>
                                            </SelectItem>
                                            <SelectItem value="Língua Inglesa">
                                                Língua Inglesa <span className="text-muted-foreground text-[10px]">(+ Linguagens)</span>
                                            </SelectItem>
                                        </SelectGroup>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {
                !selectedStudent ? (
                    <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground border-dashed">
                        <User className="h-12 w-12 mb-2 opacity-20" />
                        <p>Aguardando seleção de aluno...</p>
                    </Card>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-muted p-1 rounded-lg w-full justify-start overflow-x-auto">
                            <TabsTrigger value="summary" className="px-6">Resumo Holístico</TabsTrigger>
                            <TabsTrigger value="trajectory" className="px-6">Trajetória e Simulação</TabsTrigger>
                            <TabsTrigger value="entry" className="px-6">Lançamento Rápido</TabsTrigger>
                        </TabsList>

                        {/* TAB: SUMMARY (POTENCIALIDADES E DIFICULDADES) */}
                        <TabsContent value="summary" className="space-y-6">
                            {holisticSummary && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <Card className="border-none shadow-sm bg-card">
                                            <CardHeader className="py-2 pb-0">
                                                <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Média Fundamental</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-1">
                                                <div className="text-3xl font-black text-blue-600">{holisticSummary.fundAvg.toFixed(1)}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-none shadow-sm bg-card">
                                            <CardHeader className="py-2 pb-0">
                                                <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Média Médio</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-1">
                                                <div className="text-3xl font-black text-violet-600">{holisticSummary.emAvg.toFixed(1)}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-none shadow-sm bg-card">
                                            <CardHeader className="py-2 pb-0">
                                                <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Aval. Externas</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-1">
                                                <div className="text-3xl font-black text-amber-600">{holisticSummary.extAvg.toFixed(1)}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-none shadow-sm bg-card">
                                            <CardHeader className="py-2 pb-0">
                                                <CardTitle className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Ocorrências</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-1 flex items-center justify-between">
                                                <div className="text-3xl font-black text-red-600">{holisticSummary.incidentCount}</div>
                                                {holisticSummary.criticalIncidents > 0 && (
                                                    <Badge variant="destructive" className="h-5 px-1.5 animate-pulse text-[10px] font-bold">
                                                        {holisticSummary.criticalIncidents} CRÍTICAS
                                                    </Badge>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>


                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Potencialidades */}
                                        <Card className="border-none shadow-sm bg-card overflow-hidden">
                                            <div className="h-1 bg-emerald-500 w-full" />
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-emerald-600 dark:text-emerald-500 flex items-center gap-2 text-base">
                                                    <Zap className="h-4 w-4" /> Potencialidades
                                                </CardTitle>
                                                <CardDescription className="text-xs italic">Destaques históricos de excelência</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                {holisticSummary.strengths.length > 0 ? (
                                                    <div className="grid gap-2">
                                                        {holisticSummary.strengths.map(s => (
                                                            <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-400">{s.name}</span>
                                                                <Badge className="bg-emerald-600 hover:bg-emerald-700">{s.avg.toFixed(1)}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-sm text-muted-foreground">O deserto de excelência aguarda seu oásis...</p>}
                                            </CardContent>
                                        </Card>

                                        {/* Dificuldades */}
                                        <Card className="border-none shadow-sm bg-card overflow-hidden">
                                            <div className="h-1 bg-red-500 w-full" />
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-red-600 dark:text-red-500 flex items-center gap-2 text-base">
                                                    <AlertTriangle className="h-4 w-4" /> Áreas de Atenção
                                                </CardTitle>
                                                <CardDescription className="text-xs italic">Disciplinas requerendo maior suporte</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                {holisticSummary.difficulties.length > 0 ? (
                                                    <div className="grid gap-2">
                                                        {holisticSummary.difficulties.map(d => (
                                                            <div key={d.name} className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                                <span className="text-sm font-medium text-red-900 dark:text-red-400">{d.name}</span>
                                                                <Badge variant="destructive" className="font-bold">{d.avg.toFixed(1)}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-sm text-muted-foreground">O mar da tranquilidade acadêmica prevalece...</p>}
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
                                        <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/20 gap-1.5 py-1 px-3">
                                            <Lock className="h-3 w-3" />
                                            Ensino Médio: Bloqueado
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <Alert className="bg-blue-500/10 border-blue-500/20">
                                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <AlertTitle>Importante</AlertTitle>
                                        <AlertDescription>
                                            As notas do Ensino Médio (1º ao 3º ano) são sincronizadas automaticamente da gestão de notas regular. Utilize esta aba apenas para registros do Fundamental II.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                                        <div className="space-y-2">
                                            <Label>Série / Ano Fundamental</Label>
                                            <Select value={String(gridYear)} onValueChange={v => setGridYear(parseInt(v))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {FUNDAMENTAL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}º ano</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ano Calendário *</Label>
                                            <Select value={String(gridCalendarYear)} onValueChange={v => setGridCalendarYear(parseInt(v))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {FUNDAMENTAL_SUBJECT_AREAS.map(area => (
                                            <div key={area.name} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-3 w-1 rounded-full ${area.color.split(' ')[0]}`} />
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{area.name}</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {area.subjects.map(subject => (
                                                        <div key={subject} className="space-y-1 p-3 border rounded-lg hover:border-primary transition-colors bg-card shadow-sm">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground truncate block">{subject}</Label>
                                                            <Input
                                                                className="h-8 font-bold border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary text-lg px-px bg-transparent"
                                                                placeholder="0.0"
                                                                value={gridValues[subject] || ''}
                                                                onChange={e => setGridValues({ ...gridValues, [subject]: e.target.value })}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
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
                                            <div className="border rounded-lg overflow-hidden bg-card">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead>Ano</TableHead>
                                                            <TableHead>Bimestre</TableHead>
                                                            <TableHead>Disciplina</TableHead>
                                                            <TableHead className="text-right">Nota</TableHead>
                                                            <TableHead className="w-20">Ações</TableHead>
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
                                                                    <TableCell className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                                            onClick={() => {
                                                                                setEditingRecord(record);
                                                                                setEditGradeValue(String(record.grade).replace('.', ','));
                                                                            }}
                                                                        >
                                                                            <Edit3 className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
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

                                    <div className="mt-10 space-y-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t pt-6">
                                            <div className="flex items-center gap-2">
                                                <Target className="h-5 w-5 text-muted-foreground" />
                                                <h3 className="font-bold">Avaliações Externas</h3>
                                            </div>
                                            <Button variant="outline" className="gap-2" onClick={() => setShowBatchAssessment(true)}>
                                                <Target className="h-4 w-4" />
                                                Lançar Avaliações
                                            </Button>
                                        </div>

                                        {studentExternalSorted.length === 0 ? (
                                            <div className="border rounded-lg p-6 text-center text-muted-foreground bg-muted/20">
                                                Nenhuma avaliação externa registrada para este aluno.
                                            </div>
                                        ) : (
                                            <div className="border rounded-lg overflow-hidden bg-card">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead>Data</TableHead>
                                                            <TableHead>Tipo</TableHead>
                                                            <TableHead>Avaliação</TableHead>
                                                            <TableHead>Disciplina</TableHead>
                                                            <TableHead className="text-right">Nota</TableHead>
                                                            <TableHead>Ano</TableHead>
                                                            <TableHead>Bimestre</TableHead>
                                                            <TableHead className="w-20">Ações</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {studentExternalSorted.map((assessment) => {
                                                            const appliedLabel = formatDateInput(assessment.appliedDate);
                                                            return (
                                                                <TableRow key={assessment.id} className="hover:bg-muted/30">
                                                                    <TableCell className="text-xs">{appliedLabel || '-'}</TableCell>
                                                                    <TableCell className="text-xs">{assessment.assessmentType}</TableCell>
                                                                    <TableCell className="text-xs">{assessment.assessmentName}</TableCell>
                                                                    <TableCell className="text-xs">{assessment.subject || 'Geral'}</TableCell>
                                                                    <TableCell className="text-right font-bold text-xs">
                                                                        {assessment.score}/{assessment.maxScore}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {assessment.schoolLevel === 'fundamental'
                                                                            ? `${assessment.gradeYear}º Fund`
                                                                            : `${assessment.gradeYear}º EM`}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">{assessment.quarter || '-'}</TableCell>
                                                                    <TableCell className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                                            onClick={() => openExternalEdit(assessment)}
                                                                        >
                                                                            <Edit3 className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                                            onClick={() => deleteExternalAssessment(assessment.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB: TRAJECTORY & SIMULATION */}
                        <TabsContent value="trajectory" className="space-y-6">
                            {/* Controles de Seleção e Simulação */}
                            <Card className="bg-muted/30 border-muted">
                                <CardContent className="pt-6">
                                    <div className="grid gap-4 md:grid-cols-3">
                                        {/* Removido o seletor de disciplina daqui pois foi movido para o topo */}

                                        <div className="space-y-2">
                                            <Label>Cenário</Label>
                                            <Select value={simulationScenario} onValueChange={(v) => setSimulationScenario(v as typeof simulationScenario)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="optimistic">🚀 Otimista (+10%)</SelectItem>
                                                    <SelectItem value="realistic">📊 Realista</SelectItem>
                                                    <SelectItem value="pessimistic">⚠️ Pessimista (-10%)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Projeção (bimestres)</Label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="4"
                                                    value={simulationPoints}
                                                    onChange={(e) => setSimulationPoints(parseInt(e.target.value))}
                                                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                                <span className="w-6 text-center font-bold text-primary">{simulationPoints}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-end gap-2">
                                            <Button
                                                variant={showSimulation ? "default" : "outline"}
                                                onClick={() => setShowSimulation(!showSimulation)}
                                                disabled={!selectedSubject || subjectTimeline.length < 2}
                                                className="flex-1"
                                            >
                                                <Target className="h-4 w-4 mr-2" />
                                                {showSimulation ? "Parar" : "Simular"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {selectedSubject ? (
                                <>
                                    {/* Cards de Métricas Enriquecidas */}
                                    {enrichedMetrics && trendAnalysis && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {/* Tendência */}
                                            <Card className="border-none shadow-sm">
                                                <CardContent className="pt-4 text-center">
                                                    <div className={`text-4xl font-black ${trendAnalysis.trendColor}`}>
                                                        {trendAnalysis.trendIcon}
                                                    </div>
                                                    <p className="text-xs font-bold mt-1">{trendAnalysis.trendLabel}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {trendAnalysis.variationPercent >= 0 ? '+' : ''}{trendAnalysis.variationPercent.toFixed(0)}% variação
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            {/* Média Histórica */}
                                            <Card className="border-none shadow-sm">
                                                <CardContent className="pt-4 text-center">
                                                    <div className={`text-3xl font-black ${enrichedMetrics.average >= 6 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {enrichedMetrics.average.toFixed(1)}
                                                    </div>
                                                    <p className="text-xs font-bold mt-1">Média Histórica</p>
                                                    <p className="text-[10px] text-muted-foreground">{enrichedMetrics.totalGrades} registros</p>
                                                </CardContent>
                                            </Card>

                                            {/* Melhor Nota */}
                                            <Card className="border-none shadow-sm bg-emerald-500/10">
                                                <CardContent className="pt-4 text-center">
                                                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">
                                                        {enrichedMetrics.maxGrade.toFixed(1)}
                                                    </div>
                                                    <p className="text-xs font-bold mt-1 text-emerald-900 dark:text-emerald-100">Melhor Nota</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{enrichedMetrics.bestPeriod}</p>
                                                </CardContent>
                                            </Card>

                                            {/* Pior Nota */}
                                            <Card className="border-none shadow-sm bg-red-500/10">
                                                <CardContent className="pt-4 text-center">
                                                    <div className="text-3xl font-black text-red-600 dark:text-red-500">
                                                        {enrichedMetrics.minGrade.toFixed(1)}
                                                    </div>
                                                    <p className="text-xs font-bold mt-1 text-red-900 dark:text-red-100">Pior Nota</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{enrichedMetrics.worstPeriod}</p>
                                                </CardContent>
                                            </Card>

                                            {/* Consistência */}
                                            <Card className="border-none shadow-sm">
                                                <CardContent className="pt-4 text-center">
                                                    <div className={`text-2xl font-black ${enrichedMetrics.consistency === 'alta' ? 'text-emerald-600' : enrichedMetrics.consistency === 'baixa' ? 'text-amber-600' : 'text-blue-600'}`}>
                                                        {enrichedMetrics.consistencyLabel.split(' ')[0]}
                                                    </div>
                                                    <p className="text-xs font-bold mt-1">Consistência</p>
                                                    <p className="text-[10px] text-muted-foreground">CV: {enrichedMetrics.cv.toFixed(0)}%</p>
                                                </CardContent>
                                            </Card>

                                            {/* Projeção */}
                                            <Card className="border-none shadow-sm bg-primary/5">
                                                <CardContent className="pt-4 text-center">
                                                    {showSimulation ? (
                                                        <div className="text-3xl font-black text-primary">
                                                            {simulationData[simulationData.length - 1]?.emGrade?.toFixed(1) || '-'}
                                                        </div>
                                                    ) : (
                                                        <div className="text-3xl font-black text-muted-foreground/30">-</div>
                                                    )}
                                                    <p className="text-xs font-bold mt-1">Projeção</p>
                                                    <p className="text-[10px] text-muted-foreground">{showSimulation ? `+${simulationPoints} bim` : 'ativar simulação'}</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Insights Inteligentes */}
                                    {insights.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {insights.map((insight, idx) => (
                                                <Alert
                                                    key={idx}
                                                    className={`${insight.type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                                        insight.type === 'negative' ? 'bg-red-500/10 border-red-500/20' :
                                                            insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                                                'bg-blue-500/10 border-blue-500/20'
                                                        }`}
                                                >
                                                    <Lightbulb className={`h-4 w-4 ${insight.type === 'positive' ? 'text-emerald-600' :
                                                        insight.type === 'negative' ? 'text-red-600' :
                                                            insight.type === 'warning' ? 'text-amber-600' :
                                                                'text-blue-600'
                                                        }`} />
                                                    <AlertDescription className="text-xs">
                                                        {insight.message}
                                                    </AlertDescription>
                                                </Alert>
                                            ))}
                                        </div>
                                    )}

                                    {/* Gráfico Principal - Evolução Longitudinal */}
                                    <Card className="border-none shadow-sm bg-card">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">
                                                {selectedSubjectLabel} - Evolução Longitudinal
                                                {showSimulation && (
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                        Simulação Ativa
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[420px] pt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={showSimulation ? simulationData : subjectTimeline} margin={{ top: 20, right: 80, left: 10, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                                    <XAxis
                                                        dataKey="label"
                                                        tick={{ fontSize: 9 }}
                                                        height={70}
                                                        interval="preserveStartEnd"
                                                        angle={-35}
                                                        textAnchor="end"
                                                        padding={{ left: 10, right: 30 }}
                                                    />
                                                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                        formatter={(value: number, name: string) => [value?.toFixed(1), name]}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                                    <ReferenceLine y={6} stroke="#e74c3c" strokeDasharray="3 3" />

                                                    {/* Linha do Fundamental - Roxa */}
                                                    <Line
                                                        type="monotone"
                                                        dataKey="fundGrade"
                                                        stroke="#8e44ad"
                                                        strokeWidth={3}
                                                        name="Fundamental"
                                                        dot={{ r: 5, fill: '#8e44ad', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                        activeDot={{ r: 7 }}
                                                        connectNulls
                                                    >
                                                        <LabelList
                                                            dataKey="fundGrade"
                                                            position="top"
                                                            offset={8}
                                                            formatter={(val: number) => val?.toFixed(1)}
                                                            style={{ fontSize: '10px', fontWeight: 'bold', fill: '#8e44ad' }}
                                                        />
                                                    </Line>

                                                    {/* Linha do Ensino Médio - Azul */}
                                                    <Line
                                                        type="monotone"
                                                        dataKey="emGrade"
                                                        stroke="#3498db"
                                                        strokeWidth={3}
                                                        name="Ensino Médio"
                                                        dot={{ r: 5, fill: '#3498db', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                        activeDot={{ r: 7 }}
                                                        connectNulls
                                                    >
                                                        <LabelList
                                                            dataKey="emGrade"
                                                            position="top"
                                                            offset={8}
                                                            formatter={(val: number) => val?.toFixed(1)}
                                                            style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3498db' }}
                                                        />
                                                    </Line>

                                                    {/* Avaliações Externas - Laranja */}
                                                    <Scatter dataKey="external" fill="#f39c12" name="Aval. Externa" />

                                                    {/* Ocorrências - Vermelho */}
                                                    <Scatter dataKey="incident" fill="#e74c3c" name="Ocorrências" shape="triangle" />

                                                    {/* Linha de Projeção/Simulação - Laranja tracejada */}
                                                    {showSimulation && (
                                                        <Line
                                                            type="monotone"
                                                            dataKey="simulatedGrade"
                                                            stroke="#f97316"
                                                            strokeWidth={3}
                                                            strokeDasharray="5 5"
                                                            name="Projeção"
                                                            dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                            activeDot={{ r: 8, fill: '#f97316' }}
                                                            connectNulls
                                                        >
                                                            <LabelList
                                                                dataKey="simulatedGrade"
                                                                position="top"
                                                                offset={8}
                                                                formatter={(val: number) => val?.toFixed(1)}
                                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f97316' }}
                                                            />
                                                        </Line>
                                                    )}
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Pulso de Performance - Abaixo com mesmo padrão */}
                                    <Card className="border-none shadow-sm bg-card">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">
                                                Pulso de Performance
                                            </CardTitle>
                                            <CardDescription>
                                                Visão contínua com notas em cada período da trajetória
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[300px] pt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={showSimulation ? simulationData : subjectTimeline} margin={{ top: 20, right: 80, left: 10, bottom: 20 }}>
                                                    <defs>
                                                        <linearGradient id="pulseGradient2" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                                    <XAxis
                                                        dataKey="label"
                                                        tick={{ fontSize: 9 }}
                                                        height={70}
                                                        interval="preserveStartEnd"
                                                        angle={-35}
                                                        textAnchor="end"
                                                        padding={{ left: 10, right: 30 }}
                                                    />
                                                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                        formatter={(val: number, name: string) => [val?.toFixed(1), name]}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                                    <ReferenceLine y={6} stroke="#e74c3c" strokeDasharray="3 3" />

                                                    <Line
                                                        type="monotone"
                                                        dataKey="continuousValue"
                                                        stroke="#10b981"
                                                        strokeWidth={3}
                                                        name="Performance"
                                                        dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                        activeDot={{ r: 7 }}
                                                    >
                                                        <LabelList
                                                            dataKey="continuousValue"
                                                            position="top"
                                                            offset={10}
                                                            formatter={(val: number) => val?.toFixed(1)}
                                                            style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }}
                                                        />
                                                    </Line>

                                                    {showSimulation && (
                                                        <Line
                                                            type="monotone"
                                                            dataKey="simulatedGrade"
                                                            stroke="#f97316"
                                                            strokeWidth={3}
                                                            strokeDasharray="5 5"
                                                            name="Projeção"
                                                            dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                            activeDot={{ r: 8, fill: '#f97316' }}
                                                            connectNulls
                                                        >
                                                            <LabelList
                                                                dataKey="simulatedGrade"
                                                                position="top"
                                                                offset={10}
                                                                formatter={(val: number) => val?.toFixed(1)}
                                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f97316' }}
                                                            />
                                                        </Line>
                                                    )}
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <Card className="h-80 flex flex-col items-center justify-center border-dashed">
                                    <BookOpen className="h-12 w-12 opacity-10 mb-2" />
                                    <p className="text-muted-foreground">Escolha uma disciplina ou todas para visualizar a trajetória</p>
                                </Card>
                            )}
                        </TabsContent>


                    </Tabs >
                )
            }

            {/* Dialogs */}
            <ExternalAssessmentBatchDialog
                open={showBatchAssessment}
                onOpenChange={setShowBatchAssessment}
                classId={selectedClass}
                subjects={ALL_SUBJECTS}
            />
            <TrajectoryImportDialog open={showImport} onOpenChange={setShowImport} />

            {/* Edit Grade Dialog */}
            <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Nota</DialogTitle>
                        <DialogDescription>
                            Editando nota de <strong>{editingRecord?.subject}</strong> referente ao <strong>{editingRecord?.quarter}</strong> do {editingRecord?.gradeYear}º ano.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nota</Label>
                            <Input
                                value={editGradeValue}
                                onChange={(e) => setEditGradeValue(e.target.value)}
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                className="text-lg font-bold"
                                autoFocus
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingRecord(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            if (!editingRecord) return;
                            const newGrade = parseFloat(editGradeValue.replace(',', '.'));
                            if (isNaN(newGrade) || newGrade < 0 || newGrade > 10) {
                                toast({ title: "Valor inválido", description: "Insira uma nota entre 0 e 10", variant: "destructive" });
                                return;
                            }
                            deleteHistoricalGrade(editingRecord.id);
                            addHistoricalGrade({
                                studentId: selectedStudent!,
                                gradeYear: editingRecord.gradeYear,
                                calendarYear: new Date().getFullYear(),
                                quarter: editingRecord.quarter,
                                subject: editingRecord.subject,
                                grade: newGrade,
                                schoolLevel: 'fundamental'
                            });
                            toast({ title: "Nota atualizada", description: "A nota foi corrigida com sucesso." });
                            setEditingRecord(null);
                        }}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!editingExternalAssessment}
                onOpenChange={(open) => !open && setEditingExternalAssessment(null)}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar Avaliação Externa</DialogTitle>
                        <DialogDescription>
                            Atualize os dados da avaliação registrada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                                value={externalForm.assessmentType}
                                onValueChange={(value) => setExternalForm({ ...externalForm, assessmentType: value as ExternalAssessmentType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {['SAEB', 'SIGE', 'Diagnóstica', 'Simulado', 'Outro'].map((type) => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nome da avaliação</Label>
                            <Input
                                value={externalForm.assessmentName}
                                onChange={(e) => setExternalForm({ ...externalForm, assessmentName: e.target.value })}
                                placeholder="Ex.: Simulado SAEPI"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Disciplina</Label>
                            <Input
                                value={externalForm.subject}
                                onChange={(e) => setExternalForm({ ...externalForm, subject: e.target.value })}
                                placeholder="Geral ou disciplina"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data de aplicação</Label>
                            <Input
                                type="date"
                                value={externalForm.appliedDate}
                                onChange={(e) => setExternalForm({ ...externalForm, appliedDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nota</Label>
                            <Input
                                type="number"
                                min="0"
                                value={externalForm.score}
                                onChange={(e) => setExternalForm({ ...externalForm, score: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Pontuação máxima</Label>
                            <Input
                                type="number"
                                min="1"
                                value={externalForm.maxScore}
                                onChange={(e) => setExternalForm({ ...externalForm, maxScore: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nível</Label>
                            <Select
                                value={externalForm.schoolLevel}
                                onValueChange={(value) => {
                                    const nextLevel = value as 'fundamental' | 'medio';
                                    const nextYearOptions = nextLevel === 'fundamental' ? FUNDAMENTAL_YEARS : MEDIO_YEARS;
                                    const nextYear = nextYearOptions.includes(Number(externalForm.gradeYear))
                                        ? externalForm.gradeYear
                                        : String(nextYearOptions[0]);
                                    setExternalForm({
                                        ...externalForm,
                                        schoolLevel: nextLevel,
                                        gradeYear: nextYear,
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fundamental">Fundamental</SelectItem>
                                    <SelectItem value="medio">Ensino Médio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ano</Label>
                            <Select
                                value={externalForm.gradeYear}
                                onValueChange={(value) => setExternalForm({ ...externalForm, gradeYear: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(externalForm.schoolLevel === 'fundamental' ? FUNDAMENTAL_YEARS : MEDIO_YEARS)
                                        .map((year) => (
                                            <SelectItem key={year} value={String(year)}>
                                                {externalForm.schoolLevel === 'fundamental' ? `${year}º ano` : `${year}º EM`}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bimestre</Label>
                            <Select
                                value={externalForm.quarter || 'none'}
                                onValueChange={(value) => setExternalForm({ ...externalForm, quarter: value === 'none' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem bimestre</SelectItem>
                                    <SelectItem value="Anual">Anual</SelectItem>
                                    {QUARTERS.map((quarter) => (
                                        <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Observações</Label>
                            <Textarea
                                rows={3}
                                value={externalForm.notes}
                                onChange={(e) => setExternalForm({ ...externalForm, notes: e.target.value })}
                                placeholder="Comentários, observações ou contexto"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingExternalAssessment(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleExternalSave}>
                            Salvar alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default StudentTrajectory;
