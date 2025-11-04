import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClasses, useStudents, useGrades } from '@/hooks/useLocalStorage';
import { AlertTriangle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SUBJECTS = ['Matemática', 'Português', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês'];
const QUARTERS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

export const GradesManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { addGrade } = useGrades();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [grade, setGrade] = useState('');
  const [observation, setObservation] = useState('');

  const classStudents = students.filter(s => s.classId === selectedClass);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass || !selectedQuarter || !selectedSubject || !selectedStudent || !grade) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 10) {
      toast({
        title: 'Erro',
        description: 'A nota deve estar entre 0 e 10.',
        variant: 'destructive',
      });
      return;
    }

    addGrade({
      studentId: selectedStudent,
      classId: selectedClass,
      subject: selectedSubject,
      quarter: selectedQuarter,
      grade: gradeValue,
      observation,
    });

    if (gradeValue < 6) {
      toast({
        title: 'Nota Lançada',
        description: '⚠️ Nota abaixo da média. Considere registrar observação sobre dificuldades do aluno.',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Nota lançada com sucesso.',
      });
    }

    // Reset form
    setGrade('');
    setObservation('');
    setSelectedStudent('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.active).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                  {QUARTERS.map(quarter => (
                    <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Disciplina *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClass && selectedQuarter && selectedSubject && (
            <Alert className="mt-4">
              <AlertDescription>
                Você está lançando notas de <strong>{selectedSubject}</strong> para{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong> no{' '}
                <strong>{selectedQuarter}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lançamento Individual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Aluno *</Label>
                <Select 
                  value={selectedStudent} 
                  onValueChange={setSelectedStudent}
                  disabled={!selectedClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedClass ? "Selecione o aluno" : "Selecione uma turma primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - {student.enrollment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Nota (0-10) *</Label>
                <Input
                  id="grade"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="Ex: 7.5"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
                {parseFloat(grade) < 6 && grade !== '' && (
                  <p className="text-xs text-severity-critical flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Nota abaixo da média
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observation">Observação (Opcional)</Label>
                <Textarea
                  id="observation"
                  placeholder="Registre observações sobre a nota..."
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Button type="submit" disabled={!selectedClass || !selectedQuarter || !selectedSubject}>
              <Save className="h-4 w-4 mr-2" />
              Lançar Nota
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
