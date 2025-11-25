// Slide for Matemática e suas Tecnologias

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { Grade } from '@/types';
import { SUBJECT_AREAS } from '@/lib/subjects';
import { calculateSummaryStatistics, calculateTrend } from '@/lib/advancedCalculations';
import { LineChart } from '../charts/LineChart';
import { QUARTERS } from '@/lib/subjects';

interface MathAreaSlideProps {
  grades: Grade[];
  period: string;
}

export const MathAreaSlide = ({ grades, period }: MathAreaSlideProps) => {
  const area = SUBJECT_AREAS.find(a => a.name === 'Matemática e suas Tecnologias')!;
  
  const filteredGrades = period === 'all' 
    ? grades.filter(g => area.subjects.includes(g.subject))
    : grades.filter(g => area.subjects.includes(g.subject) && g.quarter === period);

  const areaValues = filteredGrades.map(g => g.grade);
  const areaStats = calculateSummaryStatistics(areaValues);

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

  // Distribuição de notas
  const distribution = {
    excellent: areaValues.filter(v => v >= 9).length,
    good: areaValues.filter(v => v >= 7 && v < 9).length,
    satisfactory: areaValues.filter(v => v >= 6 && v < 7).length,
    poor: areaValues.filter(v => v < 6).length,
  };

  const total = areaValues.length;
  const approvalRate = total > 0 ? ((total - distribution.poor) / total) * 100 : 0;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-orange-500/5 to-background flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold">Matemática e suas Tecnologias</h1>
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
        {/* Coluna Esquerda */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Estatísticas da Disciplina</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-background/50 rounded">
                  <p className="text-xs text-muted-foreground">Média</p>
                  <p className="text-3xl font-bold">{areaStats.mean.toFixed(1)}</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded">
                  <p className="text-xs text-muted-foreground">Mediana</p>
                  <p className="text-3xl font-bold">{areaStats.median.toFixed(1)}</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded">
                  <p className="text-xs text-muted-foreground">Desvio Padrão</p>
                  <p className="text-3xl font-bold">{areaStats.stdDev.toFixed(2)}</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded">
                  <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                  <p className="text-3xl font-bold">{approvalRate.toFixed(0)}%</p>
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
                      {trend.direction === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {trend.direction === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                      <span className="text-xs text-muted-foreground">
                        {trend.direction === 'up' ? 'Melhoria' : trend.direction === 'down' ? 'Declínio' : 'Estável'}
                      </span>
                    </div>
                  )}
                </div>
                <LineChart data={trendData} height={120} color="rgb(249, 115, 22)" />
                {trend && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Confiança da tendência: {(trend.rSquared * 100).toFixed(0)}%
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Direita */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Distribuição de Desempenho</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Excelente (9.0 - 10.0)</span>
                    <Badge className="bg-green-600">{distribution.excellent}</Badge>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-600 h-full rounded-full"
                      style={{ width: `${total > 0 ? (distribution.excellent / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Bom (7.0 - 8.9)</span>
                    <Badge className="bg-blue-600">{distribution.good}</Badge>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${total > 0 ? (distribution.good / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Satisfatório (6.0 - 6.9)</span>
                    <Badge className="bg-yellow-600">{distribution.satisfactory}</Badge>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-yellow-600 h-full rounded-full"
                      style={{ width: `${total > 0 ? (distribution.satisfactory / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Abaixo da Média (&lt; 6.0)</span>
                    <Badge className="bg-red-600">{distribution.poor}</Badge>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-600 h-full rounded-full"
                      style={{ width: `${total > 0 ? (distribution.poor / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Análise Estatística</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nota Mínima:</span>
                  <span className="font-medium">{areaStats.min.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nota Máxima:</span>
                  <span className="font-medium">{areaStats.max.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1º Quartil (Q1):</span>
                  <span className="font-medium">{areaStats.q1.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">3º Quartil (Q3):</span>
                  <span className="font-medium">{areaStats.q3.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 p-4 bg-primary/5 rounded-lg">
        <p className="text-sm">
          <span className="font-semibold">Insights:</span>{' '}
          {areaStats.mean >= 7 
            ? 'Matemática apresenta excelente desempenho. '
            : areaStats.mean >= 6 
            ? 'Desempenho satisfatório em Matemática, porém há margem para evolução. '
            : 'Matemática requer atenção urgente com reforço intensivo. '
          }
          {distribution.poor > total * 0.3 && 'Mais de 30% dos alunos abaixo da média - considerar revisão de conteúdo. '}
          {areaStats.stdDev > 2 && 'Alta dispersão indica necessidade de grupos de reforço diferenciados.'}
        </p>
      </div>
    </div>
  );
};







