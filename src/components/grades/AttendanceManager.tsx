import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClasses, useStudents, useAttendance } from '@/hooks/useLocalStorage';
import { Calendar, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QUARTERS, SUBJECT_AREAS } from '@/lib/subjects';

interface StudentAttendance {
  studentId: string;
  absences: Record<string, number>; // subject -> number of absences
}

export const AttendanceManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { attendance, addAttendance } = useAttendance();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const classStudents = students.filter(s => s.classId === selectedClass);
  const allSubjects = SUBJECT_AREAS.flatMap(area => area.subjects);

  // Initialize attendance when class changes
  useEffect(() => {
    if (selectedClass) {
      const initialAttendances = classStudents.map(student => {
        const studentAbsences: Record<string, number> = {};
        
        allSubjects.forEach(subject => {
          // Count absences for this student, subject, quarter
          const quarterAttendances = attendance.filter(
            a => a.studentId === student.id && 
                 a.classId === selectedClass &&
                 (a.status === 'falta' || a.status === 'falta_justificada' || a.status === 'atestado')
          );
          studentAbsences[subject] = quarterAttendances.length;
        });

        return {
          studentId: student.id,
          absences: studentAbsences,
        };
      });

      setStudentAttendances(initialAttendances);
    }
  }, [selectedClass, selectedQuarter, classStudents, attendance]);

  const handleSaveStudentAttendance = () => {
    if (!selectedStudent || !selectedClass || !selectedQuarter) return;

    const studentAtt = studentAttendances.find(sa => sa.studentId === selectedStudent);
    if (!studentAtt) return;

    const totalAbsences = Object.values(studentAtt.absences).reduce((sum, val) => sum + val, 0);
    const student = students.find(s => s.id === selectedStudent);

    toast({
      title: 'Frequência salva',
      description: `${totalAbsences} falta(s) de ${student?.name} registrada(s) no ${selectedQuarter}.`,
    });

    setSelectedStudent(null);
  };

  const updateAbsences = (studentId: string, subject: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStudentAttendances(prev =>
      prev.map(sa => {
        if (sa.studentId === studentId) {
          return {
            ...sa,
            absences: { ...sa.absences, [subject]: Math.max(0, numValue) }
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
                    classes.map(cls => (
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

          {selectedClass && (
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

      {/* Students List */}
      {selectedClass && classStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos - Clique para Registrar Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classStudents.map((student) => {
                const studentAtt = studentAttendances.find(sa => sa.studentId === student.id);
                const totalAbsences = studentAtt 
                  ? Object.values(studentAtt.absences).reduce((sum, val) => sum + val, 0)
                  : 0;

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
                            {totalAbsences} falta(s) registrada(s)
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Registrar Faltas - {students.find(s => s.id === selectedStudent)?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              {/* Subject Areas */}
              {SUBJECT_AREAS.map(area => {
                const studentAtt = studentAttendances.find(sa => sa.studentId === selectedStudent);
                
                return (
                  <div key={area.name} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={area.color}>
                        {area.name}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {area.subjects.map(subject => {
                        const absences = studentAtt?.absences[subject] || 0;

                        return (
                          <div key={subject} className="space-y-1">
                            <Label className="text-sm">{subject}</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Número de faltas"
                              value={absences}
                              onChange={(e) => updateAbsences(selectedStudent, subject, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

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
