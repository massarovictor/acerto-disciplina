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

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, AlertTriangle, Users, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
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
    comparisonClassIds: [],
  });

  const [showComparison, setShowComparison] = useState(false);

  const analytics = useSchoolAnalytics(
    students,
    classes,
    grades,
    attendance,
    incidents,
    filters
  );

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCompare = (classIds: string[]) => {
    setFilters(prev => ({ ...prev, comparisonClassIds: classIds }));
    setShowComparison(true);
  };

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
    </div>
  );
};

export default Analytics;
