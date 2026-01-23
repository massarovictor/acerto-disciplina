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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  comparisonCourseYearData: ClassAnalytics[];
  comparisonMode: 'calendar' | 'courseYear';
  comparisonCourseYear: 1 | 2 | 3;
  activeSubjects: string[];
  onComparisonModeChange: (mode: 'calendar' | 'courseYear', courseYear: 1 | 2 | 3) => void;
}

export function ClassComparisonDialog({
  open,
  onOpenChange,
  comparisonData,
  comparisonCourseYearData,
  comparisonMode,
  comparisonCourseYear,
  activeSubjects,
  onComparisonModeChange,
}: ClassComparisonDialogProps) {
  const isCourseYearMode = comparisonMode === 'courseYear';
  const activeData = isCourseYearMode ? comparisonCourseYearData : comparisonData;
  const hasEnoughData = activeData.length >= 2;
  const subjectMode = activeSubjects.length > 0;

  const modeLabel = isCourseYearMode
    ? `Ano do curso (${comparisonCourseYear}º ano)`
    : 'Ano calendário';
  const subjectCount = activeSubjects.length;
  const subjectPreview = activeSubjects.slice(0, 3);

  if (!open) return null;

  const bestAverage = hasEnoughData ? Math.max(...activeData.map(c => c.average)) : 0;
  // DISABLED: Frequência removida temporariamente
  // const bestFrequency = Math.max(...comparisonData.map(c => c.frequency));
  const mostExcellence = hasEnoughData ? Math.max(...activeData.map(c => c.classifications.excelencia)) : 0;
  const leastCritical = hasEnoughData ? Math.min(...activeData.map(c => c.classifications.critico)) : 0;
  const bestGrowth = hasEnoughData ? Math.max(...activeData.map(c => c.growth ?? 0)) : 0;
  const lowestBelow6Percent = hasEnoughData
    ? Math.min(
        ...activeData.map(c =>
          c.studentCount > 0 ? (c.classifications.critico / c.studentCount) * 100 : 0,
        ),
      )
    : 0;

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
            Análise comparativa de {activeData.length} turmas selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Configuração de Comparação */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Modo de Comparação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Comparar por ano do curso</p>
                  <p className="text-xs text-muted-foreground">
                    Ignora o ano calendário e compara o mesmo ano relativo da turma.
                  </p>
                </div>
                <Switch
                  checked={isCourseYearMode}
                  onCheckedChange={(checked) =>
                    onComparisonModeChange(
                      checked ? 'courseYear' : 'calendar',
                      comparisonCourseYear,
                    )
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{modeLabel}</Badge>
                <Select
                  value={String(comparisonCourseYear)}
                  onValueChange={(value) =>
                    onComparisonModeChange('courseYear', Number(value) as 1 | 2 | 3)
                  }
                  disabled={!isCourseYearMode}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º ano</SelectItem>
                    <SelectItem value="2">2º ano</SelectItem>
                    <SelectItem value="3">3º ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {subjectCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Filtro de disciplina ativo</Badge>
                  {subjectPreview.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                  {subjectCount > subjectPreview.length && (
                    <Badge variant="secondary">+{subjectCount - subjectPreview.length}</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!hasEnoughData && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Selecione ao menos 2 turmas para comparar neste modo.
                </p>
              </CardContent>
            </Card>
          )}

          {hasEnoughData && (
            <>
              {/* Headers */}
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `120px repeat(${activeData.length}, 1fr)` }}
              >
                <div></div>
                {activeData.map(cls => (
                  <div key={cls.classData.id} className="text-center">
                    <p className="font-semibold">{cls.classData.name}</p>
                    <p className="text-xs text-muted-foreground">{cls.studentCount} alunos</p>
                  </div>
                ))}
              </div>

              {/* Métricas Gerais */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">
                    {subjectMode ? 'Métricas da disciplina' : 'Métricas Gerais'}
                  </h4>
                  <div className="space-y-1 divide-y">
                    <MetricRow
                      label={subjectMode ? 'Média da disciplina' : 'Média Geral'}
                      values={activeData.map(c => c.average)}
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
                    {!subjectMode && (
                      <MetricRow
                        label="Ocorrências"
                        values={activeData.map(c => c.incidentCount)}
                        bestValue={Math.min(...activeData.map(c => c.incidentCount))}
                        format={(v) => v.toString()}
                        higherIsBetter={false}
                      />
                    )}
                    <MetricRow
                      label="Crescimento"
                      values={activeData.map(c => c.growth ?? 0)}
                      bestValue={bestGrowth}
                      format={(v) => v.toFixed(1)}
                      higherIsBetter={true}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Classificação dos Alunos */}
              {!subjectMode && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Distribuição de Alunos</h4>
                    <div className="space-y-1 divide-y">
                      <ClassificationRow
                        classification="excelencia"
                        values={activeData.map(c => c.classifications.excelencia)}
                        bestValue={mostExcellence}
                        higherIsBetter={true}
                      />
                      <ClassificationRow
                        classification="aprovado"
                        values={activeData.map(c => c.classifications.aprovado)}
                        bestValue={Math.max(...activeData.map(c => c.classifications.aprovado))}
                        higherIsBetter={true}
                      />
                      <ClassificationRow
                        classification="atencao"
                        values={activeData.map(c => c.classifications.atencao)}
                        bestValue={Math.min(...activeData.map(c => c.classifications.atencao))}
                        higherIsBetter={false}
                      />
                      <ClassificationRow
                        classification="critico"
                        values={activeData.map(c => c.classifications.critico)}
                        bestValue={leastCritical}
                        higherIsBetter={false}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {subjectMode && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Distribuição por faixa (disciplina)</h4>
                    <div className="space-y-2">
                      <MetricRow
                        label="Alunos < 6"
                        values={activeData.map(c => c.classifications.critico)}
                        bestValue={leastCritical}
                        format={(v) => v.toString()}
                        higherIsBetter={false}
                      />
                      <MetricRow
                        label="Alunos 6-7"
                        values={activeData.map(c => c.classifications.atencao)}
                        bestValue={Math.min(...activeData.map(c => c.classifications.atencao))}
                        format={(v) => v.toString()}
                        higherIsBetter={false}
                      />
                      <MetricRow
                        label="Alunos ≥ 7"
                        values={activeData.map(c => c.classifications.aprovado + c.classifications.excelencia)}
                        bestValue={Math.max(...activeData.map(c => c.classifications.aprovado + c.classifications.excelencia))}
                        format={(v) => v.toString()}
                        higherIsBetter={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gráfico de Barras Comparativo */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Comparativo Visual</h4>

                  {/* Média */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {subjectMode ? 'Média da disciplina' : 'Média Geral'}
                    </p>
                    {activeData.map(cls => {
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

                  {!subjectMode && (
                    <div className="mt-6 space-y-3">
                      <p className="text-sm text-muted-foreground">Taxa de Excelência (%)</p>
                      {activeData.map(cls => {
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
                  )}

                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {subjectMode ? 'Percentual abaixo de 6 (%)' : 'Taxa de Críticos (%)'}
                    </p>
                    {activeData.map(cls => {
                      const rate = cls.studentCount > 0
                        ? (cls.classifications.critico / cls.studentCount) * 100
                        : 0;
                      const isBest = subjectMode
                        ? rate === lowestBelow6Percent
                        : cls.classifications.critico === leastCritical;

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
                              className="h-full rounded-full transition-all duration-500"
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
                      const bestClass = activeData.find(c => c.average === bestAverage);
                      const worstClass = activeData.reduce((a, b) => a.average < b.average ? a : b);

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

                      const totalCritical = activeData.reduce((s, c) => s + c.classifications.critico, 0);
                      if (totalCritical > 0) {
                        insights.push(
                          `${totalCritical} alunos em situação crítica nas turmas analisadas`
                        );
                      }

                      const totalExcellence = activeData.reduce((s, c) => s + c.classifications.excelencia, 0);
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
