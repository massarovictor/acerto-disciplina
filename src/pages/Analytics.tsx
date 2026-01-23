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
  useGradesAnalytics,
  useAttendance,
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
import { QUARTERS } from '@/lib/subjects';
import { Class } from '@/types';

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

  const classIdsForFetch = useMemo(() => {
    let baseClasses = filters.includeArchived
      ? classes
      : classes.filter((c) => !c.archived);

    if (filters.series.length > 0) {
      baseClasses = baseClasses.filter((c) =>
        filters.series.some((series) => c.series.includes(series)),
      );
    }

    const baseIds = baseClasses.map((c) => c.id);
    const selectedIds =
      filters.classIds.length > 0 ? filters.classIds : baseIds;
    return Array.from(
      new Set([...selectedIds, ...filters.comparisonClassIds]),
    );
  }, [
    classes,
    filters.includeArchived,
    filters.series,
    filters.classIds,
    filters.comparisonClassIds,
  ]);

  const { grades } = useGradesAnalytics({
    classIds: classIdsForFetch,
  });
  // DISABLED: Attendance feature temporarily removed
  // const { attendance } = useAttendance();
  const { incidents } = useIncidents();

  const subjectClassIds = useMemo(() => {
    let baseClasses = filters.includeArchived
      ? classes
      : classes.filter((c) => !c.archived);

    baseClasses = filterClassesBySeries(
      baseClasses,
      filters.series,
      filters.calendarYear,
      filters.schoolYear,
    );

    const selectedIds =
      filters.classIds.length > 0 ? filters.classIds : baseClasses.map((c) => c.id);
    return new Set(selectedIds);
  }, [
    classes,
    filters.includeArchived,
    filters.series,
    filters.classIds,
    filters.calendarYear,
    filters.schoolYear,
  ]);

  function getStartCalendarYear(cls: Class) {
    if (cls.startCalendarYear) return cls.startCalendarYear;
    if (cls.startYearDate) return new Date(`${cls.startYearDate}T00:00:00`).getFullYear();
    if (cls.currentYear && [1, 2, 3].includes(cls.currentYear)) {
      return new Date().getFullYear() - (cls.currentYear - 1);
    }
    return undefined;
  }

  const getQuarterIndex = (quarter: string) => QUARTERS.indexOf(quarter);

  const normalizeSubjectName = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normalizeSubjectTokens = (value: string) =>
    normalizeSubjectName(value)
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length >= 3);

  const normalizeCourseName = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const templatesById = useMemo(() => {
    return new Map(templates.map((template) => [template.id, template]));
  }, [templates]);

  const templateSubjectsByCourse = useMemo(() => {
    const map = new Map<
      string,
      { all: Set<string>; byYear: Map<number, Set<string>>; labels: Map<string, string> }
    >();

    templates.forEach((template) => {
      const courseKey = template.course ? normalizeCourseName(template.course) : '';
      if (!courseKey) return;
      if (!map.has(courseKey)) {
        map.set(courseKey, {
          all: new Set<string>(),
          byYear: new Map<number, Set<string>>(),
          labels: new Map<string, string>(),
        });
      }
      const entry = map.get(courseKey)!;

      template.subjectsByYear.forEach((yearData) => {
        let yearSet = entry.byYear.get(yearData.year);
        if (!yearSet) {
          yearSet = new Set<string>();
          entry.byYear.set(yearData.year, yearSet);
        }
        yearData.subjects.forEach((subject) => {
          const key = normalizeSubjectName(subject);
          entry.all.add(key);
          yearSet!.add(key);
          if (!entry.labels.has(key)) {
            entry.labels.set(key, subject);
          }
        });
      });
    });

    return map;
  }, [templates, normalizeSubjectName, normalizeCourseName]);

  const templateSubjectsByClassId = useMemo(() => {
    const map = new Map<
      string,
      { all: Set<string>; byYear: Map<number, Set<string>>; labels: Map<string, string> }
    >();
    const courseKeys = Array.from(templateSubjectsByCourse.keys()).sort(
      (a, b) => b.length - a.length,
    );
    const findBestCourseKey = (course: string) => {
      const normalized = normalizeCourseName(course);
      if (!normalized) return null;
      if (templateSubjectsByCourse.has(normalized)) return normalized;
      return courseKeys.find((key) => key.includes(normalized) || normalized.includes(key)) ?? null;
    };

    classes.forEach((cls) => {
      const template = cls.templateId ? templatesById.get(cls.templateId) : undefined;
      const courseEntry = !template && cls.course
        ? (() => {
            const match = findBestCourseKey(cls.course);
            return match ? templateSubjectsByCourse.get(match) : undefined;
          })()
        : undefined;

      if (!template && !courseEntry) return;

      if (!template && courseEntry) {
        map.set(cls.id, {
          all: new Set(courseEntry.all),
          byYear: new Map(courseEntry.byYear),
          labels: new Map(courseEntry.labels),
        });
        return;
      }

      const all = new Set<string>();
      const byYear = new Map<number, Set<string>>();
      const labels = new Map<string, string>();

      template.subjectsByYear.forEach((yearData) => {
        const yearSet = new Set<string>();
        yearData.subjects.forEach((subject) => {
          const key = normalizeSubjectName(subject);
          yearSet.add(key);
          all.add(key);
          if (!labels.has(key)) {
            labels.set(key, subject);
          }
        });
        byYear.set(yearData.year, yearSet);
      });

      map.set(cls.id, { all, byYear, labels });
    });

    return map;
  }, [classes, templatesById, templateSubjectsByCourse, normalizeSubjectName, normalizeCourseName]);

  const professionalSubjectsByClassId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    professionalSubjects.forEach((item) => {
      const key = item.classId;
      if (!map.has(key)) {
        map.set(key, new Set());
      }
      map.get(key)!.add(normalizeSubjectName(item.subject));
    });
    return map;
  }, [professionalSubjects, normalizeSubjectName]);

  const availableSubjects = useMemo(() => {
    let pool = grades.filter((grade) => subjectClassIds.has(grade.classId));

    if (filters.schoolYear !== 'all') {
      const targetYear = Number(filters.schoolYear);
      if (Number.isFinite(targetYear)) {
        pool = pool.filter((grade) => (grade.schoolYear ?? 1) === targetYear);
      }
    }

    if (filters.useQuarterRange && filters.quarterRangeStart && filters.quarterRangeEnd) {
      const startIndex = getQuarterIndex(filters.quarterRangeStart);
      const endIndex = getQuarterIndex(filters.quarterRangeEnd);
      if (startIndex >= 0 && endIndex >= 0) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        pool = pool.filter((grade) => {
          const qIndex = getQuarterIndex(grade.quarter);
          return qIndex >= minIndex && qIndex <= maxIndex;
        });
      }
    } else if (filters.quarter !== 'all') {
      pool = pool.filter((grade) => grade.quarter === filters.quarter);
    }

    if (filters.calendarYear !== 'all') {
      const targetCalendarYear = filters.calendarYear as number;
      const classById = new Map(classes.map((cls) => [cls.id, cls]));

      pool = pool.filter((grade) => {
        const cls = classById.get(grade.classId);
        if (!cls) return false;
        const startYear = getStartCalendarYear(cls);
        if (!startYear) return true;

        if (filters.schoolYear !== 'all') {
          const schoolYear = Number(filters.schoolYear);
          if (!Number.isFinite(schoolYear)) return false;
          return startYear + (schoolYear - 1) === targetCalendarYear;
        }

        const gradeCalendarYear = startYear + ((grade.schoolYear ?? 1) - 1);
        return gradeCalendarYear === targetCalendarYear;
      });
    }

    const subjectLabelMap = new Map<string, string>();
    pool.forEach((grade) => {
      if (!grade.subject) return;
      const key = normalizeSubjectName(grade.subject);
      if (!subjectLabelMap.has(key)) {
        subjectLabelMap.set(key, grade.subject);
      }
    });

    professionalSubjects.forEach((item) => {
      if (!subjectClassIds.has(item.classId)) return;
      const key = normalizeSubjectName(item.subject);
      if (!subjectLabelMap.has(key)) {
        subjectLabelMap.set(key, item.subject);
      }
    });

    subjectClassIds.forEach((classId) => {
      const entry = templateSubjectsByClassId.get(classId);
      if (!entry) return;
      const templateSubjects =
        filters.schoolYear === 'all'
          ? entry.all
          : entry.byYear.get(Number(filters.schoolYear));
      if (!templateSubjects) return;
      templateSubjects.forEach((subjectKey) => {
        if (!subjectLabelMap.has(subjectKey)) {
          subjectLabelMap.set(subjectKey, entry.labels.get(subjectKey) ?? subjectKey);
        }
      });
    });

    return Array.from(subjectLabelMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [
    grades,
    subjectClassIds,
    filters.schoolYear,
    filters.quarter,
    filters.useQuarterRange,
    filters.quarterRangeStart,
    filters.quarterRangeEnd,
    filters.calendarYear,
    classes,
    professionalSubjects,
    templateSubjectsByClassId,
  ]);

  const normalizeList = (values: string[]) =>
    Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  function parseSeriesYear(value: string) {
    const match = value.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getCourseYearForCalendarYear(cls: Class, targetYear: number) {
    const startYear = getStartCalendarYear(cls);
    if (!startYear) return null;
    const courseYear = targetYear - startYear + 1;
    if (courseYear < 1 || courseYear > 3) return null;
    return courseYear;
  }

  function filterClassesBySeries(
    list: Class[],
    series: string[],
    calendarYear: AnalyticsFilters['calendarYear'],
    schoolYear: AnalyticsFilters['schoolYear'],
  ) {
    if (series.length === 0) return list;
    const seriesYears = series
      .map(parseSeriesYear)
      .filter((year): year is number => Boolean(year));
    const hasDerivedSeries =
      seriesYears.length > 0 && (calendarYear !== 'all' || schoolYear !== 'all');

    return list.filter((cls) => {
      if (hasDerivedSeries) {
        const targetCalendarYear =
          calendarYear !== 'all'
            ? (calendarYear as number)
            : (() => {
                if (schoolYear === 'all') return null;
                const startYear = getStartCalendarYear(cls);
                if (!startYear) return null;
                return startYear + (Number(schoolYear) - 1);
              })();
        if (targetCalendarYear) {
          const courseYear = getCourseYearForCalendarYear(cls, targetCalendarYear);
          if (courseYear) {
            return seriesYears.includes(courseYear);
          }
        }
      }
      return series.some((s) => cls.series.includes(s));
    });
  }

  const getCalendarYearsForSchoolYear = (list: Class[], schoolYear: 1 | 2 | 3) => {
    const years = new Set<number>();
    list.forEach((cls) => {
      const startYear = getStartCalendarYear(cls);
      if (!startYear) return;
      years.add(startYear + (schoolYear - 1));
    });
    return Array.from(years).sort((a, b) => a - b);
  };

  type AutoIndicatorKey =
    | 'classIds'
    | 'subjects'
    | 'schoolYear'
    | 'calendarYear'
    | 'quarter'
    | 'useQuarterRange'
    | 'comparisonClassIds';
  type AutoIndicators = Partial<Record<AutoIndicatorKey, boolean>>;

  const [autoIndicators, setAutoIndicators] = useState<AutoIndicators>({});

  function computeEligibleClassIdsForSubjects(nextFilters: AnalyticsFilters) {
    const selectedSubjects = nextFilters.subjects ?? [];
    if (selectedSubjects.length === 0) return null;

    const subjectSet = new Set(selectedSubjects.map(normalizeSubjectName));
    const subjectMatchers = selectedSubjects.map((subject) => ({
      normalized: normalizeSubjectName(subject),
      tokens: normalizeSubjectTokens(subject),
    }));
    const matchesSelectedSubject = (subject: string) => {
      const normalized = normalizeSubjectName(subject);
      for (const matcher of subjectMatchers) {
        if (normalized === matcher.normalized) return true;
        if (matcher.tokens.length === 0) continue;
        const tokens = normalizeSubjectTokens(subject);
        if (matcher.tokens.every((token) => tokens.includes(token))) {
          return true;
        }
      }
      return false;
    };
    const baseClasses = nextFilters.includeArchived
      ? classes
      : classes.filter((c) => !c.archived);
    const scopedClasses = filterClassesBySeries(
      baseClasses,
      nextFilters.series,
      nextFilters.calendarYear,
      nextFilters.schoolYear,
    );
    const scopedClassIds = new Set(scopedClasses.map((c) => c.id));
    const classById = new Map(scopedClasses.map((cls) => [cls.id, cls]));
    const eligibleFromMapping = new Set<string>();
    scopedClasses.forEach((cls) => {
      const mapped = professionalSubjectsByClassId.get(cls.id);
      const templateEntry = templateSubjectsByClassId.get(cls.id);
      const templateSubjects =
        nextFilters.schoolYear === 'all'
          ? templateEntry?.all
          : templateEntry?.byYear.get(Number(nextFilters.schoolYear));
      for (const subject of subjectSet) {
        if (mapped?.has(subject) || templateSubjects?.has(subject)) {
          eligibleFromMapping.add(cls.id);
          break;
        }
      }
    });

    let pool = grades.filter((grade) => {
      if (!scopedClassIds.has(grade.classId)) return false;
      return matchesSelectedSubject(grade.subject);
    });

    if (nextFilters.schoolYear !== 'all') {
      const targetYear = Number(nextFilters.schoolYear);
      if (Number.isFinite(targetYear)) {
        pool = pool.filter((grade) => (grade.schoolYear ?? 1) === targetYear);
      }
    }

    if (
      nextFilters.useQuarterRange &&
      nextFilters.quarterRangeStart &&
      nextFilters.quarterRangeEnd
    ) {
      const startIndex = getQuarterIndex(nextFilters.quarterRangeStart);
      const endIndex = getQuarterIndex(nextFilters.quarterRangeEnd);
      if (startIndex >= 0 && endIndex >= 0) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        pool = pool.filter((grade) => {
          const qIndex = getQuarterIndex(grade.quarter);
          return qIndex >= minIndex && qIndex <= maxIndex;
        });
      }
    } else if (nextFilters.quarter !== 'all') {
      pool = pool.filter((grade) => grade.quarter === nextFilters.quarter);
    }

    if (nextFilters.calendarYear !== 'all') {
      const targetCalendarYear = nextFilters.calendarYear as number;
      pool = pool.filter((grade) => {
        const cls = classById.get(grade.classId);
        if (!cls) return false;
        const startYear = getStartCalendarYear(cls);
        if (!startYear) return true;
        if (nextFilters.schoolYear !== 'all') {
          const schoolYear = Number(nextFilters.schoolYear);
          if (!Number.isFinite(schoolYear)) return false;
          return startYear + (schoolYear - 1) === targetCalendarYear;
        }
        const gradeCalendarYear = startYear + ((grade.schoolYear ?? 1) - 1);
        return gradeCalendarYear === targetCalendarYear;
      });
    }

    const eligibleFromGrades = new Set(pool.map((grade) => grade.classId));
    if (eligibleFromMapping.size === 0) return eligibleFromGrades;
    eligibleFromMapping.forEach((id) => eligibleFromGrades.add(id));
    return eligibleFromGrades;
  }

  const subjectEligibleClassIds = useMemo(() => {
    const eligible = computeEligibleClassIdsForSubjects(filters);
    if (!eligible || eligible.size === 0) return [];
    return Array.from(eligible);
  }, [filters, classes, grades, professionalSubjectsByClassId, templateSubjectsByClassId]);

  const normalizeFilters = useCallback((
    current: AnalyticsFilters,
    patch: Partial<AnalyticsFilters>,
  ): AnalyticsFilters => {
    const next: AnalyticsFilters = {
      ...current,
      ...patch,
      series: normalizeList((patch.series ?? current.series) as string[]),
      classIds: normalizeList((patch.classIds ?? current.classIds) as string[]),
      subjects: normalizeList((patch.subjects ?? current.subjects ?? []) as string[]),
      comparisonClassIds: normalizeList(
        (patch.comparisonClassIds ?? current.comparisonClassIds) as string[],
      ),
    };

    const baseClasses = next.includeArchived
      ? classes
      : classes.filter((c) => !c.archived);
    const scopedClasses = filterClassesBySeries(
      baseClasses,
      next.series,
      next.calendarYear,
      next.schoolYear,
    );
    const validClassIds = new Set(scopedClasses.map((c) => c.id));

    next.classIds = next.classIds.filter((id) => validClassIds.has(id));
    next.comparisonClassIds = next.comparisonClassIds.filter((id) =>
      validClassIds.has(id),
    );

    const eligibleClassIds = computeEligibleClassIdsForSubjects(next);
    if (eligibleClassIds && eligibleClassIds.size > 0) {
      if (next.classIds.length > 0) {
        next.classIds = next.classIds.filter((id) => eligibleClassIds.has(id));
      }
      next.comparisonClassIds = next.comparisonClassIds.filter((id) =>
        eligibleClassIds.has(id),
      );
    }

    if ('useQuarterRange' in patch && next.useQuarterRange) {
      next.quarter = 'all';
    }
    if ('quarter' in patch && patch.quarter !== 'all') {
      next.useQuarterRange = false;
    }

    const shouldAutoYear =
      'classIds' in patch &&
      !('schoolYear' in patch) &&
      !('calendarYear' in patch);
    if (shouldAutoYear && next.classIds.length === 1) {
      const cls = scopedClasses.find((c) => c.id === next.classIds[0]);
      if (cls) {
        const startYear = getStartCalendarYear(cls);
        const currentYear =
          cls.currentYear && [1, 2, 3].includes(cls.currentYear)
            ? (cls.currentYear as 1 | 2 | 3)
            : undefined;
        if (currentYear) {
          next.schoolYear = currentYear;
          if (startYear) {
            next.calendarYear = startYear + (currentYear - 1);
          }
        } else if (typeof next.schoolYear === 'number' && startYear) {
          next.calendarYear = startYear + (next.schoolYear - 1);
        }
      }
    }

    if (next.schoolYear !== 'all' && next.calendarYear !== 'all') {
      const calendarScope =
        next.classIds.length > 0
          ? scopedClasses.filter((c) => next.classIds.includes(c.id))
          : scopedClasses;
      const allowedYears = getCalendarYearsForSchoolYear(
        calendarScope,
        next.schoolYear,
      );
      if (allowedYears.length > 0 && !allowedYears.includes(next.calendarYear)) {
        next.calendarYear = allowedYears[0];
      }
    }

    return next;
  }, [classes, grades, professionalSubjectsByClassId, templateSubjectsByClassId]);

  const filtersEqual = (a: AnalyticsFilters, b: AnalyticsFilters) => {
    const listEqual = (left: string[], right: string[]) =>
      left.length === right.length &&
      left.every((value, index) => value === right[index]);
    return (
      listEqual(a.series, b.series) &&
      listEqual(a.classIds, b.classIds) &&
      listEqual(a.subjects ?? [], b.subjects ?? []) &&
      listEqual(a.comparisonClassIds, b.comparisonClassIds) &&
      a.quarter === b.quarter &&
      a.useQuarterRange === b.useQuarterRange &&
      a.quarterRangeStart === b.quarterRangeStart &&
      a.quarterRangeEnd === b.quarterRangeEnd &&
      a.schoolYear === b.schoolYear &&
      a.calendarYear === b.calendarYear &&
      a.includeArchived === b.includeArchived &&
      a.comparisonMode === b.comparisonMode &&
      a.comparisonCourseYear === b.comparisonCourseYear
    );
  };

  const applyFilters = useCallback(
    (patch: Partial<AnalyticsFilters>) => {
      const next = normalizeFilters(filters, patch);
      if (!filtersEqual(filters, next)) {
        setAutoIndicators((prev) => {
          const updated: AutoIndicators = { ...prev };
          const clearIfManual = (key: AutoIndicatorKey) => {
            if (key in patch) {
              delete updated[key];
            }
          };
          ([
            'classIds',
            'subjects',
            'schoolYear',
            'calendarYear',
            'quarter',
            'useQuarterRange',
            'comparisonClassIds',
          ] as AutoIndicatorKey[]).forEach(clearIfManual);

          const listChanged = (a: string[], b: string[]) =>
            a.length !== b.length || a.some((value, index) => value !== b[index]);

          if (!('classIds' in patch) && listChanged(filters.classIds, next.classIds)) {
            updated.classIds = true;
          }
          if (
            !('comparisonClassIds' in patch) &&
            listChanged(filters.comparisonClassIds, next.comparisonClassIds)
          ) {
            updated.comparisonClassIds = true;
          }
          if (
            !('subjects' in patch) &&
            listChanged(filters.subjects ?? [], next.subjects ?? [])
          ) {
            updated.subjects = true;
          }
          if (!('schoolYear' in patch) && filters.schoolYear !== next.schoolYear) {
            updated.schoolYear = true;
          }
          if (!('calendarYear' in patch) && filters.calendarYear !== next.calendarYear) {
            updated.calendarYear = true;
          }
          if (!('quarter' in patch) && filters.quarter !== next.quarter) {
            updated.quarter = true;
          }
          if (
            !('useQuarterRange' in patch) &&
            filters.useQuarterRange !== next.useQuarterRange
          ) {
            updated.useQuarterRange = true;
          }
          return updated;
        });
        setAnalyticsFilters(next);
      }
    },
    [filters, normalizeFilters, setAnalyticsFilters],
  );

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
