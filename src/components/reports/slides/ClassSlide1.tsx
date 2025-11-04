import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Award } from 'lucide-react';
import { Class, Student, Grade } from '@/types';
import { QUARTERS } from '@/lib/subjects';

interface ClassSlide1Props {
  classData: Class;
  students: Student[];
  grades: Grade[];
}

export const ClassSlide1 = ({ classData, students, grades }: ClassSlide1Props) => {
  // Calculate metrics
  const classGrades = grades.filter(g => g.classId === classData.id);
  const averageGrade = classGrades.length > 0
    ? classGrades.reduce((sum, g) => sum + g.grade, 0) / classGrades.length
    : 0;

  const gradesByQuarter = QUARTERS.map(quarter => {
    const quarterGrades = classGrades.filter(g => g.quarter === quarter);
    return {
      quarter,
      average: quarterGrades.length > 0
        ? quarterGrades.reduce((sum, g) => sum + g.grade, 0) / quarterGrades.length
        : 0
    };
  });

  const passRate = classGrades.length > 0
    ? (classGrades.filter(g => g.grade >= 6).length / classGrades.length) * 100
    : 0;

  const trend = gradesByQuarter.length >= 2 && gradesByQuarter[0].average > 0 && gradesByQuarter[gradesByQuarter.length - 1].average > 0
    ? gradesByQuarter[gradesByQuarter.length - 1].average - gradesByQuarter[0].average
    : 0;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{classData.name}</h1>
        <p className="text-xl text-muted-foreground">{classData.course}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Visão Geral - Ano Letivo {new Date().getFullYear()}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Left Column - Key Metrics */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Média Geral</p>
                  <p className="text-4xl font-bold">{averageGrade.toFixed(1)}</p>
                </div>
                <Badge variant={averageGrade >= 7 ? 'default' : averageGrade >= 6 ? 'secondary' : 'destructive'}>
                  {averageGrade >= 7 ? 'Ótimo' : averageGrade >= 6 ? 'Bom' : 'Atenção'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tendência</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className={`h-6 w-6 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {trend >= 0 ? 'Em crescimento' : 'Em declínio'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Taxa de Aprovação</p>
                  <p className="text-4xl font-bold">{passRate.toFixed(0)}%</p>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-2 w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="text-3xl font-bold">{students.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Evolution Chart */}
        <div className="col-span-2">
          <Card className="h-full bg-card/50 backdrop-blur">
            <CardContent className="pt-6 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Evolução por Bimestre</h3>
              <div className="flex-1 flex items-end justify-around gap-4 pb-4">
                {gradesByQuarter.map((item, index) => {
                  const height = item.average > 0 ? (item.average / 10) * 100 : 5;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="text-lg font-bold mb-2">{item.average.toFixed(1)}</div>
                      <div 
                        className="w-full bg-primary rounded-t-lg transition-all"
                        style={{ height: `${height}%`, minHeight: '20px' }}
                      />
                      <div className="text-xs text-muted-foreground mt-2">
                        {item.quarter.replace('º Bimestre', 'º Bim')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
      </div>
    </div>
  );
};