import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useClasses, useStudents, useAttendance } from '@/hooks/useLocalStorage';
import { Calendar, Save, Check, X, FileText, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AttendanceManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { addAttendance } = useAttendance();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'justified' | 'medical'>>({});

  const classStudents = students.filter(s => s.classId === selectedClass);

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
      });
    });

    toast({
      title: 'Sucesso',
      description: 'Frequência registrada com sucesso.',
    });

    setAttendanceRecords({});
  };

  const toggleStatus = (studentId: string) => {
    const currentStatus = attendanceRecords[studentId] || 'present';
                const nextStatus = currentStatus === 'present' ? 'falta' :
                      currentStatus === 'falta' ? 'falta_justificada' :
                      currentStatus === 'falta_justificada' ? 'atestado' : 'presente';
    
    setAttendanceRecords(prev => ({ ...prev, [studentId]: nextStatus }));
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'presente': return <Check className="h-4 w-4 text-severity-light" />;
      case 'falta': return <X className="h-4 w-4 text-severity-critical" />;
      case 'falta_justificada': return <FileText className="h-4 w-4 text-severity-intermediate" />;
      case 'atestado': return <Heart className="h-4 w-4 text-status-analysis" />;
      default: return <Check className="h-4 w-4 text-severity-light" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'presente': return <Badge className="bg-severity-light-bg text-severity-light border-severity-light">Presente</Badge>;
      case 'falta': return <Badge className="bg-severity-critical-bg text-severity-critical border-severity-critical">Falta</Badge>;
      case 'falta_justificada': return <Badge className="bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate">Justificada</Badge>;
      case 'atestado': return <Badge className="bg-status-analysis/10 text-status-analysis border-status-analysis">Atestado</Badge>;
      default: return <Badge className="bg-severity-light-bg text-severity-light border-severity-light">Presente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
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
                  {classes.filter(c => c.active).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                Registrando frequência de <strong>{new Date(date).toLocaleDateString('pt-BR')}</strong> para{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Marcar Presença ({classStudents.length} alunos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-muted-foreground">
                Clique no aluno para alternar entre: Presente → Falta → Justificada → Atestado
              </p>
            </div>

            <div className="space-y-2">
              {classStudents.map(student => {
                const status = attendanceRecords[student.id] || 'presente';
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStatus(student.id)}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getStatusIcon(status)}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">Matrícula: {student.enrollment}</p>
                      </div>
                    </div>
                    {getStatusBadge(status)}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Frequência
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const allPresent: Record<string, 'presente'> = {};
                  classStudents.forEach(s => allPresent[s.id] = 'presente');
                  setAttendanceRecords(allPresent);
                }}
              >
                Marcar Todos Presentes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
