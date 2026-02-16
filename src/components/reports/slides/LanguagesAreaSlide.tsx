// Slide for Linguagens, Códigos e suas Tecnologias

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { Grade } from '@/types';
import { SUBJECT_AREAS } from '@/lib/subjects';
import { calculateSummaryStatistics, calculateTrend } from '@/lib/advancedCalculations';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';
import { LineChart } from '../charts/LineChart';
import { QUARTERS } from '@/lib/subjects';

interface LanguagesAreaSlideProps {
  grades: Grade[];
  period: string;
}

export const LanguagesAreaSlide = ({ grades, period }: LanguagesAreaSlideProps) => {
  const area = SUBJECT_AREAS.find(a => a.name === 'Linguagens, Códigos e suas Tecnologias')!;
  
  // Filtrar notas da área
  const filteredGrades = period === 'all' 
    ? grades.filter(g => area.subjects.includes(g.subject))
    : grades.filter(g => area.subjects.includes(g.subject) && g.quarter === period);

  // Estatísticas por disciplina
  const subjectStats = area.subjects.map(subject => {
    const subjectGrades = filteredGrades.filter(g => g.subject === subject);
    const values = subjectGrades.map(g => g.grade);
    const stats = calculateSummaryStatistics(values);
    return { subject, ...stats };
  }).filter(s => s.count > 0);

  // Estatísticas gerais da área
  const areaValues = filteredGrades.map(g => g.grade);
  const areaStats = calculateSummaryStatistics(areaValues);

  // Tendência por bimestre (apenas para ano completo)
  const trendData = period === 'all' ? QUARTERS.map(quarter => {
    const quarterGrades = grades.filter(g => 
      area.subjects.includes(g.subject) && g.quarter === quarter
    );
    const avg = quarterGrades.length > 0
      ? quarterGrades.reduce((sum, g) => sum + g.grade, 0) / quarterGrades.length
      : 0;
    return { label: quarter.substring(0, 2), value: avg };
  }).filter(d => d.value > 0) : [];

  const trend = trendData.length >= 2 ? calculateTrend(
    trendData.map((d, i) => ({ x: i + 1, y: d.value }))
  ) : null;

  // Top 3 melhores e piores
  const sorted = [...subjectStats].sort((a, b) => b.mean - a.mean);
  const topPerformers = sorted.slice(0, Math.min(3, sorted.length));
  const lowPerformers = sorted.slice(-Math.min(3, sorted.length)).reverse();

  return (
    <div className="h-full p-8 bg-gradient-to-br from-info/5 to-background flex flex-col">
      {/* Cabeçalho */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-info" />
            <div>
              <h1 className="text-3xl font-bold">Linguagens, Códigos e suas Tecnologias</h1>
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

      {/* Seção Principal */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Coluna Esquerda - Gráfico de Barras */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Desempenho por Disciplina</h3>
            <HorizontalBarChart
              data={subjectStats.map(s => ({
                label: s.subject,
                value: s.mean,
              }))}
              height={240}
            />
          </CardContent>
        </Card>

        {/* Coluna Direita - Estatísticas e Análises */}
        <div className="space-y-4">
          {/* Estatísticas Resumidas */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Estatísticas da Área</h3>
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

          {/* Tendência por Bimestre */}
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
                <LineChart data={trendData} height={80} color="rgb(37, 99, 235)" />
              </CardContent>
            </Card>
          )}

          {/* Top Disciplinas */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Destaques</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Melhor Desempenho</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{topPerformers[0]?.subject}</span>
                    <Badge variant="default" className="bg-success/100">
                      {topPerformers[0]?.mean.toFixed(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Necessita Atenção</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{lowPerformers[0]?.subject}</span>
                    <Badge variant="destructive">
                      {lowPerformers[0]?.mean.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rodapé - Insights */}
      <div className="mt-4 p-4 bg-primary/5 rounded-lg">
        <p className="text-sm">
          <span className="font-semibold">Insights:</span>{' '}
          {areaStats.mean >= 7 
            ? 'Área com excelente desempenho geral. '
            : areaStats.mean >= 6 
            ? 'Área com desempenho satisfatório, com margem para melhoria. '
            : 'Área requer atenção especial e reforço. '
          }
          {areaStats.stdDev > 1.5 
            ? 'Alta variação entre disciplinas indica necessidade de nivelamento.'
            : 'Desempenho consistente entre as disciplinas da área.'
          }
        </p>
      </div>
    </div>
  );
};







