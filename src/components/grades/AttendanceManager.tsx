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
import { Calendar, Save, Check, X, FileText, Heart, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QUARTERS, getAllSubjects } from '@/lib/subjects';

type AttendanceStatus = 'presente' | 'falta' | 'falta_justificada' | 'atestado';

interface StudentAttendance {
  studentId: string;
  attendance: Record<string, AttendanceStatus>; // subject -> status
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

  // Initialize attendance when class or date changes
  useEffect(() => {
    if (selectedClass && date) {
      const initialAttendances = classStudents.map(student => {
        const studentAttendanceData: Record<string, AttendanceStatus> = {};
        
        allSubjects.forEach(subject => {
          const existingAttendance = attendance.find(
            a => a.studentId === student.id && 
                 a.date === date && 
                 a.classId === selectedClass
          );
          studentAttendanceData[subject] = existingAttendance?.status || 'presente';
        });

        return {
          studentId: student.id,
          attendance: studentAttendanceData,
        };
      });

      setStudentAttendances(initialAttendances);
    }
  }, [selectedClass, date, classStudents, attendance]);

  const handleSubmit = () => {
    if (!selectedClass || studentAttendances.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma e marque a presença dos alunos.',
        variant: 'destructive',
      });
      return;
    }

    let savedCount = 0;
    studentAttendances.forEach(studentAtt => {
      Object.entries(studentAtt.attendance).forEach(([subject, status]) => {
        addAttendance({
          studentId: studentAtt.studentId,
          classId: selectedClass,
          date,
          status,
          recordedBy: '1',
        });
        savedCount++;
      });
    });

    toast({
      title: 'Frequência registrada',
      description: `${savedCount} registros salvos com sucesso.`,
    });
  };

  const toggleStatus = (studentId: string, subject: string) => {
    setStudentAttendances(prev =>
      prev.map(sa => {
        if (sa.studentId === studentId) {
          const currentStatus = sa.attendance[subject] || 'presente';
          const nextStatus: AttendanceStatus = 
            currentStatus === 'presente' ? 'falta' :
            currentStatus === 'falta' ? 'falta_justificada' :
            currentStatus === 'falta_justificada' ? 'atestado' : 'presente';
          
          return {
            ...sa,
            attendance: { ...sa.attendance, [subject]: nextStatus }
          };
        }
        return sa;
      })
    );
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return <Check className="h-4 w-4 text-severity-light" />;
      case 'falta': return <X className="h-4 w-4 text-severity-critical" />;
      case 'falta_justificada': return <FileText className="h-4 w-4 text-severity-intermediate" />;
      case 'atestado': return <Heart className="h-4 w-4 text-status-analysis" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'bg-severity-light/10 hover:bg-severity-light/20';
      case 'falta': return 'bg-severity-critical/10 hover:bg-severity-critical/20';
      case 'falta_justificada': return 'bg-severity-intermediate/10 hover:bg-severity-intermediate/20';
      case 'atestado': return 'bg-status-analysis/10 hover:bg-status-analysis/20';
    }
  };

  const markAllPresent = () => {
    setStudentAttendances(prev =>
      prev.map(sa => ({
        ...sa,
        attendance: Object.fromEntries(
          Object.keys(sa.attendance).map(subject => [subject, 'presente' as AttendanceStatus])
        )
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
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
              <Label>Bimestre</Label>
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

            <div className="space-y-2">
              <Label htmlFor="date">Data da Aula *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {selectedClass && (
            <Alert className="mt-4">
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Registrando frequência de <strong>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> para{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong> ({selectedQuarter})
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
              <CardTitle>Registro de Frequência</CardTitle>
              <Button variant="outline" size="sm" onClick={markAllPresent}>
                <Check className="h-4 w-4 mr-2" />
                Marcar Todos Presentes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 w-[180px]">
                      Aluno
                    </TableHead>
                    {allSubjects.map(subject => (
                      <TableHead key={subject} className="text-center w-[70px] p-1">
                        <div className="flex flex-col items-center">
                          <div className="text-[10px] font-medium leading-tight text-center max-w-[70px] break-words">
                            {subject.length > 12 ? subject.substring(0, 12) + '...' : subject}
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
                        <TableCell className="sticky left-0 bg-background z-10 p-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              {student.photoUrl ? (
                                <AvatarImage src={student.photoUrl} alt={student.name} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-[10px]">
                                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs truncate" title={student.name}>
                                {student.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {student.enrollment || 'S/N'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {allSubjects.map(subject => {
                          const status = studentAtt?.attendance[subject] || 'presente';

                          return (
                            <TableCell key={subject} className="p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`w-full h-10 p-0 ${getStatusColor(status)}`}
                                onClick={() => toggleStatus(student.id, subject)}
                                title={`${subject} - ${student.name}`}
                              >
                                {getStatusIcon(status)}
                              </Button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="font-medium">Clique para alternar:</span>
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 text-severity-light" />
                <span>Presente</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-3 w-3 text-severity-critical" />
                <span>Falta</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-severity-intermediate" />
                <span>Justificada</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-3 w-3 text-status-analysis" />
                <span>Atestado</span>
              </div>
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
