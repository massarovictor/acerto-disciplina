import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useClasses, useStudents, useAttendance } from '@/hooks/useLocalStorage';
import { Calendar, Save, Check, X, FileText, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QUARTERS } from '@/lib/subjects';

type AttendanceStatus = 'presente' | 'falta' | 'falta_justificada' | 'atestado';

export const AttendanceManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { attendance, addAttendance } = useAttendance();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});

  const classStudents = students.filter(s => s.classId === selectedClass);

  // Load existing attendance when date or class changes
  useEffect(() => {
    if (selectedClass && date) {
      const existingRecords: Record<string, AttendanceStatus> = {};
      classStudents.forEach(student => {
        const existingAttendance = attendance.find(
          a => a.studentId === student.id && 
               a.date === date && 
               a.classId === selectedClass
        );
        existingRecords[student.id] = existingAttendance?.status || 'presente';
      });
      setAttendanceRecords(existingRecords);
    }
  }, [selectedClass, date, classStudents, attendance]);

  const handleSubmit = () => {
    if (!selectedClass || Object.keys(attendanceRecords).length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma e marque a presença dos alunos.',
        variant: 'destructive',
      });
      return;
    }

    Object.entries(attendanceRecords).forEach(([studentId, status]) => {
      addAttendance({
        studentId,
        classId: selectedClass,
        date,
        status,
        recordedBy: '1', // Mock user ID
      });
    });

    const absences = Object.values(attendanceRecords).filter(s => s === 'falta').length;
    const justified = Object.values(attendanceRecords).filter(s => s === 'falta_justificada' || s === 'atestado').length;

    toast({
      title: 'Frequência registrada',
      description: `${Object.keys(attendanceRecords).length} registros salvos. ${absences} falta(s), ${justified} justificada(s).`,
    });
  };

  const toggleStatus = (studentId: string) => {
    const currentStatus = attendanceRecords[studentId] || 'presente';
    const nextStatus: AttendanceStatus = 
      currentStatus === 'presente' ? 'falta' :
      currentStatus === 'falta' ? 'falta_justificada' :
      currentStatus === 'falta_justificada' ? 'atestado' : 'presente';
    
    setAttendanceRecords(prev => ({ ...prev, [studentId]: nextStatus }));
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return <Check className="h-5 w-5 text-severity-light" />;
      case 'falta': return <X className="h-5 w-5 text-severity-critical" />;
      case 'falta_justificada': return <FileText className="h-5 w-5 text-severity-intermediate" />;
      case 'atestado': return <Heart className="h-5 w-5 text-status-analysis" />;
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': 
        return <Badge className="bg-severity-light-bg text-severity-light border-severity-light">Presente</Badge>;
      case 'falta': 
        return <Badge className="bg-severity-critical-bg text-severity-critical border-severity-critical">Falta</Badge>;
      case 'falta_justificada': 
        return <Badge className="bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate">Justificada</Badge>;
      case 'atestado': 
        return <Badge className="bg-status-analysis/10 text-status-analysis border-status-analysis">Atestado</Badge>;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'border-severity-light bg-severity-light/5';
      case 'falta': return 'border-severity-critical bg-severity-critical/5';
      case 'falta_justificada': return 'border-severity-intermediate bg-severity-intermediate/5';
      case 'atestado': return 'border-status-analysis bg-status-analysis/5';
    }
  };

  // Stats calculation
  const stats = {
    present: Object.values(attendanceRecords).filter(s => s === 'presente').length,
    absent: Object.values(attendanceRecords).filter(s => s === 'falta').length,
    justified: Object.values(attendanceRecords).filter(s => s === 'falta_justificada').length,
    medical: Object.values(attendanceRecords).filter(s => s === 'atestado').length,
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
                  {classes.filter(c => c.active).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
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

      {/* Stats */}
      {selectedClass && Object.keys(attendanceRecords).length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-severity-light/10 rounded-lg">
                  <Check className="h-5 w-5 text-severity-light" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Presentes</p>
                  <p className="text-2xl font-bold">{stats.present}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-severity-critical/10 rounded-lg">
                  <X className="h-5 w-5 text-severity-critical" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faltas</p>
                  <p className="text-2xl font-bold">{stats.absent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-severity-intermediate/10 rounded-lg">
                  <FileText className="h-5 w-5 text-severity-intermediate" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Justificadas</p>
                  <p className="text-2xl font-bold">{stats.justified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-status-analysis/10 rounded-lg">
                  <Heart className="h-5 w-5 text-status-analysis" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atestados</p>
                  <p className="text-2xl font-bold">{stats.medical}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance List */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Marcar Presença ({classStudents.length} alunos)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allPresent: Record<string, AttendanceStatus> = {};
                  classStudents.forEach(s => allPresent[s.id] = 'presente');
                  setAttendanceRecords(allPresent);
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar Todos Presentes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-muted-foreground">
                Clique no aluno para alternar: <strong>Presente</strong> → <strong>Falta</strong> → <strong>Justificada</strong> → <strong>Atestado</strong>
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {classStudents.map(student => {
                const status = attendanceRecords[student.id] || 'presente';
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStatus(student.id)}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer hover:shadow-md transition-all ${getStatusColor(status)}`}
                  >
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
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.enrollment || 'Sem matrícula'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-background">
                        {getStatusIcon(status)}
                      </div>
                      {getStatusBadge(status)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Frequência
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
