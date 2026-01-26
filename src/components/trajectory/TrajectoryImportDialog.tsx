import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
    Upload,
    FileText,
    Loader2,
    BookOpen,
    Settings,
    Users,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    TrendingUp,
    History
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useClasses, useStudents, useHistoricalGrades } from '@/hooks/useData';
import {
    processTrajectoryFile,
    TrajectoryParseResult,
    ImportableHistoricalGrade,
    calculateNameSimilarity
} from '@/lib/trajectoryParser';

interface StudentMatch {
    fileStudentName: string;
    systemStudentId: string | null;
    similarity: number;
    isManual: boolean;
}

interface TrajectoryImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TrajectoryImportDialog = ({
    open,
    onOpenChange,
}: TrajectoryImportDialogProps) => {
    const { classes } = useClasses();
    const { students } = useStudents();
    const { addHistoricalGradesBatch, clearHistoricalGradesForStudents, historicalGrades } = useHistoricalGrades();

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const { toast } = useToast();

    const [step, setStep] = useState<'upload' | 'match-students' | 'preview'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [importPhase, setImportPhase] = useState<'deleting' | 'importing'>('importing');
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [parseResult, setParseResult] = useState<TrajectoryParseResult | null>(null);
    const [studentMatches, setStudentMatches] = useState<StudentMatch[]>([]);
    const [importableGrades, setImportableGrades] = useState<ImportableHistoricalGrade[]>([]);
    const [calendarYearBase, setCalendarYearBase] = useState(new Date().getFullYear());

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isValidFormat = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');

        if (!isValidFormat) {
            toast({
                title: 'Formato inválido',
                description: 'Por favor, selecione um arquivo XLS ou XLSX.',
                variant: 'destructive',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await processTrajectoryFile(file);

            if (result.success) {
                toast({
                    title: 'Excel processado com sucesso',
                    description: `${result.rows.length} alunos e ${result.subjects.length} disciplinas encontradas (anos ${result.years.join(', ')})`,
                });

                // Preparar matches - filtrar por turma se selecionada
                const uniqueStudentNames = Array.from(new Set(result.rows.map(r => r.studentName)));
                const filteredStudents = selectedClassId
                    ? students.filter(s => s.classId === selectedClassId)
                    : students;

                const matches: StudentMatch[] = uniqueStudentNames.map(fileStudentName => {
                    let bestMatch: { student: typeof students[0], score: number } | null = null;

                    for (const student of filteredStudents) {
                        const score = calculateNameSimilarity(fileStudentName, student.name);
                        if (!bestMatch || score > bestMatch.score) {
                            bestMatch = { student, score };
                        }
                    }

                    return {
                        fileStudentName,
                        systemStudentId: (bestMatch && bestMatch.score >= 0.6) ? bestMatch.student.id : null,
                        similarity: bestMatch ? bestMatch.score : 0,
                        isManual: false
                    };
                });

                // Ordenar: primeiro os com menor score
                matches.sort((a, b) => {
                    if (a.similarity < 0.9 && b.similarity >= 0.9) return -1;
                    if (a.similarity >= 0.9 && b.similarity < 0.9) return 1;
                    return a.fileStudentName.localeCompare(b.fileStudentName);
                });

                setStudentMatches(matches);
                setParseResult(result);
                setStep('match-students');
            } else {
                toast({
                    title: 'Erro ao processar Excel',
                    description: result.errors.join(', '),
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível processar o arquivo.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const updateMatch = (index: number, systemStudentId: string | null) => {
        setStudentMatches(prev => prev.map((m, i) => {
            if (i === index) {
                return { ...m, systemStudentId, isManual: true };
            }
            return m;
        }));
    };

    const handleConfirmMatches = () => {
        if (!parseResult) return;

        const grades: ImportableHistoricalGrade[] = [];

        for (const row of parseResult.rows) {
            const match = studentMatches.find(m => m.fileStudentName === row.studentName);
            const systemStudent = match?.systemStudentId ? students.find(s => s.id === match.systemStudentId) : null;

            for (const [yearStr, subjects] of Object.entries(row.grades)) {
                const year = parseInt(yearStr);
                const calendarYear = calendarYearBase - (9 - year) - 1;

                for (const [subject, grade] of Object.entries(subjects)) {
                    if (grade !== null && grade !== undefined) {
                        grades.push({
                            studentId: systemStudent?.id || '',
                            studentName: systemStudent?.name || '',
                            extractedName: row.studentName,
                            similarity: match?.similarity || 0,
                            schoolLevel: 'fundamental',
                            gradeYear: year,
                            subject,
                            quarter: 'Anual',
                            grade,
                            calendarYear,
                            selected: !!systemStudent
                        });
                    }
                }
            }
        }

        if (grades.length === 0) {
            toast({
                title: 'Nenhuma nota encontrada',
                description: 'Não foi possível encontrar notas válidas para importar.',
                variant: 'destructive',
            });
            return;
        }

        setImportableGrades(grades);
        setStep('preview');
    };

    const handleToggleGrade = (index: number) => {
        setImportableGrades(prev =>
            prev.map((g, i) => i === index ? { ...g, selected: !g.selected } : g)
        );
    };

    const handleSelectAll = (selected: boolean) => {
        setImportableGrades(prev => prev.map(g => g.studentId ? { ...g, selected } : g));
    };

    const handleImport = async () => {
        const toImport = importableGrades.filter(g => g.selected && g.studentId);

        if (toImport.length === 0) {
            toast({
                title: 'Nenhuma nota selecionada',
                description: 'Selecione pelo menos uma nota para importar.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true);
        setImportProgress({ current: 0, total: toImport.length });

        let imported = 0;
        let errors = 0;

        try {
            // Se a opção de substituir estiver ativa, limpar dados existentes para os alunos selecionados
            if (replaceExisting) {
                setImportPhase('deleting');
                const studentIdsToClear = Array.from(new Set(toImport.map(g => g.studentId)));

                try {
                    await clearHistoricalGradesForStudents(studentIdsToClear, 'fundamental');
                } catch (error) {
                    console.error('Erro ao limpar dados existentes:', error);
                    toast({
                        title: 'Erro ao limpar dados',
                        description: 'Não foi possível remover os dados existentes. A importação continuará.',
                        variant: 'destructive',
                    });
                }
            }

            setImportPhase('importing');
            // Reduzido para 50 para total estabilidade com Supabase (padrão SIGE)
            const BATCH_SIZE = 50;
            const totalRecords = toImport.length;

            try {
                for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
                    const chunk = toImport.slice(i, i + BATCH_SIZE);
                    const batch = chunk.map(grade => ({
                        studentId: grade.studentId,
                        schoolLevel: grade.schoolLevel,
                        gradeYear: grade.gradeYear,
                        subject: grade.subject,
                        quarter: grade.quarter,
                        grade: grade.grade,
                        calendarYear: grade.calendarYear
                    }));

                    try {
                        const savedBatch = await addHistoricalGradesBatch(batch);
                        imported += savedBatch.length;

                        // Atualizar progresso de forma granular
                        setImportProgress({
                            current: Math.min(i + chunk.length, totalRecords),
                            total: totalRecords
                        });
                    } catch (error) {
                        console.error('Erro ao importar lote:', error);
                        errors += batch.length;
                    }
                }
            } catch (error) {
                console.error('Erro crítico na importação:', error);
                errors = toImport.length;
            } finally {
                setIsImporting(false);
            }

            if (errors > 0) {
                toast({
                    title: 'Importação parcial',
                    description: `${imported} notas importadas, ${errors} erros detectados nos lotes.`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Importação concluída!',
                    description: `${imported} notas históricas importadas com sucesso em lotes.`,
                });
            }

            onOpenChange(false);
            resetState();
        } catch (error) {
            console.error('Erro crítico no handleImport:', error);
            setIsImporting(false);
        }
    };

    const resetState = () => {
        setStep('upload');
        setParseResult(null);
        setStudentMatches([]);
        setImportableGrades([]);
        setIsProcessing(false);
        setIsImporting(false);
        setSelectedClassId('');
    };

    const handleClose = () => {
        if (!isImporting) {
            onOpenChange(false);
            resetState();
        }
    };

    // Estatísticas
    const stats = useMemo(() => {
        const matched = studentMatches.filter(m => m.systemStudentId).length;
        const unmatched = studentMatches.length - matched;
        const selectedGrades = importableGrades.filter(g => g.selected).length;
        return { matched, unmatched, selectedGrades, totalGrades: importableGrades.length };
    }, [studentMatches, importableGrades]);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        Importar Histórico Escolar
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                        Importe notas do 6º ao 9º ano (Ensino Fundamental) a partir de planilha Excel.
                    </DialogDescription>
                </DialogHeader>

                {/* Stepper Visual */}
                <div className="px-6 py-4 bg-muted/20 border-b">
                    <div className="flex items-center justify-between relative max-w-lg mx-auto">
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted-foreground/20 -z-10" />

                        {/* Step 1 */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'upload' ? 'border-primary' : 'border-muted-foreground/20'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Settings className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>Configuração</span>
                        </div>

                        {/* Step 2 */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'match-students' ? 'border-primary' : (['match-students', 'preview'].includes(step) ? 'border-emerald-500/50' : 'border-muted-foreground/20')}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'match-students' ? 'bg-primary text-primary-foreground' : (['match-students', 'preview'].includes(step) ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}`}>
                                <Users className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'match-students' ? 'text-primary' : 'text-muted-foreground'}`}>Vinculação</span>
                        </div>

                        {/* Step 3 */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'preview' ? 'border-primary' : 'border-muted-foreground/20'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'preview' ? 'text-primary' : 'text-muted-foreground'}`}>Conclusão</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {/* Step: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Turma de Referência</Label>
                                    <Select value={selectedClassId || '_all'} onValueChange={v => setSelectedClassId(v === '_all' ? '' : v)}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Todas as turmas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_all">Todas as turmas</SelectItem>
                                            {classes.filter(c => c.active).map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Filtra os alunos para facilitar a vinculação automática de nomes.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Ano Base (Calendário)</Label>
                                    <Select value={String(calendarYearBase)} onValueChange={v => setCalendarYearBase(parseInt(v))}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Usado para calcular em que ano o aluno cursou cada série (ex: 9º em {calendarYearBase}).
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label className="text-base font-semibold text-foreground">Modo de Importação</Label>
                                <RadioGroup
                                    value={replaceExisting ? "replace" : "append"}
                                    onValueChange={(v) => setReplaceExisting(v === "replace")}
                                    className="grid gap-4"
                                >
                                    <div className={`flex items-start space-x-3 border rounded-xl p-4 cursor-pointer transition-all ${!replaceExisting ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/30 border-muted'}`} onClick={() => setReplaceExisting(false)}>
                                        <RadioGroupItem value="append" id="mode-append" className="mt-1" />
                                        <div className="space-y-1">
                                            <Label htmlFor="mode-append" className="text-base font-medium cursor-pointer">
                                                Adição Incremental <span className="text-xs font-normal text-muted-foreground ml-2">(Recomendado)</span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Adiciona as novas notas e atualiza as correspondentes. O histórico que não estiver na planilha será <strong>preservado</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`flex items-start space-x-3 border rounded-xl p-4 cursor-pointer transition-all ${replaceExisting ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50/50 dark:bg-orange-950/20' : 'hover:bg-orange-50/30 border-orange-200 dark:border-orange-800/30'}`} onClick={() => setReplaceExisting(true)}>
                                        <RadioGroupItem value="replace" id="mode-replace" className="mt-1 border-orange-500 text-orange-600" />
                                        <div className="space-y-1">
                                            <Label htmlFor="mode-replace" className="text-base font-medium text-orange-900 dark:text-orange-200 cursor-pointer">
                                                Substituição Total
                                            </Label>
                                            <p className="text-sm text-orange-800/80 dark:text-orange-300/80 leading-relaxed">
                                                ⚠️ <strong>Apaga todo o histórico</strong> (6º ao 9º ano) dos alunos vinculados antes de importar. Use apenas se quiser reescrever completamente os dados.
                                            </p>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-base">Arquivo de Dados</Label>
                                <div className="border-2 border-dashed rounded-xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer group bg-muted/20 relative overflow-hidden">
                                    <input
                                        type="file"
                                        accept=".xls,.xlsx"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        id="trajectory-file-input"
                                        disabled={isProcessing}
                                    />

                                    {isProcessing ? (
                                        <div className="flex flex-col items-center gap-4 py-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                                                <div className="bg-background rounded-full p-4 relative shadow-sm border">
                                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-lg text-foreground">Processando arquivo...</p>
                                                <p className="text-sm text-muted-foreground">Analisando estrutura e buscando alunos...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 py-4">
                                            <div className="bg-background rounded-full p-4 shadow-sm border group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/30">
                                                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                                                    Clique ou arraste o arquivo aqui
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Suporte para XLS ou XLSX (Modelo Processo Seletivo)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step: Match Students */}
                    {step === 'match-students' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Resumo da Vinculação</p>
                                        <p className="text-xs text-muted-foreground">{stats.matched} alunos encontrados automaticamente</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="bg-background">{stats.matched} Vinculados</Badge>
                                    {stats.unmatched > 0 && (
                                        <Badge variant="destructive">{stats.unmatched} Pendentes</Badge>
                                    )}
                                </div>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-lg bg-background">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40%] font-semibold">Nome no Arquivo</TableHead>
                                            <TableHead className="w-[40%] font-semibold">Aluno no Sistema</TableHead>
                                            <TableHead className="w-[20%] font-semibold">Similaridade</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentMatches.map((match, index) => (
                                            <TableRow key={index} className={!match.systemStudentId ? 'bg-red-50/30 dark:bg-red-900/10' : ''}>
                                                <TableCell className="py-3">
                                                    <span className="font-medium text-sm">{match.fileStudentName}</span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Select
                                                        value={match.systemStudentId || '_none'}
                                                        onValueChange={(v) => updateMatch(index, v === '_none' ? null : v)}
                                                    >
                                                        <SelectTrigger className={`w-full h-9 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted/50 justify-start text-left ${!match.systemStudentId ? 'text-muted-foreground italic' : ''}`}>
                                                            <div className="flex items-center gap-2 overflow-hidden w-full">
                                                                {match.systemStudentId ? (
                                                                    <>
                                                                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] uppercase shrink-0 font-bold">
                                                                            {students.find(s => s.id === match.systemStudentId)?.name.substring(0, 2)}
                                                                        </div>
                                                                        <span className="truncate">{students.find(s => s.id === match.systemStudentId)?.name}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-destructive truncate">Não vinculado (Ignorar)</span>
                                                                )}
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent align="start" className="w-[300px]">
                                                            <SelectItem value="_none" className="text-muted-foreground italic">
                                                                -- Não vincular (Ignorar) --
                                                            </SelectItem>
                                                            {(selectedClassId ? students.filter(s => s.classId === selectedClassId) : students).map(s => (
                                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {match.similarity >= 0.9 ? (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            {Math.round(match.similarity * 100)}% Match
                                                        </Badge>
                                                    ) : match.similarity >= 0.6 ? (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                            {Math.round(match.similarity * 100)}% Incerto
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                            Sem Match ({Math.round(match.similarity * 100)}%)
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Step: Preview */}
                    {step === 'preview' && (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                        {importableGrades.length}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Notas</span>
                                </div>
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                                        {stats.selectedGrades}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selecionadas</span>
                                </div>
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                                        {new Set(importableGrades.filter(g => g.selected).map(g => g.studentId)).size}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alunos</span>
                                </div>
                                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                                        {new Set(importableGrades.filter(g => g.selected).map(g => g.subject)).size}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disciplinas</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center px-1">
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleSelectAll(false)}>
                                        Desmarcar Todas
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleSelectAll(true)}>
                                        Selecionar Todas
                                    </Button>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    Revise as notas antes de confirmar a importação.
                                </span>
                            </div>

                            <ScrollArea className="h-[350px] border rounded-lg bg-background">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-10 text-center"></TableHead>
                                            <TableHead className="font-semibold">Aluno</TableHead>
                                            <TableHead className="font-semibold">Ano Escolar</TableHead>
                                            <TableHead className="font-semibold">Disciplina</TableHead>
                                            <TableHead className="text-right font-semibold">Nota</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importableGrades.map((grade, index) => (
                                            <TableRow key={index} className={!grade.selected ? 'opacity-50 grayscale' : 'hover:bg-muted/30'}>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={grade.selected}
                                                        onCheckedChange={() => handleToggleGrade(index)}
                                                        className="translate-y-[2px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{grade.studentName || grade.extractedName}</span>
                                                        {grade.studentName && grade.studentName !== grade.extractedName && (
                                                            <span className="text-[10px] text-muted-foreground">de "{grade.extractedName}"</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{grade.gradeYear}º ano ({grade.calendarYear})</TableCell>
                                                <TableCell className="text-sm">{grade.subject}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className={`font-mono ${grade.grade < 6 ? 'text-red-500 border-red-200 bg-red-50' : 'text-slate-700 bg-slate-50'}`}>
                                                        {grade.grade.toFixed(1)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Progress */}
                    {isImporting && (
                        <div className="mt-6 p-4 border rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                            <div className="flex justify-between items-center text-sm font-medium mb-2">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                        {importPhase === 'deleting' ? 'Limpando dados antigos...' : 'Importando notas...'}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{importProgress.current} / {importProgress.total}</span>
                            </div>
                            <Progress value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} className="h-2 bg-blue-100 dark:bg-blue-900/30" />
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
                    <Button variant="ghost" onClick={handleClose} disabled={isImporting} className="text-muted-foreground hover:text-foreground">
                        Cancelar
                    </Button>

                    <div className="flex gap-2">
                        {step === 'match-students' && (
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Voltar
                            </Button>
                        )}

                        {step === 'preview' && (
                            <Button variant="outline" onClick={() => setStep('match-students')} disabled={isImporting}>
                                Voltar
                            </Button>
                        )}

                        {step === 'match-students' && (
                            <Button onClick={handleConfirmMatches} disabled={stats.matched === 0} className="bg-primary hover:bg-primary/90">
                                Continuar ({stats.matched}) <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}

                        {step === 'preview' && (
                            <Button onClick={handleImport} disabled={isImporting || stats.selectedGrades === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]">
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Importar {stats.selectedGrades} Notas
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
