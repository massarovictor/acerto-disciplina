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
    BookOpen
} from 'lucide-react';
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Importar Notas Históricas do Fundamental
                    </DialogTitle>
                    <DialogDescription>
                        Importe notas do 6º ao 9º ano a partir de planilha Excel (Processo Seletivo)
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    {/* Step: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4 p-4">
                            <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertTitle>Formato esperado</AlertTitle>
                                <AlertDescription>
                                    Planilha Excel do Processo Seletivo com colunas: NOME COMPLETO, e notas no formato "DISCIPLINA - Xº ANO"
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label>Turma (opcional - filtra alunos para vinculação)</Label>
                                <Select value={selectedClassId || '_all'} onValueChange={v => setSelectedClassId(v === '_all' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas as turmas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all">Todas as turmas</SelectItem>
                                        {classes.filter(c => c.active).map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Selecione uma turma para facilitar a vinculação dos nomes do arquivo com os alunos do sistema
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Ano base para cálculo do calendário</Label>
                                <Select value={String(calendarYearBase)} onValueChange={v => setCalendarYearBase(parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Se o aluno está no 9º ano em {calendarYearBase}, as notas do 6º ano serão de {calendarYearBase - 4}
                                </p>
                            </div>

                            {/* Opção de substituir notas - Estilo SIGE */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 mb-4">
                                <div className="space-y-1 flex-1 pr-4">
                                    <Label className="text-base font-medium">
                                        Substituir dados existentes
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {replaceExisting
                                            ? "Todas as notas antigas (6º ao 9º) dos alunos vinculados serão deletadas e substituídas pelas novas"
                                            : "As notas do arquivo serão adicionadas/atualizadas mantendo as existentes"
                                        }
                                    </p>
                                </div>
                                <Checkbox
                                    checked={replaceExisting}
                                    onCheckedChange={(checked) => setReplaceExisting(!!checked)}
                                    className="h-5 w-5"
                                />
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="trajectory-file-input"
                                    disabled={isProcessing}
                                />
                                <label htmlFor="trajectory-file-input" className="cursor-pointer">
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                            <span>Processando arquivo...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="h-12 w-12 text-muted-foreground" />
                                            <span className="font-medium">Clique para selecionar arquivo</span>
                                            <span className="text-sm text-muted-foreground">XLS ou XLSX</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step: Match Students */}
                    {step === 'match-students' && (
                        <div className="space-y-4 p-4">
                            <div className="flex gap-2">
                                <Badge variant="outline">{stats.matched} vinculados</Badge>
                                {stats.unmatched > 0 && (
                                    <Badge variant="destructive">{stats.unmatched} não vinculados</Badge>
                                )}
                            </div>

                            <ScrollArea className="h-[400px] border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome no Arquivo</TableHead>
                                            <TableHead>Aluno no Sistema</TableHead>
                                            <TableHead className="w-24">Match</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentMatches.map((match, index) => (
                                            <TableRow key={index} className={!match.systemStudentId ? 'bg-red-50' : ''}>
                                                <TableCell className="font-medium">{match.fileStudentName}</TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={match.systemStudentId || '_none'}
                                                        onValueChange={(v) => updateMatch(index, v === '_none' ? null : v)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Selecionar aluno..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="_none">— Não vincular —</SelectItem>
                                                            {(selectedClassId ? students.filter(s => s.classId === selectedClassId) : students).map(s => (
                                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {match.similarity >= 0.9 ? (
                                                        <Badge className="bg-green-100 text-green-800">{Math.round(match.similarity * 100)}%</Badge>
                                                    ) : match.similarity >= 0.6 ? (
                                                        <Badge className="bg-yellow-100 text-yellow-800">{Math.round(match.similarity * 100)}%</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">{Math.round(match.similarity * 100)}%</Badge>
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
                        <div className="space-y-4 p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <Badge variant="outline">{stats.selectedGrades} selecionadas</Badge>
                                    <Badge variant="secondary">{stats.totalGrades} total</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleSelectAll(true)}>
                                        Selecionar Todas
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleSelectAll(false)}>
                                        Desmarcar Todas
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Aluno</TableHead>
                                            <TableHead>Ano</TableHead>
                                            <TableHead>Disciplina</TableHead>
                                            <TableHead className="text-right">Nota</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importableGrades.map((grade, index) => (
                                            <TableRow key={index} className={!grade.studentId ? 'opacity-50' : ''}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={grade.selected}
                                                        onCheckedChange={() => handleToggleGrade(index)}
                                                        disabled={!grade.studentId}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{grade.studentName || grade.extractedName}</span>
                                                        {grade.studentName && grade.studentName !== grade.extractedName && (
                                                            <span className="text-xs text-muted-foreground">{grade.extractedName}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{grade.gradeYear}º ano</TableCell>
                                                <TableCell>{grade.subject}</TableCell>
                                                <TableCell className="text-right font-bold">{grade.grade.toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Progress */}
                    {isImporting && (
                        <div className="space-y-2 p-4 border-t bg-muted/30">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span>
                                        {importPhase === 'deleting' ? 'Limpando dados antigos...' : 'Importando notas...'}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{importProgress.current} / {importProgress.total}</span>
                            </div>
                            <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === 'match-students' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                            <Button onClick={handleConfirmMatches} disabled={stats.matched === 0}>
                                Continuar ({stats.matched} alunos)
                            </Button>
                        </>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('match-students')}>Voltar</Button>
                            <Button onClick={handleImport} disabled={isImporting || stats.selectedGrades === 0}>
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Importando...
                                    </>
                                ) : (
                                    `Importar ${stats.selectedGrades} notas`
                                )}
                            </Button>
                        </>
                    )}
                    {step === 'upload' && (
                        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
