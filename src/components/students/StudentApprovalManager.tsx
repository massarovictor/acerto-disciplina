import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClasses, useStudents, useGrades } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { calculateClassAcademicStatus } from '@/lib/approvalCalculator';
import { getAcademicYear } from '@/lib/classYearCalculator';
import { checkAndGenerateIncidents } from '@/lib/autoIncidentGenerator';
import { useIncidents } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const StudentApprovalManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { grades } = useGrades();
  const { incidents, addIncident } = useIncidents();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [academicStatuses, setAcademicStatuses] = useState<Record<string, any>>({});

  const classStudents = students.filter((s) => s.classId === selectedClass);
  const selectedClassData = classes.find((c) => c.id === selectedClass);

  const handleCalculateStatuses = () => {
    if (!selectedClass || !selectedClassData) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma primeiro.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedClassData.startYearDate || !selectedClassData.currentYear) {
      toast({
        title: 'Erro',
        description: 'Esta turma não possui dados de ano letivo configurados.',
        variant: 'destructive',
      });
      return;
    }

    const academicYear = getAcademicYear(
      selectedClassData.startYearDate,
      selectedClassData.currentYear
    );

    const studentIds = classStudents.map((s) => s.id);
    const statuses = calculateClassAcademicStatus(
      grades,
      studentIds,
      selectedClass,
      academicYear
    );

    const statusesMap: Record<string, any> = {};
    statuses.forEach((status) => {
      statusesMap[status.studentId] = status;
    });

    setAcademicStatuses(statusesMap);

    toast({
      title: 'Status calculado',
      description: `Status acadêmico calculado para ${statuses.length} aluno(s).`,
    });
  };

  const handleGenerateIncidents = () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      return;
    }

    const newIncidents = checkAndGenerateIncidents(
      grades,
      students,
      classes,
      incidents,
      user.id
    );

    if (newIncidents.length === 0) {
      toast({
        title: 'Nenhuma ocorrência gerada',
        description: 'Não há alunos que atendam aos critérios para geração automática de ocorrências.',
      });
      return;
    }

    // Adicionar ocorrências
    newIncidents.forEach((incident) => {
      addIncident(incident);
    });

    toast({
      title: 'Ocorrências geradas',
      description: `${newIncidents.length} ocorrência(s) gerada(s) automaticamente.`,
    });
  };

  const getStatusBadge = (status: 'approved' | 'recovery' | 'failed') => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'recovery':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Recuperação
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Reprovado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aprovação/Reprovação de Alunos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {classes
                  .filter((c) => !c.archived && c.active)
                  .map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.classNumber} - {cls.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selectedClass && (
              <>
                <Button onClick={handleCalculateStatuses}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Calcular Status
                </Button>
                <Button variant="outline" onClick={handleGenerateIncidents}>
                  Verificar e Gerar Ocorrências
                </Button>
              </>
            )}
          </div>

          {selectedClassData && (
            <Alert>
              <AlertDescription>
                <strong>Turma:</strong> {selectedClassData.name} |{' '}
                <strong>Ano Atual:</strong> {selectedClassData.currentYear || 'Não definido'} |{' '}
                <strong>Alunos:</strong> {classStudents.length}
              </AlertDescription>
            </Alert>
          )}

          {Object.keys(academicStatuses).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resultados do Cálculo</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Disciplinas Abaixo da Média</TableHead>
                    <TableHead>Média Geral</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => {
                    const status = academicStatuses[student.id];
                    if (!status) return null;

                    const averageGrades = Object.values(status.finalGrades) as number[];
                    const overallAverage =
                      averageGrades.length > 0
                        ? averageGrades.reduce((a, b) => a + b, 0) / averageGrades.length
                        : 0;

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{getStatusBadge(status.status)}</TableCell>
                        <TableCell>
                          {status.subjectsBelowAverage.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {status.subjectsBelowAverage.map((subject: string) => (
                                <Badge
                                  key={subject}
                                  variant="outline"
                                  className="bg-red-500/10 text-red-700 border-red-500/30"
                                >
                                  {subject}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Nenhuma</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <strong>{overallAverage.toFixed(1)}</strong>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

