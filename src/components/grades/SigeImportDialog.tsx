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
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClasses, useStudents, useGrades } from '@/hooks/useLocalStorage';
import { QUARTERS } from '@/lib/subjects';
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
    const { addGrade, grades: existingGrades } = useGrades();
    const { toast } = useToast();

    const [step, setStep] = useState<'upload' | 'configure' | 'match-students' | 'preview'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [parseResult, setParseResult] = useState<SigeParseResult | null>(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
    const [importableGrades, setImportableGrades] = useState<ImportableGrade[]>([]);
    const [studentMatches, setStudentMatches] = useState<StudentMatch[]>([]);

    const activeClasses = classes.filter(c => !c.archived && c.active);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isValidFormat = fileName.endsWith('.pdf') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx');

        if (!isValidFormat) {
            toast({
                title: 'Formato inválido',
                description: 'Por favor, selecione um arquivo PDF, XLS ou XLSX.',
                variant: 'destructive',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await processSigeFile(file);
            setParseResult(result);

            const formatName = fileName.endsWith('.pdf') ? 'PDF' : 'Excel';

            if (result.success) {
                toast({
                    title: `${formatName} processado`,
                    description: `${result.rows.length} linhas de notas encontradas.`,
                });
                setStep('configure');
            } else {
                toast({
                    title: `Erro ao processar ${formatName}`,
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
        if (!parseResult) return;

        const classStudents = students.filter(s => s.classId === selectedClass);
        const grades: ImportableGrade[] = [];

        // Para cada match confirmado
        for (const match of studentMatches) {
            if (!match.systemStudentId) continue; // Ignorar

            const systemStudent = classStudents.find(s => s.id === match.systemStudentId);
            if (!systemStudent) continue;

            // Encontrar TODAS as linhas de notas para este nome do arquivo
            // (Lembre-se: um aluno pode ter múltiplas linhas no arquivo com disciplinas diferentes)
            const studentRows = parseResult.rows.filter(r => r.studentName === match.fileStudentName);

            for (const row of studentRows) {
                for (const [subject, grade] of Object.entries(row.grades)) {
                    if (grade !== null && grade >= 0 && grade <= 10) {
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
        }

        if (grades.length === 0) {
            toast({
                title: 'Nenhuma nota gerada',
                description: 'Verifique se você associou os alunos corretamente.',
                variant: 'destructive',
            });
            return;
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

    const handleImport = () => {
        const toImport = importableGrades.filter(g => g.selected);

        if (toImport.length === 0) {
            toast({
                title: 'Nenhuma nota selecionada',
                description: 'Selecione pelo menos uma nota para importar.',
                variant: 'destructive',
            });
            return;
        }

        let imported = 0;
        let skipped = 0;

        toImport.forEach(grade => {
            // Verificar se já existe nota para este aluno/disciplina/bimestre
            const existing = existingGrades.find(
                g => g.studentId === grade.studentId &&
                    g.subject === grade.subject &&
                    g.quarter === grade.quarter &&
                    g.classId === grade.classId
            );

            if (!existing) {
                addGrade({
                    studentId: grade.studentId,
                    classId: grade.classId,
                    subject: grade.subject,
                    quarter: grade.quarter,
                    grade: grade.grade,
                });
                imported++;
            } else {
                skipped++;
            }
        });

        toast({
            title: 'Importação concluída',
            description: `${imported} nota(s) importada(s). ${skipped} nota(s) já existiam e foram ignoradas.`,
        });

        // Reset e fechar
        setStep('upload');
        setParseResult(null);
        setImportableGrades([]);
        setSelectedClass('');
        onOpenChange(false);
    };

    const handleClose = () => {
        setStep('upload');
        setParseResult(null);
        setImportableGrades([]);
        setSelectedClass('');
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
                        {step === 'upload' && 'Faça upload do PDF "Mapa de Notas" do SIGE para importar automaticamente.'}
                        {step === 'configure' && 'Configure a turma e o bimestre para as notas.'}
                        {step === 'match-students' && 'Valide a associação entre os nomes do arquivo e do sistema.'}
                        {step === 'preview' && 'Revise as notas antes de importar.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <div className="space-y-4">
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                            onClick={() => document.getElementById('pdf-upload')?.click()}
                        >
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    <p>Processando arquivo...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-lg font-medium">Clique para selecionar o arquivo</p>
                                    <p className="text-sm text-muted-foreground">
                                        PDF, XLS ou XLSX do SIGE
                                    </p>
                                </>
                            )}
                            <Input
                                id="pdf-upload"
                                type="file"
                                accept=".pdf,.xls,.xlsx"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />
                        </div>

                        <Alert>
                            <AlertDescription>
                                <strong>Dica:</strong> Use o arquivo "Mapa de Notas" exportado do SIGE.
                                <strong> Excel (é mais confiável que PDF para extração de dados.</strong>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Step 2: Configure */}
                {step === 'configure' && parseResult && (
                    <div className="space-y-4">
                        {parseResult.errors.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {parseResult.errors.join(', ')}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
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
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <p><strong>Dados extraídos do arquivo:</strong></p>
                            <p>📊 {parseResult.rows.length} alunos encontrados</p>
                            <p>📚 {parseResult.subjects.length} disciplinas: {parseResult.subjects.join(', ')}</p>
                            {parseResult.quarter && <p>📅 Bimestre detectado: {parseResult.quarter}</p>}
                        </div>
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

                {/* Step 4: Preview */}
                {step === 'preview' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedGradesCount === importableGrades.length}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
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
                                        <TableHead>Aluno (PDF)</TableHead>
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
                                    Nenhum aluno do PDF foi encontrado na turma selecionada.
                                    Verifique se a turma está correta.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 'upload' && (
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                    )}

                    {step === 'configure' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={handlePrepareMatching}
                                disabled={!selectedClass}
                            >
                                Continuar
                            </Button>
                        </>
                    )}

                    {step === 'match-students' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('configure')}>
                                Voltar
                            </Button>
                            <Button onClick={handleConfirmMatches}>
                                Continuar para Notas
                            </Button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('match-students')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={selectedGradesCount === 0}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Importar {selectedGradesCount} nota(s)
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
