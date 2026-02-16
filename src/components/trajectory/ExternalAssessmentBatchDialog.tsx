import { useEffect, useMemo, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Target,
    Save,
    Loader2,
    Trash2,
    Settings,
    LayoutList,
    CheckCircle2,
    ArrowRight,
    Calendar,
    GraduationCap,
    BookOpen,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExternalAssessments, useStudents } from '@/hooks/useData';
import { QUARTERS } from '@/lib/subjects';
import { ExternalAssessmentType } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ExternalAssessmentBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    subjects: string[];
}

export const ExternalAssessmentBatchDialog = ({ open, onOpenChange, classId, subjects }: ExternalAssessmentBatchDialogProps) => {
    const { students } = useStudents();
    const { addExternalAssessment, deleteExternalAssessment, updateExternalAssessment, externalAssessments } = useExternalAssessments();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const NO_QUARTER_VALUE = 'sem_bimestre';

    // Steps: 'config' (select/create) -> 'launch' (enter grades)
    const [step, setStep] = useState<'config' | 'launch'>('config');

    const [form, setForm] = useState({
        assessmentType: 'Diagnóstica' as ExternalAssessmentType,
        assessmentName: '',
        subject: 'geral',
        maxScore: '100',
        schoolLevel: 'medio' as 'fundamental' | 'medio',
        gradeYear: 1,
        quarter: '1º Bimestre',
        appliedDate: new Date().toISOString().split('T')[0],
    });

    const [scores, setScores] = useState<Record<string, { score: string, proficiency: string }>>({});
    const [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
    const [mode, setMode] = useState<'new' | 'existing'>('new');

    const classStudents = useMemo(() =>
        students.filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name)),
        [students, classId]
    );
    const studentNames = useMemo(() => Object.fromEntries(classStudents.map(s => [s.id, s.name])), [classStudents]);
    const classStudentIds = useMemo(() => new Set(classStudents.map(s => s.id)), [classStudents]);

    const buildGroupKey = (assessment: {
        assessmentName: string;
        assessmentType: ExternalAssessmentType;
        subject?: string | null;
        schoolLevel: 'fundamental' | 'medio';
        gradeYear: number;
        quarter?: string | null;
        appliedDate: string;
        maxScore: number;
    }) => {
        return [
            assessment.assessmentName,
            assessment.assessmentType,
            assessment.subject ?? 'geral',
            assessment.schoolLevel,
            assessment.gradeYear,
            assessment.quarter ?? '',
            assessment.appliedDate,
            assessment.maxScore
        ].join('|');
    };

    const assessmentGroups = useMemo(() => {
        const groups = new Map<string, { key: string; label: string; count: number; sample: typeof form }>();
        externalAssessments.forEach((assessment) => {
            if (!classStudentIds.has(assessment.studentId)) return;
            const key = buildGroupKey(assessment);

            if (!groups.has(key)) {
                const label = [
                    assessment.assessmentName,
                    assessment.assessmentType,
                    assessment.subject ?? 'Geral',
                    assessment.schoolLevel === 'fundamental' ? `${assessment.gradeYear}º Fund` : `${assessment.gradeYear}º EM`,
                    assessment.quarter ?? 'Sem bimestre',
                    assessment.appliedDate
                ].join(' • ');
                groups.set(key, {
                    key,
                    label,
                    count: 0,
                    sample: {
                        assessmentType: assessment.assessmentType,
                        assessmentName: assessment.assessmentName,
                        subject: assessment.subject ?? 'geral',
                        maxScore: String(assessment.maxScore),
                        schoolLevel: assessment.schoolLevel,
                        gradeYear: assessment.gradeYear,
                        quarter: assessment.quarter ?? NO_QUARTER_VALUE,
                        appliedDate: assessment.appliedDate
                    }
                });
            }
            const entry = groups.get(key);
            if (entry) entry.count += 1;
        });
        return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [externalAssessments, classStudentIds]);

    const matchingAssessments = useMemo(() => {
        const maxScoreValue = Number(form.maxScore);
        return externalAssessments.filter(e =>
            classStudentIds.has(e.studentId) &&
            e.assessmentName === form.assessmentName &&
            e.assessmentType === form.assessmentType &&
            (form.subject === 'geral' ? !e.subject : e.subject === form.subject) &&
            e.schoolLevel === form.schoolLevel &&
            e.gradeYear === form.gradeYear &&
            (form.quarter === NO_QUARTER_VALUE ? !e.quarter : e.quarter === form.quarter) &&
            e.appliedDate === form.appliedDate &&
            e.maxScore === maxScoreValue
        );
    }, [
        externalAssessments,
        classStudentIds,
        form.assessmentName,
        form.assessmentType,
        form.subject,
        form.schoolLevel,
        form.gradeYear,
        form.quarter,
        form.appliedDate,
        form.maxScore
    ]);

    const deleteTargets = selectedGroupKey
        ? externalAssessments.filter(a => classStudentIds.has(a.studentId) && buildGroupKey(a) === selectedGroupKey)
        : matchingAssessments;

    // Sincronizar notas existentes
    useEffect(() => {
        if (!open) return;
        // Se estamos creando nueva, reset. Se carregando existente, sync.
        if (mode === 'new') {
            // Check if unintentionally matches
            // Keep logic simple: if switching steps, fetch data
        }

        const newScores: Record<string, { score: string, proficiency: string }> = {};

        matchingAssessments.forEach(e => {
            newScores[e.studentId] = {
                score: String(e.score).replace('.', ','),
                proficiency: e.proficiencyLevel || ''
            };
        });

        classStudents.forEach(s => {
            if (!newScores[s.id]) {
                newScores[s.id] = { score: '', proficiency: '' };
            }
        });

        setScores(newScores);
    }, [open, matchingAssessments, classStudents, mode]);

    const handleContinue = () => {
        if (mode === 'new' && !form.assessmentName) {
            toast({ title: "Nome obrigatório", description: "Informe o nome da avaliação para continuar.", variant: "destructive" });
            return;
        }
        if (mode === 'existing' && !selectedGroupKey) {
            toast({ title: "Seleção obrigatória", description: "Selecione uma avaliação existente.", variant: "destructive" });
            return;
        }
        setStep('launch');
    }

    const handleSave = async () => {
        if (!form.assessmentName) {
            toast({ title: "Erro", description: "Nome da avaliação é obrigatório.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const entries = Object.entries(scores).filter(([_, data]) => data.score !== '');

        if (entries.length === 0) {
            toast({ title: "Aviso", description: "Nenhuma nota preenchida para salvar." });
            setIsSaving(false);
            return;
        }

        try {
            const existingByStudent = new Map(matchingAssessments.map(a => [a.studentId, a]));
            const promises = entries.map(([studentId, data]) => {
                const payload = {
                    studentId,
                    assessmentType: form.assessmentType,
                    assessmentName: form.assessmentName,
                    subject: form.subject === 'geral' ? undefined : form.subject,
                    score: parseFloat(data.score.replace(',', '.')),
                    maxScore: parseFloat(form.maxScore),
                    proficiencyLevel: data.proficiency || undefined,
                    appliedDate: form.appliedDate,
                    schoolLevel: form.schoolLevel,
                    gradeYear: form.gradeYear,
                    quarter: form.quarter === NO_QUARTER_VALUE ? undefined : form.quarter,
                };
                const existing = existingByStudent.get(studentId);
                if (existing) {
                    return updateExternalAssessment({ ...existing, ...payload });
                }
                return addExternalAssessment(payload);
            });

            await Promise.all(promises);
            toast({ title: "Sucesso", description: `${entries.length} avaliações salvas/atualizadas.` });
            onOpenChange(false);
            setStep('config');
        } catch (e) {
            toast({ title: "Erro", description: "Falha ao salvar avaliações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (deleteTargets.length === 0) return;

        const confirmed = window.confirm(`ATENÇÃO: Isso excluirá todas as ${deleteTargets.length} notas lançadas para esta avaliação. Confirmar?`);
        if (!confirmed) return;

        setIsSaving(true);
        try {
            await Promise.all(deleteTargets.map(a => deleteExternalAssessment(a.id)));
            toast({ title: "Excluídas", description: "Todas as notas foram removidas." });
            onOpenChange(false);
            setStep('config');
        } catch (e) {
            toast({ title: "Erro", description: "Falha ao excluir avaliações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate Completion
    const completionStats = useMemo(() => {
        const total = classStudents.length;
        const filled = Object.values(scores).filter(s => s.score !== '').length;
        return { total, filled, percent: total > 0 ? (filled / total) * 100 : 0 };
    }, [scores, classStudents]);

    const updateForm = (next: Partial<typeof form>) => {
        setForm((prev) => ({ ...prev, ...next }));
        // Se mudar campos críticos no modo 'new', não faz nada de especial além de atualizar form
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) setStep('config');
            onOpenChange(v);
        }}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Target className="h-5 w-5" />
                        </div>
                        Lançamento em Lote: Avaliação Externa
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                        Gerencie avaliações externas (SAEB, Prova Brasil, Simulados) para a turma inteira.
                    </DialogDescription>
                </DialogHeader>

                {/* Steps */}
                <div className="px-6 py-4 bg-muted/20 border-b">
                    <div className="flex items-center justify-between relative max-w-sm mx-auto">
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted-foreground/20 -z-10" />

                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'config' ? 'border-primary' : 'border-success/30'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'config' ? 'bg-primary text-primary-foreground' : 'bg-success/15 text-success'}`}>
                                <Settings className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'config' ? 'text-primary' : 'text-muted-foreground'}`}>Configuração</span>
                        </div>

                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'launch' ? 'border-primary' : 'border-muted-foreground/20'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'launch' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <LayoutList className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'launch' ? 'text-primary' : 'text-muted-foreground'}`}>Lançamento</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {step === 'config' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">O que você deseja fazer?</Label>
                                <RadioGroup
                                    value={mode}
                                    onValueChange={(v) => {
                                        setMode(v as 'new' | 'existing');
                                        if (v === 'new') setSelectedGroupKey('');
                                    }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div className={`flex items-start space-x-3 border rounded-xl p-4 cursor-pointer transition-all ${mode === 'new' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/30 border-muted'}`} onClick={() => setMode('new')}>
                                        <RadioGroupItem value="new" id="mode-new" className="mt-1" />
                                        <div className="space-y-1">
                                            <Label htmlFor="mode-new" className="font-semibold cursor-pointer">Nova Avaliação</Label>
                                            <p className="text-xs text-muted-foreground">Criar um novo registro e lançar notas do zero.</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-start space-x-3 border rounded-xl p-4 cursor-pointer transition-all ${mode === 'existing' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/30 border-muted'}`} onClick={() => setMode('existing')}>
                                        <RadioGroupItem value="existing" id="mode-existing" className="mt-1" />
                                        <div className="space-y-1">
                                            <Label htmlFor="mode-existing" className="font-semibold cursor-pointer">Editar Existente</Label>
                                            <p className="text-xs text-muted-foreground">Carregar uma avaliação já lançada para editar notas.</p>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            {mode === 'existing' && (
                                <div className="space-y-4 border p-4 rounded-xl bg-muted/10 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label>Selecione a Avaliação</Label>
                                        <Select
                                            value={selectedGroupKey}
                                            onValueChange={(value) => {
                                                setSelectedGroupKey(value);
                                                const group = assessmentGroups.find(item => item.key === value);
                                                if (group) {
                                                    setForm({ ...form, ...group.sample });
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {assessmentGroups.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        Nenhuma avaliação encontrada.
                                                    </div>
                                                ) : (
                                                    assessmentGroups.map(group => (
                                                        <SelectItem key={group.key} value={group.key}>
                                                            <div className="flex flex-col items-start text-left">
                                                                <span className="font-medium">{group.label.split(' • ')[0]}</span>
                                                                <span className="text-xs text-muted-foreground">{group.label.split(' • ').slice(1).join(' • ')}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedGroupKey && (
                                        <div className="p-3 bg-info/10 dark:bg-info/20 text-info dark:text-info rounded-lg text-sm flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Avaliação carregada. Clique em "Continuar" para editar as notas.
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode === 'new' && (
                                <div className="grid gap-4 border p-4 rounded-xl bg-muted/10 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nome da Avaliação</Label>
                                            <Input
                                                placeholder="Ex: Simulado 1º Trimestre"
                                                value={form.assessmentName}
                                                onChange={e => updateForm({ assessmentName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tipo</Label>
                                            <Select value={form.assessmentType} onValueChange={v => updateForm({ assessmentType: v as ExternalAssessmentType })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SAEB">SAEB</SelectItem>
                                                    <SelectItem value="SIGE">SIGE</SelectItem>
                                                    <SelectItem value="Diagnóstica">Diagnóstica</SelectItem>
                                                    <SelectItem value="Simulado">Simulado</SelectItem>
                                                    <SelectItem value="Outro">Outro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Disciplina</Label>
                                            <Select value={form.subject} onValueChange={v => updateForm({ subject: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="geral">Geral / Multidisciplinar</SelectItem>
                                                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data Aplicada</Label>
                                            <Input
                                                type="date"
                                                value={form.appliedDate}
                                                onChange={e => updateForm({ appliedDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor Máximo</Label>
                                            <Input
                                                type="number"
                                                value={form.maxScore}
                                                onChange={e => updateForm({ maxScore: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-background rounded-lg border">
                                        <div className="space-y-2">
                                            <Label>Nível</Label>
                                            <Select
                                                value={form.schoolLevel}
                                                onValueChange={v => updateForm({ schoolLevel: v as 'fundamental' | 'medio', gradeYear: v === 'fundamental' ? 6 : 1 })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fundamental">Fundamental</SelectItem>
                                                    <SelectItem value="medio">Ensino Médio</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Série/Ano</Label>
                                            <Select value={String(form.gradeYear)} onValueChange={v => updateForm({ gradeYear: parseInt(v) })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {(form.schoolLevel === 'fundamental' ? [6, 7, 8, 9] : [1, 2, 3]).map(y => (
                                                        <SelectItem key={y} value={String(y)}>{y}º ano</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Bimestre</Label>
                                            <Select value={form.quarter} onValueChange={v => updateForm({ quarter: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NO_QUARTER_VALUE}>Sem bimestre</SelectItem>
                                                    {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'launch' && (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-3 p-4 bg-muted/30 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{form.assessmentName}</h3>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                                                <Badge variant="outline" className="bg-background">{form.assessmentType}</Badge>
                                                <Badge variant="outline" className="bg-background">{form.subject}</Badge>
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {form.appliedDate}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-right">
                                        <div>
                                            <p className="text-2xl font-bold">{completionStats.filled}/{completionStats.total}</p>
                                            <p className="text-xs text-muted-foreground">Lançados</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{form.maxScore}</p>
                                            <p className="text-xs text-muted-foreground">Valor Máx</p>
                                        </div>
                                    </div>
                                </div>
                                {completionStats.percent === 100 && (
                                    <div className="md:col-span-1 bg-success/10 dark:bg-success/20 border border-success/30 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                                        <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                                        <p className="font-bold text-success dark:text-success">Completo!</p>
                                        <p className="text-xs text-success">Todos os alunos com nota.</p>
                                    </div>
                                )}
                            </div>

                            {/* Grid */}
                            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[40%] pl-6">Aluno</TableHead>
                                            <TableHead className="w-[30%] text-center">Nota (0 a {form.maxScore})</TableHead>
                                            <TableHead className="w-[30%]">Proficiência (Opcional)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                                <ScrollArea className="h-[400px]">
                                    <Table>
                                        <TableBody>
                                            {classStudents.map(student => (
                                                <TableRow key={student.id} className="hover:bg-muted/30">
                                                    <TableCell className="pl-6 font-medium py-3">
                                                        <div className="flex flex-col">
                                                            <span>{student.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-center">
                                                        <div className="flex justify-center">
                                                            <Input
                                                                placeholder="-"
                                                                className={`h-9 w-24 text-center font-mono ${scores[student.id]?.score ? 'bg-primary/5 border-primary/30 font-bold' : ''}`}
                                                                value={scores[student.id]?.score || ''}
                                                                onChange={e => {
                                                                    // Validation logic implies we trust user input but could clamp or warn
                                                                    setScores({
                                                                        ...scores,
                                                                        [student.id]: { ...(scores[student.id] || { proficiency: '' }), score: e.target.value }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 pr-6">
                                                        <Input
                                                            placeholder="Ex: Proficiente"
                                                            className="h-9"
                                                            value={scores[student.id]?.proficiency || ''}
                                                            onChange={e => setScores({
                                                                ...scores,
                                                                [student.id]: { ...(scores[student.id] || { score: '' }), proficiency: e.target.value }
                                                            })}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {classStudents.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                                        Nenhum aluno encontrado nesta turma.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
                    <div className="flex items-center gap-2">
                        {step === 'config' ? (
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        ) : (
                            <Button variant="outline" onClick={() => setStep('config')}>Voltar</Button>
                        )}

                        {step === 'launch' && mode === 'existing' && (
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={handleDeleteAll}
                                title="Excluir todas as notas desta avaliação"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {step === 'config' ? (
                            <Button onClick={handleContinue} className="bg-primary px-8">
                                Continuar <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSave} disabled={isSaving || classStudents.length === 0} className="bg-success hover:bg-success text-white px-8">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Salvar Lançamentos
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
