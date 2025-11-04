import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BookOpen } from 'lucide-react';
import { Class, Student, Incident, Grade } from '@/types';
import { SUBJECT_AREAS } from '@/lib/subjects';

interface ClassSlide4Props {
  classData: Class;
  students: Student[];
  incidents: Incident[];
  grades: Grade[];
}

export const ClassSlide4 = ({ classData, students, incidents, grades }: ClassSlide4Props) => {
  const classGrades = grades.filter(g => g.classId === classData.id);

  // Calculate correlation between incidents and grades by subject area
  const areaAnalysis = SUBJECT_AREAS.map(area => {
    const areaGrades = classGrades.filter(g => area.subjects.includes(g.subject));
    const areaAverage = areaGrades.length > 0
      ? areaGrades.reduce((sum, g) => sum + g.grade, 0) / areaGrades.length
      : 0;

    // Count students with both low grades and incidents in this area
    const studentsAtRisk = students.filter(student => {
      const studentGrades = areaGrades.filter(g => g.studentId === student.id);
      const studentAvg = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
        : 0;
      const hasIncidents = incidents.some(i => i.studentIds.includes(student.id));
      
      return studentAvg < 6 && hasIncidents;
    }).length;

    return {
      area: area.name,
      average: areaAverage,
      studentsAtRisk
    };
  });

  const incidentsBySeverity = [
    { 
      severity: 'Leve', 
      count: incidents.filter(i => i.finalSeverity === 'leve').length,
      color: 'bg-severity-light'
    },
    { 
      severity: 'Intermediária', 
      count: incidents.filter(i => i.finalSeverity === 'intermediaria').length,
      color: 'bg-severity-intermediate'
    },
    { 
      severity: 'Grave', 
      count: incidents.filter(i => i.finalSeverity === 'grave').length,
      color: 'bg-severity-serious'
    },
    { 
      severity: 'Gravíssima', 
      count: incidents.filter(i => i.finalSeverity === 'gravissima').length,
      color: 'bg-severity-critical'
    },
  ];

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">{classData.name} - Correlação Comportamento x Aprendizagem</h1>
        <p className="text-sm text-muted-foreground">Análise do impacto de ocorrências no desempenho acadêmico</p>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Left Column - Area Analysis */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Desempenho por Área de Conhecimento</h3>
              </div>
              
              <div className="space-y-4">
                {areaAnalysis.map((area, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{area.area}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={area.average >= 7 ? 'default' : area.average >= 6 ? 'secondary' : 'destructive'}>
                          {area.average.toFixed(1)}
                        </Badge>
                        {area.studentsAtRisk > 0 && (
                          <Badge variant="outline" className="border-red-500">
                            {area.studentsAtRisk} em risco
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          area.average >= 7 ? 'bg-green-500' :
                          area.average >= 6 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(area.average / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Distribuição de Ocorrências</h3>
              </div>

              <div className="space-y-3">
                {incidentsBySeverity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm">{item.severity}</span>
                    </div>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-sm">
                  <p className="font-medium mb-2">Total de Ocorrências</p>
                  <p className="text-3xl font-bold">{incidents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Insights and Actions */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Principais Conclusões</h3>
              
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-primary/5 rounded">
                  <p className="font-medium mb-2">📊 Padrão Identificado:</p>
                  <p className="text-muted-foreground">
                    Alunos com 3+ ocorrências apresentam média {
                      classGrades.length > 0 ? 
                      ((classGrades.filter(g => {
                        const studentIncidents = incidents.filter(i => i.studentIds.includes(g.studentId));
                        return studentIncidents.length >= 3 && g.grade < 6;
                      }).length / classGrades.length) * 100).toFixed(0)
                      : 0
                    }% menor que a média da turma.
                  </p>
                </div>

                <div className="p-3 bg-primary/5 rounded">
                  <p className="font-medium mb-2">🎯 Área Crítica:</p>
                  <p className="text-muted-foreground">
                    {areaAnalysis.reduce((prev, current) => 
                      current.studentsAtRisk > prev.studentsAtRisk ? current : prev
                    ).area} apresenta maior correlação entre ocorrências e baixo desempenho.
                  </p>
                </div>

                <div className="p-3 bg-primary/5 rounded">
                  <p className="font-medium mb-2">⚠️ Alertas:</p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• {areaAnalysis.reduce((sum, area) => sum + area.studentsAtRisk, 0)} alunos em situação de risco combinado</li>
                    <li>• {incidents.filter(i => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima').length} ocorrências graves ou gravíssimas requerem atenção</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Próximos Passos</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Intervenção Imediata</p>
                    <p className="text-muted-foreground">
                      Reunião com responsáveis dos alunos em risco combinado
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Reforço Direcionado</p>
                    <p className="text-muted-foreground">
                      Aulas de reforço focadas nas áreas com maior correlação
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Acompanhamento Comportamental</p>
                    <p className="text-muted-foreground">
                      Estratégias para reduzir ocorrências e melhorar clima da turma
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">4</span>
                  </div>
                  <div>
                    <p className="font-medium">Monitoramento Contínuo</p>
                    <p className="text-muted-foreground">
                      Reavaliação mensal dos indicadores de desempenho e comportamento
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};