import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStudents } from '@/hooks/useLocalStorage';
import { IncidentFormData } from '../IncidentWizard';
import { Search } from 'lucide-react';

interface StudentsStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
}

export const StudentsStep = ({ formData, updateFormData }: StudentsStepProps) => {
  const { students } = useStudents();
  const [searchTerm, setSearchTerm] = useState('');

  const classStudents = students.filter((s) => s.classId === formData.classId);
  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStudent = (studentId: string) => {
    const currentIds = formData.studentIds || [];
    const newIds = currentIds.includes(studentId)
      ? currentIds.filter((id) => id !== studentId)
      : [...currentIds, studentId];
    updateFormData({ studentIds: newIds });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Alunos Envolvidos</h2>
        <p className="text-muted-foreground mt-1">
          Selecione os alunos envolvidos na ocorrência
        </p>
      </div>

      <div className="flex items-center gap-2">
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
          {formData.studentIds?.length || 0} selecionados
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              id={student.id}
              checked={formData.studentIds?.includes(student.id)}
              onCheckedChange={() => toggleStudent(student.id)}
            />
            <label
              htmlFor={student.id}
              className="flex-1 cursor-pointer space-y-1"
            >
              <div className="font-medium">{student.name}</div>
              <div className="text-sm text-muted-foreground">
                Data de nascimento: {new Date(student.birthDate).toLocaleDateString('pt-BR')}
              </div>
            </label>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum aluno encontrado
        </div>
      )}
    </div>
  );
};
