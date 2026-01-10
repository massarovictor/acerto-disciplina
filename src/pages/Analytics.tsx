/**
 * Página de Analytics
 * 
 * Painel completo de exploração de dados organizado por dimensões:
 * 
 * 1. DESEMPENHO ACADÊMICO
 *    - Visão geral da escola
 *    - Rankings de turmas (por média)
 *    - Análise de disciplinas
 *    - Insights acadêmicos
 * 
 * 2. COMPORTAMENTO E DISCIPLINA
 *    - Resumo de ocorrências por severidade
 *    - Ranking de turmas (por ocorrências)
 *    - Alunos com mais ocorrências
 *    - Tendência mensal
 *    - Insights comportamentais
 * 
 * 3. RANKINGS GERAIS
 *    - Top alunos e alunos críticos
 *    - Insights de risco
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, AlertTriangle, Users, CheckCircle2, AlertCircle, Lightbulb, Sparkles } from 'lucide-react';
import { useClasses, useStudents, useGrades, useAttendance, useIncidents } from '@/hooks/useData';
import { useSchoolAnalytics, AnalyticsFilters, Insight } from '@/hooks/useSchoolAnalytics';
import { AnalyticsFilters as FiltersBar } from '@/components/analytics/AnalyticsFilters';
import { SchoolOverviewCards } from '@/components/analytics/SchoolOverviewCards';
import { ClassificationChart } from '@/components/analytics/ClassificationChart';
import { ClassRankingTable } from '@/components/analytics/ClassRankingTable';
import { StudentRankingPanel } from '@/components/analytics/StudentRankingPanel';
import { SubjectAnalysisPanel } from '@/components/analytics/SubjectAnalysisPanel';
import { ClassComparisonDialog } from '@/components/analytics/ClassComparisonDialog';
import { BehaviorAnalyticsPanel } from '@/components/analytics/BehaviorAnalyticsPanel';
import { CohortComparisonTable } from '@/components/analytics/CohortComparisonTable';
import { PredictionDialog } from '@/components/analytics/PredictionDialog';

// Componente de Insights Inline
const InlineInsights = ({
  insights,
  title
}: {
  insights: Insight[];
  title: string;
}) => {
  if (insights.length === 0) return null;

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'alert': return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'warning': return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20';
      case 'success': return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20';
      default: return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
    }
  };

  const InsightIcon = ({ type }: { type: Insight['type'] }) => {
    const iconClass = 'h-4 w-4';
    switch (type) {
      case 'alert': return <AlertTriangle className={`${iconClass} text-red-500`} />;
      case 'warning': return <AlertCircle className={`${iconClass} text-amber-500`} />;
      case 'success': return <CheckCircle2 className={`${iconClass} text-emerald-500`} />;
      default: return <AlertCircle className={`${iconClass} text-blue-500`} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map(insight => (
            <div
              key={insight.id}
              className={`p-3 rounded-lg border-l-4 ${getInsightStyles(insight.type)}`}
            >
              <div className="flex items-start gap-2">
                <InsightIcon type={insight.type} />
                <div>
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const Analytics = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { grades } = useGrades();
  const { attendance } = useAttendance();
  const { incidents } = useIncidents();

  const [filters, setFilters] = useState<AnalyticsFilters>({
    series: [],
    classIds: [],
    quarter: 'all',
    schoolYear: 'all',
    calendarYear: 'all',
    includeArchived: false,
    comparisonClassIds: [],
  });

  const [showComparison, setShowComparison] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  const analytics = useSchoolAnalytics(
    students,
    classes,
    grades,
    attendance,
    incidents,
    filters
  );

  const lastClassIdRef = useRef<string | null>(null);

  useEffect(() => {
    const primaryClassId = filters.classIds[0] ?? filters.comparisonClassIds[0];
    if (!primaryClassId) {
      lastClassIdRef.current = null;
      return;
    }

    if (lastClassIdRef.current === primaryClassId) return;
    lastClassIdRef.current = primaryClassId;

    if (filters.schoolYear === 'all') return;

    const classData = classes.find((c) => c.id === primaryClassId);
    const defaultYear = classData?.currentYear;
    if (defaultYear && [1, 2, 3].includes(defaultYear)) {
      const startYear =
        classData?.startCalendarYear ||
        (classData?.startYearDate ? new Date(`${classData.startYearDate}T00:00:00`).getFullYear() : undefined);
      const calendarYear = startYear ? startYear + (defaultYear - 1) : undefined;
      const nextSchoolYear = defaultYear as 1 | 2 | 3;
      const nextCalendarYear = calendarYear ?? 'all';

      if (filters.schoolYear !== nextSchoolYear || filters.calendarYear !== nextCalendarYear) {
        setFilters((prev) => ({
          ...prev,
          schoolYear: nextSchoolYear,
          calendarYear: nextCalendarYear,
        }));
      }
    }
  }, [classes, filters.classIds, filters.comparisonClassIds, filters.schoolYear, filters.calendarYear]);

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCompare = (classIds: string[]) => {
    setFilters(prev => ({ ...prev, comparisonClassIds: classIds }));
    setShowComparison(true);
  };

  const predictionYearLabel =
    filters.schoolYear === 'all' ? 'Ano atual das turmas' : `${filters.schoolYear}º ano`;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Exploração de dados acadêmicos e comportamentais
          </p>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar
        classes={classes}
        filters={filters}
        onFilterChange={handleFilterChange}
        onCompare={handleCompare}
      />

      {/* Overview Cards */}
      <SchoolOverviewCards overview={analytics.overview} />

      {/* ============================================ */}
      {/* SEÇÃO 1: DESEMPENHO ACADÊMICO */}
      {/* ============================================ */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <GraduationCap className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Desempenho Acadêmico</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Distribution Chart */}
          <ClassificationChart
            classifications={analytics.overview.classifications}
            totalStudents={analytics.overview.totalStudents}
          />

          {/* Subject Analysis */}
          <SubjectAnalysisPanel
            bestSubjects={analytics.bestSubjects}
            worstSubjects={analytics.worstSubjects}
            areaAnalytics={analytics.areaAnalytics}
          />
        </div>

        {/* Class Ranking */}
        <ClassRankingTable
          classRanking={analytics.classRanking}
          onSelectForComparison={handleCompare}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Predições de Desempenho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline" className="w-fit">
                {predictionYearLabel}
              </Badge>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Alto risco</span>
                  <Badge variant="destructive">{analytics.predictionSummary.highRisk}</Badge>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Médio risco</span>
                  <Badge className="bg-amber-500">{analytics.predictionSummary.mediumRisk}</Badge>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Baixo risco</span>
                  <Badge className="bg-emerald-500">{analytics.predictionSummary.lowRisk}</Badge>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Dados insuficientes</span>
                  <Badge variant="outline">{analytics.predictionSummary.insufficient}</Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {analytics.predictionSummary.total === 0
                  ? 'Nenhum aluno encontrado com os filtros atuais.'
                  : analytics.predictionSummary.insufficient > 0
                    ? 'Alguns alunos (especialmente do 1º ano) ainda não possuem dados suficientes para predição.'
                    : 'Predições geradas com base nas notas atuais e no histórico disponível.'}
              </p>

              <Button
                onClick={() => setShowPredictions(true)}
                disabled={analytics.predictionSummary.total === 0}
              >
                Ver predições
              </Button>
            </CardContent>
          </Card>

          {filters.schoolYear === 'all' ? (
            <Card>
              <CardHeader>
                <CardTitle>Comparação por Ano Calendário</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Selecione um ano específico para comparar turmas por calendário.
                </p>
              </CardContent>
            </Card>
          ) : (
            <CohortComparisonTable
              cohorts={analytics.cohortAnalytics}
              schoolYear={filters.schoolYear}
            />
          )}
        </div>

        {/* Insights Acadêmicos */}
        <InlineInsights
          insights={analytics.categorizedInsights.academic}
          title="Insights Acadêmicos"
        />
      </div>

      {/* ============================================ */}
      {/* SEÇÃO 2: COMPORTAMENTO E DISCIPLINA */}
      {/* ============================================ */}
      <div className="space-y-6 pt-4">
        <BehaviorAnalyticsPanel
          behavioralAnalytics={analytics.behavioralAnalytics}
          behavioralInsights={analytics.categorizedInsights.behavioral}
        />
      </div>

      {/* ============================================ */}
      {/* SEÇÃO 3: RANKINGS GERAIS */}
      {/* ============================================ */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Users className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-semibold">Rankings de Alunos</h2>
        </div>

        {/* Student Rankings */}
        <StudentRankingPanel
          topStudents={analytics.topStudents}
          criticalStudents={analytics.criticalStudents}
        />

        {/* Insights de Risco */}
        <InlineInsights
          insights={analytics.categorizedInsights.risk}
          title="Alertas e Situações de Risco"
        />
      </div>

      {/* Comparison Dialog */}
      <ClassComparisonDialog
        open={showComparison}
        onOpenChange={setShowComparison}
        comparisonData={analytics.comparisonData}
      />

      <PredictionDialog
        open={showPredictions}
        onOpenChange={setShowPredictions}
        predictions={analytics.studentPredictions}
        summary={analytics.predictionSummary}
        schoolYearLabel={predictionYearLabel}
      />
    </div>
  );
};

export default Analytics;
