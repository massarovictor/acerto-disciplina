import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Class, Student, Incident, Grade } from '@/types';

interface ClassSlide2Props {
  classData: Class;
  students: Student[];
  incidents: Incident[];
  grades: Grade[];
}

export const ClassSlide2 = ({ classData, students, incidents, grades }: ClassSlide2Props) => {
  const classGrades = grades.filter(g => g.classId === classData.id);

  // Find best and worst performing students
  const studentPerformance = students.map(student => {
    const studentGrades = classGrades.filter(g => g.studentId === student.id);
    const average = studentGrades.length > 0
      ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
      : 0;
    const incidentCount = incidents.filter(i => i.studentIds.includes(student.id)).length;

    return { student, average, incidentCount };
  }).sort((a, b) => b.average - a.average);

  const topStudents = studentPerformance.slice(0, 5);
  const bottomStudents = studentPerformance.slice(-5).reverse();

  const recentIncidents = incidents
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">{classData.name} - Diagnóstico Individual</h1>
        <p className="text-sm text-muted-foreground">Análise de desempenho e comportamento</p>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        {/* Left Column - Academic Performance */}
        <div className="space-y-4 overflow-auto">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Melhores Desempenhos</h3>
              </div>
              <div className="space-y-2">
                {topStudents.map((item, index) => (
                  <div key={item.student.id} className="flex items-center justify-between p-2 bg-background/50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}º</span>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {item.student.name}
                      </span>
                    </div>
                    <Badge variant="default">{item.average.toFixed(1)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Necessitam Atenção</h3>
              </div>
              <div className="space-y-2">
                {bottomStudents.map((item, index) => (
                  <div key={item.student.id} className="flex items-center justify-between p-2 bg-background/50 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {item.student.name}
                      </span>
                    </div>
                    <Badge variant="destructive">{item.average.toFixed(1)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Recomendações</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Reforço escolar para alunos com média abaixo de 6.0</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Reunião com responsáveis dos alunos em situação crítica</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Monitoria pelos alunos de melhor desempenho</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Incidents */}
        <div className="space-y-4 overflow-auto">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Ocorrências Recentes</h3>
              {recentIncidents.length > 0 ? (
                <div className="space-y-3">
                  {recentIncidents.map((incident) => {
                    const studentNames = incident.studentIds
                      .map(id => students.find(s => s.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <div key={incident.id} className="p-3 bg-background/50 rounded border-l-4 border-primary">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(incident.date).toLocaleDateString('pt-BR')}
                          </span>
                          <Badge 
                            variant="outline"
                            className={
                              incident.finalSeverity === 'gravissima' ? 'border-severity-critical' :
                              incident.finalSeverity === 'grave' ? 'border-severity-serious' :
                              incident.finalSeverity === 'intermediaria' ? 'border-severity-intermediate' :
                              'border-severity-light'
                            }
                          >
                            {incident.finalSeverity}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1 line-clamp-2">{incident.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Envolvidos: {studentNames}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma ocorrência registrada
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Diagnóstico Completo</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-primary mb-1">Forças da Turma:</p>
                  <ul className="space-y-1 text-muted-foreground ml-4">
                    <li>• Média geral acima de 6.0 em {Math.round((classGrades.filter(g => g.grade >= 6).length / Math.max(classGrades.length, 1)) * 100)}% das avaliações</li>
                    <li>• {topStudents.length} alunos com desempenho destacado</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-destructive mb-1">Pontos de Atenção:</p>
                  <ul className="space-y-1 text-muted-foreground ml-4">
                    <li>• {bottomStudents.filter(s => s.average < 6).length} alunos com média abaixo de 6.0</li>
                    <li>• {incidents.filter(i => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima').length} ocorrências graves/gravíssimas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};