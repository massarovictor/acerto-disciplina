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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, Lightbulb, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useClasses,
  useStudents,
  useIncidents,
  useProfessionalSubjects,
  useProfessionalSubjectTemplates,
} from '@/hooks/useData';
import { AnalyticsFilters, Insight, SubjectAnalytics } from '@/hooks/useSchoolAnalytics';
import { useSchoolAnalyticsWorker } from '@/hooks/useSchoolAnalyticsWorker';
import { AnalyticsFilters as FiltersBar } from '@/components/analytics/AnalyticsFilters';
import { SchoolOverviewCards } from '@/components/analytics/SchoolOverviewCards';
import { ClassificationChart } from '@/components/analytics/ClassificationChart';
import { ClassRankingTable } from '@/components/analytics/ClassRankingTable';
import { StudentRankingPanel } from '@/components/analytics/StudentRankingPanel';
import { SubjectAnalysisPanel } from '@/components/analytics/SubjectAnalysisPanel';
import { ClassComparisonDialog } from '@/components/analytics/ClassComparisonDialog';
import { BehaviorAnalyticsPanel } from '@/components/analytics/BehaviorAnalyticsPanel';
import { CohortComparisonTable } from '@/components/analytics/CohortComparisonTable';
import { useUIStore } from '@/stores/useUIStore';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAnalyticsFiltersLogic } from '@/hooks/useAnalyticsFiltersLogic';

// Componente de Insights Inline
const InlineInsights = ({
  insights,
  title,
  onAction,
}: {
  insights: Insight[];
  title: string;
  onAction?: (insight: Insight) => void;
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
                  {insight.actionLabel && onAction && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction(insight)}
                      >
                        {insight.actionLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SubjectComparisonCard = ({ subjects }: { subjects: SubjectAnalytics[] }) => {
  const sorted = [...subjects].sort((a, b) => b.average - a.average);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparativo por disciplina</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma disciplina disponível no recorte atual.
          </p>
        ) : (
          sorted.map((subject) => {
            const width = Math.min(100, (subject.average / 10) * 100);
            return (
              <div key={subject.subject} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{subject.subject}</span>
                  <span className="text-muted-foreground">
                    {subject.average.toFixed(1)} • {subject.studentsBelow6Percent.toFixed(0)}% &lt; 6
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

const Analytics = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { professionalSubjects } = useProfessionalSubjects();
  const { templates } = useProfessionalSubjectTemplates();
  // ✅ Usando Zustand store para persistir filtros entre navegações
  const { analyticsUI, setAnalyticsFilters } = useUIStore();
  const filters = analyticsUI.filters as AnalyticsFilters;

  const { incidents } = useIncidents();

  // Hook unificado para lógica de filtros e preparação de dados
  const {
    grades,
    availableSubjects,
    subjectEligibleClassIds,
    autoIndicators,
    applyFilters,
  } = useAnalyticsFiltersLogic({
    classes,
    professionalSubjects,
    templates,
    filters,
    setAnalyticsFilters,
  });

  const [showComparison, setShowComparison] = useState(false);

  const { analytics, loading: analyticsLoading } = useSchoolAnalyticsWorker(
    students,
    classes,
    grades,
    [], // DISABLED: Attendance temporarily removed
    incidents,
    filters
  );

  const analyticsContext = analytics.context ?? {
    mode: 'general' as const,
    classCount: 0,
    studentCount: 0,
    gradeCount: 0,
    subjectCount: 0,
    hasSubjectFilter: false,
    quarterLabel: 'Anual',
    schoolYear: filters.schoolYear,
    calendarYear: filters.calendarYear,
  };

  const rankingRef = useRef<HTMLDivElement | null>(null);
  const [rankingFocus, setRankingFocus] = useState<'top' | 'critical' | null>(null);

  useEffect(() => {
    const nextSubjects = (filters.subjects ?? []).filter((subject) =>
      availableSubjects.includes(subject),
    );

    if (nextSubjects.length !== (filters.subjects ?? []).length) {
      applyFilters({ subjects: nextSubjects });
    }
  }, [
    filters.subjects,
    availableSubjects,
    applyFilters,
  ]);

  const handleInsightAction = (insight: Insight) => {
    const actionData = insight.actionData as
      | { classId?: string; subject?: string; filter?: string }
      | undefined;
    if (!actionData) return;

    if (actionData.classId) {
      applyFilters({ classIds: [actionData.classId] });
    }

    if (actionData.subject) {
      applyFilters({ subjects: [actionData.subject] });
    }

    if (actionData.filter === 'critico') {
      setRankingFocus('critical');
    } else if (actionData.filter === 'excelencia') {
      setRankingFocus('top');
    }

    rankingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    applyFilters(newFilters);
  };

  const handleCompare = (classIds: string[]) => {
    applyFilters({ comparisonClassIds: classIds });
    setShowComparison(true);
  };

  const handleComparisonModeChange = (
    mode: 'calendar' | 'courseYear',
    courseYear: 1 | 2 | 3,
  ) => {
    applyFilters({
      comparisonMode: mode,
      comparisonCourseYear: courseYear,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Exploração de dados acadêmicos e comportamentais"
        actions={
          analyticsLoading && (
            <Badge variant="secondary">Atualizando...</Badge>
          )
        }
      />

      {/* Filters */}
      <FiltersBar
        classes={classes}
        subjects={availableSubjects}
        filters={filters}
        onFilterChange={handleFilterChange}
        onCompare={handleCompare}
        autoIndicators={autoIndicators}
        eligibleClassIds={subjectEligibleClassIds}
      />

      {/* Contexto do recorte */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2">
        <Badge variant="outline">
          Modo: {analyticsContext.mode === 'subject' ? 'Disciplina' : 'Geral'}
        </Badge>
        <Badge variant="outline">{analyticsContext.classCount} turmas</Badge>
        <Badge variant="outline">{analyticsContext.studentCount} alunos</Badge>
        <Badge variant="outline">{analyticsContext.gradeCount} notas</Badge>
        <Badge variant="outline">Período: {analyticsContext.quarterLabel}</Badge>
        {analyticsContext.hasSubjectFilter && (
          <Badge variant="secondary">
            {analyticsContext.subjectCount} disciplina(s) ativa(s)
          </Badge>
        )}
        {analyticsContext.hasSubjectFilter && subjectEligibleClassIds.length === 0 && (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
            Nenhuma turma com notas nesse recorte
          </Badge>
        )}
        {analyticsContext.hasSubjectFilter && (
          <span className="text-[11px] text-muted-foreground/80">
            Modo disciplina altera a interpretação das métricas gerais.
          </span>
        )}
      </div>

      {/* Overview Cards */}
      <SchoolOverviewCards
        overview={analytics.overview}
        showBehavior={!analyticsContext.hasSubjectFilter}
        showClassification={!analyticsContext.hasSubjectFilter}
        subjectMode={analyticsContext.hasSubjectFilter}
        hasGrades={analyticsContext.gradeCount > 0}
      />

      {/* ============================================ */}
      {/* SEÇÃO 1: DESEMPENHO ACADÊMICO */}
      {/* ============================================ */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <GraduationCap className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Desempenho Acadêmico</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {!analyticsContext.hasSubjectFilter ? (
            <ClassificationChart
              classifications={analytics.overview.classifications}
              totalStudents={analytics.overview.totalStudents}
            />
          ) : (
            <SubjectComparisonCard subjects={analytics.subjectAnalytics} />
          )}

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
          subjectMode={analyticsContext.hasSubjectFilter}
        />

        {filters.schoolYear !== 'all' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <CohortComparisonTable
              cohorts={analytics.cohortAnalytics}
              schoolYear={filters.schoolYear}
            />
          </div>
        )}

        {/* Insights Acadêmicos */}
        <InlineInsights
          insights={analytics.categorizedInsights.academic}
          title="Insights Acadêmicos"
          onAction={handleInsightAction}
        />
      </div>

      {/* ============================================ */}
      {/* SEÇÃO 2: COMPORTAMENTO E DISCIPLINA */}
      {/* ============================================ */}
      {!analyticsContext.hasSubjectFilter && (
        <div className="space-y-6 pt-4">
          <BehaviorAnalyticsPanel
            behavioralAnalytics={analytics.behavioralAnalytics}
            behavioralInsights={analytics.categorizedInsights.behavioral}
          />
        </div>
      )}

      {/* ============================================ */}
      {/* SEÇÃO 3: RANKINGS GERAIS */}
      {/* ============================================ */}
      <div className="space-y-6 pt-4">
        <div ref={rankingRef}>
          <StudentRankingPanel
            topStudents={analytics.topStudents}
            criticalStudents={analytics.criticalStudents}
            allStudentsRanking={analytics.allStudentsRanking}
            allCriticalStudents={analytics.allCriticalStudents}
            focusTab={rankingFocus}
            subjectMode={analyticsContext.hasSubjectFilter}
            activeSubjects={filters.subjects ?? []}
          />
        </div>

        {/* Insights de Risco */}
        <InlineInsights
          insights={analytics.categorizedInsights.risk}
          title="Alertas e Situações de Risco"
          onAction={handleInsightAction}
        />
      </div>

      {/* Comparison Dialog */}
      <ClassComparisonDialog
        open={showComparison}
        onOpenChange={setShowComparison}
        comparisonData={analytics.comparisonData}
        comparisonCourseYearData={analytics.comparisonCourseYearData}
        comparisonMode={filters.comparisonMode ?? 'calendar'}
        comparisonCourseYear={filters.comparisonCourseYear ?? 1}
        activeSubjects={filters.subjects ?? []}
        onComparisonModeChange={handleComparisonModeChange}
      />
    </PageContainer>
  );
};

export default Analytics;
