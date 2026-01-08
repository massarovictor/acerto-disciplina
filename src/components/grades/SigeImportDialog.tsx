import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClasses, useStudents, useGrades, useProfessionalSubjects } from '@/hooks/useData';
import { QUARTERS, getAllSubjects } from '@/lib/subjects';
import {
    processSigeFile,
    ImportableGrade,
    SigeParseResult,
    calculateNameSimilarity
} from '@/lib/sigeParser';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface StudentMatch {
    fileStudentName: string;
    systemStudentId: string | null;
    similarity: number;
    isManual: boolean;
}

interface SigeImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SigeImportDialog = ({ open, onOpenChange }: SigeImportDialogProps) => {
    const { classes } = useClasses();
    const { students } = useStudents();
    const { addGrade, deleteGrade, grades: existingGrades } = useGrades();
    const { professionalSubjects } = useProfessionalSubjects();
    const { toast } = useToast();

    const [step, setStep] = useState<'configure' | 'upload' | 'match-students' | 'review-subjects' | 'preview'>('configure');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importPhase, setImportPhase] = useState<'deleting' | 'importing'>('importing');
    const [parseResult, setParseResult] = useState<SigeParseResult | null>(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
    const [replaceExisting, setReplaceExisting] = useState(true); // Por padrão, substituir
    const [importableGrades, setImportableGrades] = useState<ImportableGrade[]>([]);
    const [studentMatches, setStudentMatches] = useState<StudentMatch[]>([]);

    const activeClasses = classes.filter(c => !c.archived && c.active);

    // Função para obter disciplinas válidas de uma turma
    const getValidSubjectsForClass = (classId: string): string[] => {
        // Disciplinas da Base Nacional Comum (ENEM)
        const baseSubjects = getAllSubjects();
        
        // Disciplinas Profissionais da turma (verificar se existe antes de filtrar)
        const classSubjects = (professionalSubjects || [])
            .filter(ps => ps.classId === classId)
            .map(ps => ps.subject);
        
        // Combinar ambas (sem duplicatas)
        const allValidSubjects = [...new Set([...baseSubjects, ...classSubjects])];
        
        return allValidSubjects;
    };

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

        setStep('upload');
        setParseResult(null);
        setImportableGrades([]);
        setStudentMatches([]);
        setIsProcessing(true);
        try {
            const result = await processSigeFile(file);

            if (result.success) {
                const subjectsSummary = result.subjects.length <= 5 
                    ? result.subjects.join(', ')
                    : `${result.subjects.slice(0, 5).join(', ')}... (+${result.subjects.length - 5})`;
                    
                toast({
                    title: 'Excel processado com sucesso',
                    description: `${result.rows.length} alunos e ${result.subjects.length} disciplinas encontradas: ${subjectsSummary}`,
                });
                console.log('[INFO] Disciplinas encontradas no Excel:', result.subjects);

                // Preparar matches imediatamente com o resultado
                if (selectedClass) {
                    const classStudents = students.filter(s => s.classId === selectedClass);
                    const uniqueStudentNames = Array.from(new Set(result.rows.map(r => r.studentName)));

                    const matches: StudentMatch[] = uniqueStudentNames.map(fileStudentName => {
                        let bestMatch: { student: typeof classStudents[0], score: number } | null = null;

                        for (const student of classStudents) {
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

                    // Ordenar
                    matches.sort((a, b) => {
                        if (a.similarity < 0.9 && b.similarity >= 0.9) return -1;
                        if (a.similarity >= 0.9 && b.similarity < 0.9) return 1;
                        return a.fileStudentName.localeCompare(b.fileStudentName);
                    });

                    setStudentMatches(matches);
                }

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

    const handlePrepareMatching = () => {
        if (!parseResult || !selectedClass) return;

        const classStudents = students.filter(s => s.classId === selectedClass);

        // Agrupar linhas por nome de aluno para criar matches únicos
        const uniqueStudentNames = Array.from(new Set(parseResult.rows.map(r => r.studentName)));

        const matches: StudentMatch[] = uniqueStudentNames.map(fileStudentName => {
            // Encontrar melhor match
            let bestMatch: { student: typeof classStudents[0], score: number } | null = null;

            for (const student of classStudents) {
                const score = calculateNameSimilarity(fileStudentName, student.name);
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { student, score };
                }
            }

            // Auto-selecionar se score >= 0.6 (já que temos validação manual agora, podemos ser mais lenientes na sugestão)
            return {
                fileStudentName,
                systemStudentId: (bestMatch && bestMatch.score >= 0.6) ? bestMatch.student.id : null,
                similarity: bestMatch ? bestMatch.score : 0,
                isManual: false
            };
        });

        // Ordenar: primeiro os com menor score (para atenção), depois alfabético
        matches.sort((a, b) => {
            if (a.similarity < 0.9 && b.similarity >= 0.9) return -1;
            if (a.similarity >= 0.9 && b.similarity < 0.9) return 1;
            return a.fileStudentName.localeCompare(b.fileStudentName);
        });

        setStudentMatches(matches);
        setStep('match-students');
    };

    const handleConfirmMatches = () => {
        // Ir para o passo de revisão de disciplinas
        setStep('review-subjects');
    };

    const handleConfirmSubjects = () => {
        if (!parseResult) return;

        const classStudents = students.filter(s => s.classId === selectedClass);
        const validSubjects = getValidSubjectsForClass(selectedClass);
        const grades: ImportableGrade[] = [];

        // 📊 ESTATÍSTICAS DE DEBUG
        let totalNotasNoArquivo = 0;
        let notasDescartadasPorAluno = 0;
        let notasDescartadasPorDisciplina = 0;
        let notasDescartadasPorValorInvalido = 0;
        let notasValidas = 0;

        // Para cada match confirmado
        for (const match of studentMatches) {
            const systemStudent = classStudents.find(s => s.id === match.systemStudentId);
            
            // Encontrar TODAS as linhas de notas para este nome do arquivo
            const studentRows = parseResult.rows.filter(r => r.studentName === match.fileStudentName);

            for (const row of studentRows) {
                for (const [subject, grade] of Object.entries(row.grades)) {
                    totalNotasNoArquivo++;

                    // Verificar por que a nota seria descartada
                    if (!match.systemStudentId || !systemStudent) {
                        notasDescartadasPorAluno++;
                        continue;
                    }

                    if (grade === null || grade < 0 || grade > 10) {
                        notasDescartadasPorValorInvalido++;
                        continue;
                    }

                    if (!validSubjects.includes(subject)) {
                        notasDescartadasPorDisciplina++;
                        continue;
                    }

                    // ✅ Nota válida!
                    notasValidas++;
                    grades.push({
                        studentId: systemStudent.id,
                        studentName: systemStudent.name,
                        extractedName: match.fileStudentName,
                        similarity: match.similarity,
                        classId: selectedClass,
                        subject,
                        quarter: selectedQuarter,
                        grade,
                        selected: true,
                    });
                }
            }
        }

        // 📊 LOG DETALHADO
        console.log('=== ESTATÍSTICAS DE IMPORTAÇÃO ===');
        console.log(`📝 Total de notas no arquivo: ${totalNotasNoArquivo}`);
        console.log(`✅ Notas válidas: ${notasValidas}`);
        console.log(`❌ Descartadas por aluno não identificado: ${notasDescartadasPorAluno}`);
        console.log(`❌ Descartadas por disciplina não cadastrada: ${notasDescartadasPorDisciplina}`);
        console.log(`❌ Descartadas por valor inválido (nulo/fora de 0-10): ${notasDescartadasPorValorInvalido}`);
        console.log(`📊 Taxa de aproveitamento: ${((notasValidas / totalNotasNoArquivo) * 100).toFixed(1)}%`);

        if (grades.length === 0) {
            toast({
                title: 'Nenhuma nota válida encontrada',
                description: `${totalNotasNoArquivo} notas no arquivo: ${notasDescartadasPorAluno} sem aluno, ${notasDescartadasPorDisciplina} sem disciplina, ${notasDescartadasPorValorInvalido} inválidas.`,
                variant: 'destructive',
            });
            return;
        }

        // Mostrar resumo ao usuário
        const descartadas = totalNotasNoArquivo - notasValidas;
        if (descartadas > 0) {
            toast({
                title: '⚠️ Algumas notas foram descartadas',
                description: `${notasValidas} de ${totalNotasNoArquivo} notas serão importadas. ${descartadas} descartadas (veja console para detalhes).`,
                variant: 'default',
            });
        }

        setImportableGrades(grades);
        setStep('preview');
    };

    const updateMatch = (index: number, systemStudentId: string | null) => {
        setStudentMatches(prev => prev.map((m, i) => {
            if (i === index) {
                return { ...m, systemStudentId, isManual: true };
            }
            return m;
        }));
    };

    const handleToggleGrade = (index: number) => {
        setImportableGrades(prev =>
            prev.map((g, i) => i === index ? { ...g, selected: !g.selected } : g)
        );
    };

    const handleSelectAll = (selected: boolean) => {
        setImportableGrades(prev => prev.map(g => ({ ...g, selected })));
    };

    const handleImport = async () => {
        const toImport = importableGrades.filter(g => g.selected);

        if (toImport.length === 0) {
            toast({
                title: 'Nenhuma nota selecionada',
                description: 'Selecione pelo menos uma nota para importar.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true);

        let imported = 0;
        let updated = 0;
        let deleted = 0;
        let errors = 0;

        try {
            // ETAPA 1: Se replaceExisting, deletar TODAS as notas da turma + bimestre (EM LOTES PARALELOS)
            if (replaceExisting) {
                const gradesToDelete = existingGrades.filter(
                    g => g.classId === selectedClass && g.quarter === selectedQuarter
                );
                
                setImportPhase('deleting');
                setImportProgress({ current: 0, total: gradesToDelete.length });
                
                console.log(`🗑️ Deletando ${gradesToDelete.length} notas antigas...`);
                
                const DELETE_BATCH_SIZE = 50; // Deletar 50 por vez em paralelo
                const deleteBatches = [];
                
                for (let i = 0; i < gradesToDelete.length; i += DELETE_BATCH_SIZE) {
                    deleteBatches.push(gradesToDelete.slice(i, i + DELETE_BATCH_SIZE));
                }

                for (let batchIndex = 0; batchIndex < deleteBatches.length; batchIndex++) {
                    const batch = deleteBatches[batchIndex];
                    
                    // Deletar TODAS as notas do lote em PARALELO
                    const deletePromises = batch.map(async (grade) => {
                        try {
                            await deleteGrade(grade.id);
                            deleted++;
                            return { success: true };
                        } catch (error) {
                            console.error(`Erro ao deletar nota:`, error);
                            errors++;
                            return { success: false, error };
                        }
                    });

                    await Promise.all(deletePromises);
                    
                    // Atualizar progresso após cada lote
                    const deletedCount = Math.min((batchIndex + 1) * DELETE_BATCH_SIZE, gradesToDelete.length);
                    setImportProgress({ current: deletedCount, total: gradesToDelete.length });
                }
                
                console.log(`✅ ${deleted} notas antigas deletadas`);
            }

            // ETAPA 2: Importar as novas notas (EM LOTES PARALELOS para velocidade)
            setImportPhase('importing');
            setImportProgress({ current: 0, total: toImport.length });

            const BATCH_SIZE = 50; // Processar 50 notas por vez em paralelo
            const batches = [];
            
            for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
                batches.push(toImport.slice(i, i + BATCH_SIZE));
            }

            console.log(`⚡ Processando ${toImport.length} notas em ${batches.length} lotes de ${BATCH_SIZE}`);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                
                // Processar TODAS as notas do lote em PARALELO
                const batchPromises = batch.map(async (grade) => {
                    try {
                        // Se não está substituindo, verificar se existe
                        const existing = !replaceExisting ? existingGrades.find(
                            g => g.studentId === grade.studentId &&
                                g.subject === grade.subject &&
                                g.quarter === grade.quarter &&
                                g.classId === grade.classId
                        ) : null;

                        await addGrade({
                            studentId: grade.studentId,
                            classId: grade.classId,
                            subject: grade.subject,
                            quarter: grade.quarter,
                            grade: grade.grade,
                        });
                        
                        if (existing) {
                            updated++;
                        } else {
                            imported++;
                        }
                        
                        return { success: true };
                    } catch (error) {
                        console.error(`Erro ao importar nota:`, error);
                        errors++;
                        return { success: false, error };
                    }
                });

                // Aguardar TODAS as notas do lote serem processadas
                await Promise.all(batchPromises);
                
                // Atualizar progresso após cada lote
                const processedCount = Math.min((batchIndex + 1) * BATCH_SIZE, toImport.length);
                setImportProgress({ 
                    current: processedCount, 
                    total: toImport.length 
                });
            }
            
            console.log(`✅ Importação concluída: ${imported} importadas, ${updated} atualizadas, ${errors} erros`);
        } finally {
            setIsImporting(false);
        }

        if (errors > 0) {
            toast({
                title: 'Importação concluída com erros',
                description: replaceExisting 
                    ? `${deleted} deletada(s), ${imported} importada(s), ${errors} erro(s).`
                    : `${imported} importada(s), ${updated} atualizada(s), ${errors} erro(s).`,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Importação concluída com sucesso',
                description: replaceExisting
                    ? `${deleted} nota(s) antiga(s) removida(s), ${imported} nota(s) nova(s) importada(s).`
                    : `${imported} nota(s) importada(s), ${updated} nota(s) atualizada(s).`,
            });
        }

        // Reset e fechar
        setStep('configure');
        setParseResult(null);
        setImportableGrades([]);
        setStudentMatches([]);
        onOpenChange(false);
    };

    const handleClose = () => {
        setStep('configure');
        setParseResult(null);
        setImportableGrades([]);
        setStudentMatches([]);
        onOpenChange(false);
    };

    const selectedGradesCount = importableGrades.filter(g => g.selected).length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Importar Notas do SIGE
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'configure' && 'Selecione a turma e o bimestre, depois faça o upload do arquivo Excel.'}
                        {step === 'upload' && 'Aguarde enquanto processamos o arquivo...'}
                        {step === 'match-students' && 'Valide a associação entre os nomes do arquivo e do sistema.'}
                        {step === 'review-subjects' && 'Revise as disciplinas encontradas. Apenas disciplinas cadastradas serão importadas.'}
                        {step === 'preview' && 'Revise as notas antes de importar.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Configure - AGORA É O PRIMEIRO PASSO */}
                {step === 'configure' && (
                    <div className="space-y-6">
                        {/* Seleção de Turma e Bimestre */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Turma *</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a turma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeClasses.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.classNumber} - {cls.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Bimestre *</Label>
                                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o bimestre" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {QUARTERS.map(q => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Opção de substituir notas */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-1 flex-1 pr-4">
                                    <Label className="text-base font-medium">
                                        Substituir notas existentes
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {replaceExisting 
                                            ? 'Todas as notas antigas deste bimestre serão deletadas e substituídas pelas novas'
                                            : 'As notas do arquivo serão adicionadas/atualizadas sem deletar as existentes'
                                        }
                                    </p>
                                </div>
                                <Checkbox 
                                    checked={replaceExisting}
                                    onCheckedChange={(checked) => setReplaceExisting(!!checked)}
                                />
                            </div>
                        </div>

                        {/* Upload após selecionar turma */}
                        {selectedClass && (
                            <div className="space-y-4">
                                <div
                                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('sige-upload')?.click()}
                                >
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            <p>Processando arquivo...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-lg font-medium">Clique para selecionar o arquivo Excel</p>
                                            <p className="text-sm text-muted-foreground">
                                                XLS ou XLSX do SIGE
                                            </p>
                                        </>
                                    )}
                                    <Input
                                        id="sige-upload"
                                        type="file"
                                        accept=".xls,.xlsx"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isProcessing}
                                    />
                                </div>

                                <Alert>
                                    <AlertDescription>
                                        <strong>Dica:</strong> Use o arquivo "Mapa de Notas" exportado do SIGE em Excel (XLS/XLSX).
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {!selectedClass && (
                            <Alert>
                                <AlertDescription>
                                    Selecione uma turma para continuar
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                {/* Step 3: Match Students (NOVO) */}
                {step === 'match-students' && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertDescription>
                                Verifique se os alunos foram identificados corretamente.
                                Altere manualmente ou selecione "Ignorar" para não importar notas de um aluno.
                            </AlertDescription>
                        </Alert>

                        <ScrollArea className="h-[400px] border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Nome no Arquivo</TableHead>
                                        <TableHead className="w-[40%]">Nome no Sistema</TableHead>
                                        <TableHead className="w-[20%]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentMatches.map((match, index) => (
                                        <TableRow key={index} className={!match.systemStudentId ? 'opacity-60 bg-muted/40' : ''}>
                                            <TableCell className="font-medium">
                                                {match.fileStudentName}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={match.systemStudentId || 'ignore'}
                                                    onValueChange={(val) => updateMatch(index, val === 'ignore' ? null : val)}
                                                >
                                                    <SelectTrigger className="w-full h-8">
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ignore" className="text-muted-foreground italic">
                                                            -- Ignorar (Não importar) --
                                                        </SelectItem>
                                                        {students
                                                            .filter(s => s.classId === selectedClass)
                                                            .sort((a, b) => a.name.localeCompare(b.name))
                                                            .map(s => (
                                                                <SelectItem key={s.id} value={s.id}>
                                                                    {s.name}
                                                                </SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                {match.systemStudentId ? (
                                                    <Badge
                                                        variant={match.isManual ? 'outline' : (match.similarity >= 0.9 ? 'default' : 'secondary')}
                                                        className={!match.isManual && match.similarity >= 0.9 ? 'bg-green-500 hover:bg-green-600' : ''}
                                                    >
                                                        {match.isManual ? 'Manual' : `${Math.round(match.similarity * 100)}% Match`}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground border-dashed">
                                                        Ignorado
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

                {/* Step 4: Review Subjects (NOVO) */}
                {step === 'review-subjects' && parseResult && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertDescription>
                                Revise as disciplinas encontradas no arquivo. Apenas disciplinas cadastradas no sistema serão importadas.
                            </AlertDescription>
                        </Alert>

                        {(() => {
                            const validSubjects = getValidSubjectsForClass(selectedClass);
                            const allSubjectsInFile = parseResult.subjects;
                            const validFromFile = allSubjectsInFile.filter(s => validSubjects.includes(s));
                            const discardedFromFile = allSubjectsInFile.filter(s => !validSubjects.includes(s));

                            return (
                                <div className="space-y-4">
                                    {/* Disciplinas Válidas */}
                                    <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <h3 className="font-semibold text-green-900 dark:text-green-100">
                                                Disciplinas que serão importadas ({validFromFile.length})
                                            </h3>
                                        </div>
                                        {validFromFile.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {validFromFile.map(subject => (
                                                    <Badge 
                                                        key={subject} 
                                                        variant="outline" 
                                                        className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"
                                                    >
                                                        ✓ {subject}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Nenhuma disciplina válida encontrada.
                                            </p>
                                        )}
                                    </div>

                                    {/* Disciplinas Descartadas */}
                                    {discardedFromFile.length > 0 && (
                                        <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <X className="h-5 w-5 text-red-600" />
                                                <h3 className="font-semibold text-red-900 dark:text-red-100">
                                                    Disciplinas que serão descartadas ({discardedFromFile.length})
                                                </h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {discardedFromFile.map(subject => (
                                                    <Badge 
                                                        key={subject} 
                                                        variant="outline" 
                                                        className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                                                    >
                                                        ✗ {subject}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Alert variant="destructive" className="mt-3">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <p className="font-medium mb-2">
                                                        Essas disciplinas não estão cadastradas no sistema
                                                    </p>
                                                    <p className="text-sm">
                                                        Para importá-las, cadastre-as no template de disciplinas profissionais da turma:
                                                    </p>
                                                    <ol className="text-sm mt-2 ml-4 list-decimal">
                                                        <li>Ir em Turmas → Templates de Disciplinas</li>
                                                        <li>Criar ou editar template do curso</li>
                                                        <li>Adicionar as disciplinas profissionais</li>
                                                        <li>Aplicar o template à turma</li>
                                                    </ol>
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                    )}

                                    {/* Resumo */}
                                    <div className="border rounded-lg p-4 bg-muted/50">
                                        <h4 className="font-semibold mb-2">Resumo da Importação</h4>
                                        <div className="space-y-1 text-sm">
                                            <p>📊 Total de disciplinas no arquivo: {allSubjectsInFile.length}</p>
                                            <p className="text-green-700 dark:text-green-400">
                                                ✓ Serão importadas: {validFromFile.length}
                                            </p>
                                            {discardedFromFile.length > 0 && (
                                                <p className="text-red-700 dark:text-red-400">
                                                    ✗ Serão descartadas: {discardedFromFile.length}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {validFromFile.length === 0 && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                                Nenhuma disciplina válida para importar. Cadastre as disciplinas profissionais antes de continuar.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Step 5: Preview */}
                {step === 'preview' && parseResult && (
                    <div className="space-y-4">
                        {/* Estatísticas da Importação */}
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-3">
                                    <p className="text-sm font-medium">
                                        📊 Resumo da Importação
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                                            <span className="text-muted-foreground">Alunos no arquivo:</span>
                                            <span className="ml-2 font-semibold">{parseResult.rows.length}</span>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                                            <span className="text-muted-foreground">Alunos identificados:</span>
                                            <span className="ml-2 font-semibold">{studentMatches.filter(m => m.systemStudentId).length}</span>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                                            <span className="text-muted-foreground">Notas válidas:</span>
                                            <span className="ml-2 font-semibold text-green-700 dark:text-green-400">{importableGrades.length}</span>
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded">
                                            <span className="text-muted-foreground">Disciplinas:</span>
                                            <span className="ml-2 font-semibold">{new Set(importableGrades.map(g => g.subject)).size}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Disciplinas */}
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Disciplinas validadas:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(new Set(importableGrades.map(g => g.subject))).map(subject => (
                                                <Badge key={subject} variant="outline" className="text-xs">
                                                    {subject}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>

                        {isImporting && (
                            <Alert>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>
                                                {importPhase === 'deleting' 
                                                    ? '🗑️ Removendo notas antigas...' 
                                                    : '📝 Importando novas notas...'
                                                }
                                            </span>
                                            <span className="font-medium">
                                                {importProgress.current} / {importProgress.total}
                                            </span>
                                        </div>
                                        <Progress 
                                            value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} 
                                            className="h-2"
                                        />
                                        {importPhase === 'deleting' && (
                                            <p className="text-xs text-muted-foreground">
                                                Substituindo todas as notas do bimestre selecionado
                                            </p>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedGradesCount === importableGrades.length}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    disabled={isImporting}
                                />
                                <span className="text-sm">
                                    Selecionar todas ({selectedGradesCount}/{importableGrades.length})
                                </span>
                            </div>
                            <Badge variant={selectedGradesCount > 0 ? 'default' : 'secondary'}>
                                {selectedGradesCount} notas selecionadas
                            </Badge>
                        </div>

                        <ScrollArea className="h-[400px] border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Aluno (Sistema)</TableHead>
                                        <TableHead>Aluno (Arquivo)</TableHead>
                                        <TableHead>Match</TableHead>
                                        <TableHead>Disciplina</TableHead>
                                        <TableHead>Nota</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importableGrades.map((grade, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={grade.selected}
                                                    onCheckedChange={() => handleToggleGrade(index)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {grade.studentName}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {grade.extractedName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={grade.similarity >= 0.9 ? 'default' : 'secondary'}
                                                    className={grade.similarity >= 0.9 ? 'bg-green-500' : 'bg-yellow-500'}
                                                >
                                                    {Math.round(grade.similarity * 100)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{grade.subject}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{grade.grade.toFixed(1)}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>

                        {importableGrades.length === 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Nenhum aluno do arquivo foi encontrado na turma selecionada.
                                    Verifique se a turma está correta.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 'configure' && (
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                    )}

                    {step === 'match-students' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleConfirmMatches}>
                                Continuar para Disciplinas
                            </Button>
                        </>
                    )}

                    {step === 'review-subjects' && parseResult && (
                        <>
                            <Button variant="outline" onClick={() => setStep('match-students')}>
                                Voltar
                            </Button>
                            <Button 
                                onClick={handleConfirmSubjects}
                                disabled={(() => {
                                    const validSubjects = getValidSubjectsForClass(selectedClass);
                                    const validFromFile = parseResult.subjects.filter(s => validSubjects.includes(s));
                                    return validFromFile.length === 0;
                                })()}
                            >
                                Continuar para Preview
                            </Button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button 
                                variant="outline" 
                                onClick={() => setStep('review-subjects')}
                                disabled={isImporting}
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={selectedGradesCount === 0 || isImporting}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Importar {selectedGradesCount} nota(s)
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
