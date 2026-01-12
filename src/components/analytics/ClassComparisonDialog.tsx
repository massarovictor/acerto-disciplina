/**
 * Dialog de Comparação entre Turmas
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClassAnalytics,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_LABELS,
  formatNumber
} from '@/hooks/useSchoolAnalytics';
import { StudentClassification } from '@/lib/advancedAnalytics';

interface ClassComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparisonData: ClassAnalytics[];
}

export function ClassComparisonDialog({
  open,
  onOpenChange,
  comparisonData
}: ClassComparisonDialogProps) {
  if (comparisonData.length < 2) return null;

  // Encontrar os melhores valores para destacar
  const bestAverage = Math.max(...comparisonData.map(c => c.average));
  // DISABLED: Frequência removida temporariamente
  // const bestFrequency = Math.max(...comparisonData.map(c => c.frequency));
  const mostExcellence = Math.max(...comparisonData.map(c => c.classifications.excelencia));
  const leastCritical = Math.min(...comparisonData.map(c => c.classifications.critico));
  const bestGrowth = Math.max(...comparisonData.map(c => c.growth ?? 0));

  const MetricRow = ({
    label,
    values,
    bestValue,
    format = (v: number) => formatNumber(v),
    suffix = '',
    higherIsBetter = true,
  }: {
    label: string;
    values: number[];
    bestValue: number;
    format?: (v: number) => string;
    suffix?: string;
    higherIsBetter?: boolean;
  }) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${values.length}, 1fr)` }}>
      <div className="text-sm font-medium text-muted-foreground py-2">{label}</div>
      {values.map((value, index) => {
        const isBest = higherIsBetter ? value === bestValue : value === bestValue;
        return (
          <div
            key={index}
            className={`text-center py-2 rounded ${isBest ? 'bg-emerald-50 text-emerald-700 font-semibold' : ''}`}
          >
            {format(value)}{suffix}
          </div>
        );
      })}
    </div>
  );

  const ClassificationRow = ({
    classification,
    values,
    bestValue,
    higherIsBetter,
  }: {
    classification: StudentClassification;
    values: number[];
    bestValue: number;
    higherIsBetter: boolean;
  }) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${values.length}, 1fr)` }}>
      <div className="flex items-center gap-2 py-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: CLASSIFICATION_COLORS[classification] }}
        />
        <span className="text-sm">{CLASSIFICATION_LABELS[classification]}</span>
      </div>
      {values.map((value, index) => {
        const isBest = higherIsBetter ? value === bestValue : value === bestValue;
        return (
          <div
            key={index}
            className={`text-center py-2 rounded ${isBest && bestValue !== 0 ? 'bg-emerald-50 text-emerald-700 font-semibold' : ''
              }`}
          >
            {value}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparação entre Turmas</DialogTitle>
          <DialogDescription>
            Análise comparativa de {comparisonData.length} turmas selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Headers */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `120px repeat(${comparisonData.length}, 1fr)` }}
          >
            <div></div>
            {comparisonData.map(cls => (
              <div key={cls.classData.id} className="text-center">
                <p className="font-semibold">{cls.classData.name}</p>
                <p className="text-xs text-muted-foreground">{cls.studentCount} alunos</p>
              </div>
            ))}
          </div>

          {/* Métricas Gerais */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3">Métricas Gerais</h4>
              <div className="space-y-1 divide-y">
                <MetricRow
                  label="Média Geral"
                  values={comparisonData.map(c => c.average)}
                  bestValue={bestAverage}
                />
                {/* DISABLED: Frequência removida temporariamente
                <MetricRow 
                  label="Frequência"
                  values={comparisonData.map(c => c.frequency)}
                  bestValue={bestFrequency}
                  format={(v) => formatNumber(v, 0)}
                  suffix="%"
                />
                */}
                <MetricRow
                  label="Ocorrências"
                  values={comparisonData.map(c => c.incidentCount)}
                  bestValue={Math.min(...comparisonData.map(c => c.incidentCount))}
                  format={(v) => v.toString()}
                  higherIsBetter={false}
                />
                <MetricRow
                  label="Crescimento"
                  values={comparisonData.map(c => c.growth ?? 0)}
                  bestValue={bestGrowth}
                  format={(v) => v.toFixed(1)}
                  higherIsBetter={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classificação dos Alunos */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3">Distribuição de Alunos</h4>
              <div className="space-y-1 divide-y">
                <ClassificationRow
                  classification="excelencia"
                  values={comparisonData.map(c => c.classifications.excelencia)}
                  bestValue={mostExcellence}
                  higherIsBetter={true}
                />
                <ClassificationRow
                  classification="aprovado"
                  values={comparisonData.map(c => c.classifications.aprovado)}
                  bestValue={Math.max(...comparisonData.map(c => c.classifications.aprovado))}
                  higherIsBetter={true}
                />
                <ClassificationRow
                  classification="atencao"
                  values={comparisonData.map(c => c.classifications.atencao)}
                  bestValue={Math.min(...comparisonData.map(c => c.classifications.atencao))}
                  higherIsBetter={false}
                />
                <ClassificationRow
                  classification="critico"
                  values={comparisonData.map(c => c.classifications.critico)}
                  bestValue={leastCritical}
                  higherIsBetter={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Barras Comparativo */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3">Comparativo Visual</h4>

              {/* Média */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Média Geral</p>
                {comparisonData.map(cls => {
                  const width = (cls.average / 10) * 100;
                  const isBest = cls.average === bestAverage;

                  return (
                    <div key={cls.classData.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{cls.classData.name}</span>
                        <span className={isBest ? 'font-semibold text-emerald-600' : ''}>
                          {formatNumber(cls.average)}
                        </span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isBest ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Taxa de Excelência */}
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">Taxa de Excelência (%)</p>
                {comparisonData.map(cls => {
                  const rate = cls.studentCount > 0
                    ? (cls.classifications.excelencia / cls.studentCount) * 100
                    : 0;
                  const isBest = cls.classifications.excelencia === mostExcellence;

                  return (
                    <div key={cls.classData.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{cls.classData.name}</span>
                        <span className={isBest ? 'font-semibold text-blue-600' : ''}>
                          {formatNumber(rate, 0)}%
                        </span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500`}
                          style={{
                            width: `${rate}%`,
                            backgroundColor: CLASSIFICATION_COLORS.excelencia,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Taxa de Críticos */}
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">Taxa de Críticos (%)</p>
                {comparisonData.map(cls => {
                  const rate = cls.studentCount > 0
                    ? (cls.classifications.critico / cls.studentCount) * 100
                    : 0;
                  const isBest = cls.classifications.critico === leastCritical;

                  return (
                    <div key={cls.classData.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{cls.classData.name}</span>
                        <span className={isBest ? 'font-semibold text-emerald-600' : 'text-red-600'}>
                          {formatNumber(rate, 0)}%
                        </span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500`}
                          style={{
                            width: `${rate}%`,
                            backgroundColor: CLASSIFICATION_COLORS.critico,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Insights da Comparação */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-3">Insights da Comparação</h4>
              <div className="space-y-2">
                {(() => {
                  const insights: string[] = [];
                  const bestClass = comparisonData.find(c => c.average === bestAverage);
                  const worstClass = comparisonData.reduce((a, b) => a.average < b.average ? a : b);

                  if (bestClass) {
                    insights.push(
                      `${bestClass.classData.name} lidera com média ${formatNumber(bestClass.average)}`
                    );
                  }

                  const avgDiff = bestAverage - worstClass.average;
                  if (avgDiff > 1) {
                    insights.push(
                      `Diferença de ${formatNumber(avgDiff)} pontos entre a melhor e a pior turma`
                    );
                  }

                  const totalCritical = comparisonData.reduce((s, c) => s + c.classifications.critico, 0);
                  if (totalCritical > 0) {
                    insights.push(
                      `${totalCritical} alunos em situação crítica nas turmas analisadas`
                    );
                  }

                  const totalExcellence = comparisonData.reduce((s, c) => s + c.classifications.excelencia, 0);
                  if (totalExcellence > 0) {
                    insights.push(
                      `${totalExcellence} alunos de excelência nas turmas analisadas`
                    );
                  }

                  return insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{insight}</span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
