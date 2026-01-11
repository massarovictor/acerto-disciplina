import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClasses, useStudents, useAttendance } from '@/hooks/useData';
import { AlertTriangle, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  QUARTERS
} from '@/lib/subjects';

const STATUS_LABELS = {
  presente: 'Presente',
  falta: 'Falta',
  falta_justificada: 'Falta Justificada',
  atestado: 'Atestado',
};

type AttendanceStatus = keyof typeof STATUS_LABELS;

const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const addYears = (date: Date, years: number) => {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

const getQuarterRange = (
  startYearDate: string | undefined,
  schoolYear: number | undefined,
  quarter: string
) => {
  if (!startYearDate) return null;
  const index = QUARTERS.indexOf(quarter);
  if (index < 0) return null;

  const startDate = parseLocalDate(startYearDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const yearOffset = (schoolYear ?? 1) - 1;
  const currentYearStart = addYears(startDate, yearOffset);
  const rangeStart = addMonths(currentYearStart, index * 2);
  const rangeEnd = addMonths(currentYearStart, index * 2 + 2);

  return { start: rangeStart, end: rangeEnd };
};

const isDateInRange = (value: string, range: { start: Date; end: Date } | null) => {
  if (!range) return true;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date < range.end;
};

const formatDate = (value: string) => parseLocalDate(value).toLocaleDateString('pt-BR');

export const AttendanceManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { attendance, addAttendance, deleteAttendance } = useAttendance();
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<{
    date: string;
    status: AttendanceStatus;
  }>({
    date: '',
    status: 'falta',
  });

  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClass), [students, selectedClass]);
  const selectedClassData = classes.find(c => c.id === selectedClass);

  const schoolYearOptions: Array<{ value: 1 | 2 | 3; label: string }> = [
    { value: 1, label: '1º ano' },
    { value: 2, label: '2º ano' },
    { value: 3, label: '3º ano' },
  ];

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSchoolYear(1);
      return;
    }
    const defaultYear = selectedClassData?.currentYear ?? 1;
    const normalizedYear = [1, 2, 3].includes(defaultYear as number)
      ? (defaultYear as 1 | 2 | 3)
      : 1;
    setSelectedSchoolYear(normalizedYear);
  }, [selectedClass, selectedClassData?.currentYear]);

  const isClassArchived = selectedClassData?.archived === true;
  const isClassInactive = selectedClassData?.active === false;
  const isClassLocked = isClassArchived || isClassInactive;

  const fallbackStartYearDate =
    selectedClassData?.startCalendarYear ? `${selectedClassData.startCalendarYear}-02-01` : undefined;
  const effectiveStartYearDate = selectedClassData?.startYearDate || fallbackStartYearDate;

  const quarterRange = useMemo(
    () =>
      getQuarterRange(
        effectiveStartYearDate,
        selectedSchoolYear,
        selectedQuarter
      ),
    [effectiveStartYearDate, selectedSchoolYear, selectedQuarter]
  );

  const classAttendance = useMemo(() => {
    if (!selectedClass) return [];
    return attendance.filter(
      record => record.classId === selectedClass && isDateInRange(record.date, quarterRange)
    );
  }, [attendance, selectedClass, quarterRange]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, typeof classAttendance>();
    classAttendance.forEach(record => {
      const list = map.get(record.studentId) || [];
      list.push(record);
      map.set(record.studentId, list);
    });
    return map;
  }, [classAttendance]);

  const selectedStudentRecords = useMemo(() => {
    if (!selectedStudent) return [];
    const records = attendanceByStudent.get(selectedStudent) || [];
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceByStudent, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) return;
    const today = new Date().toISOString().slice(0, 10);
    setAttendanceForm({
      date: today,
      status: 'falta',
    });
  }, [selectedStudent]);

  const handleAddAttendance = async () => {
    if (!selectedStudent || !selectedClass || !attendanceForm.date) {
      toast({
        title: 'Erro',
        description: 'Selecione a data e o aluno para registrar a frequência.',
        variant: 'destructive',
      });
      return;
    }

    if (isClassLocked) {
      toast({
        title: 'Turma bloqueada',
        description: isClassArchived
          ? 'Esta turma está arquivada e não aceita frequência.'
          : 'Esta turma está inativa e não aceita frequência.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addAttendance({
        studentId: selectedStudent,
        classId: selectedClass,
        date: attendanceForm.date,
        status: attendanceForm.status,
        recordedBy: user?.id || 'system',
      });

      toast({
        title: 'Frequência registrada',
        description: 'Registro adicionado com sucesso.',
      });

      setAttendanceForm((prev) => ({
        ...prev,
        status: 'falta',
      }));
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a frequência.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (isClassLocked) return;
    try {
      await deleteAttendance(id);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      });
    }
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
                    classes
                      .filter(cls => cls.active && !cls.archived)
                      .map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano da turma *</Label>
              <Select
                value={String(selectedSchoolYear)}
                onValueChange={(value) => setSelectedSchoolYear(Number(value) as 1 | 2 | 3)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYearOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
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

          {isClassLocked && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isClassArchived
                  ? 'Esta turma está arquivada. Não é possível registrar frequência para turmas arquivadas.'
                  : 'Esta turma está inativa. Não é possível registrar frequência para turmas inativas.'}
              </AlertDescription>
            </Alert>
          )}

          {selectedClass && !isClassLocked && (
            <Alert className="mt-4">
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Registrando faltas do <strong>{selectedQuarter}</strong> no{' '}
                <strong>{selectedSchoolYear}º ano</strong> para{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>
              </AlertDescription>
            </Alert>
          )}

          {selectedClass && !selectedClassData?.startYearDate && (
            <Alert className="mt-4">
              <AlertDescription>
                {fallbackStartYearDate
                  ? `Data de início não definida. Usando ${new Date(`${fallbackStartYearDate}T00:00:00`).toLocaleDateString('pt-BR')} como padrão.`
                  : 'Defina a data de início da turma para organizar os registros por bimestre. Sem essa data, todos os registros serão exibidos.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Students List */}
      {selectedClass && classStudents.length > 0 && !isClassLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos - Clique para Registrar Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classStudents.map((student) => {
                const records = attendanceByStudent.get(student.id) || [];
                const totalAbsences = records.filter(
                  record => record.status !== 'presente'
                ).length;
                const totalRecords = records.length;

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
                            {totalAbsences} falta(s) em {totalRecords} registro(s)
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
                  Registre a data e o status da frequência no <strong>{selectedQuarter}</strong> do{' '}
                  <strong>{selectedSchoolYear}º ano</strong>.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="attendance-date">Data *</Label>
                    <Input
                      id="attendance-date"
                      type="date"
                      value={attendanceForm.date}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attendance-status">Status *</Label>
                    <Select
                      value={attendanceForm.status}
                      onValueChange={(value) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          status: value as AttendanceStatus,
                        }))
                      }
                    >
                      <SelectTrigger id="attendance-status">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presente">Presente</SelectItem>
                        <SelectItem value="falta">Falta</SelectItem>
                        <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                        <SelectItem value="atestado">Atestado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddAttendance} className="w-full">
                  Registrar Frequência
                </Button>

                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm text-muted-foreground">
                    Registros do {selectedQuarter} ({selectedSchoolYear}º ano)
                  </Label>
                  {selectedStudentRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum registro encontrado para este bimestre.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudentRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {formatDate(record.date)}
                            </span>
                            <Badge variant="outline">
                              {STATUS_LABELS[record.status as AttendanceStatus]}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAttendance(record.id)}
                            title="Excluir registro"
                          >
                            <Trash2 className="h-4 w-4 text-severity-critical" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedStudent(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedClass && classStudents.length === 0 && !isClassLocked && (
        <Alert>
          <AlertDescription>
            Nenhum aluno cadastrado nesta turma. Cadastre alunos para registrar frequência.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
