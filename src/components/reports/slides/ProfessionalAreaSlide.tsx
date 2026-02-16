// Slide for Base Profissional/Técnica

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { Grade } from '@/types';
import { calculateSummaryStatistics, calculateTrend } from '@/lib/advancedCalculations';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';
import { LineChart } from '../charts/LineChart';
import { QUARTERS } from '@/lib/subjects';

interface ProfessionalAreaSlideProps {
  grades: Grade[];
  period: string;
  professionalSubjects: string[];
}

export const ProfessionalAreaSlide = ({ grades, period, professionalSubjects }: ProfessionalAreaSlideProps) => {
  if (professionalSubjects.length === 0) {
    return (
      <div className="h-full p-8 flex items-center justify-center text-muted-foreground">
        <p>Nenhuma disciplina profissional cadastrada para esta turma</p>
      </div>
    );
  }

  const filteredGrades = period === 'all' 
    ? grades.filter(g => professionalSubjects.includes(g.subject))
    : grades.filter(g => professionalSubjects.includes(g.subject) && g.quarter === period);

  const subjectStats = professionalSubjects.map(subject => {
    const subjectGrades = filteredGrades.filter(g => g.subject === subject);
    const values = subjectGrades.map(g => g.grade);
    const stats = calculateSummaryStatistics(values);
    return { subject, ...stats };
  }).filter(s => s.count > 0);

  const areaValues = filteredGrades.map(g => g.grade);
  const areaStats = calculateSummaryStatistics(areaValues);

  const trendData = period === 'all' ? QUARTERS.map(quarter => {
    const quarterGrades = grades.filter(g => 
      professionalSubjects.includes(g.subject) && g.quarter === quarter
    );
    const avg = quarterGrades.length > 0
      ? quarterGrades.reduce((sum, g) => sum + g.grade, 0) / quarterGrades.length
      : 0;
    return { label: quarter.substring(0, 2), value: avg };
  }).filter(d => d.value > 0) : [];

  const trend = trendData.length >= 2 ? calculateTrend(
    trendData.map((d, i) => ({ x: i + 1, y: d.value }))
  ) : null;

  const sorted = [...subjectStats].sort((a, b) => b.mean - a.mean);
  const topPerformers = sorted.slice(0, Math.min(3, sorted.length));
  const lowPerformers = sorted.slice(-Math.min(3, sorted.length)).reverse();

  return (
    <div className="h-full p-8 bg-gradient-to-br from-warning/5 to-background flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-warning" />
            <div>
              <h1 className="text-3xl font-bold">Base Profissional / Técnica</h1>
              <p className="text-sm text-muted-foreground">
                {period === 'all' ? 'Ano Letivo Completo' : period}
              </p>
            </div>
          </div>
          <Badge
            variant={areaStats.mean >= 7 ? 'default' : areaStats.mean >= 6 ? 'secondary' : 'destructive'}
            className="text-2xl px-4 py-2"
          >
            {areaStats.mean.toFixed(1)}
          </Badge>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Desempenho por Disciplina Técnica</h3>
            <HorizontalBarChart
              data={subjectStats.map(s => ({
                label: s.subject,
                value: s.mean,
              }))}
              height={240}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Estatísticas da Formação Técnica</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Média</p>
                  <p className="text-xl font-bold">{areaStats.mean.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mediana</p>
                  <p className="text-xl font-bold">{areaStats.median.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Desvio Padrão</p>
                  <p className="text-xl font-bold">{areaStats.stdDev.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {period === 'all' && trendData.length > 0 && (
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Evolução por Bimestre</h3>
                  {trend && (
                    <div className="flex items-center gap-1">
                      {trend.direction === 'up' && <TrendingUp className="h-4 w-4 text-success" />}
                      {trend.direction === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
                      <span className="text-xs text-muted-foreground">
                        {trend.direction === 'up' ? 'Melhoria' : trend.direction === 'down' ? 'Declínio' : 'Estável'}
                      </span>
                    </div>
                  )}
                </div>
                <LineChart data={trendData} height={80} color="rgb(245, 158, 11)" />
              </CardContent>
            </Card>
          )}

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Destaques Técnicos</h3>
              <div className="space-y-2">
                {topPerformers[0] && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Melhor Desempenho</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{topPerformers[0]?.subject}</span>
                      <Badge variant="default" className="bg-success/100">
                        {topPerformers[0]?.mean.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                )}
                {lowPerformers[0] && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Necessita Reforço</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{lowPerformers[0]?.subject}</span>
                      <Badge variant="destructive">
                        {lowPerformers[0]?.mean.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 p-4 bg-warning/10 rounded-lg border border-warning/30">
        <p className="text-sm">
          <span className="font-semibold">Insights da Formação Técnica:</span>{' '}
          {areaStats.mean >= 7 
            ? 'Formação técnica com excelente aproveitamento. '
            : areaStats.mean >= 6 
            ? 'Desenvolvimento técnico satisfatório, com espaço para aprimoramento. '
            : 'Formação técnica requer atenção especial e reforço prático. '
          }
          {areaStats.stdDev > 1.5 
            ? 'Variação significativa entre disciplinas técnicas sugere revisão de metodologia ou conteúdo.'
            : 'Consistência no desenvolvimento das competências técnicas.'
          }
        </p>
      </div>
    </div>
  );
};







