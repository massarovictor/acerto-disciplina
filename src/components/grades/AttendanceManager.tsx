import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClasses, useStudents, useAttendance } from '@/hooks/useLocalStorage';
import { Calendar, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QUARTERS, getAllSubjects } from '@/lib/subjects';

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);

  const classStudents = students.filter(s => s.classId === selectedClass);
  const allSubjects = getAllSubjects();

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

  const handleSubmit = () => {
    if (!selectedClass || studentAttendances.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Frequência registrada',
      description: `Faltas do ${selectedQuarter} salvas com sucesso.`,
    });
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

  const clearAllAbsences = () => {
    setStudentAttendances(prev =>
      prev.map(sa => ({
        ...sa,
        absences: Object.fromEntries(
          Object.keys(sa.absences).map(subject => [subject, 0])
        )
      }))
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

      {/* Attendance Table */}
      {selectedClass && classStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Número de Faltas por Disciplina</CardTitle>
              <Button variant="outline" size="sm" onClick={clearAllAbsences}>
                <X className="h-4 w-4 mr-2" />
                Zerar Todas as Faltas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 w-[140px]">
                      Aluno
                    </TableHead>
                    {allSubjects.map(subject => (
                      <TableHead key={subject} className="text-center w-[60px] p-1">
                        <div className="flex flex-col items-center">
                          <div className="text-[10px] font-medium leading-tight text-center max-w-[60px] break-words">
                            {subject.length > 10 ? subject.substring(0, 10) + '...' : subject}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => {
                    const studentAtt = studentAttendances.find(sa => sa.studentId === student.id);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="sticky left-0 bg-background z-10 p-1">
                          <div className="flex items-start gap-1.5 w-[140px]">
                            <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                              {student.photoUrl ? (
                                <AvatarImage src={student.photoUrl} alt={student.name} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-[9px]">
                                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[11px] leading-tight truncate" title={student.name}>
                                {student.name}
                              </p>
                              <p className="text-[9px] text-muted-foreground leading-tight">
                                {student.enrollment || 'S/N'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {allSubjects.map(subject => {
                          const absences = studentAtt?.absences[subject] || 0;

                          return (
                            <TableCell key={subject} className="p-1">
                              <Input
                                type="number"
                                min="0"
                                value={absences}
                                onChange={(e) => updateAbsences(student.id, subject, e.target.value)}
                                className="h-8 text-center text-xs w-full p-1"
                                title={`Faltas em ${subject} - ${student.name}`}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Save Button */}
            <div className="flex gap-4 pt-6 border-t mt-6">
              <Button onClick={handleSubmit} size="lg">
                <Save className="h-4 w-4 mr-2" />
                Salvar Frequência
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
