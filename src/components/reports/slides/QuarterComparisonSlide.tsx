// Slide for Quarter Comparison Analysis

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Grade } from '@/types';
import { QUARTERS } from '@/lib/subjects';
import { calculateMean, calculateTrend } from '@/lib/advancedCalculations';
import { LineChart } from '../charts/LineChart';

interface QuarterComparisonSlideProps {
  grades: Grade[];
  classData: { name: string };
}

export const QuarterComparisonSlide = ({ grades, classData }: QuarterComparisonSlideProps) => {
  // Calcular médias por bimestre
  const quarterData = QUARTERS.map(quarter => {
    const quarterGrades = grades.filter(g => g.quarter === quarter);
    const average = quarterGrades.length > 0
      ? calculateMean(quarterGrades.map(g => g.grade))
      : 0;
    return { quarter, average, count: quarterGrades.length };
  }).filter(q => q.count > 0);

  // Calcular variações percentuais
  const variations = quarterData.map((q, i) => {
    if (i === 0) return { quarter: q.quarter, variation: 0, absolute: 0 };
    const previous = quarterData[i - 1].average;
    const current = q.average;
    const absolute = current - previous;
    const variation = previous > 0 ? ((absolute / previous) * 100) : 0;
    return { quarter: q.quarter, variation, absolute };
  });

  // Identificar bimestre com melhor e pior desempenho
  const bestQuarter = quarterData.reduce((best, current) =>
    current.average > best.average ? current : best
  , quarterData[0]);
  
  const worstQuarter = quarterData.reduce((worst, current) =>
    current.average < worst.average ? current : worst
  , quarterData[0]);

  // Análise de tendência geral
  const trendData = quarterData.map((q, i) => ({ x: i + 1, y: q.average }));
  const trend = trendData.length >= 2 ? calculateTrend(trendData) : null;

  // Identificar disciplinas com maior crescimento/declínio
  const subjectEvolution = new Map<string, { start: number; end: number; count: number }>();
  
  grades.forEach(g => {
    const current = subjectEvolution.get(g.subject) || { start: 0, end: 0, count: 0 };
    const quarterIndex = QUARTERS.indexOf(g.quarter);
    
    if (!current.count || quarterIndex < QUARTERS.indexOf(QUARTERS.find(q => 
      grades.find(gr => gr.subject === g.subject && gr.quarter === q)
    ) || QUARTERS[0])) {
      current.start = g.grade;
    }
    if (quarterIndex >= QUARTERS.lastIndexOf(QUARTERS.find((q, idx) => 
      idx >= quarterIndex && grades.find(gr => gr.subject === g.subject && gr.quarter === q)
    ) || g.quarter)) {
      current.end = g.grade;
    }
    current.count++;
    subjectEvolution.set(g.subject, current);
  });

  const evolvedSubjects = Array.from(subjectEvolution.entries())
    .map(([subject, data]) => ({
      subject,
      change: data.end - data.start,
      percentChange: data.start > 0 ? ((data.end - data.start) / data.start) * 100 : 0,
    }))
    .filter(s => Math.abs(s.change) > 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const topGrowers = evolvedSubjects.filter(s => s.change > 0).slice(0, 3);
  const topDecliners = evolvedSubjects.filter(s => s.change < 0).slice(0, 3);

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{classData.name} - Comparação Entre Bimestres</h1>
            <p className="text-sm text-muted-foreground">Análise de Evolução ao Longo do Ano Letivo</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[60%_40%] gap-6">
        {/* Gráfico Principal */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Evolução da Média da Turma</h3>
            <LineChart
              data={quarterData.map(q => ({
                label: q.quarter.substring(0, 2),
                value: q.average,
              }))}
              height={200}
              showPoints
              showGrid
            />
            {trend && (
              <div className="mt-4 p-3 bg-background/50 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tendência Geral:</span>
                  <div className="flex items-center gap-2">
                    {trend.direction === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
                    {trend.direction === 'down' && <TrendingDown className="h-5 w-5 text-red-600" />}
                    {trend.direction === 'stable' && <Minus className="h-5 w-5 text-gray-600" />}
                    <span className="text-sm">
                      {trend.direction === 'up' ? 'Melhoria Progressiva' : 
                       trend.direction === 'down' ? 'Declínio Progressivo' : 
                       'Desempenho Estável'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Confiança: {(trend.rSquared * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel Lateral */}
        <div className="space-y-4">
          {/* Tabela de Médias */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Médias por Bimestre</h3>
              <div className="space-y-2">
                {quarterData.map((q, i) => (
                  <div key={q.quarter} className="flex items-center justify-between p-2 bg-background/50 rounded">
                    <span className="text-sm font-medium">{q.quarter}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={q.average >= 7 ? 'default' : q.average >= 6 ? 'secondary' : 'destructive'}>
                        {q.average.toFixed(1)}
                      </Badge>
                      {i > 0 && (
                        <span className={`text-xs ${variations[i].absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variations[i].absolute >= 0 ? '+' : ''}{variations[i].absolute.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Destaques */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Destaques</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Melhor Bimestre</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{bestQuarter.quarter}</span>
                    <Badge className="bg-green-500">{bestQuarter.average.toFixed(1)}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Bimestre Crítico</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{worstQuarter.quarter}</span>
                    <Badge variant="destructive">{worstQuarter.average.toFixed(1)}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rodapé - Disciplinas com Maior Variação */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="bg-green-500/10 backdrop-blur border-green-500/20">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Maior Crescimento
            </h4>
            <div className="space-y-1">
              {topGrowers.slice(0, 3).map(s => (
                <div key={s.subject} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{s.subject}</span>
                  <span className="text-green-600 font-medium ml-2">+{s.change.toFixed(1)}</span>
                </div>
              ))}
              {topGrowers.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma melhoria significativa</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 backdrop-blur border-red-500/20">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Maior Declínio
            </h4>
            <div className="space-y-1">
              {topDecliners.slice(0, 3).map(s => (
                <div key={s.subject} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{s.subject}</span>
                  <span className="text-red-600 font-medium ml-2">{s.change.toFixed(1)}</span>
                </div>
              ))}
              {topDecliners.length === 0 && <p className="text-xs text-muted-foreground">Nenhum declínio significativo</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};







