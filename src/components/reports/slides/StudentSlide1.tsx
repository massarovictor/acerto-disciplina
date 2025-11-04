import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { Student, Grade, Incident } from '@/types';
import { QUARTERS } from '@/lib/subjects';

interface StudentSlide1Props {
  student: Student;
  grades: Grade[];
  incidents: Incident[];
}

export const StudentSlide1 = ({ student, grades, incidents }: StudentSlide1Props) => {
  const studentGrades = grades.filter(g => g.studentId === student.id);
  const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id));

  const overallAverage = studentGrades.length > 0
    ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
    : 0;

  const gradesByQuarter = QUARTERS.map(quarter => {
    const quarterGrades = studentGrades.filter(g => g.quarter === quarter);
    return {
      quarter,
      average: quarterGrades.length > 0
        ? quarterGrades.reduce((sum, g) => sum + g.grade, 0) / quarterGrades.length
        : 0
    };
  });

  const trend = gradesByQuarter.length >= 2 && gradesByQuarter[0].average > 0 && gradesByQuarter[gradesByQuarter.length - 1].average > 0
    ? gradesByQuarter[gradesByQuarter.length - 1].average - gradesByQuarter[0].average
    : 0;

  const disciplinesBelow6 = studentGrades.filter(g => g.grade < 6).length;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-1">{student.name}</h1>
        <p className="text-sm text-muted-foreground">
          Matrícula: {student.enrollment || 'Não informada'} | Ano Letivo {new Date().getFullYear()}
        </p>
        <Badge variant="outline" className="mt-2">
          Visão Geral - Desempenho Anual
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Left Column - Metrics Cards */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Média Geral</p>
                <p className="text-5xl font-bold mb-2">{overallAverage.toFixed(1)}</p>
                <Badge 
                  variant={overallAverage >= 7 ? 'default' : overallAverage >= 6 ? 'secondary' : 'destructive'}
                  className="w-full justify-center"
                >
                  {overallAverage >= 7 ? 'Acima da Média' : overallAverage >= 6 ? 'Na Média' : 'Abaixo da Média'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Tendência</p>
                {trend >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-3xl font-bold mb-1">
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">
                {trend >= 0 ? 'Em crescimento' : 'Em declínio'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                <Award className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold mb-2">
                {studentGrades.length > 0 ? ((studentGrades.filter(g => g.grade >= 6).length / studentGrades.length) * 100).toFixed(0) : 0}%
              </p>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full"
                  style={{ 
                    width: `${studentGrades.length > 0 ? ((studentGrades.filter(g => g.grade >= 6).length / studentGrades.length) * 100) : 0}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle/Right Column - Evolution Chart */}
        <div className="col-span-2">
          <Card className="h-full bg-card/50 backdrop-blur">
            <CardContent className="pt-6 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Evolução das Notas por Bimestre</h3>
              <div className="flex-1 flex items-end justify-around gap-6 pb-6">
                {gradesByQuarter.map((item, index) => {
                  const height = item.average > 0 ? (item.average / 10) * 100 : 5;
                  const isLow = item.average < 6 && item.average > 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className={`text-xl font-bold mb-2 ${isLow ? 'text-red-500' : ''}`}>
                        {item.average > 0 ? item.average.toFixed(1) : '-'}
                      </div>
                      <div 
                        className={`w-full rounded-t-lg transition-all ${
                          isLow ? 'bg-red-500' : 'bg-primary'
                        }`}
                        style={{ height: `${height}%`, minHeight: '30px' }}
                      />
                      <div className="text-sm text-muted-foreground mt-3">
                        {item.quarter}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Min/Max Legend */}
              <div className="pt-4 border-t flex justify-between text-xs text-muted-foreground">
                <span>Nota Mínima: {Math.min(...studentGrades.map(g => g.grade), 10).toFixed(1)}</span>
                <span>Nota Máxima: {Math.max(...studentGrades.map(g => g.grade), 0).toFixed(1)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer - Alerts and Actions */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card className={`${disciplinesBelow6 > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Alertas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {disciplinesBelow6 > 0 
                    ? `${disciplinesBelow6} disciplina(s) abaixo de 6.0` 
                    : 'Nenhum alerta acadêmico'}
                </p>
              </div>
              <Badge variant={disciplinesBelow6 > 0 ? 'destructive' : 'default'}>
                {disciplinesBelow6}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className={`${studentIncidents.length > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Providências</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {studentIncidents.length > 0 
                    ? `${studentIncidents.length} ocorrência(s) registrada(s)` 
                    : 'Nenhuma ocorrência disciplinar'}
                </p>
              </div>
              <Badge variant={studentIncidents.length > 0 ? 'secondary' : 'default'}>
                {studentIncidents.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};