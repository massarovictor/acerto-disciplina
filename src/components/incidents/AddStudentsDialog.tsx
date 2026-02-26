
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStudents } from '@/hooks/useData';
import { Search } from 'lucide-react';

interface AddStudentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    existingStudentIds: string[];
    onAddStudents: (studentIds: string[]) => Promise<void>;
}

export const AddStudentsDialog = ({
    open,
    onOpenChange,
    classId,
    existingStudentIds,
    onAddStudents,
}: AddStudentsDialogProps) => {
    const { students } = useStudents();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Filter students by class and exclude already added ones
    const availableStudents = students
        .filter((s) => s.classId === classId && !existingStudentIds.includes(s.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const filteredStudents = availableStudents.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleStudent = (studentId: string) => {
        setSelectedStudentIds((current) =>
            current.includes(studentId)
                ? current.filter((id) => id !== studentId)
                : [...current, studentId]
        );
    };

    const handleSave = async () => {
        if (selectedStudentIds.length === 0) return;

        setIsSaving(true);
        try {
            await onAddStudents(selectedStudentIds);
            setSelectedStudentIds([]);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to add students:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Adicionar Alunos à Ocorrência</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 py-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar aluno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Badge variant="secondary">
                        {selectedStudentIds.length} selecionados
                    </Badge>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px] border rounded-md p-2 space-y-2">
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                            >
                                <Checkbox
                                    id={`add-${student.id}`}
                                    checked={selectedStudentIds.includes(student.id)}
                                    onCheckedChange={() => toggleStudent(student.id)}
                                />
                                <label
                                    htmlFor={`add-${student.id}`}
                                    className="flex-1 cursor-pointer space-y-1"
                                >
                                    <div className="font-medium text-sm">{student.name}</div>
                                </label>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {searchTerm ? 'Nenhum aluno encontrado' : 'Todos os alunos da turma já estão na ocorrência'}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={selectedStudentIds.length === 0 || isSaving}>
                        {isSaving ? 'Adicionando...' : 'Adicionar Alunos'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
