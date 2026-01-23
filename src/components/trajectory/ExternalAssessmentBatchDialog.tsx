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
import { Target, Users, Save, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExternalAssessments, useStudents } from '@/hooks/useData';
import { QUARTERS } from '@/lib/subjects';
import { ExternalAssessmentType } from '@/types';

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

    const selectedGroup = useMemo(() => {
        if (!selectedGroupKey) return null;
        return assessmentGroups.find(group => group.key === selectedGroupKey) || null;
    }, [assessmentGroups, selectedGroupKey]);

    const updateForm = (next: Partial<typeof form>) => {
        setForm((prev) => ({ ...prev, ...next }));
        if (selectedGroupKey) setSelectedGroupKey('');
    };

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

    // Sincronizar notas existentes quando o formulário mudar
    useEffect(() => {
        if (!open) return;

        const newScores: Record<string, { score: string, proficiency: string }> = {};

        matchingAssessments.forEach(e => {
            newScores[e.studentId] = {
                score: String(e.score).replace('.', ','),
                proficiency: e.proficiencyLevel || ''
            };
        });

        // Preencher com '' para os alunos que não tem nota
        classStudents.forEach(s => {
            if (!newScores[s.id]) {
                newScores[s.id] = { score: '', proficiency: '' };
            }
        });

        setScores(newScores);
    }, [open, matchingAssessments, classStudents]);

    const handleSave = async () => {
        if (!form.assessmentName) {
            toast({ title: "Erro", description: "Nome da avaliação é obrigatório.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const entries = Object.entries(scores).filter(([_, data]) => data.score !== '');

        if (entries.length === 0) {
            toast({ title: "Aviso", description: "Nenhuma nota preenchida." });
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
        } catch (e) {
            toast({ title: "Erro", description: "Falha ao salvar avaliações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (deleteTargets.length === 0) {
            toast({ title: "Aviso", description: "Não há avaliações para excluir com essa seleção." });
            return;
        }
        const confirmed = window.confirm(`Excluir ${deleteTargets.length} avaliações dessa turma? Essa ação não pode ser desfeita.`);
        if (!confirmed) return;

        setIsSaving(true);
        try {
            await Promise.all(deleteTargets.map(a => deleteExternalAssessment(a.id)));
            toast({ title: "Excluídas", description: "Avaliações removidas com sucesso." });
        } catch (e) {
            toast({ title: "Erro", description: "Falha ao excluir avaliações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle>Lançamento em Lote: Avaliação Externa</DialogTitle>
                            <DialogDescription>Crie uma avaliação e lance as notas para toda a turma</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl my-2">
                    <div className="space-y-1 md:col-span-2">
                        <Label className="text-[10px] uppercase font-bold">Avaliações Criadas</Label>
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
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Selecione uma avaliação existente" />
                            </SelectTrigger>
                            <SelectContent>
                                {assessmentGroups.length === 0 ? (
                                    <div className="px-2 py-4 text-sm text-muted-foreground">
                                        Nenhuma avaliação criada para esta turma.
                                    </div>
                                ) : (
                                    assessmentGroups.map(group => (
                                        <SelectItem key={group.key} value={group.key}>
                                            {group.label} ({group.count})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Nome / Edição</Label>
                        <Input
                            placeholder="Ex: SAEB 2024"
                            className="h-8 text-sm"
                            value={form.assessmentName}
                            onChange={e => updateForm({ assessmentName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Tipo</Label>
                        <Select value={form.assessmentType} onValueChange={v => updateForm({ assessmentType: v as ExternalAssessmentType })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SAEB">SAEB</SelectItem>
                                <SelectItem value="SIGE">SIGE</SelectItem>
                                <SelectItem value="Diagnóstica">Diagnóstica</SelectItem>
                                <SelectItem value="Simulado">Simulado</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Disciplina</Label>
                        <Select value={form.subject} onValueChange={v => updateForm({ subject: v })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="geral">Geral / Multidisciplinar</SelectItem>
                                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Valor Máximo</Label>
                        <Input
                            type="number"
                            className="h-8 text-sm"
                            value={form.maxScore}
                            onChange={e => updateForm({ maxScore: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Nível</Label>
                        <Select
                            value={form.schoolLevel}
                            onValueChange={v => updateForm({ schoolLevel: v as 'fundamental' | 'medio', gradeYear: v === 'fundamental' ? 6 : 1 })}
                        >
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fundamental">Fundamental</SelectItem>
                                <SelectItem value="medio">Ensino Médio</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Série/Ano</Label>
                        <Select value={String(form.gradeYear)} onValueChange={v => updateForm({ gradeYear: parseInt(v) })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(form.schoolLevel === 'fundamental' ? [6, 7, 8, 9] : [1, 2, 3]).map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}º ano</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Bimestre</Label>
                        <Select value={form.quarter} onValueChange={v => updateForm({ quarter: v })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_QUARTER_VALUE}>Sem bimestre</SelectItem>
                                {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Data Aplicada</Label>
                        <Input
                            type="date"
                            className="h-8 text-sm"
                            value={form.appliedDate}
                            onChange={e => updateForm({ appliedDate: e.target.value })}
                        />
                    </div>
                </div>

                <div className="border rounded-lg p-4 bg-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold">Avaliações já criadas (filtro atual)</div>
                            <div className="text-xs text-muted-foreground">
                                {matchingAssessments.length} registros encontrados para esta turma.
                            </div>
                        </div>
                    </div>
                    {matchingAssessments.length === 0 ? (
                        <div className="mt-4 text-sm text-muted-foreground">
                            Nenhuma avaliação registrada com esse cabeçalho.
                        </div>
                    ) : (
                        <div className="mt-4 border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Aluno</TableHead>
                                        <TableHead>Nota</TableHead>
                                        <TableHead>Disciplina</TableHead>
                                        <TableHead>Ano</TableHead>
                                        <TableHead>Bimestre</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="w-16">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                            </Table>
                            <ScrollArea className="h-[220px]">
                                <Table>
                                    <TableBody>
                                        {matchingAssessments.map((assessment) => (
                                            <TableRow key={assessment.id}>
                                                <TableCell className="text-xs font-medium">
                                                    {studentNames[assessment.studentId] ?? assessment.studentId}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {assessment.score}/{assessment.maxScore}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {assessment.subject ?? 'Geral'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {assessment.schoolLevel === 'fundamental'
                                                        ? `${assessment.gradeYear}º Fund`
                                                        : `${assessment.gradeYear}º EM`}
                                                </TableCell>
                                                <TableCell className="text-xs">{assessment.quarter ?? '-'}</TableCell>
                                                <TableCell className="text-xs">{assessment.appliedDate}</TableCell>
                                                <TableCell>
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden border rounded-lg">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0">
                            <TableRow>
                                <TableHead className="w-1/2">Aluno</TableHead>
                                <TableHead>Pontuação</TableHead>
                                <TableHead>Proficiência (Opcional)</TableHead>
                            </TableRow>
                        </TableHeader>
                    </Table>
                    <ScrollArea className="h-[300px]">
                        <Table>
                            <TableBody>
                                {classStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium py-2">
                                            {student.name}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <Input
                                                placeholder="0.0"
                                                className="h-8 w-24"
                                                value={scores[student.id]?.score || ''}
                                                onChange={e => setScores({
                                                    ...scores,
                                                    [student.id]: { ...(scores[student.id] || { proficiency: '' }), score: e.target.value }
                                                })}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <Input
                                                placeholder="Ex: Proficiente"
                                                className="h-8"
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
                                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                                            Nenhum aluno encontrado nesta turma.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAll}
                            disabled={isSaving || deleteTargets.length === 0}
                        >
                            {selectedGroupKey ? 'Excluir avaliação' : 'Excluir todas'}
                        </Button>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || classStudents.length === 0} className="gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar/Atualizar Avaliações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
