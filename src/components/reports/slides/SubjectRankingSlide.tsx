// Slide for Subject Ranking by Performance

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import { Grade } from '@/types';
import { calculateSummaryStatistics } from '@/lib/advancedCalculations';
import { getAllSubjects } from '@/lib/subjects';

interface SubjectRankingSlideProps {
  grades: Grade[];
  classData: { name: string };
  professionalSubjects: string[];
}

export const SubjectRankingSlide = ({ grades, classData, professionalSubjects }: SubjectRankingSlideProps) => {
  // Obter todas as disciplinas (ENEM + Profissionais)
  const allSubjects = [...getAllSubjects(), ...professionalSubjects];

  // Calcular estatísticas por disciplina
  const subjectStats = allSubjects.map(subject => {
    const subjectGrades = grades.filter(g => g.subject === subject);
    const values = subjectGrades.map(g => g.grade);
    const stats = calculateSummaryStatistics(values);
    const approvalRate = values.length > 0 ? (values.filter(v => v >= 6).length / values.length) * 100 : 0;
    
    return {
      subject,
      mean: stats.mean,
      stdDev: stats.stdDev,
      count: values.length,
      approvalRate,
      isProfessional: professionalSubjects.includes(subject),
    };
  }).filter(s => s.count > 0)
    .sort((a, b) => b.mean - a.mean);

  const topPerformers = subjectStats.slice(0, 3);
  const lowPerformers = subjectStats.slice(-3).reverse();

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{classData.name} - Ranking de Disciplinas</h1>
            <p className="text-sm text-muted-foreground">Ordenadas por Desempenho Médio</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {/* Ranking Visual */}
        <Card className="bg-card/50 backdrop-blur flex-1">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Ranking Geral ({subjectStats.length} disciplinas)</h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {subjectStats.map((subject, index) => {
                const percentage = (subject.mean / 10) * 100;
                
                return (
                  <div key={subject.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-bold text-muted-foreground w-6 flex-shrink-0">#{index + 1}</span>
                        <span className="font-medium truncate">{subject.subject}</span>
                        {subject.isProfessional && (
                          <Badge variant="outline" className="text-xs bg-warning/10">Técnica</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          σ {subject.stdDev.toFixed(2)}
                        </span>
                        <Badge
                          variant={subject.mean >= 7 ? 'default' : subject.mean >= 6 ? 'secondary' : 'destructive'}
                        >
                          {subject.mean.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          subject.mean >= 7 ? 'bg-success/100' :
                          subject.mean >= 6 ? 'bg-warning/100' :
                          'bg-destructive/100'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Análise Detalhada */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top 3 Melhores */}
          <Card className="bg-success/10 backdrop-blur border-success/30">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Top 3 - Melhor Desempenho
              </h4>
              <div className="space-y-3">
                {topPerformers.map((subject, index) => (
                  <div key={subject.subject} className="p-2 bg-background/50 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-success">#{index + 1}</span>
                        <span className="text-sm font-medium truncate">{subject.subject}</span>
                      </div>
                      <Badge className="bg-success">{subject.mean.toFixed(1)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Desvio: {subject.stdDev.toFixed(2)}</span>
                      <span>Aprovação: {subject.approvalRate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top 3 Piores */}
          <Card className="bg-destructive/10 backdrop-blur border-destructive/30">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Necessitam Atenção
              </h4>
              <div className="space-y-3">
                {lowPerformers.map((subject, index) => (
                  <div key={subject.subject} className="p-2 bg-background/50 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-destructive">#{subjectStats.length - index}</span>
                        <span className="text-sm font-medium truncate">{subject.subject}</span>
                      </div>
                      <Badge variant="destructive">{subject.mean.toFixed(1)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Desvio: {subject.stdDev.toFixed(2)}</span>
                      <span>Aprovação: {subject.approvalRate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rodapé - Insights */}
      <div className="mt-4 p-4 bg-primary/5 rounded-lg">
        <p className="text-sm">
          <span className="font-semibold">Análise de Consistência:</span>{' '}
          {topPerformers[0] && `${topPerformers[0].subject} lidera com ${topPerformers[0].mean.toFixed(1)} de média. `}
          {lowPerformers[0] && `${lowPerformers[0].subject} requer reforço imediato (${lowPerformers[0].mean.toFixed(1)}). `}
          {subjectStats.some(s => s.stdDev > 2) && 
            'Disciplinas com alto desvio padrão indicam desempenho irregular entre alunos.'}
        </p>
      </div>
    </div>
  );
};







