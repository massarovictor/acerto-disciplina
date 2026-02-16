import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BookOpen, Calendar } from 'lucide-react';
import { Student, Grade, Incident, AttendanceRecord } from '@/types';
import { SUBJECT_AREAS } from '@/lib/subjects';

interface StudentSlide2Props {
  student: Student;
  grades: Grade[];
  incidents: Incident[];
  attendance: AttendanceRecord[];
}

export const StudentSlide2 = ({ student, grades, incidents, attendance }: StudentSlide2Props) => {
  const studentGrades = grades.filter(g => g.studentId === student.id);
  const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id)).slice(0, 6);
  const studentAttendance = attendance.filter(a => a.studentId === student.id);

  // Calculate grades by subject area
  const gradesByArea = SUBJECT_AREAS.map(area => {
    const areaGrades = studentGrades.filter(g => area.subjects.includes(g.subject));
    const average = areaGrades.length > 0
      ? areaGrades.reduce((sum, g) => sum + g.grade, 0) / areaGrades.length
      : 0;

    return {
      area: area.name,
      average,
      color: area.color
    };
  });

  // Find best and worst subjects
  const subjectPerformance = studentGrades.map(g => ({
    subject: g.subject,
    grade: g.grade,
    quarter: g.quarter
  })).sort((a, b) => b.grade - a.grade);

  const bestSubjects = subjectPerformance.slice(0, 3);
  const worstSubjects = subjectPerformance.slice(-3).reverse();

  // Count absences
  const totalAbsences = studentAttendance.filter(
    a => a.status === 'falta' || a.status === 'falta_justificada' || a.status === 'atestado'
  ).length;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{student.name} - Distribuição por Disciplina</h1>
        <p className="text-sm text-muted-foreground">Diagnóstico completo de desempenho e comportamento</p>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-5 gap-6">
        {/* Left Column (60%) - Academic Performance */}
        <div className="col-span-3 space-y-4">
          {/* Radar Chart Representation */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Desempenho por Área de Conhecimento</h3>
              </div>
              
              <div className="space-y-3">
                {gradesByArea.map((area, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{area.area}</span>
                      <Badge 
                        variant={area.average >= 7 ? 'default' : area.average >= 6 ? 'secondary' : 'destructive'}
                      >
                        {area.average > 0 ? area.average.toFixed(1) : '-'}
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          area.average >= 7 ? 'bg-success/100' :
                          area.average >= 6 ? 'bg-warning/100' :
                          'bg-destructive/100'
                        }`}
                        style={{ width: `${area.average > 0 ? (area.average / 10) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best/Worst Subjects */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-success/10 backdrop-blur border-success/30">
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold mb-3">Melhores Disciplinas</h4>
                <div className="space-y-2">
                  {bestSubjects.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{item.subject}</span>
                      <Badge variant="default" className="ml-2">{item.grade.toFixed(1)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 backdrop-blur border-destructive/30">
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Requerem Atenção
                </h4>
                <div className="space-y-2">
                  {worstSubjects.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{item.subject}</span>
                      <Badge variant="destructive" className="ml-2">{item.grade.toFixed(1)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (40%) - Incidents and Diagnosis */}
        <div className="col-span-2 space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 text-sm">Ocorrências Recentes</h3>
              {studentIncidents.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {studentIncidents.map((incident, index) => (
                    <div key={index} className="p-2 bg-background/50 rounded text-xs border-l-2 border-primary">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">
                          {new Date(incident.date).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {incident.finalSeverity}
                        </Badge>
                      </div>
                      <p className="line-clamp-2">{incident.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma ocorrência registrada
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Frequência</h3>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">{totalAbsences}</p>
                <p className="text-xs text-muted-foreground">falta(s) registrada(s)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 text-sm">Diagnóstico</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium text-primary mb-1">Forças:</p>
                  <ul className="text-muted-foreground space-y-0.5 ml-3">
                    <li>• Desempenho destacado em {bestSubjects[0]?.subject || 'várias disciplinas'}</li>
                    <li>• Média geral {(studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length).toFixed(1)}</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-destructive mb-1">Atenção:</p>
                  <ul className="text-muted-foreground space-y-0.5 ml-3">
                    <li>• Necessita reforço em {worstSubjects[0]?.subject || 'algumas áreas'}</li>
                    {totalAbsences > 10 && <li>• Taxa de faltas elevada</li>}
                    {studentIncidents.length > 3 && <li>• Múltiplas ocorrências disciplinares</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 backdrop-blur border-primary/20">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 text-sm">Recomendações</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Acompanhamento em {worstSubjects[0]?.subject || 'disciplinas específicas'}</li>
                <li>• Reforço escolar se necessário</li>
                {studentIncidents.length > 0 && <li>• Reunião com responsáveis</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};