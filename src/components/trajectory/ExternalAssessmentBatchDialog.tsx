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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Users, Save, Loader2, AlertCircle } from 'lucide-react';
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
    const { addExternalAssessment } = useExternalAssessments();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

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

    const classStudents = useMemo(() =>
        students.filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name)),
        [students, classId]
    );

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
            const promises = entries.map(([studentId, data]) =>
                addExternalAssessment({
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
                    quarter: form.quarter,
                })
            );

            await Promise.all(promises);
            toast({ title: "Sucesso", description: `${entries.length} avaliações registradas.` });
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Erro", description: "Falha ao salvar avaliações.", variant: "destructive" });
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
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Nome / Edição</Label>
                        <Input
                            placeholder="Ex: SAEB 2024"
                            className="h-8 text-sm"
                            value={form.assessmentName}
                            onChange={e => setForm({ ...form, assessmentName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Tipo</Label>
                        <Select value={form.assessmentType} onValueChange={v => setForm({ ...form, assessmentType: v as ExternalAssessmentType })}>
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
                        <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
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
                            onChange={e => setForm({ ...form, maxScore: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Nível</Label>
                        <Select value={form.schoolLevel} onValueChange={v => setForm({ ...form, schoolLevel: v as 'fundamental' | 'medio', gradeYear: v === 'fundamental' ? 6 : 1 })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fundamental">Fundamental</SelectItem>
                                <SelectItem value="medio">Ensino Médio</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Série/Ano</Label>
                        <Select value={String(form.gradeYear)} onValueChange={v => setForm({ ...form, gradeYear: parseInt(v) })}>
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
                        <Select value={form.quarter} onValueChange={v => setForm({ ...form, quarter: v })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
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
                            onChange={e => setForm({ ...form, appliedDate: e.target.value })}
                        />
                    </div>
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

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving || classStudents.length === 0} className="gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Avaliações para a Turma
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
