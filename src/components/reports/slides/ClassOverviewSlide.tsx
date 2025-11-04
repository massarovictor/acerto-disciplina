import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, AlertTriangle, Award } from 'lucide-react';
import { Class, Student, Grade, Incident } from '@/types';

interface ClassOverviewSlideProps {
  classData: Class;
  students: Student[];
  grades: Grade[];
  incidents: Incident[];
  period: string;
}

export const ClassOverviewSlide = ({ classData, students, grades, incidents, period }: ClassOverviewSlideProps) => {
  const filteredGrades = period === 'all' 
    ? grades 
    : grades.filter(g => g.quarter === period);

  const averageGrade = filteredGrades.length > 0
    ? filteredGrades.reduce((sum, g) => sum + g.grade, 0) / filteredGrades.length
    : 0;

  const studentsWithLowGrades = new Set(
    filteredGrades.filter(g => g.grade < 6).map(g => g.studentId)
  ).size;

  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter(i => 
    i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
  ).length;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">{classData.name} - Visão Geral</h1>
        <p className="text-lg text-muted-foreground">
          {period === 'all' ? 'Ano Letivo Completo' : period} • {new Date().getFullYear()}
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Alunos</p>
                  <p className="text-4xl font-bold">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Média Geral da Turma</p>
                  <p className="text-4xl font-bold">{averageGrade.toFixed(1)}</p>
                </div>
              </div>
              <Badge variant={averageGrade >= 7 ? 'default' : averageGrade >= 6 ? 'secondary' : 'destructive'}>
                {averageGrade >= 7 ? 'Excelente' : averageGrade >= 6 ? 'Satisfatório' : 'Requer Atenção'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Award className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                  <p className="text-4xl font-bold">
                    {filteredGrades.length > 0 
                      ? ((filteredGrades.filter(g => g.grade >= 6).length / filteredGrades.length) * 100).toFixed(0)
                      : 0}%
                  </p>
                </div>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full"
                  style={{ 
                    width: `${filteredGrades.length > 0 ? (filteredGrades.filter(g => g.grade >= 6).length / filteredGrades.length) * 100 : 0}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="bg-red-500/10 backdrop-blur border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Alunos com Nota Abaixo de 6.0</p>
                  <p className="text-4xl font-bold text-red-500">{studentsWithLowGrades}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {((studentsWithLowGrades / students.length) * 100).toFixed(0)}% da turma
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Ocorrências Disciplinares</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total de Ocorrências</span>
                  <Badge variant="outline">{totalIncidents}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Graves/Gravíssimas</span>
                  <Badge variant="destructive">{criticalIncidents}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa</span>
                  <span className="text-sm font-medium">
                    {(totalIncidents / students.length).toFixed(1)} por aluno
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Principais Indicadores</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Média da turma {averageGrade >= 7 ? 'acima' : 'abaixo'} da meta (7.0)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{studentsWithLowGrades > 0 ? `${studentsWithLowGrades} aluno(s) necessitam reforço` : 'Todos os alunos com bom desempenho'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{criticalIncidents > 0 ? `${criticalIncidents} ocorrência(s) crítica(s) registrada(s)` : 'Sem ocorrências críticas'}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};