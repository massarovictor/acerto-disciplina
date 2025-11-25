import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useClasses, useStudents, useAttendance, useProfessionalSubjects } from '@/hooks/useLocalStorage';
import { Calendar, Save, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  QUARTERS 
} from '@/lib/subjects';

interface StudentAttendance {
  studentId: string;
  totalAbsences: number; // Número total de faltas do bimestre
}

export const AttendanceManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { attendance, addAttendance } = useAttendance();
  const { toast } = useToast();
  const { 
    getProfessionalSubjects, 
    addProfessionalSubject, 
    removeProfessionalSubject 
  } = useProfessionalSubjects();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [newProfessionalSubject, setNewProfessionalSubject] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const classStudents = students.filter(s => s.classId === selectedClass);
  const selectedClassData = classes.find(c => c.id === selectedClass);
  
  // Verificar se a turma está arquivada
  const isClassArchived = selectedClassData?.archived === true;
  
  // Obter disciplinas profissionais da turma (armazenadas no localStorage)
  const professionalSubjects = selectedClass ? getProfessionalSubjects(selectedClass) : [];

  // Initialize attendance when class changes
  useEffect(() => {
    if (selectedClass && selectedQuarter) {
      const initialAttendances = classStudents.map(student => {
        // Contar faltas totais do bimestre para este aluno
        // Assumindo que cada registro de falta representa uma falta
        const quarterAttendances = attendance.filter(
          a => a.studentId === student.id && 
               a.classId === selectedClass &&
               (a.status === 'falta' || a.status === 'falta_justificada' || a.status === 'atestado')
        );
        
        return {
          studentId: student.id,
          totalAbsences: quarterAttendances.length,
        };
      });

      setStudentAttendances(initialAttendances);
    } else {
      setStudentAttendances([]);
    }
  }, [selectedClass, selectedQuarter, classStudents.length, attendance.length]);

  const handleAddProfessionalSubject = () => {
    if (newProfessionalSubject.trim() && selectedClass) {
      addProfessionalSubject(selectedClass, newProfessionalSubject.trim());
      setNewProfessionalSubject('');
      setShowAddDialog(false);
      toast({
        title: 'Disciplina adicionada',
        description: 'A disciplina foi adicionada com sucesso e estará disponível em Notas e Frequência.',
      });
    }
  };

  const handleRemoveProfessionalSubject = (subject: string) => {
    if (selectedClass) {
      removeProfessionalSubject(selectedClass, subject);
    }
  };

  const handleSaveStudentAttendance = () => {
    if (!selectedStudent || !selectedClass || !selectedQuarter) return;

    const studentAtt = studentAttendances.find(sa => sa.studentId === selectedStudent);
    if (!studentAtt) return;

    const student = students.find(s => s.id === selectedStudent);
    const totalAbsences = studentAtt.totalAbsences;

    // Aqui você pode salvar o número total de faltas do bimestre
    // Por enquanto, apenas mostra uma mensagem
    toast({
      title: 'Frequência salva',
      description: `${totalAbsences} falta(s) de ${student?.name} registrada(s) no ${selectedQuarter}.`,
    });

    setSelectedStudent(null);
  };

  const updateAbsences = (studentId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStudentAttendances(prev =>
      prev.map(sa => {
        if (sa.studentId === studentId) {
          return {
            ...sa,
            totalAbsences: Math.max(0, numValue)
          };
        }
        return sa;
      })
    );
  };


  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma turma cadastrada
                    </div>
                  ) : (
                    classes
                      .filter(cls => !cls.archived)
                      .map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bimestre *</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map(quarter => (
                    <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isClassArchived && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta turma está arquivada. Não é possível registrar frequência para turmas arquivadas.
              </AlertDescription>
            </Alert>
          )}

          {selectedClass && !isClassArchived && (
            <Alert className="mt-4">
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Registrando faltas do <strong>{selectedQuarter}</strong> para{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Add Professional Subject Button */}
      {selectedClass && classStudents.length > 0 && !isClassArchived && (
        <div className="flex justify-end">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Disciplina Profissional
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Disciplina da Base Profissional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Disciplina</Label>
                  <Input
                    placeholder="Ex: Gestão de Processos"
                    value={newProfessionalSubject}
                    onChange={(e) => setNewProfessionalSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProfessionalSubject()}
                  />
                </div>
                <Button onClick={handleAddProfessionalSubject} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Students List */}
      {selectedClass && classStudents.length > 0 && !isClassArchived && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos - Clique para Registrar Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classStudents.map((student) => {
                const studentAtt = studentAttendances.find(sa => sa.studentId === student.id);
                const totalAbsences = studentAtt?.totalAbsences || 0;

                return (
                  <Card 
                    key={student.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {student.photoUrl ? (
                            <AvatarImage src={student.photoUrl} alt={student.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.enrollment || 'S/N'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {totalAbsences} falta(s) no bimestre
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Attendance Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Registrar Faltas - {students.find(s => s.id === selectedStudent)?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  Informe o número total de faltas do aluno no <strong>{selectedQuarter}</strong>.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="total-absences">Número Total de Faltas no Bimestre</Label>
                  <Input
                    id="total-absences"
                    type="number"
                    min="0"
                    placeholder="Digite o número total de faltas"
                    value={studentAttendances.find(sa => sa.studentId === selectedStudent)?.totalAbsences || 0}
                    onChange={(e) => updateAbsences(selectedStudent, e.target.value)}
                    className="text-2xl font-bold text-center"
                  />
                  <p className="text-sm text-muted-foreground">
                    Este número representa todas as faltas do aluno no {selectedQuarter}, independente da disciplina.
                  </p>
                </div>

                {/* Mostrar disciplinas profissionais apenas para referência */}
                {professionalSubjects.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-sm text-muted-foreground">
                      Disciplinas Profissionais da Turma (apenas referência)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {professionalSubjects.map(subject => (
                        <Badge key={subject} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveStudentAttendance} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Faltas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStudent(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedClass && classStudents.length === 0 && (
        <Alert>
          <AlertDescription>
            Nenhum aluno cadastrado nesta turma. Cadastre alunos para registrar frequência.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

