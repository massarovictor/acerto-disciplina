import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Users, FileDown, UserCheck, FileText } from 'lucide-react';
import { Class, Student, Incident } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useProfessionalSubjects, useGrades, useAttendance } from '@/hooks/useLocalStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PrintableClassReport } from '@/components/reports/PrintableClassReport';

interface IntegratedReportsProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
}

export const IntegratedReports = ({ classes, students, incidents }: IntegratedReportsProps) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [showPrintable, setShowPrintable] = useState(false);
  const { toast } = useToast();
  const { grades } = useGrades();
  const { attendance } = useAttendance();
  const { getProfessionalSubjects } = useProfessionalSubjects();

  const selectedClassData = useMemo(
    () => classes.find(cls => cls.id === selectedClass) || null,
    [classes, selectedClass]
  );

  const classStudents = useMemo(
    () => (selectedClass ? students.filter(s => s.classId === selectedClass) : []),
    [selectedClass, students]
  );

  const classGrades = useMemo(
    () => (selectedClass ? grades.filter(g => g.classId === selectedClass) : []),
    [grades, selectedClass]
  );

  const classIncidents = useMemo(
    () => (selectedClass ? incidents.filter(i => i.classId === selectedClass) : []),
    [incidents, selectedClass]
  );

  const classAttendance = useMemo(
    () => (selectedClass ? attendance.filter(a => a.classId === selectedClass) : []),
    [attendance, selectedClass]
  );

  const professionalSubjects = selectedClass ? getProfessionalSubjects(selectedClass) : [];

  const classAverage = classGrades.length > 0
    ? classGrades.reduce((sum, grade) => sum + grade.grade, 0) / classGrades.length
    : 0;

  const selectedStudentData = selectedStudent
    ? classStudents.find(student => student.id === selectedStudent) || null
    : null;

  const selectedStudentMetrics = useMemo(() => {
    if (!selectedStudentData) return null;

    const studentGrades = classGrades.filter(g => g.studentId === selectedStudentData.id);
    const subjects = [...new Set(studentGrades.map(g => g.subject))];
    const subjectAverages = subjects.map(subject => {
      const gradesBySubject = studentGrades.filter(g => g.subject === subject);
      const average = gradesBySubject.length > 0
        ? gradesBySubject.reduce((sum, g) => sum + g.grade, 0) / gradesBySubject.length
        : 0;
      return { subject, average };
    });

    const overallAverage = subjectAverages.length > 0
      ? subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length
      : 0;

    const subjectsBelowAverage = subjectAverages
      .filter(s => s.average < 6)
      .map(s => s.subject);

    const studentIncidents = classIncidents.filter(i => i.studentIds.includes(selectedStudentData.id));
    const studentAttendance = classAttendance.filter(a => a.studentId === selectedStudentData.id);
    const absences = studentAttendance.filter(a => a.status !== 'presente').length;
    const presenceRate = studentAttendance.length > 0
      ? ((studentAttendance.length - absences) / studentAttendance.length) * 100
      : 100;

    return {
      average: overallAverage,
      subjectsBelowAverage,
      incidents: studentIncidents.length,
      absences,
      presenceRate,
    };
  }, [selectedStudentData, classGrades, classIncidents, classAttendance]);

  const handleGenerateClassReport = async () => {
    if (!selectedClassData) {
      toast({
        variant: 'destructive',
        title: 'Selecione uma turma',
        description: 'Escolha a turma para gerar o relatório.',
      });
      return;
    }

    try {
      const { generateCompleteAcademicReport } = await import('@/lib/advancedPdfExport');
      const pdf = await generateCompleteAcademicReport(
        classGrades,
        classStudents,
        classIncidents,
        classAttendance,
        selectedClassData,
        professionalSubjects
      );
      const fileName = `relatorio-turma-${selectedClassData.name}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Relatório gerado',
        description: `O PDF "${fileName}" foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
      });
    }
  };

  const handleIndividualReport = () => {
    if (!selectedClassData || !selectedStudentData) {
      toast({
        variant: 'destructive',
        title: 'Selecione a turma e o aluno',
        description: 'Escolha o aluno que receberá o relatório individual.',
      });
      return;
    }

    toast({
      title: 'Em breve',
      description: 'O relatório individual em PDF está em implementação.',
    });
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Relatório de Turma
              </CardTitle>
              <CardDescription>
                Gera um PDF completo com panorama, destaques, rankings e análises por área.
              </CardDescription>
            </div>
            {selectedClassData && (
              <Badge variant="secondary">{selectedClassData.name}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Selecione a turma</Label>
            <Select value={selectedClass} onValueChange={(value) => {
              setSelectedClass(value);
              setSelectedStudent('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a turma" />
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
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedClassData ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span>Total de alunos</span>
                <span className="font-semibold text-foreground">{classStudents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Média geral</span>
                <span className="font-semibold text-foreground">{classAverage.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ocorrências registradas</span>
                <span className="font-semibold text-foreground">{classIncidents.length}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Escolha uma turma para visualizar o resumo e habilitar o download do PDF.
            </p>
          )}

          <Button className="w-full" onClick={handleGenerateClassReport} disabled={!selectedClass}>
            <FileDown className="mr-2 h-4 w-4" />
            Gerar PDF da Turma
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!selectedClassData}
            onClick={() => setShowPrintable(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Visualizar relatório em página
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Relatório Individual
              </CardTitle>
              <CardDescription>
                Selecione um estudante para preparar o relatório personalizado (em breve).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={selectedClass} onValueChange={(value) => {
              setSelectedClass(value);
              setSelectedStudent('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a turma" />
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
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Aluno</Label>
            <Select
              value={selectedStudent}
              onValueChange={setSelectedStudent}
              disabled={!selectedClass}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedClass ? 'Escolha o aluno' : 'Selecione a turma primeiro'} />
              </SelectTrigger>
              <SelectContent>
                {classStudents.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Nenhum aluno encontrado
                  </div>
                ) : (
                  classStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedStudentData && selectedStudentMetrics && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumo</p>
                <p className="font-semibold text-foreground">{selectedStudentData.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Média geral</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedStudentMetrics.average.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ocorrências</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedStudentMetrics.incidents}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disciplinas &lt; 6</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedStudentMetrics.subjectsBelowAverage.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Presença</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedStudentMetrics.presenceRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              {selectedStudentMetrics.subjectsBelowAverage.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Disciplinas em atenção
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedStudentMetrics.subjectsBelowAverage.join(', ')}
                  </p>
                </>
              )}
            </div>
          )}

          <Button
            className="w-full"
            variant="secondary"
            onClick={handleIndividualReport}
            disabled={!selectedStudent}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Gerar Relatório Individual
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            O modelo individual seguirá o plano aprovado: capa, histórico, áreas, frequência, risco e plano de ação.
          </p>
        </CardContent>
      </Card>
    </div>
    <Dialog open={showPrintable} onOpenChange={setShowPrintable}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório para impressão</DialogTitle>
        </DialogHeader>
        {selectedClassData && (
          <PrintableClassReport
            classData={selectedClassData}
            students={classStudents}
            grades={classGrades}
            incidents={classIncidents}
            attendance={classAttendance}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
