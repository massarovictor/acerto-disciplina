import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClasses, useStudents, useGradesAnalytics, useHistoricalGrades, useExternalAssessments, useIncidents, useProfessionalSubjects, useProfessionalSubjectTemplates } from '@/hooks/useData';
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
    Lock,
    UploadCloud,
    Users,
    Info,
    RefreshCw
} from 'lucide-react';
import { ClassTrajectoryView } from '@/components/trajectory/ClassTrajectoryView';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

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

import { useSearchParams } from 'react-router-dom';

// ...

const StudentTrajectory = () => {
    const { classes } = useClasses();
    const { students } = useStudents();
    const { trajectoryUI, setTrajectoryUI } = useUIStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedClass = trajectoryUI.selectedClassId;
    const selectedStudent = trajectoryUI.selectedStudentId;
    const selectedSubject = trajectoryUI.selectedSubject;
    const activeTab = trajectoryUI.activeTab;
    const gridYear = trajectoryUI.gridYear;
    const gridQuarter = trajectoryUI.gridQuarter;
    const gridCalendarYear = trajectoryUI.gridCalendarYear;
    const source = trajectoryUI.source;

    // Hooks de Dados
    const { grades: regularGrades } = useGradesAnalytics({ studentId: selectedStudent || undefined });
    const { historicalGrades, addHistoricalGrade, deleteHistoricalGrade } = useHistoricalGrades();
    const { externalAssessments, deleteExternalAssessment, updateExternalAssessment } = useExternalAssessments();
    const { incidents } = useIncidents();
    const { getProfessionalSubjects } = useProfessionalSubjects();
    const { getTemplate, getTemplatesByCourse } = useProfessionalSubjectTemplates();
    const { toast } = useToast();

    // Sync with URL params on mount for deep linking support
    useEffect(() => {
        const classIdParam = searchParams.get('classId');
        const studentIdParam = searchParams.get('studentId');

        const updates: Partial<typeof trajectoryUI> = {};
        let needsUpdate = false;

        if (classIdParam && classIdParam !== selectedClass) {
            updates.selectedClassId = classIdParam;
            needsUpdate = true;
        }
        if (studentIdParam && studentIdParam !== selectedStudent) {
            updates.selectedStudentId = studentIdParam;
            needsUpdate = true;
        }

        if (needsUpdate) {
            setTrajectoryUI(updates);
        }
    }, [searchParams, selectedClass, selectedStudent, setTrajectoryUI]);

    const setSelectedClass = (value: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (value) nextParams.set('classId', value);
        else nextParams.delete('classId');
        nextParams.delete('studentId'); // Reset student on class change
        setTrajectoryUI({ selectedClassId: value, selectedStudentId: '' });
        setSearchParams(nextParams);
    };

    const setSelectedStudent = (value: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (value) nextParams.set('studentId', value);
        else nextParams.delete('studentId');
        setTrajectoryUI({ selectedStudentId: value });
        setSearchParams(nextParams);
    };

    const setSelectedSubject = (value: string) => {
        setTrajectoryUI({
            selectedSubject: value,
            source: source === 'analytics' ? '' : source,
        });
    };
    const setActiveTab = (value: string) => setTrajectoryUI({ activeTab: value });
    const setGridYear = (value: number) => setTrajectoryUI({ gridYear: value });
    const setGridQuarter = (value: string) => setTrajectoryUI({ gridQuarter: value });
    const setGridCalendarYear = (value: number) => setTrajectoryUI({ gridCalendarYear: value });

    const [showBatchAssessment, setShowBatchAssessment] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [subjectFallbackNotice, setSubjectFallbackNotice] = useState('');
    const [editingHistoryYear, setEditingHistoryYear] = useState<number | null>(null);
    const [editingExternalYear, setEditingExternalYear] = useState<{ year: number, level: 'fundamental' | 'medio' } | null>(null);

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
    const selectedClassData = useMemo(() => classes.find(c => c.id === selectedClass), [classes, selectedClass]);
    const studentRegularGrades = useMemo(() => regularGrades, [regularGrades]);
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

    const templateSubjectsAllYears = useMemo(() => {
        if (!selectedClassData) return [];
        let templateSubjects: string[] = [];
        if (selectedClassData.templateId) {
            const template = getTemplate(selectedClassData.templateId);
            if (template) {
                templateSubjects = template.subjectsByYear.flatMap(entry => entry.subjects || []);
            }
        } else if (selectedClassData.course) {
            const templates = getTemplatesByCourse(selectedClassData.course);
            templateSubjects = templates.flatMap(template =>
                template.subjectsByYear.flatMap(entry => entry.subjects || [])
            );
        }
        return templateSubjects.filter(Boolean);
    }, [getTemplate, getTemplatesByCourse, selectedClassData]);

    const classProfessionalSubjects = useMemo(
        () => (selectedClass ? getProfessionalSubjects(selectedClass) : []),
        [getProfessionalSubjects, selectedClass]
    );

    const professionalSubjectsExpanded = useMemo(() => {
        const subjectMap = new Map<string, string>();
        [...classProfessionalSubjects, ...templateSubjectsAllYears].forEach(subject => {
            const key = normalizeSubjectName(subject);
            if (!subjectMap.has(key)) {
                subjectMap.set(key, subject);
            }
        });
        return Array.from(subjectMap.values());
    }, [classProfessionalSubjects, templateSubjectsAllYears]);

    const professionalSubjectsForSelect = useMemo(() => {
        if (professionalSubjectsExpanded.length === 0) return [];
        const baseSubjects = (isStudentFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS).flatMap(area => area.subjects);
        const baseNormalized = new Set(baseSubjects.map(normalizeSubjectName));
        return professionalSubjectsExpanded
            .filter(subject => !baseNormalized.has(normalizeSubjectName(subject)))
            .sort((a, b) => a.localeCompare(b));
    }, [professionalSubjectsExpanded, isStudentFundamental]);

    const subjectsForBatchDialog = useMemo(() => {
        if (professionalSubjectsExpanded.length === 0) return ALL_SUBJECTS;
        const map = new Map<string, string>();
        ALL_SUBJECTS.forEach(subject => map.set(normalizeSubjectName(subject), subject));
        professionalSubjectsExpanded.forEach(subject => {
            const key = normalizeSubjectName(subject);
            if (!map.has(key)) {
                map.set(key, subject);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }, [professionalSubjectsExpanded]);

    const studentSubjectSet = useMemo(() => {
        const allSubjects = [...studentHistorical, ...studentRegularGrades].map(g => g.subject).filter(Boolean);
        return new Set(allSubjects.map(normalizeSubjectName));
    }, [studentHistorical, studentRegularGrades]);

    const normalizedSelectedSubject = useMemo(
        () => (selectedSubject && selectedSubject !== 'all' ? normalizeSubjectName(selectedSubject) : ''),
        [selectedSubject]
    );

    const selectedSubjectHasData = useMemo(() => {
        if (!normalizedSelectedSubject) return true;
        return studentSubjectSet.has(normalizedSelectedSubject);
    }, [normalizedSelectedSubject, studentSubjectSet]);

    useEffect(() => {
        if (!selectedStudent || !selectedSubject || selectedSubject === 'all') {
            setSubjectFallbackNotice('');
            return;
        }
        if (!selectedSubjectHasData) {
            setSubjectFallbackNotice(`Sem notas registradas para "${selectedSubject}".`);
            return;
        }
        setSubjectFallbackNotice('');
    }, [selectedStudent, selectedSubject, selectedSubjectHasData]);

    useEffect(() => {
        setSubjectFallbackNotice('');
    }, [selectedStudent]);

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
                                (
                                    !selectedSubject ||
                                    selectedSubject === 'all' ||
                                    normalizeSubjectName(e.subject || '') === normalizeSubjectName(selectedSubject) ||
                                    e.subject === 'geral' ||
                                    !e.subject
                                )
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
                                .filter(e => {
                                    // 1. Year & Level Match (Strict)
                                    if (e.schoolLevel !== level) return false;
                                    // eslint-disable-next-line eqeqeq
                                    if (e.gradeYear != year) return false;

                                    // 2. Quarter Match (Robust with Date Fallback)
                                    const getNumber = (s: string | undefined | null) => {
                                        if (!s) return '';
                                        const val = s.match(/\d/);
                                        return val ? val[0] : '';
                                    };

                                    let eNum = getNumber(e.quarter);

                                    // Fallback to appliedDate if no quarter
                                    if (!eNum && e.appliedDate) {
                                        try {
                                            const month = new Date(e.appliedDate).getMonth() + 1;
                                            if (month >= 1 && month <= 4) eNum = '1'; // Jan a Abr
                                            else if (month >= 5 && month <= 7) eNum = '2'; // Mai a Jul
                                            else if (month >= 8 && month <= 10) eNum = '3'; // Ago a Out
                                            else if (month >= 11 || month === 12) eNum = '4'; // Nov e Dez
                                        } catch { /* ignore */ }
                                    }

                                    const qNum = getNumber(q);
                                    return eNum && qNum && eNum === qNum;
                                })
                                .map(e => (e.maxScore ? (e.score / e.maxScore) * 10 : NaN));
                            const externalAvg = average(externalScores);

                            const periodIncidents = studentIncidents.filter(i => {
                                const date = new Date(i.createdAt);
                                const month = date.getMonth();
                                const quarter = Math.floor(month / 3) + 1;
                                const quarterStr = `${quarter}º Bimestre`;
                                return quarterStr === q;
                            });

                            // Push School Grade Point
                            if (gradeAvg !== null || (periodIncidents.length > 0 && data.length > 0)) {
                                data.push({
                                    idx: idx++,
                                    label: `${year}º EM - ${q.replace(' Bimestre', 'B')}`,
                                    emGrade: gradeAvg ?? undefined,
                                    external: undefined, // Separate point
                                    incident: periodIncidents.length > 0 ? periodIncidents.length * 2 : undefined,
                                    incidentCount: periodIncidents.length,
                                    type: 'Escolar',
                                    continuousValue: gradeAvg ?? undefined
                                });
                            }

                            // Push External Assessment Point (Side-by-side)
                            if (externalAvg !== null) {
                                const qNum = q.replace(/[^0-9]/g, '');
                                data.push({
                                    idx: idx++,
                                    label: `${year}º - AE ${qNum}B`,
                                    emGrade: undefined,
                                    external: externalAvg,
                                    externalName: externalScores.length > 1 ? 'Avaliações' : undefined,
                                    type: 'Externa',
                                    continuousValue: externalAvg
                                });
                            }
                            return;
                        }

                        const g = studentRegularGrades.find(r =>
                            (r.schoolYear || 1) === year &&
                            r.quarter === q &&
                            normalizeSubjectName(r.subject) === normalizeSubjectName(selectedSubject)
                        );

                        const ext = studentExternal.find(e => {
                            // 1. Year & Level Match (Strict)
                            if (e.schoolLevel !== level) return false;
                            // eslint-disable-next-line eqeqeq
                            if (e.gradeYear != year) return false;

                            // 2. Subject Match (Safe check)
                            const isSubjectMatch =
                                selectedSubject === 'all' ||
                                !selectedSubject ||
                                normalizeSubjectName(e.subject || '') === normalizeSubjectName(selectedSubject) ||
                                e.subject === 'geral' ||
                                !e.subject;
                            if (!isSubjectMatch) return false;

                            // 3. Quarter Match (Robust with Date Fallback)
                            // Helper to extract digit
                            const getNumber = (s: string | undefined | null) => {
                                if (!s) return '';
                                const val = s.match(/\d/);
                                return val ? val[0] : '';
                            };

                            let eNum = getNumber(e.quarter);

                            // Fallback to appliedDate if no quarter
                            if (!eNum && e.appliedDate) {
                                try {
                                    const month = new Date(e.appliedDate).getMonth() + 1;
                                    if (month >= 1 && month <= 4) eNum = '1';
                                    else if (month >= 5 && month <= 7) eNum = '2';
                                    else if (month >= 8 && month <= 10) eNum = '3';
                                    else if (month >= 11 || month === 12) eNum = '4';
                                } catch { /* ignore */ }
                            }

                            const qNum = getNumber(q);
                            return eNum && qNum && eNum === qNum;
                        });

                        // Incidents for this specific period
                        const periodIncidents = studentIncidents.filter(i => {
                            const date = new Date(i.createdAt);
                            const month = date.getMonth();
                            const quarter = Math.floor(month / 3) + 1;
                            const quarterStr = `${quarter}º Bimestre`;
                            return quarterStr === q;
                        });

                        // Push School Grade Point
                        if (g || (periodIncidents.length > 0 && data.length > 0)) {
                            data.push({
                                idx: idx++,
                                label: `${year}º EM - ${q.replace(' Bimestre', 'B')}`,
                                emGrade: g?.grade,
                                external: undefined,
                                incident: periodIncidents.length > 0 ? periodIncidents.length * 2 : undefined,
                                incidentCount: periodIncidents.length,
                                type: 'Escolar',
                                continuousValue: g?.grade
                            });
                        }

                        // Push External Point (Side-by-side)
                        if (ext) {
                            const qNum = q.replace(/[^0-9]/g, '');
                            const val = (ext.score / ext.maxScore) * 10;
                            data.push({
                                idx: idx++,
                                label: `${year}º - AE ${qNum}B`,
                                emGrade: undefined, // Separate from EM Line
                                external: val,
                                externalName: ext.assessmentName,
                                type: 'Externa',
                                continuousValue: val
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
        <PageContainer>
            <PageHeader
                title="Trajetória Estudantil"
                description="Acompanhamento longitudinal e simulação de desempenho"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
                            <FileSpreadsheet className="h-4 w-4" /> Importação
                        </Button>
                        <Button onClick={() => setShowBatchAssessment(true)} className="gap-2">
                            <Target className="h-4 w-4" /> Lançamento em Lote
                        </Button>
                    </div>
                }
            />

            {source === 'analytics' && (
                <div className="mb-4 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
                    <p className="font-semibold text-sm mb-1 text-blue-700 dark:text-blue-300">Filtro recebido do Analytics</p>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-blue-700/80 dark:text-blue-300/80">
                        <span>
                            Abrindo trajetória com disciplina{' '}
                            <strong>
                                {selectedSubject
                                    ? selectedSubject === 'all'
                                        ? 'todas as disciplinas'
                                        : selectedSubject
                                    : 'não definida'}
                            </strong>
                            .
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-blue-700 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            onClick={() => setTrajectoryUI({ source: '', selectedSubject: '' })}
                        >
                            Limpar filtro
                        </Button>
                    </div>
                </div>
            )}

            {subjectFallbackNotice && (
                <div className="mb-4 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
                    <p className="font-semibold text-sm mb-1 text-amber-700 dark:text-amber-300">Sem notas registradas</p>
                    <p className="text-sm text-amber-700/80 dark:text-amber-300/80">{subjectFallbackNotice}</p>
                </div>
            )}

            {/* Main Filters - Clean Design (No Labels) */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="space-y-1">
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="h-10 bg-background">
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

                <div className="space-y-1">
                    <Select
                        value={selectedStudent || 'view_all_class'}
                        onValueChange={(val) => setSelectedStudent(val === 'view_all_class' ? '' : val)}
                        disabled={!selectedClass}
                    >
                        <SelectTrigger className="h-10 bg-background">
                            <SelectValue placeholder="Selecione o aluno" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="view_all_class" className="text-primary font-medium border-b mb-1 pb-1">
                                🏫 Visão Geral da Turma
                            </SelectItem>
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

                <div className="space-y-1">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                        <SelectTrigger className="h-10 bg-background">
                            <SelectValue placeholder="Escolha a disciplina" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                            {/* Option "All" is already there */}
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
                            {professionalSubjectsForSelect.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/10 uppercase tracking-wider">
                                        Profissionais
                                    </SelectLabel>
                                    {professionalSubjectsForSelect.map(subject => (
                                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
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

            {
                !selectedStudent ? (
                    selectedClass ? (
                        <ClassTrajectoryView
                            classId={selectedClass}
                            selectedSubject={selectedSubject === 'all' ? '' : selectedSubject}
                        />
                    ) : (
                        <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground border-dashed">
                            <User className="h-12 w-12 mb-2 opacity-20" />
                            <p>Selecione uma turma para ver a visão geral ou escolha um aluno.</p>
                        </Card>
                    )
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Média Fundamental */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">Média Fundamental</CardTitle>
                                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                    <GraduationCap className="h-4 w-4" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{holisticSummary.fundAvg.toFixed(1)}</div>
                                                <p className="text-xs text-muted-foreground mt-1">Média geral do ciclo básico</p>
                                            </CardContent>
                                        </Card>

                                        {/* Média Médio */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">Média Ensino Médio</CardTitle>
                                                <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                                                    <School className="h-4 w-4" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{holisticSummary.emAvg.toFixed(1)}</div>
                                                <p className="text-xs text-muted-foreground mt-1">Média geral do ciclo avançado</p>
                                            </CardContent>
                                        </Card>

                                        {/* Avaliações Externas */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações Externas</CardTitle>
                                                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                                    <Target className="h-4 w-4" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{holisticSummary.extAvg.toFixed(1)}</div>
                                                <p className="text-xs text-muted-foreground mt-1">Média de simulados e provas</p>
                                            </CardContent>
                                        </Card>

                                        {/* Ocorrências */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium text-muted-foreground">Ocorrências</CardTitle>
                                                <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                    <AlertTriangle className="h-4 w-4" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{holisticSummary.incidentCount}</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {holisticSummary.criticalIncidents > 0
                                                        ? `${holisticSummary.criticalIncidents} registros críticos`
                                                        : 'Registros comportamentais'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>


                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Potencialidades */}
                                        <Card className="border-none shadow-none bg-emerald-50/30 dark:bg-emerald-900/5 border border-emerald-100 dark:border-emerald-800/50">
                                            <CardHeader className="pb-2 border-b border-emerald-100 dark:border-emerald-800/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                                        <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-base text-emerald-900 dark:text-emerald-300">Potencialidades</CardTitle>
                                                        <CardDescription className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Áreas de destaque e alto desempenho</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                {holisticSummary.strengths.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {holisticSummary.strengths.map(s => (
                                                            <div key={s.name} className="flex flex-col gap-1 p-3 rounded-lg bg-white dark:bg-gray-800/50 shadow-sm border border-emerald-100/50 dark:border-emerald-800/30">
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.name}</span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Média Geral</span>
                                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{s.avg.toFixed(1)}</span>
                                                                </div>
                                                                <div className="h-1 w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden mt-1">
                                                                    <div className="h-full bg-emerald-500" style={{ width: `${(s.avg / 10) * 100}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-sm text-muted-foreground text-center py-8">Ainda não foram identificadas áreas de destaque significativo.</p>}
                                            </CardContent>
                                        </Card>

                                        {/* Dificuldades */}
                                        <Card className="border-none shadow-none bg-red-50/30 dark:bg-red-900/5 border border-red-100 dark:border-red-800/50">
                                            <CardHeader className="pb-2 border-b border-red-100 dark:border-red-800/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-base text-red-900 dark:text-red-300">Pontos de Atenção</CardTitle>
                                                        <CardDescription className="text-xs text-red-700/70 dark:text-red-400/70">Disciplinas que requerem suporte prioritário</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                {holisticSummary.difficulties.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {holisticSummary.difficulties.map(d => (
                                                            <div key={d.name} className="flex flex-col gap-1 p-3 rounded-lg bg-white dark:bg-gray-800/50 shadow-sm border border-red-100/50 dark:border-red-800/30">
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{d.name}</span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Média Geral</span>
                                                                    <span className="font-bold text-red-600 dark:text-red-400 text-lg">{d.avg.toFixed(1)}</span>
                                                                </div>
                                                                <div className="h-1 w-full bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden mt-1">
                                                                    <div className="h-full bg-red-500" style={{ width: `${(d.avg / 10) * 100}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center py-8 flex flex-col items-center gap-2">
                                                    <CheckCircle2 className="h-8 w-8 opacity-50" />
                                                    Nenhum ponto de atenção identificado.
                                                </p>}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* TAB: ENTRY (LANÇAMENTO RÁPIDO) */}
                        <TabsContent value="entry" className="space-y-6">
                            <Tabs defaultValue="school_history" className="w-full">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                    <TabsList>
                                        <TabsTrigger value="school_history" className="gap-2">
                                            <History className="h-4 w-4" />
                                            Histórico Escolar
                                        </TabsTrigger>
                                        <TabsTrigger value="external_assessments" className="gap-2">
                                            <Target className="h-4 w-4" />
                                            Avaliações Externas
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border">
                                        <Info className="h-3 w-3 text-blue-500" />
                                        <span>Use esta área apenas para dados anteriores à entrada no Ensino Médio.</span>
                                    </div>
                                </div>

                                {/* SUB-TAB: HISTÓRICO ESCOLAR */}
                                <TabsContent value="school_history" className="space-y-6 animate-in slide-in-from-left-2 fade-in duration-300">
                                    <div className="grid gap-6">
                                        <div className="flex flex-col gap-2">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <History className="h-5 w-5 text-primary" />
                                                Histórico Escolar Fundamental
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Selecione um ano para visualizar ou editar as notas anuais.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {FUNDAMENTAL_YEARS.map(year => {
                                                // Calculate stats for this year
                                                const yearGrades = studentHistorical.filter(h => h.gradeYear === year && h.quarter === 'Anual');
                                                const totalSubjects = yearGrades.length;
                                                const avgGrade = totalSubjects > 0
                                                    ? yearGrades.reduce((acc, curr) => acc + curr.grade, 0) / totalSubjects
                                                    : 0;
                                                const hasGrades = totalSubjects > 0;

                                                return (
                                                    <Card
                                                        key={year}
                                                        className={`cursor-pointer transition-all hover:shadow-md border-2 ${hasGrades ? 'border-primary/20 bg-primary/5' : 'border-dashed hover:border-primary/50'
                                                            }`}
                                                        onClick={() => setEditingHistoryYear(year)}
                                                    >
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-lg font-bold flex justify-between items-center">
                                                                {year}º Ano
                                                                {hasGrades && (
                                                                    <Badge variant={avgGrade >= 6 ? "default" : "destructive"}>
                                                                        Média: {avgGrade.toFixed(1)}
                                                                    </Badge>
                                                                )}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-muted-foreground">Disciplinas:</span>
                                                                    <span className="font-medium">{totalSubjects} lançadas</span>
                                                                </div>

                                                                {hasGrades ? (
                                                                    <div className="w-full bg-background rounded-full h-2 overflow-hidden border">
                                                                        <div
                                                                            className={`h-full ${avgGrade >= 6 ? 'bg-primary' : 'bg-destructive'}`}
                                                                            style={{ width: `${Math.min(100, (avgGrade / 10) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center py-2 text-muted-foreground text-sm italic">
                                                                        Clique para lançar
                                                                    </div>
                                                                )}

                                                                <Button variant="ghost" className="w-full gap-2 mt-2" size="sm">
                                                                    <Edit3 className="h-4 w-4" />
                                                                    {hasGrades ? 'Editar Notas' : 'Lançar Notas'}
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* SUB-TAB: AVALIAÇÕES EXTERNAS */}
                                <TabsContent value="external_assessments" className="space-y-6 animate-in slide-in-from-right-2 fade-in duration-300">
                                    <Card>
                                        <CardHeader>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                        Gestão de Avaliações Externas
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Centralize aqui os resultados de simulados, SAEB, e provas diagnósticas.
                                                    </CardDescription>
                                                </div>
                                                <Button variant="default" size="sm" className="gap-2 shadow-sm" onClick={() => setShowBatchAssessment(true)}>
                                                    <UploadCloud className="h-4 w-4" />
                                                    Lançar em Lote (Turma)
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {studentExternalSorted.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                                    <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                                                        <Target className="h-8 w-8 text-muted-foreground/30" />
                                                    </div>
                                                    <h3 className="text-lg font-medium text-foreground">Nenhuma avaliação registrada</h3>
                                                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                                        Registre simulados e provas para acompanhar a evolução do aluno em comparação com métricas externas.
                                                    </p>
                                                    <Button variant="outline" className="mt-6" onClick={() => setShowBatchAssessment(true)}>
                                                        Começar Lançamento
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="border-t">
                                                    <Table>
                                                        <TableHeader className="bg-muted/30">
                                                            <TableRow>
                                                                <TableHead className="text-xs uppercase font-semibold pl-6">Data</TableHead>
                                                                <TableHead className="text-xs uppercase font-semibold">Avaliação</TableHead>
                                                                <TableHead className="text-xs uppercase font-semibold">Disciplina</TableHead>
                                                                <TableHead className="text-center text-xs uppercase font-semibold">Desempenho</TableHead>
                                                                <TableHead className="text-xs uppercase font-semibold">Nível</TableHead>
                                                                <TableHead className="w-20 text-xs uppercase font-semibold text-right pr-6">Ações</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {studentExternalSorted.map((assessment) => {
                                                                const appliedLabel = formatDateInput(assessment.appliedDate);
                                                                const percentage = (assessment.score / assessment.maxScore) * 100;

                                                                return (
                                                                    <TableRow
                                                                        key={assessment.id}
                                                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                                                        onClick={() => openExternalEdit(assessment)}
                                                                    >
                                                                        <TableCell className="text-xs font-medium pl-6 text-muted-foreground">{appliedLabel || '-'}</TableCell>
                                                                        <TableCell>
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium text-sm">{assessment.assessmentName}</span>
                                                                                <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                                                    {assessment.assessmentType}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-muted-foreground">{assessment.subject || 'Geral (Multidisciplinar)'}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <span className={`font-bold text-sm px-2 py-0.5 rounded border ${assessment.score >= 6 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                                                    {assessment.score.toFixed(1)}
                                                                                </span>
                                                                                <span className="text-[10px] text-muted-foreground">{percentage.toFixed(0)}% de {assessment.maxScore}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-muted-foreground">
                                                                            {assessment.schoolLevel === 'fundamental'
                                                                                ? `${assessment.gradeYear}º Fund`
                                                                                : `${assessment.gradeYear}º EM`}
                                                                            {assessment.quarter && <span className="ml-1 opacity-50">• {assessment.quarter.replace(' Bimestre', 'B')}</span>}
                                                                        </TableCell>
                                                                        <TableCell className="text-right pr-6">
                                                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
                                                                                    onClick={() => openExternalEdit(assessment)}
                                                                                >
                                                                                    <Edit3 className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                                                                                    onClick={() => deleteExternalAssessment(assessment.id)}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                        {/* TAB: TRAJECTORY & SIMULATION */}
                        <TabsContent value="trajectory" className="space-y-6">
                            {/* Controles de Seleção e Simulação */}
                            {/* Controles de Seleção e Simulação - Clean */}
                            <div className="mb-6">
                                <div className="grid gap-4 md:grid-cols-3 items-center">
                                    <div className="space-y-1">
                                        <Select value={simulationScenario} onValueChange={(v) => setSimulationScenario(v as typeof simulationScenario)}>
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Selecione o cenário" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="optimistic">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                                        <span>Otimista (+10%)</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="realistic">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="h-4 w-4 text-blue-500" />
                                                        <span>Realista (Tendência Atual)</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="pessimistic">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                                                        <span>Pessimista (-10%)</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-background h-10">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Extensão:</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="4"
                                            value={simulationPoints}
                                            onChange={(e) => setSimulationPoints(parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="w-6 text-center font-bold text-primary text-sm">{simulationPoints}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">bim</span>
                                    </div>

                                    <div className="flex items-center">
                                        <Button
                                            variant={showSimulation ? "default" : "outline"}
                                            onClick={() => setShowSimulation(!showSimulation)}
                                            disabled={!selectedSubject || subjectTimeline.length < 2}
                                            className="w-full h-10 gap-2"
                                        >
                                            <Target className="h-4 w-4" />
                                            {showSimulation ? "Parar Simulação" : "Simular Cenário"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {selectedSubject ? (
                                <>
                                    {/* Cards de Métricas Enriquecidas */}
                                    {/* Cards de Métricas Enriquecidas - Design System Premium */}
                                    {enrichedMetrics && trendAnalysis && (
                                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                            {/* Tendência */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">Tendência</CardTitle>
                                                    <div className={`p-2 rounded-lg ${trendAnalysis.trend === 'ascending' ? 'bg-emerald-100 text-emerald-600' :
                                                        trendAnalysis.trend === 'descending' ? 'bg-red-100 text-red-600' :
                                                            'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {trendAnalysis.trend === 'ascending' ? <TrendingUp className="h-4 w-4" /> :
                                                            trendAnalysis.trend === 'descending' ? <TrendingUp className="h-4 w-4 rotate-180" /> :
                                                                <Minus className="h-4 w-4" />}
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className={`text-2xl font-bold ${trendAnalysis.trendColor}`}>
                                                        {trendAnalysis.variationPercent >= 0 ? '+' : ''}{trendAnalysis.variationPercent.toFixed(0)}%
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">vs. bimestre anterior</p>
                                                </CardContent>
                                            </Card>

                                            {/* Média Histórica */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">Média Geral</CardTitle>
                                                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <Activity className="h-4 w-4" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className={`text-2xl font-bold ${enrichedMetrics.average >= 6 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {enrichedMetrics.average.toFixed(1)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">Média acumulada</p>
                                                </CardContent>
                                            </Card>

                                            {/* Melhor Nota */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Nota</CardTitle>
                                                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                        {enrichedMetrics.maxGrade.toFixed(1)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 truncate" title={enrichedMetrics.bestPeriod}>
                                                        {enrichedMetrics.bestPeriod}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            {/* Pior Nota */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">Pior Nota</CardTitle>
                                                    <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                        <ArrowDownRight className="h-4 w-4" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                        {enrichedMetrics.minGrade.toFixed(1)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 truncate" title={enrichedMetrics.worstPeriod}>
                                                        {enrichedMetrics.worstPeriod}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            {/* Consistência */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">Consistência</CardTitle>
                                                    <div className={`p-2 rounded-lg ${enrichedMetrics.consistency === 'alta' ? 'bg-emerald-100 text-emerald-600' :
                                                        enrichedMetrics.consistency === 'baixa' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        <Target className="h-4 w-4" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className={`text-2xl font-bold ${enrichedMetrics.consistency === 'alta' ? 'text-emerald-600' :
                                                        enrichedMetrics.consistency === 'baixa' ? 'text-amber-600' :
                                                            'text-blue-600'
                                                        }`}>
                                                        {enrichedMetrics.consistencyLabel}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">Estabilidade</p>
                                                </CardContent>
                                            </Card>

                                            {/* Projeção */}
                                            <Card className={showSimulation ? 'bg-orange-50/30 hover:border-orange-200' : 'opacity-70 bg-muted/20'}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">Projeção</CardTitle>
                                                    <div className={`p-2 rounded-lg ${showSimulation ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                                                        <Target className="h-4 w-4" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className={`text-2xl font-bold ${showSimulation ? 'text-orange-600' : 'text-muted-foreground/30'}`}>
                                                        {showSimulation ? (simulationData[simulationData.length - 1]?.emGrade?.toFixed(1) || simulationData[simulationData.length - 1]?.simulatedGrade?.toFixed(1) || '-') : '-'}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">Nota final estimada</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Insights Inteligentes */}
                                    {/* Insights Inteligentes - Clean/Professional */}
                                    {insights.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {insights.map((insight, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`
                                                        px-4 py-3 rounded-lg border flex items-start gap-3 
                                                        ${insight.type === 'positive' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                                                            insight.type === 'negative' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                                                                insight.type === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' :
                                                                    'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                                        }
                                                    `}
                                                >
                                                    <div className={`mt-0.5 ${insight.type === 'positive' ? 'text-emerald-600 dark:text-emerald-400' :
                                                        insight.type === 'negative' ? 'text-red-600 dark:text-red-400' :
                                                            insight.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                                                'text-blue-600 dark:text-blue-400'
                                                        }`}>
                                                        <Lightbulb className="h-4 w-4" />
                                                    </div>
                                                    <div className="text-sm font-medium text-foreground/90 dark:text-foreground">
                                                        {insight.message}
                                                    </div>
                                                </div>
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
                                            {subjectTimeline.length === 0 ? (
                                                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                                                    <BookOpen className="h-10 w-10 opacity-20" />
                                                    <div>Sem notas para esta disciplina.</div>
                                                    <div className="text-xs">0 registros no período selecionado.</div>
                                                </div>
                                            ) : (
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

                                                        {/* Linha do Fundamental - Azul (Coerente com Resumo) */}
                                                        <Line
                                                            type="monotone"
                                                            dataKey="fundGrade"
                                                            stroke="#2563eb"
                                                            strokeWidth={3}
                                                            name="Fundamental"
                                                            dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                            activeDot={{ r: 7 }}
                                                            connectNulls
                                                        >
                                                            <LabelList
                                                                dataKey="fundGrade"
                                                                position="top"
                                                                offset={8}
                                                                formatter={(val: number) => val?.toFixed(1)}
                                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#2563eb' }}
                                                            />
                                                        </Line>

                                                        {/* Linha do Ensino Médio - Violeta (Coerente com Resumo) */}
                                                        <Line
                                                            type="monotone"
                                                            dataKey="emGrade"
                                                            stroke="#7c3aed"
                                                            strokeWidth={3}
                                                            name="Ensino Médio"
                                                            dot={{ r: 5, fill: '#7c3aed', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                            activeDot={{ r: 7 }}
                                                            connectNulls
                                                        >
                                                            <LabelList
                                                                dataKey="emGrade"
                                                                position="top"
                                                                offset={8}
                                                                formatter={(val: number) => val?.toFixed(1)}
                                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#7c3aed' }}
                                                            />
                                                        </Line>

                                                        {/* Avaliações Externas - Linha Laranja Independente */}
                                                        <Line
                                                            type="monotone"
                                                            dataKey="external"
                                                            stroke="#f39c12"
                                                            strokeWidth={3}
                                                            name="Aval. Externa"
                                                            dot={{ r: 5, fill: '#f39c12', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                                                            activeDot={{ r: 7 }}
                                                            connectNulls
                                                        >
                                                            <LabelList
                                                                dataKey="external"
                                                                position="top"
                                                                offset={8}
                                                                formatter={(val: number) => val?.toFixed(1)}
                                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f39c12' }}
                                                            />
                                                        </Line>

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
                                            )}
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
                                            {subjectTimeline.length === 0 ? (
                                                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                                                    <BookOpen className="h-10 w-10 opacity-20" />
                                                    <div>Sem notas para esta disciplina.</div>
                                                    <div className="text-xs">0 registros no período selecionado.</div>
                                                </div>
                                            ) : (
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
                                                            connectNulls
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
                                            )}
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
                subjects={subjectsForBatchDialog}
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

            {/* School History Bulk Edit Dialog - Synced with GradesManager UX */}
            <Dialog open={!!editingHistoryYear} onOpenChange={(open) => !open && setEditingHistoryYear(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            <span>
                                Lançar Histórico - <span className="text-muted-foreground font-normal">{editingHistoryYear}º Ano do Fundamental</span>
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Lance notas anuais para compor o histórico escolar.
                        </DialogDescription>
                    </DialogHeader>

                    {editingHistoryYear && (() => {
                        // Current Grades for this year
                        const currentGrades = studentHistorical.filter(h => h.gradeYear === editingHistoryYear && h.quarter === 'Anual');
                        const gradeMap: Record<string, string> = {};
                        currentGrades.forEach(g => {
                            if (g.subject) gradeMap[normalizeSubjectName(g.subject)] = String(g.grade);
                        });

                        // Local state handler helper (managed by parent refresh/re-render for now, 
                        // in a real refactor we might want a local state form, but here let's use direct edit via a wrapper or assume stateless for simplicity initially
                        // Actually, for a dialog form, we need local state to gather inputs THEN save. 
                        // Let's create a wrapper component inside the dialog for state? No, let's use a simple map in state or just controlled inputs created on fly.
                        // Better: Use a dedicated internal component for the form logic or refs. 
                        // For simplicity in this large file: I'll assume we can use the `gridValues` state I removed? No, let's restore a specific `historyForm` state.
                        return (
                            <HistoryForm
                                year={editingHistoryYear}
                                initialGrades={gradeMap}
                                onSave={async (grades) => {
                                    if (!selectedStudent) return;

                                    const promises = Object.entries(grades).map(async ([subject, value]) => {
                                        const grade = parseFloat(value);
                                        if (isNaN(grade)) return null;

                                        // Find existing to delete if re-saving?
                                        // The backend addHistoricalGrade usually appends or updates. The simplified hook `addHistoricalGrade` 
                                        // in `useData` context (mock) might just push. 
                                        // To be safe and clean, we might want to delete existing for this year/subject first.
                                        // But for now let's just add/update functionality.

                                        // Find logic to update:
                                        const existing = currentGrades.find(g => normalizeSubjectName(g.subject) === normalizeSubjectName(subject));
                                        if (existing) {
                                            await deleteHistoricalGrade(existing.id);
                                        }

                                        return addHistoricalGrade({
                                            studentId: selectedStudent,
                                            gradeYear: editingHistoryYear,
                                            calendarYear: new Date().getFullYear(), // Default current year for history entry
                                            quarter: 'Anual',
                                            subject: subject,
                                            grade: grade,
                                            schoolLevel: 'fundamental'
                                        });
                                    });

                                    await Promise.all(promises.filter(p => p !== null));
                                    toast({ title: "Histórico Atualizado", description: `Notas do ${editingHistoryYear}º ano salvas com sucesso.` });
                                    setEditingHistoryYear(null);
                                }}
                                onCancel={() => setEditingHistoryYear(null)}
                            />
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* External Assessment Year Management Dialog */}
            <Dialog open={!!editingExternalYear} onOpenChange={(open) => !open && setEditingExternalYear(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <span>
                                Avaliações Externas - <span className="text-muted-foreground font-normal">
                                    {editingExternalYear?.year}º {editingExternalYear?.level === 'fundamental' ? 'Ano' : 'Série EM'}
                                </span>
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Gerencie as provas externas e simulados deste ano letivo.
                        </DialogDescription>
                    </DialogHeader>

                    {editingExternalYear && (() => {
                        const currentAssessments = studentExternal.filter(e =>
                            e.schoolLevel === editingExternalYear.level &&
                            e.gradeYear === editingExternalYear.year
                        ).sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

                        return (
                            <div className="space-y-6">
                                {/* Lista de Avaliações Existentes */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Registros ({currentAssessments.length})</h4>
                                        <Button variant="outline" size="sm" onClick={() => openExternalEdit({
                                            id: '',
                                            studentId: selectedStudent!,
                                            assessmentType: 'Simulado',
                                            assessmentName: '',
                                            score: 0,
                                            maxScore: 10,
                                            appliedDate: new Date().toISOString().split('T')[0],
                                            schoolLevel: editingExternalYear.level,
                                            gradeYear: editingExternalYear.year,
                                            createdAt: '',
                                            updatedAt: ''
                                        } as any)}>
                                            <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                                            Adicionar Avaliação
                                        </Button>
                                    </div>

                                    {currentAssessments.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/10">
                                            <Target className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                                            <p className="text-muted-foreground text-sm">Nenhuma avaliação registrada neste ano.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {currentAssessments.map(assessment => (
                                                <div key={assessment.id} className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-sm transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${assessment.assessmentType === 'SAEB' ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                                                            {assessment.assessmentType === 'SAEB' ? <Target className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm">{assessment.assessmentName}</div>
                                                            <div className="text-xs text-muted-foreground flex gap-2">
                                                                <span>{formatDateInput(assessment.appliedDate)}</span>
                                                                <span>•</span>
                                                                <span>{assessment.subject || 'Geral'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="font-bold text-sm">
                                                                {assessment.score.toFixed(1)} <span className="text-muted-foreground font-normal">/ {assessment.maxScore}</span>
                                                            </div>
                                                            {assessment.quarter && (
                                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                                    {assessment.quarter.replace(' Bimestre', 'B')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openExternalEdit(assessment)}>
                                                                <Edit3 className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                                                                if (confirm('Excluir esta avaliação?')) deleteExternalAssessment(assessment.id);
                                                            }}>
                                                                <Lock className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
};

// Internal Form Component for History Dialog to handle local input state
const HistoryForm = ({ year, initialGrades, onSave, onCancel }: { year: number, initialGrades: Record<string, string>, onSave: (grades: Record<string, string>) => void, onCancel: () => void }) => {
    const [grades, setGrades] = useState<Record<string, string>>(initialGrades);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(grades);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 py-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {FUNDAMENTAL_SUBJECT_AREAS.map(area => (
                    <Card key={area.name} className="overflow-hidden h-fit">
                        <CardHeader className="py-2 px-3 bg-muted/10 border-b">
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${area.color}`}>{area.name}</h4>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                            {area.subjects.map(subject => {
                                const normSub = normalizeSubjectName(subject);
                                // Find key in initialGrades that matches normalized
                                const initialKey = Object.keys(initialGrades).find(k => k === normSub);
                                const val = grades[normSub] ?? (initialKey ? initialGrades[initialKey] : '');

                                const numVal = parseFloat(val);
                                const isLow = !isNaN(numVal) && numVal < 6;

                                return (
                                    <div key={subject} className="space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <Label className="text-xs text-muted-foreground" title={subject}>{subject}</Label>
                                            {val && !isNaN(numVal) && (
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                            )}
                                        </div>
                                        <Input
                                            className={`h-9 font-mono text-center transition-all ${val ? (isLow ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : ''
                                                }`}
                                            placeholder="-"
                                            value={val}
                                            onChange={e => setGrades(prev => ({ ...prev, [normSub]: e.target.value }))}
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.1"
                                        />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Histórico ({year}º Ano)
                </Button>
            </DialogFooter>
        </div>
    );
};

export default StudentTrajectory;
