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

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  BookOpen,
  Users2,
  ShieldAlert,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAnalyticsFiltersLogic } from '@/hooks/useAnalyticsFiltersLogic';

// Componente de Insights Inline (Neutralizado)
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

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50 dark:border-border/30 bg-muted/20">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground/80">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map(insight => (
            <div
              key={insight.id}
              className="group flex flex-col gap-2 p-3 rounded-md border border-border/50 hover:border-border transition-colors bg-background"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1 rounded-full bg-muted shrink-0 ${insight.type === 'alert' ? 'text-destructive dark:text-destructive' :
                  insight.type === 'warning' ? 'text-warning dark:text-warning' :
                    insight.type === 'success' ? 'text-success dark:text-success' :
                      'text-info dark:text-info'
                  }`}>
                  {insight.type === 'alert' && <AlertTriangle className="h-3.5 w-3.5" />}
                  {insight.type === 'warning' && <AlertCircle className="h-3.5 w-3.5" />}
                  {insight.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {(!['alert', 'warning', 'success'].includes(insight.type)) && <AlertCircle className="h-3.5 w-3.5" />}
                </div>

                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-semibold text-foreground leading-none">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>

              {insight.actionLabel && onAction && (
                <div className="pl-9">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 -ml-2 text-primary hover:text-primary/80"
                    onClick={() => onAction(insight)}
                  >
                    {insight.actionLabel}
                    <span className="sr-only">sobre {insight.title}</span>
                  </Button>
                </div>
              )}
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
                    className="h-full rounded-full bg-info/100"
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

// ... imports anteriores
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ... (InlineInsights e SubjectComparisonCard mantidos como estavam ou movidos para arquivos separados futuramente)
const ANALYTICS_TABS = ['dashboard', 'subjects', 'classes', 'ranking-alunos', 'behavior'] as const;
type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

const isAnalyticsTab = (value: unknown): value is AnalyticsTab =>
  typeof value === 'string' && ANALYTICS_TABS.includes(value as AnalyticsTab);

const Analytics = () => {
  const { toast } = useToast();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { professionalSubjects } = useProfessionalSubjects();
  const { templates } = useProfessionalSubjectTemplates();
  const { analyticsUI, setAnalyticsFilters, setAnalyticsUI } = useUIStore();
  const filters = analyticsUI.filters as AnalyticsFilters;
  const { incidents } = useIncidents();

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
  const [shouldScrollToRanking, setShouldScrollToRanking] = useState(false);
  const activeTab: AnalyticsTab = isAnalyticsTab(analyticsUI.activeTab)
    ? analyticsUI.activeTab
    : 'dashboard';

  const setActiveTab = useCallback(
    (value: string) => {
      if (!isAnalyticsTab(value)) return;
      setAnalyticsUI({ activeTab: value });
    },
    [setAnalyticsUI],
  );

  useEffect(() => {
    if (!isAnalyticsTab(analyticsUI.activeTab)) {
      setAnalyticsUI({ activeTab: 'dashboard' });
    }
  }, [analyticsUI.activeTab, setAnalyticsUI]);

  useEffect(() => {
    if (activeTab === 'ranking-alunos') return;
    if (rankingFocus !== null) setRankingFocus(null);
  }, [activeTab, rankingFocus]);

  useEffect(() => {
    if (!shouldScrollToRanking || activeTab !== 'ranking-alunos') return;
    const rafId = window.requestAnimationFrame(() => {
      rankingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShouldScrollToRanking(false);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [activeTab, shouldScrollToRanking]);

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

    let shouldNavigateToRanking = false;
    if (actionData.classId) {
      applyFilters({ classIds: [actionData.classId] });
      toast({
        title: "Filtro aplicado",
        description: "Exibindo dados da turma selecionada",
        duration: 2000,
      });
    }

    if (actionData.subject) {
      applyFilters({ subjects: [actionData.subject] });
      toast({
        title: "Filtro aplicado",
        description: `Analisando ${actionData.subject}`,
        duration: 2000,
      });
    }

    if (actionData.filter === 'critico') {
      setActiveTab('ranking-alunos');
      setRankingFocus('critical');
      shouldNavigateToRanking = true;
      toast({
        title: "Navegando...",
        description: "Exibindo alunos em situação crítica",
        duration: 2000,
      });
    } else if (actionData.filter === 'excelencia') {
      setActiveTab('ranking-alunos');
      setRankingFocus('top');
      shouldNavigateToRanking = true;
      toast({
        title: "Navegando...",
        description: "Exibindo alunos em destaque",
        duration: 2000,
      });
    }

    if (shouldNavigateToRanking) {
      setShouldScrollToRanking(true);
    }
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

  // Helper Contexto Limpo (Sem asteriscos, retorno ReactNode puro)
  const getContextDescription = () => {
    const filtersLabel: ReactNode[] = [];

    // Turma(s)
    if (filters.classIds.length === 1) {
      const cls = classes.find(c => c.id === filters.classIds[0]);
      if (cls) filtersLabel.push(<span key="cls">Turma {cls.name}</span>);
    } else if (filters.classIds.length > 1) {
      filtersLabel.push(<span key="cls-multi">{filters.classIds.length} turmas selecionadas</span>);
    } else if (filters.series.length > 0) {
      filtersLabel.push(<span key="series">Série(s) {filters.series.join(', ')}</span>);
    } else {
      filtersLabel.push(<span key="all">Visão Geral da Escola</span>);
    }

    // Disciplinas
    if (filters.subjects && filters.subjects.length > 0) {
      filtersLabel.push(<span key="subj">em {filters.subjects.length === 1 ? filters.subjects[0] : `${filters.subjects.length} disciplinas`}</span>);
    }

    // Período
    if (filters.quarter !== 'all') {
      filtersLabel.push(<span key="q">referente ao {filters.quarter}</span>);
    } else {
      filtersLabel.push(<span key="q-all">no acumulado Anual</span>);
    }

    const content = filtersLabel.flatMap((item, index) =>
      index === 0 ? [item] : [<span key={`sep-${index}`}>•</span>, item],
    );

    return (
      <span className="flex flex-wrap gap-1 items-baseline font-normal text-muted-foreground dark:text-muted-foreground/80 dark:opacity-90">
        {content}
      </span>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description={getContextDescription()}
        actions={
          analyticsLoading && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">Atualizando...</Badge>
          )
        }
      />

      {/* Filters (Fixo no topo) */}
      <FiltersBar
        classes={classes}
        subjects={availableSubjects}
        filters={filters}
        onFilterChange={handleFilterChange}
        onCompare={handleCompare}
        autoIndicators={autoIndicators}
        eligibleClassIds={subjectEligibleClassIds}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Visão 360º
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Disciplinas
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Ranking de Turma
          </TabsTrigger>
          <TabsTrigger value="ranking-alunos" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Ranking de Alunos
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-2">
            <Users2 className="h-4 w-4" />
            Convivência
          </TabsTrigger>
        </TabsList>

        {/* ================= ABA 1: DASHBOARD ================= */}
        <TabsContent value="dashboard" className="space-y-8">
          {analyticsContext.gradeCount === 0 && analyticsContext.studentCount === 0 && !analyticsLoading && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-center">
              <p className="text-sm font-medium text-warning dark:text-warning">
                Nenhum dado encontrado para os filtros selecionados.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente ajustar os filtros de período, série ou turma.
              </p>
            </div>
          )}
          <SchoolOverviewCards
            overview={analytics.overview}
            showBehavior={!analyticsContext.hasSubjectFilter}
            showClassification={!analyticsContext.hasSubjectFilter}
            subjectMode={analyticsContext.hasSubjectFilter}
            hasGrades={analyticsContext.gradeCount > 0}
          />

          {!analyticsContext.hasSubjectFilter ? (
            <ClassificationChart
              classifications={analytics.overview.classifications}
              totalStudents={analytics.overview.totalStudents}
            />
          ) : (
            <SubjectComparisonCard subjects={analytics.subjectAnalytics} />
          )}

          <InlineInsights
            insights={[...analytics.categorizedInsights.academic, ...analytics.categorizedInsights.risk].slice(0, 3)}
            title="Destaques Importantes"
            onAction={handleInsightAction}
          />
        </TabsContent>

        {/* ================= ABA 2: DISCIPLINAS ================= */}
        <TabsContent value="subjects" className="space-y-8">
          <SubjectAnalysisPanel
            allSubjects={analytics.subjectAnalytics}
            areaAnalytics={analytics.areaAnalytics}
          />


          {/* Comparativo de Disciplinas */}
          {analyticsContext.hasSubjectFilter && (
            <div className="max-w-xl">
              <SubjectComparisonCard subjects={analytics.subjectAnalytics} />
            </div>
          )}

          <InlineInsights
            insights={analytics.categorizedInsights.academic.filter(i => i.type !== 'alert')}
            title="Insights de Disciplinas"
            onAction={handleInsightAction}
          />
        </TabsContent>

        {/* ================= ABA 3: RANKING DE TURMA ================= */}
        <TabsContent value="classes" className="space-y-8">
          <ClassRankingTable
            classRanking={analytics.classRanking}
            onSelectForComparison={handleCompare}
            subjectMode={analyticsContext.hasSubjectFilter}
            filters={filters}
          />

          {filters.schoolYear !== 'all' && (
            <CohortComparisonTable
              cohorts={analytics.cohortAnalytics}
              schoolYear={filters.schoolYear}
            />
          )}

          <InlineInsights
            insights={analytics.categorizedInsights.academic}
            title="Insights Gerais"
            onAction={handleInsightAction}
          />
        </TabsContent>

        {/* ================= ABA 4: RANKING DE ALUNOS ================= */}
        <TabsContent value="ranking-alunos" className="space-y-8">
          <div ref={rankingRef}>
            <StudentRankingPanel
              topStudents={analytics.topStudents}
              criticalStudents={analytics.criticalStudents}
              allStudentsRanking={analytics.allStudentsRanking}
              allCriticalStudents={analytics.allCriticalStudents}
              focusTab={rankingFocus}
              subjectMode={analyticsContext.hasSubjectFilter}
              activeSubjects={filters.subjects ?? []}
              filters={filters}
            />
          </div>

          <InlineInsights
            insights={analytics.categorizedInsights.risk}
            title="Alertas e Situações de Risco"
            onAction={handleInsightAction}
          />
        </TabsContent>

        {/* ================= ABA 5: CONVIVÊNCIA ================= */}
        <TabsContent value="behavior" className="space-y-8">
          {!analyticsContext.hasSubjectFilter ? (
            <>
              <BehaviorAnalyticsPanel
                behavioralAnalytics={analytics.behavioralAnalytics}
                behavioralInsights={analytics.categorizedInsights.behavioral}
              />
              <InlineInsights
                insights={analytics.categorizedInsights.behavioral}
                title="Alertas de Convivência"
                onAction={handleInsightAction}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Filtro de Disciplina Ativo</h3>
              <p className="text-muted-foreground max-w-md">
                Dados comportamentais são globais e não são filtrados por disciplina específica. Remova o filtro de disciplina para visualizar esta aba.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleFilterChange({ subjects: [] })}
              >
                Limpar Filtro de Disciplina
              </Button>
            </div>
          )}
        </TabsContent>

      </Tabs>

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
