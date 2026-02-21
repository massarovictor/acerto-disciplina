/**
 * Hook para Analytics da Escola
 * 
 * Fornece cálculos agregados, rankings e insights para toda a escola
 * com suporte a filtros por série, turma e período.
 */

import { useMemo } from 'react';
import { Student, Class, Grade, Incident, AttendanceRecord } from '@/types';
import { classifyStudent, StudentClassification, ClassificationResult } from '@/lib/advancedAnalytics';
import { analyzeStudentPerformance } from '@/lib/performancePrediction';
import { getSubjectArea, SUBJECT_AREAS } from '@/lib/subjects';
import { QUARTERS } from '@/lib/subjects';
import { perfTimer } from '@/lib/perf';
import { CLASSIFICATION_COLOR_HEX } from '@/lib/statusPalette';
import { partitionIncidentsByType } from '@/lib/incidentType';
import {
  buildBehaviorInsights,
  buildDashboardHighlights,
  buildFamilyInsights,
  dedupeInsightsBySemanticKey,
  scoreInsightPriority,
  InsightEvidenceLevel,
} from '@/lib/analyticsInsightRules';

// ============================================
// TIPOS
// ============================================

export interface AnalyticsFilters {
  series: string[];              // ['1º', '2º', '3º']
  classIds: string[];            // IDs das turmas selecionadas
  subjects: string[];            // Disciplinas selecionadas
  quarter: string;               // 'all' | '1º Bimestre' | etc
  useQuarterRange?: boolean;     // Intervalo de bimestres
  quarterRangeStart?: string;    // Início do intervalo
  quarterRangeEnd?: string;      // Fim do intervalo
  schoolYear: 1 | 2 | 3 | 'all'; // Ano/série da turma ou todos os anos
  calendarYear: 'all' | number;  // Ano calendário para comparação entre turmas
  includeArchived: boolean;      // Incluir turmas arquivadas
  comparisonClassIds: string[];  // Turmas para comparação lado a lado
  comparisonMode?: 'calendar' | 'courseYear';
  comparisonCourseYear?: 1 | 2 | 3;
}

export interface StudentAnalytics {
  student: Student;
  classification: ClassificationResult;
  className: string;
  incidentCount: number;
  trend: 'up' | 'down' | 'stable';
  hasGrades: boolean;
}



export interface StudentPrediction {
  student: Student;
  classId: string;
  className: string;
  predicted: number;
  confidence: number;
  method: string;
  risk: number;
  trend: string;
  currentAverage: number;
  dataPoints: number;
  hasSufficientData: boolean;
}

export interface PredictionSummary {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  insufficient: number;
}

export interface ClassAnalytics {
  classData: Class;
  calendarYear?: number;
  studentCount: number;
  average: number;
  frequency: number;
  growth: number | null;
  trendPoints?: number;
  gradeSampleCount?: number;
  classifications: {
    critico: number;
    atencao: number;
    aprovado: number;
    excelencia: number;
  };
  incidentCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SubjectAnalytics {
  subject: string;
  area: string;
  average: number;
  studentsBelow6: number;
  studentsBelow6Percent: number;
  totalStudents: number;
}

export interface AreaAnalytics {
  area: string;
  average: number;
  subjects: SubjectAnalytics[];
}

export interface SchoolOverview {
  totalStudents: number;
  totalClasses: number;
  overallAverage: number;
  overallFrequency: number;
  totalIncidents: number;
  classifications: {
    critico: number;
    atencao: number;
    aprovado: number;
    excelencia: number;
  };
}

export interface Insight {
  id: string;
  type: 'warning' | 'alert' | 'success' | 'info';
  category: 'academic' | 'behavioral' | 'risk' | 'family';
  title: string;
  description: string;
  actionLabel?: string;
  actionData?: unknown;
  priority?: number;
  semanticKey?: string;
  evidenceLevel?: InsightEvidenceLevel;
}

// Novo: Analytics comportamentais
export interface IncidentBySeverity {
  severity: 'leve' | 'intermediaria' | 'grave' | 'gravissima';
  count: number;
  percent: number;
}

export interface ClassIncidentRanking {
  classData: Class;
  incidentCount: number;
  studentCount: number;
  incidentsPerStudent: number;
  openIncidents: number;
  severities: {
    leve: number;
    intermediaria: number;
    grave: number;
    gravissima: number;
  };
}

export interface StudentIncidentRanking {
  student: Student;
  className: string;
  incidentCount: number;
  lastIncidentDate: string | null;
  severities: { leve: number; intermediaria: number; grave: number; gravissima: number };
}

export interface MonthlyIncidentTrend {
  month: string;  // 'Jan', 'Fev', etc.
  monthLabel: string; // 'Jan/26'
  year: number;
  count: number;
}

export interface BehavioralAnalytics {
  incidentsBySeverity: IncidentBySeverity[];
  classIncidentRanking: ClassIncidentRanking[];
  topStudentsByIncidents: StudentIncidentRanking[];
  monthlyTrend: MonthlyIncidentTrend[];
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  averageIncidentsPerStudent: number;
}

export interface FamilyAnalytics {
  incidentsBySeverity: IncidentBySeverity[];
  classIncidentRanking: ClassIncidentRanking[];
  topStudentsByIncidents: StudentIncidentRanking[];
  monthlyTrend: MonthlyIncidentTrend[];
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  averageIncidentsPerStudent: number;
}

export interface CategorizedInsights {
  dashboard: Insight[];
  academic: Insight[];
  behavioral: Insight[];
  risk: Insight[];
  family: Insight[];
}

export interface AnalyticsContextSummary {
  mode: 'general' | 'subject';
  classCount: number;
  studentCount: number;
  gradeCount: number;
  subjectCount: number;
  hasSubjectFilter: boolean;
  quarterLabel: string;
  schoolYear: AnalyticsFilters['schoolYear'];
  calendarYear: AnalyticsFilters['calendarYear'];
}

export interface SchoolAnalyticsResult {
  // Overview
  overview: SchoolOverview;

  // Rankings
  classRanking: ClassAnalytics[];
  topStudents: StudentAnalytics[];
  criticalStudents: StudentAnalytics[];
  allStudentsRanking: StudentAnalytics[];
  allCriticalStudents: StudentAnalytics[];

  // Predições
  studentPredictions: StudentPrediction[];
  predictionSummary: PredictionSummary;

  // Subject Analysis
  subjectAnalytics: SubjectAnalytics[];
  areaAnalytics: AreaAnalytics[];
  bestSubjects: SubjectAnalytics[];
  worstSubjects: SubjectAnalytics[];

  // Behavioral Analytics (NOVO)
  behavioralAnalytics: BehavioralAnalytics;
  familyAnalytics: FamilyAnalytics;

  // Insights categorizados (MODIFICADO)
  insights: Insight[];  // Todos os insights
  categorizedInsights: CategorizedInsights;  // Insights por categoria

  // Comparison data
  comparisonData: ClassAnalytics[];
  comparisonCourseYearData: ClassAnalytics[];

  // Cohorts (ano calendário)
  cohortAnalytics: {
    calendarYear: number;
    classCount: number;
    studentCount: number;
    average: number;
    frequency: number;
    incidentCount: number;
    growthAverage: number | null;
  }[];

  // Contexto do recorte aplicado
  context: AnalyticsContextSummary;
}

// ============================================
// CORES E LABELS
// ============================================

export const CLASSIFICATION_COLORS: Record<StudentClassification, string> = {
  critico: CLASSIFICATION_COLOR_HEX.critico,
  atencao: CLASSIFICATION_COLOR_HEX.atencao,
  aprovado: CLASSIFICATION_COLOR_HEX.aprovado,
  excelencia: CLASSIFICATION_COLOR_HEX.excelencia,
};

export const CLASSIFICATION_LABELS: Record<StudentClassification, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  aprovado: 'Aprovado',
  excelencia: 'Excelência',
};

export const CLASSIFICATION_BG_COLORS: Record<StudentClassification, string> = {
  critico: 'bg-destructive/15 text-destructive border-destructive/30',
  atencao: 'bg-warning/15 text-warning border-warning/30',
  aprovado: 'bg-success/15 text-success border-success/30',
  excelencia: 'bg-info/15 text-info border-info/30',
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export const EMPTY_ANALYTICS_RESULT: SchoolAnalyticsResult = {
  overview: {
    totalStudents: 0,
    totalClasses: 0,
    overallAverage: 0,
    overallFrequency: 0,
    totalIncidents: 0,
    classifications: {
      critico: 0,
      atencao: 0,
      aprovado: 0,
      excelencia: 0,
    },
  },
  classRanking: [],
  topStudents: [],
  criticalStudents: [],
  allStudentsRanking: [],
  allCriticalStudents: [],
  studentPredictions: [],
  predictionSummary: {
    total: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    insufficient: 0,
  },
  subjectAnalytics: [],
  areaAnalytics: [],
  bestSubjects: [],
  worstSubjects: [],
  behavioralAnalytics: {
    incidentsBySeverity: [],
    classIncidentRanking: [],
    topStudentsByIncidents: [],
    monthlyTrend: [],
    openIncidentsCount: 0,
    resolvedIncidentsCount: 0,
    averageIncidentsPerStudent: 0,
  },
  familyAnalytics: {
    incidentsBySeverity: [],
    classIncidentRanking: [],
    topStudentsByIncidents: [],
    monthlyTrend: [],
    openIncidentsCount: 0,
    resolvedIncidentsCount: 0,
    averageIncidentsPerStudent: 0,
  },
  insights: [],
  categorizedInsights: {
    dashboard: [],
    academic: [],
    behavioral: [],
    risk: [],
    family: [],
  },
  comparisonData: [],
  comparisonCourseYearData: [],
  cohortAnalytics: [],
  context: {
    mode: 'general',
    classCount: 0,
    studentCount: 0,
    gradeCount: 0,
    subjectCount: 0,
    hasSubjectFilter: false,
    quarterLabel: 'Anual',
    schoolYear: 'all',
    calendarYear: 'all',
  },
};

export function computeSchoolAnalytics(
  students: Student[],
  classes: Class[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[],
  filters: AnalyticsFilters
): SchoolAnalyticsResult {
  const BRASILIA_TIMEZONE = 'America/Sao_Paulo';
  const { disciplinaryIncidents, familyIncidents } =
    partitionIncidentsByType(incidents);
  const parseLocalDate = (value: string | undefined | null) => {
    if (!value) return new Date(Number.NaN);
    const normalized = value.trim();
    if (!normalized) return new Date(Number.NaN);

    // ISO date only: 2026-02-21
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return new Date(`${normalized}T00:00:00`);
    }

    // BR date: 21/02/2026
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      const [day, month, year] = normalized.split("/");
      return new Date(`${year}-${month}-${day}T00:00:00`);
    }

    // ISO timestamp or other valid Date input
    return new Date(normalized);
  };
  const addMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  };
  const addYears = (date: Date, years: number) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };
  const getBrasiliaMonthYear = (value: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BRASILIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(value);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value) - 1;
    return { year, month };
  };
  const getQuarterRange = (
    startYearDate: string | undefined,
    schoolYear: number,
    quarter: string
  ) => {
    if (!startYearDate) return null;
    const index = QUARTERS.indexOf(quarter);
    if (index < 0) return null;

    const startDate = parseLocalDate(startYearDate);
    if (Number.isNaN(startDate.getTime())) return null;

    const yearOffset = schoolYear - 1;
    const currentYearStart = addYears(startDate, yearOffset);
    const rangeStart = addMonths(currentYearStart, index * 2);
    const rangeEnd = addMonths(currentYearStart, index * 2 + 2);
    return { start: rangeStart, end: rangeEnd };
  };
  const getQuarterIndex = (quarter: string) => QUARTERS.indexOf(quarter);
  const getQuarterRangeSpan = (
    startYearDate: string | undefined,
    schoolYear: number,
    startQuarter: string,
    endQuarter: string,
  ) => {
    const startIndex = getQuarterIndex(startQuarter);
    const endIndex = getQuarterIndex(endQuarter);
    if (startIndex < 0 || endIndex < 0) return null;
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangeStart = getQuarterRange(startYearDate, schoolYear, QUARTERS[start]);
    const rangeEnd = getQuarterRange(startYearDate, schoolYear, QUARTERS[end]);
    if (!rangeStart || !rangeEnd) return null;
    return { start: rangeStart.start, end: rangeEnd.end };
  };
  const getSchoolYearRange = (startYearDate: string | undefined, schoolYear: number) => {
    if (!startYearDate) return null;
    const startDate = parseLocalDate(startYearDate);
    if (Number.isNaN(startDate.getTime())) return null;
    const yearOffset = schoolYear - 1;
    const yearStart = addYears(startDate, yearOffset);
    const yearEnd = addMonths(yearStart, 8);
    return { start: yearStart, end: yearEnd };
  };
  const isDateInRange = (value: string, range: { start: Date; end: Date } | null) => {
    if (!range) return true;
    const date = parseLocalDate(value);
    if (Number.isNaN(date.getTime())) return false;
    return date >= range.start && date < range.end;
  };
  const resolveStartYearDate = (cls: Class) =>
    cls.startYearDate || (cls.startCalendarYear ? `${cls.startCalendarYear}-02-01` : undefined);

  const groupById = <T,>(items: T[], keyFn: (item: T) => string) => {
    const map = new Map<string, T[]>();
    items.forEach((item) => {
      const key = keyFn(item);
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        map.set(key, [item]);
      }
    });
    return map;
  };


  const done = perfTimer('analytics.compute');
  const targetSchoolYear = filters.schoolYear === 'all' ? null : (filters.schoolYear ?? 1);
  const useAllYears = targetSchoolYear === null;
  // Filtrar turmas ativas (não arquivadas)
  const activeClasses = filters.includeArchived ? classes : classes.filter(c => !c.archived);

  const getStartCalendarYear = (cls: Class) => {
    if (typeof cls.startCalendarYear === 'number') return cls.startCalendarYear;
    if (cls.startYearDate) {
      const date = parseLocalDate(cls.startYearDate);
      if (!Number.isNaN(date.getTime())) return date.getFullYear();
    }
    const currentYear = new Date().getFullYear();
    const inferredYear =
      cls.currentYear && [1, 2, 3].includes(cls.currentYear)
        ? currentYear - (cls.currentYear - 1)
        : undefined;
    return inferredYear;
  };

  const parseSeriesYear = (value: string) => {
    const match = value.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getCourseYearForCalendarYear = (cls: Class, targetYear: number) => {
    const startYear = getStartCalendarYear(cls);
    if (!startYear) return null;
    const courseYear = targetYear - startYear + 1;
    if (courseYear < 1 || courseYear > 3) return null;
    return courseYear;
  };

  const comparisonMode = filters.comparisonMode ?? 'calendar';
  const comparisonCourseYear =
    filters.comparisonCourseYear ??
    (filters.schoolYear === 'all' ? 1 : filters.schoolYear);

  const classCalendarYearMap = new Map<string, number | null>();
  activeClasses.forEach((cls) => {
    if (useAllYears || targetSchoolYear === null) {
      classCalendarYearMap.set(cls.id, null);
      return;
    }
    const startYear = getStartCalendarYear(cls);
    const calendarYear = startYear ? startYear + (targetSchoolYear - 1) : null;
    classCalendarYearMap.set(cls.id, calendarYear);
  });

  // Aplicar filtros iniciais de turma
  let candidateClasses = activeClasses;

  if (filters.series.length > 0) {
    const seriesYears = filters.series
      .map(parseSeriesYear)
      .filter((year): year is number => Boolean(year));
    const hasDerivedSeries =
      seriesYears.length > 0 && (filters.calendarYear !== 'all' || targetSchoolYear !== null);

    candidateClasses = candidateClasses.filter((cls) => {
      if (hasDerivedSeries) {
        const targetCalendarYear =
          filters.calendarYear !== 'all'
            ? Number(filters.calendarYear)
            : (() => {
              if (targetSchoolYear === null) return null;
              const startYear = getStartCalendarYear(cls);
              if (!startYear) return null;
              return startYear + (targetSchoolYear - 1);
            })();
        if (targetCalendarYear) {
          const courseYear = getCourseYearForCalendarYear(cls, targetCalendarYear);
          if (courseYear) {
            return seriesYears.includes(courseYear);
          }
        }
      }
      return filters.series.some((s) => cls.series.includes(s));
    });
  }

  if (filters.classIds.length > 0) {
    candidateClasses = candidateClasses.filter(c =>
      filters.classIds.includes(c.id)
    );
  }

  // Filtrar por ano calendário - funciona independente de schoolYear
  // Quando calendarYear é definido, filtra turmas que estavam ativas naquele ano
  if (filters.calendarYear !== 'all') {
    const targetCalendarYear = Number(filters.calendarYear);
    candidateClasses = candidateClasses.filter((cls) => {
      const startYear = getStartCalendarYear(cls);
      const endYear = cls.endCalendarYear ?? (startYear ? startYear + 2 : undefined);

      if (!startYear) return false;

      // Turma estava ativa naquele ano calendário
      return startYear <= targetCalendarYear && targetCalendarYear <= (endYear || startYear + 2);
    });
  }

  const candidateClassIds = new Set(candidateClasses.map(c => c.id));
  const candidateStudents = students.filter((student) =>
    candidateClassIds.has(student.classId),
  );

  const classById = new Map(classes.map((cls) => [cls.id, cls]));
  const getLatestQuarter = (gradesList: Grade[]) => {
    for (let i = QUARTERS.length - 1; i >= 0; i -= 1) {
      const quarter = QUARTERS[i];
      if (gradesList.some((grade) => grade.quarter === quarter)) {
        return quarter;
      }
    }
    return QUARTERS[0];
  };

  const allGrades = grades.filter(g => candidateClassIds.has(g.classId));
  const yearGrades = useAllYears
    ? allGrades
    : allGrades.filter(g => (g.schoolYear ?? 1) === targetSchoolYear);

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

  const selectedSubjects = filters.subjects ?? [];
  const subjectSet =
    selectedSubjects.length > 0
      ? new Set(selectedSubjects.map(normalizeSubjectName))
      : null;
  const subjectMatchers = selectedSubjects.map((subject) => ({
    normalized: normalizeSubjectName(subject),
    tokens: normalizeSubjectTokens(subject),
  }));
  const matchesSelectedSubject = (subject: string) => {
    if (!subjectSet) return true;
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
  const classifyStudentByAverage = (
    gradesList: Grade[],
    attendanceList: AttendanceRecord[],
  ): ClassificationResult => {
    const subjectGradesRaw: Record<string, number[]> = {};
    gradesList.forEach((g) => {
      if (!subjectGradesRaw[g.subject]) subjectGradesRaw[g.subject] = [];
      subjectGradesRaw[g.subject].push(g.grade);
    });

    const subjectAverages: Record<string, number> = {};
    Object.entries(subjectGradesRaw).forEach(([subject, gradeList]) => {
      subjectAverages[subject] = gradeList.reduce((a, b) => a + b, 0) / gradeList.length;
    });

    const subjectsBelow6 = Object.entries(subjectAverages)
      .filter(([, avg]) => avg < 6)
      .map(([subject, avg]) => ({ subject, average: avg }))
      .sort((a, b) => a.average - b.average);

    const subjectAverageValues = Object.values(subjectAverages);
    const average =
      subjectAverageValues.length > 0
        ? subjectAverageValues.reduce((sum, value) => sum + value, 0) / subjectAverageValues.length
        : 0;

    const present = attendanceList.filter((a) => a.status === 'presente').length;
    const frequency =
      attendanceList.length > 0 ? (present / attendanceList.length) * 100 : 100;

    let classification: StudentClassification;
    if (average < 6) {
      classification = 'critico';
    } else if (average < 7) {
      classification = 'atencao';
    } else if (average < 8) {
      classification = 'aprovado';
    } else {
      classification = 'excelencia';
    }

    return {
      classification,
      subjectsBelow6,
      subjectsBelow6Count: subjectsBelow6.length,
      subjectAverages,
      average,
      frequency,
    };
  };

  const classifyStudentForAnalytics = (
    gradesList: Grade[],
    attendanceList: AttendanceRecord[],
  ) =>
    subjectSet
      ? classifyStudentByAverage(gradesList, attendanceList)
      : classifyStudent(gradesList, attendanceList);

  const applyQuarterFilter = (gradesList: Grade[]) => {
    let scopedGrades = gradesList;
    if (hasQuarterRange) {
      const startIndex = getQuarterIndex(filters.quarterRangeStart!);
      const endIndex = getQuarterIndex(filters.quarterRangeEnd!);
      if (startIndex >= 0 && endIndex >= 0) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        scopedGrades = scopedGrades.filter((grade) => {
          const quarterIndex = getQuarterIndex(grade.quarter);
          return quarterIndex >= minIndex && quarterIndex <= maxIndex;
        });
      }
    } else if (filters.quarter !== 'all') {
      scopedGrades = scopedGrades.filter((grade) => grade.quarter === filters.quarter);
    }
    return scopedGrades;
  };

  const buildClassStudentGradesMap = (gradesList: Grade[]) => {
    const map = new Map<string, Map<string, Grade[]>>();
    gradesList.forEach((grade) => {
      let classMap = map.get(grade.classId);
      if (!classMap) {
        classMap = new Map<string, Grade[]>();
        map.set(grade.classId, classMap);
      }
      let studentGrades = classMap.get(grade.studentId);
      if (!studentGrades) {
        studentGrades = [];
        classMap.set(grade.studentId, studentGrades);
      }
      studentGrades.push(grade);
    });
    return map;
  };

  const computeClassAverageFromStudentGrades = (
    classStudents: Array<{ student: Student }>,
    classGradesByStudentId: Map<string, Grade[]> | undefined,
  ) => {
    let totalStudentAverages = 0;
    let studentCountWithGrades = 0;

    classStudents.forEach((entry) => {
      const studentGrades = classGradesByStudentId?.get(entry.student.id) ?? [];
      if (studentGrades.length > 0) {
        const studentAverage =
          studentGrades.reduce((sum, grade) => sum + grade.grade, 0) / studentGrades.length;
        totalStudentAverages += studentAverage;
        studentCountWithGrades += 1;
      }
    });

    return studentCountWithGrades > 0 ? totalStudentAverages / studentCountWithGrades : 0;
  };

  const countClassifications = (
    entries: Array<Pick<StudentAnalytics, 'classification' | 'hasGrades'>>,
  ) => ({
    critico: entries.filter((entry) => entry.hasGrades && entry.classification.classification === 'critico').length,
    atencao: entries.filter((entry) => entry.hasGrades && entry.classification.classification === 'atencao').length,
    aprovado: entries.filter((entry) => entry.hasGrades && entry.classification.classification === 'aprovado').length,
    excelencia: entries.filter((entry) => entry.hasGrades && entry.classification.classification === 'excelencia').length,
  });

  let filteredGrades = useAllYears ? allGrades : yearGrades;
  const hasQuarterRange =
    filters.useQuarterRange &&
    filters.quarterRangeStart &&
    filters.quarterRangeEnd;
  filteredGrades = applyQuarterFilter(filteredGrades);

  let filteredGradesForClassification = filteredGrades;

  if (subjectSet) {
    filteredGrades = filteredGrades.filter((g) => matchesSelectedSubject(g.subject));
  }

  const buildComparisonCourseYearData = (courseYear: 1 | 2 | 3) => {
    if (filters.comparisonClassIds.length === 0) return [];
    const comparisonClasses = filters.comparisonClassIds
      .map((id) => classById.get(id))
      .filter((cls): cls is Class =>
        !!cls && (filters.includeArchived || !cls.archived),
      );
    if (comparisonClasses.length === 0) return [];

    const comparisonClassIdsSet = new Set(comparisonClasses.map((cls) => cls.id));
    const comparisonStudentsAll = students.filter(
      (student) => comparisonClassIdsSet.has(student.classId),
    );

    const comparisonGradesAll = grades.filter((grade) =>
      comparisonClassIdsSet.has(grade.classId),
    );
    const comparisonYearGrades = comparisonGradesAll.filter(
      (grade) => (grade.schoolYear ?? 1) === courseYear,
    );

    let comparisonGrades = applyQuarterFilter(comparisonYearGrades);

    const comparisonGradesForClassification = comparisonGrades;

    if (subjectSet) {
      comparisonGrades = comparisonGrades.filter((grade) =>
        matchesSelectedSubject(grade.subject),
      );
    }

    const classRanges = new Map<string, { start: Date; end: Date } | null>();
    comparisonClasses.forEach((cls) => {
      const startYearDate = resolveStartYearDate(cls);
      const range = hasQuarterRange
        ? getQuarterRangeSpan(
          startYearDate,
          courseYear,
          filters.quarterRangeStart!,
          filters.quarterRangeEnd!,
        )
        : filters.quarter !== 'all'
          ? getQuarterRange(startYearDate, courseYear, filters.quarter)
          : getSchoolYearRange(startYearDate, courseYear);
      classRanges.set(cls.id, range);
    });

    const comparisonAttendance = attendance.filter((record) =>
      comparisonClassIdsSet.has(record.classId) &&
      isDateInRange(record.date, classRanges.get(record.classId)),
    );
    const comparisonIncidents = disciplinaryIncidents.filter((incident) =>
      comparisonClassIdsSet.has(incident.classId) &&
      isDateInRange(incident.date, classRanges.get(incident.classId)),
    );

    const comparisonStudentIdsWithGrades = new Set(comparisonGrades.map((grade) => grade.studentId));
    const comparisonStudents = comparisonStudentsAll.filter((student) =>
      comparisonStudentIdsWithGrades.has(student.id),
    );
    const comparisonGradesByStudentId = groupById(comparisonGrades, (grade) => grade.studentId);
    const comparisonGradesForClassificationByStudentId = groupById(
      comparisonGradesForClassification,
      (grade) => grade.studentId,
    );
    const comparisonClassificationGradesByStudentId = subjectSet
      ? comparisonGradesByStudentId
      : comparisonGradesForClassificationByStudentId;
    const comparisonGradesByClassStudentId = buildClassStudentGradesMap(comparisonGrades);
    const comparisonAttendanceByClassId = groupById(comparisonAttendance, (record) => record.classId);
    const comparisonAttendanceByStudentId = groupById(comparisonAttendance, (record) => record.studentId);
    const comparisonIncidentsByClassId = groupById(comparisonIncidents, (incident) => incident.classId);

    const comparisonStudentAnalyticsList = comparisonStudents.map((student) => {
      const studentGrades = comparisonClassificationGradesByStudentId.get(student.id) ?? [];
      const studentAttendance = comparisonAttendanceByStudentId.get(student.id) ?? [];
      const classification = classifyStudentForAnalytics(studentGrades, studentAttendance);
      const studentClass = classById.get(student.classId);
      return {
        student,
        classification,
        className: studentClass?.name || 'Sem turma',
        incidentCount: 0,
        trend: 'stable' as const,
        hasGrades: studentGrades.length > 0,
      };
    });

    const comparisonStudentAnalyticsByClassId = groupById(
      comparisonStudentAnalyticsList,
      (entry) => entry.student.classId,
    );

    const comparisonYearGradesForTrends = subjectSet
      ? comparisonYearGrades.filter((grade) => matchesSelectedSubject(grade.subject))
      : comparisonYearGrades;
    const comparisonYearGradesByClassId = groupById(
      comparisonYearGradesForTrends,
      (grade) => grade.classId,
    );

    return comparisonClasses.map((cls) => {
      const classStudents = comparisonStudentAnalyticsByClassId.get(cls.id) ?? [];
      const classYearGrades = comparisonYearGradesByClassId.get(cls.id) ?? [];
      const classAttendance = comparisonAttendanceByClassId.get(cls.id) ?? [];
      const classIncidents = comparisonIncidentsByClassId.get(cls.id) ?? [];
      const classGradesByStudentId = comparisonGradesByClassStudentId.get(cls.id);

      const average = computeClassAverageFromStudentGrades(classStudents, classGradesByStudentId);

      const present = classAttendance.filter((record) => record.status === 'presente').length;
      const frequency =
        classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

      const classifications = countClassifications(classStudents);

      const quarterAverages = QUARTERS.map((quarter) => {
        const quarterGrades = classYearGrades.filter((grade) => grade.quarter === quarter);
        return quarterGrades.length > 0
          ? quarterGrades.reduce((sum, grade) => sum + grade.grade, 0) / quarterGrades.length
          : 0;
      }).filter((value) => value > 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (quarterAverages.length >= 2) {
        const diff = quarterAverages[quarterAverages.length - 1] - quarterAverages[quarterAverages.length - 2];
        if (diff > 0.2) trend = 'up';
        else if (diff < -0.2) trend = 'down';
      }

      const growth =
        quarterAverages.length >= 2
          ? quarterAverages[quarterAverages.length - 1] - quarterAverages[0]
          : null;

      const startYear = getStartCalendarYear(cls);
      const calendarYear = startYear ? startYear + (courseYear - 1) : undefined;

      return {
        classData: cls,
        calendarYear,
        studentCount: classStudents.length,
        average,
        frequency,
        growth,
        trendPoints: quarterAverages.length,
        gradeSampleCount: classYearGrades.length,
        classifications,
        incidentCount: classIncidents.length,
        trend,
      };
    });
  };

  const buildComparisonCalendarData = () => {
    if (filters.comparisonClassIds.length === 0) return [];
    const comparisonClasses = filters.comparisonClassIds
      .map((id) => classById.get(id))
      .filter((cls): cls is Class =>
        !!cls && (filters.includeArchived || !cls.archived),
      );
    if (comparisonClasses.length === 0) return [];

    const comparisonClassIdsSet = new Set(comparisonClasses.map((cls) => cls.id));
    const comparisonStudentsAll = students.filter(
      (student) => comparisonClassIdsSet.has(student.classId),
    );

    const comparisonGradesAll = grades.filter((grade) =>
      comparisonClassIdsSet.has(grade.classId),
    );
    const comparisonGradesBase = useAllYears
      ? comparisonGradesAll
      : comparisonGradesAll.filter((grade) => (grade.schoolYear ?? 1) === targetSchoolYear);

    let comparisonGrades = applyQuarterFilter(comparisonGradesBase);

    let comparisonGradesForClassification = comparisonGrades;

    if (subjectSet) {
      comparisonGrades = comparisonGrades.filter((grade) =>
        matchesSelectedSubject(grade.subject),
      );
    }

    let comparisonAttendance = attendance.filter((record) =>
      comparisonClassIdsSet.has(record.classId),
    );
    let comparisonIncidents = disciplinaryIncidents.filter((incident) =>
      comparisonClassIdsSet.has(incident.classId),
    );

    let comparisonYearGradesBase = comparisonGradesBase;

    if (!useAllYears && targetSchoolYear !== null) {
      const classRanges = new Map<string, { start: Date; end: Date } | null>();
      comparisonClasses.forEach((cls) => {
        if (filters.calendarYear !== 'all') {
          // CORREÇÃO: Permitir comparação mesmo se a turma for de outro ano calendário
          // O modo "Comparação" deve priorizar as turmas selecionadas explicitamente
          // const startYear = getStartCalendarYear(cls);
          // if (startYear) {
          //   const specificYear = startYear + (targetSchoolYear - 1);
          //   if (specificYear !== filters.calendarYear) {
          //     classRanges.set(cls.id, null);
          //     return;
          //   }
          // }
        }

        const startYearDate = resolveStartYearDate(cls);
        const range = hasQuarterRange
          ? getQuarterRangeSpan(
            startYearDate,
            targetSchoolYear,
            filters.quarterRangeStart!,
            filters.quarterRangeEnd!,
          )
          : filters.quarter !== 'all'
            ? getQuarterRange(startYearDate, targetSchoolYear, filters.quarter)
            : getSchoolYearRange(startYearDate, targetSchoolYear);
        classRanges.set(cls.id, range);
      });

      const rangeFilter = (g: Grade) => {
        const range = classRanges.get(g.classId);
        return range !== null && range !== undefined;
      };

      comparisonGrades = comparisonGrades.filter(rangeFilter);
      comparisonGradesForClassification = comparisonGradesForClassification.filter(rangeFilter);
      comparisonYearGradesBase = comparisonYearGradesBase.filter(rangeFilter);

      comparisonAttendance = comparisonAttendance.filter((record) =>
        isDateInRange(record.date, classRanges.get(record.classId)),
      );
      comparisonIncidents = comparisonIncidents.filter((incident) =>
        isDateInRange(incident.date, classRanges.get(incident.classId)),
      );
    } else if (useAllYears && filters.calendarYear !== 'all') {
      const targetCalYear = filters.calendarYear as number;

      const calendarFilter = (g: Grade) => {
        const cls = classById.get(g.classId);
        if (!cls) return false;

        const startYear = getStartCalendarYear(cls);
        if (!startYear) return false;

        const gradeCalendarYear = startYear + ((g.schoolYear ?? 1) - 1);
        return gradeCalendarYear === targetCalYear;
      };

      comparisonGrades = comparisonGrades.filter(calendarFilter);
      comparisonGradesForClassification = comparisonGradesForClassification.filter(calendarFilter);
      comparisonYearGradesBase = comparisonYearGradesBase.filter(calendarFilter);

      comparisonAttendance = comparisonAttendance.filter((record) => {
        const date = parseLocalDate(record.date);
        if (Number.isNaN(date.getTime())) return false;
        return date.getFullYear() === targetCalYear;
      });
      comparisonIncidents = comparisonIncidents.filter((incident) => {
        const date = parseLocalDate(incident.date);
        if (Number.isNaN(date.getTime())) return false;
        return date.getFullYear() === targetCalYear;
      });
    }

    const comparisonStudentIdsWithGrades = new Set(
      comparisonGrades.map((grade) => grade.studentId),
    );
    const comparisonStudents = comparisonStudentsAll.filter((student) =>
      comparisonStudentIdsWithGrades.has(student.id),
    );

    const comparisonGradesByStudentId = groupById(comparisonGrades, (grade) => grade.studentId);
    const comparisonGradesForClassificationByStudentId = groupById(
      comparisonGradesForClassification,
      (grade) => grade.studentId,
    );
    const comparisonClassificationGradesByStudentId = subjectSet
      ? comparisonGradesByStudentId
      : comparisonGradesForClassificationByStudentId;
    const comparisonGradesByClassStudentId = buildClassStudentGradesMap(comparisonGrades);
    const comparisonAttendanceByClassId = groupById(comparisonAttendance, (record) => record.classId);
    const comparisonAttendanceByStudentId = groupById(comparisonAttendance, (record) => record.studentId);
    const comparisonIncidentsByClassId = groupById(comparisonIncidents, (incident) => incident.classId);

    const comparisonStudentAnalyticsList = comparisonStudents.map((student) => {
      const studentGrades = comparisonClassificationGradesByStudentId.get(student.id) ?? [];
      const studentAttendance = comparisonAttendanceByStudentId.get(student.id) ?? [];
      const classification = classifyStudentForAnalytics(studentGrades, studentAttendance);
      const studentClass = classById.get(student.classId);
      return {
        student,
        classification,
        className: studentClass?.name || 'Sem turma',
        incidentCount: 0,
        trend: 'stable' as const,
        hasGrades: studentGrades.length > 0,
      };
    });

    const comparisonStudentAnalyticsByClassId = groupById(
      comparisonStudentAnalyticsList,
      (entry) => entry.student.classId,
    );

    const comparisonYearGradesForTrends = subjectSet
      ? comparisonYearGradesBase.filter((grade) => matchesSelectedSubject(grade.subject))
      : comparisonYearGradesBase;
    const comparisonYearGradesByClassId = groupById(
      comparisonYearGradesForTrends,
      (grade) => grade.classId,
    );

    return comparisonClasses.map((cls) => {
      const classStudents = comparisonStudentAnalyticsByClassId.get(cls.id) ?? [];
      const classYearGrades = comparisonYearGradesByClassId.get(cls.id) ?? [];
      const classAttendance = comparisonAttendanceByClassId.get(cls.id) ?? [];
      const classIncidents = comparisonIncidentsByClassId.get(cls.id) ?? [];
      const classGradesByStudentId = comparisonGradesByClassStudentId.get(cls.id);

      const average = computeClassAverageFromStudentGrades(classStudents, classGradesByStudentId);

      const present = classAttendance.filter((record) => record.status === 'presente').length;
      const frequency =
        classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

      const classifications = countClassifications(classStudents);

      const quarterAverages = QUARTERS.map((quarter) => {
        const quarterGrades = classYearGrades.filter((grade) => grade.quarter === quarter);
        return quarterGrades.length > 0
          ? quarterGrades.reduce((sum, grade) => sum + grade.grade, 0) / quarterGrades.length
          : 0;
      }).filter((value) => value > 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (quarterAverages.length >= 2) {
        const diff = quarterAverages[quarterAverages.length - 1] - quarterAverages[quarterAverages.length - 2];
        if (diff > 0.2) trend = 'up';
        else if (diff < -0.2) trend = 'down';
      }

      const growth =
        quarterAverages.length >= 2
          ? quarterAverages[quarterAverages.length - 1] - quarterAverages[0]
          : null;

      const startYear = getStartCalendarYear(cls);
      const calendarYear = useAllYears || targetSchoolYear === null
        ? undefined
        : (startYear ? startYear + (targetSchoolYear - 1) : undefined);

      return {
        classData: cls,
        calendarYear,
        studentCount: classStudents.length,
        average,
        frequency,
        growth,
        trendPoints: quarterAverages.length,
        gradeSampleCount: classYearGrades.length,
        classifications,
        incidentCount: classIncidents.length,
        trend,
      };
    });
  };

  let filteredAttendance = attendance.filter(a => candidateClassIds.has(a.classId));
  let filteredIncidents = disciplinaryIncidents.filter(i => candidateClassIds.has(i.classId));
  let filteredFamilyIncidents = familyIncidents.filter(i => candidateClassIds.has(i.classId));

  // Filtrar por range de datas quando schoolYear específico
  if (!useAllYears && targetSchoolYear !== null) {
    const classRanges = new Map<string, { start: Date; end: Date } | null>();
    candidateClasses.forEach(cls => {
      // Se temos um ano calendário específico, verificamos se o schoolYear da turma cai nesse ano
      if (filters.calendarYear !== 'all') {
        const startYear = getStartCalendarYear(cls);
        if (startYear) {
          // Ano calendário em que a turma cursou este schoolYear
          const specificYear = startYear + (targetSchoolYear - 1);
          if (specificYear !== filters.calendarYear) {
            classRanges.set(cls.id, null); // Fora do ano selecionado
            return;
          }
        }
      }

      const startYearDate = resolveStartYearDate(cls);
      const range = hasQuarterRange
        ? getQuarterRangeSpan(startYearDate, targetSchoolYear, filters.quarterRangeStart!, filters.quarterRangeEnd!)
        : filters.quarter !== 'all'
          ? getQuarterRange(startYearDate, targetSchoolYear, filters.quarter)
          : getSchoolYearRange(startYearDate, targetSchoolYear);
      classRanges.set(cls.id, range);
    });

    filteredAttendance = attendance.filter(a => {
      if (!candidateClassIds.has(a.classId)) return false;
      const range = classRanges.get(a.classId);
      return range ? isDateInRange(a.date, range) : false;
    });

    filteredIncidents = disciplinaryIncidents.filter(i => {
      if (!candidateClassIds.has(i.classId)) return false;
      const range = classRanges.get(i.classId);
      return range ? isDateInRange(i.date, range) : false;
    });
    filteredFamilyIncidents = familyIncidents.filter(i => {
      if (!candidateClassIds.has(i.classId)) return false;
      const range = classRanges.get(i.classId);
      return range ? isDateInRange(i.date, range) : false;
    });

    // Também precisamos filtrar as notas se o range for nulo (fora do ano)
    const rangeFilter = (g: Grade) => {
      const range = classRanges.get(g.classId);
      return range !== null && range !== undefined; // Se range é null/undefined, a turma não cursou a série neste ano
    };
    filteredGrades = filteredGrades.filter(rangeFilter);
    filteredGradesForClassification = filteredGradesForClassification.filter(rangeFilter);
  }
  // Filtrar por ano calendário quando schoolYear é 'all' mas calendarYear é específico
  else if (useAllYears && filters.calendarYear !== 'all') {
    const targetCalYear = filters.calendarYear as number;

    // Filtrar notas pelo ano calendário
    const calendarFilter = (g: Grade) => {
      // Usar a data se disponível, ou calcular a partir do schoolYear da nota
      const cls = classById.get(g.classId);
      if (!cls) return false;

      const startYear = getStartCalendarYear(cls);
      if (!startYear) return false;

      // Nota do schoolYear X corresponde ao ano calendário startYear + X - 1
      const gradeCalendarYear = startYear + ((g.schoolYear ?? 1) - 1);
      return gradeCalendarYear === targetCalYear;
    };
    filteredGrades = filteredGrades.filter(calendarFilter);
    filteredGradesForClassification = filteredGradesForClassification.filter(calendarFilter);

    // Filtrar frequência pelo ano calendário
    filteredAttendance = filteredAttendance.filter(a => {
      const date = parseLocalDate(a.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === targetCalYear;
    });

    // Filtrar acompanhamentos pelo ano calendário  
    filteredIncidents = filteredIncidents.filter(i => {
      const date = parseLocalDate(i.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === targetCalYear;
    });
    filteredFamilyIncidents = filteredFamilyIncidents.filter(i => {
      const date = parseLocalDate(i.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === targetCalYear;
    });
  }


  const classIdsWithGrades = new Set(filteredGrades.map((grade) => grade.classId));
  const classIdsWithIncidents = new Set(filteredIncidents.map((incident) => incident.classId));
  const classIdsWithAttendance = new Set(filteredAttendance.map((record) => record.classId));

  const studentIdsWithGrades = new Set(filteredGrades.map((grade) => grade.studentId));
  const studentIdsWithIncidents = new Set(filteredIncidents.map((incident) => incident.studentIds).flat());
  const studentIdsWithAttendance = new Set(filteredAttendance.map((record) => record.studentId));

  const filteredClasses = candidateClasses.filter((cls) =>
    classIdsWithGrades.has(cls.id) ||
    classIdsWithIncidents.has(cls.id) ||
    classIdsWithAttendance.has(cls.id)
  );

  const filteredClassIds = new Set(filteredClasses.map((cls) => cls.id));
  const filteredClassById = new Map(filteredClasses.map((cls) => [cls.id, cls]));

  const filteredStudents = students.filter(
    (student) =>
      filteredClassIds.has(student.classId) &&
      (studentIdsWithGrades.has(student.id) ||
        studentIdsWithIncidents.has(student.id) ||
        studentIdsWithAttendance.has(student.id))
  );

  filteredAttendance = filteredAttendance.filter(a => filteredClassIds.has(a.classId));
  filteredIncidents = filteredIncidents.filter(i => filteredClassIds.has(i.classId));

  const hasGradesInScope = filteredGrades.length > 0;
  const displayClasses = hasGradesInScope ? filteredClasses : candidateClasses;
  const displayStudents = hasGradesInScope ? filteredStudents : candidateStudents;

  const filteredStudentsById = new Map(filteredStudents.map((student) => [student.id, student]));
  const candidateStudentsById = new Map(candidateStudents.map((student) => [student.id, student]));
  const candidateStudentsByClassId = groupById(candidateStudents, (student) => student.classId);
  const filteredStudentsByClassId = groupById(filteredStudents, (student) => student.classId);
  const gradesByClassId = groupById(filteredGrades, (grade) => grade.classId);
  const gradesByStudentId = groupById(filteredGrades, (grade) => grade.studentId);
  const gradesForClassificationByStudentId = groupById(
    filteredGradesForClassification,
    (grade) => grade.studentId,
  );
  const gradesByClassStudentId = buildClassStudentGradesMap(filteredGrades);
  const yearGradesForTrends = subjectSet
    ? yearGrades.filter((grade) => matchesSelectedSubject(grade.subject))
    : yearGrades;
  const yearGradesByClassId = groupById(yearGradesForTrends, (grade) => grade.classId);
  const yearGradesByStudentId = groupById(yearGradesForTrends, (grade) => grade.studentId);
  const attendanceByClassId = groupById(filteredAttendance, (record) => record.classId);
  const attendanceByStudentId = groupById(filteredAttendance, (record) => record.studentId);
  const incidentsByClassId = groupById(filteredIncidents, (incident) => incident.classId);
  const incidentsByStudentId = new Map<string, Incident[]>();
  filteredIncidents.forEach((incident) => {
    incident.studentIds.forEach((studentId) => {
      const bucket = incidentsByStudentId.get(studentId);
      if (bucket) {
        bucket.push(incident);
      } else {
        incidentsByStudentId.set(studentId, [incident]);
      }
    });
  });
  const familyIncidentsByClassId = groupById(filteredFamilyIncidents, (incident) => incident.classId);
  const familyIncidentsByStudentId = new Map<string, Incident[]>();
  filteredFamilyIncidents.forEach((incident) => {
    incident.studentIds.forEach((studentId) => {
      const bucket = familyIncidentsByStudentId.get(studentId);
      if (bucket) {
        bucket.push(incident);
      } else {
        familyIncidentsByStudentId.set(studentId, [incident]);
      }
    });
  });
  const allGradesByStudentId = groupById(allGrades, (grade) => grade.studentId);
  const fullGradesByStudentId = groupById(grades, (grade) => grade.studentId);

  const quarterLabel = filters.useQuarterRange
    ? `${filters.quarterRangeStart ?? QUARTERS[0]} → ${filters.quarterRangeEnd ?? QUARTERS[QUARTERS.length - 1]}`
    : filters.quarter === 'all'
      ? 'Anual'
      : filters.quarter;

  // ============================================
  // CALCULAR ANALYTICS POR ALUNO
  // ============================================

  const classificationGradesByStudentId = subjectSet
    ? gradesByStudentId
    : gradesForClassificationByStudentId;

  const studentAnalyticsList: StudentAnalytics[] = filteredStudents.map(student => {
    const studentGrades = classificationGradesByStudentId.get(student.id) ?? [];
    const studentAttendance = attendanceByStudentId.get(student.id) ?? [];
    const studentIncidents = incidentsByStudentId.get(student.id) ?? [];

    const classification = classifyStudentForAnalytics(studentGrades, studentAttendance);
    const studentClass = filteredClassById.get(student.classId);

    // Calcular tendência (considera o ano letivo inteiro)
    const trendGrades = yearGradesByStudentId.get(student.id) ?? [];
    const quarterAverages = QUARTERS.map(q => {
      const qGrades = trendGrades.filter(g => g.quarter === q);
      return qGrades.length > 0 ? qGrades.reduce((s, g) => s + g.grade, 0) / qGrades.length : 0;
    }).filter(v => v > 0);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (quarterAverages.length >= 2) {
      const diff = quarterAverages[quarterAverages.length - 1] - quarterAverages[quarterAverages.length - 2];
      if (diff > 0.3) trend = 'up';
      else if (diff < -0.3) trend = 'down';
    }

    return {
      student,
      classification,
      className: studentClass?.name || 'Sem turma',
      incidentCount: studentIncidents.length,
      trend,
      hasGrades: studentGrades.length > 0,
    };
  });

  const studentAnalyticsByClassId = groupById(
    studentAnalyticsList,
    (entry) => entry.student.classId,
  );

  // ============================================
  // CALCULAR ANALYTICS POR TURMA
  // ============================================

  const classAnalyticsList: ClassAnalytics[] = filteredClasses.map(cls => {
    const classStudents = studentAnalyticsByClassId.get(cls.id) ?? [];
    const classYearGrades = yearGradesByClassId.get(cls.id) ?? [];
    const classAttendance = attendanceByClassId.get(cls.id) ?? [];
    const classIncidents = incidentsByClassId.get(cls.id) ?? [];
    const classGradesByStudentId = gradesByClassStudentId.get(cls.id);

    const average = computeClassAverageFromStudentGrades(classStudents, classGradesByStudentId);

    const present = classAttendance.filter(a => a.status === 'presente').length;
    const frequency = classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

    const classifications = countClassifications(classStudents);

    // Calcular tendência da turma (média mensal)
    const quarterAverages = QUARTERS.map(q => {
      const qGrades = classYearGrades.filter(g => g.quarter === q);
      return qGrades.length > 0 ? qGrades.reduce((s, g) => s + g.grade, 0) / qGrades.length : 0;
    }).filter(v => v > 0);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (quarterAverages.length >= 2) {
      const diff = quarterAverages[quarterAverages.length - 1] - quarterAverages[quarterAverages.length - 2];
      if (diff > 0.2) trend = 'up';
      else if (diff < -0.2) trend = 'down';
    }

    const growth = quarterAverages.length >= 2
      ? quarterAverages[quarterAverages.length - 1] - quarterAverages[0]
      : null;

    return {
      classData: cls,
      calendarYear: classCalendarYearMap.get(cls.id) ?? undefined,
      studentCount: classStudents.length,
      average,
      frequency,
      growth,
      trendPoints: quarterAverages.length,
      gradeSampleCount: classYearGrades.length,
      classifications,
      incidentCount: classIncidents.length,
      trend,
    };
  });

  // Ordenar ranking de turmas por média
  const classRanking = [...classAnalyticsList].sort((a, b) => b.average - a.average);

  // ============================================
  // COMPARAÇÃO POR COORTE (ANO CALENDÁRIO)
  // ============================================

  const cohortMap = new Map<
    number,
    {
      classIds: Set<string>;
      studentIds: Set<string>;
      gradeSum: number;
      gradeCount: number;
      attendancePresent: number;
      attendanceTotal: number;
      incidentCount: number;
      growthValues: number[];
    }
  >();

  filteredClasses.forEach((cls) => {
    const calendarYear = classCalendarYearMap.get(cls.id);
    if (!calendarYear) return;

    const entry =
      cohortMap.get(calendarYear) ||
      {
        classIds: new Set<string>(),
        studentIds: new Set<string>(),
        gradeSum: 0,
        gradeCount: 0,
        attendancePresent: 0,
        attendanceTotal: 0,
        incidentCount: 0,
        growthValues: [],
      };

    entry.classIds.add(cls.id);

    const classStudents = filteredStudentsByClassId.get(cls.id) ?? [];
    classStudents.forEach((student) => entry.studentIds.add(student.id));

    const classGrades = gradesByClassId.get(cls.id) ?? [];
    classGrades.forEach((grade) => {
      entry.gradeSum += grade.grade;
      entry.gradeCount += 1;
    });

    const classAttendance = attendanceByClassId.get(cls.id) ?? [];
    entry.attendanceTotal += classAttendance.length;
    entry.attendancePresent += classAttendance.filter((record) => record.status === 'presente').length;

    entry.incidentCount += (incidentsByClassId.get(cls.id) ?? []).length;

    const classGrowth = classAnalyticsList.find((c) => c.classData.id === cls.id)?.growth;
    if (typeof classGrowth === 'number') {
      entry.growthValues.push(classGrowth);
    }

    cohortMap.set(calendarYear, entry);
  });

  const cohortAnalytics = useAllYears
    ? []
    : Array.from(cohortMap.entries())
      .map(([calendarYear, entry]) => {
        const growthAverage =
          entry.growthValues.length > 0
            ? entry.growthValues.reduce((sum, value) => sum + value, 0) / entry.growthValues.length
            : null;
        return {
          calendarYear,
          classCount: entry.classIds.size,
          studentCount: entry.studentIds.size,
          average: entry.gradeCount > 0 ? entry.gradeSum / entry.gradeCount : 0,
          frequency:
            entry.attendanceTotal > 0
              ? (entry.attendancePresent / entry.attendanceTotal) * 100
              : 100,
          incidentCount: entry.incidentCount,
          growthAverage,
        };
      })
      .sort((a, b) => a.calendarYear - b.calendarYear);

  // ============================================
  // CALCULAR ANALYTICS POR DISCIPLINA
  // ============================================

  // Agrupar por disciplina e aluno para calcular médias individuais primeiro
  const subjectStudentMap: Record<string, Record<string, number[]>> = {};

  filteredGrades.forEach(g => {
    if (!subjectStudentMap[g.subject]) {
      subjectStudentMap[g.subject] = {};
    }
    if (!subjectStudentMap[g.subject][g.studentId]) {
      subjectStudentMap[g.subject][g.studentId] = [];
    }
    subjectStudentMap[g.subject][g.studentId].push(g.grade);
  });

  const subjectAnalytics: SubjectAnalytics[] = Object.entries(subjectStudentMap).map(([subject, studentsData]) => {
    // Calcular média de cada aluno na disciplina
    const studentFinalGrades: number[] = [];

    Object.values(studentsData).forEach(grades => {
      if (grades.length > 0) {
        const studentAvg = grades.reduce((a, b) => a + b, 0) / grades.length;
        studentFinalGrades.push(studentAvg);
      }
    });

    // Média da disciplina = Média das médias dos alunos
    const average = studentFinalGrades.length > 0
      ? studentFinalGrades.reduce((a, b) => a + b, 0) / studentFinalGrades.length
      : 0;

    const below6 = studentFinalGrades.filter(g => g < 6).length;
    const area = getSubjectArea(subject);

    return {
      subject,
      area: area?.name || 'Outros',
      average,
      studentsBelow6: below6,
      studentsBelow6Percent: studentFinalGrades.length > 0 ? (below6 / studentFinalGrades.length) * 100 : 0,
      totalStudents: studentFinalGrades.length,
    };
  });

  // Ordenar disciplinas
  const bestSubjects = [...subjectAnalytics].sort((a, b) => b.average - a.average).slice(0, 5);
  const worstSubjects = [...subjectAnalytics].sort((a, b) => a.average - b.average).slice(0, 5);

  // Analytics por área
  const areaMap: Record<string, SubjectAnalytics[]> = {};
  subjectAnalytics.forEach(s => {
    if (!areaMap[s.area]) areaMap[s.area] = [];
    areaMap[s.area].push(s);
  });

  const areaAnalytics: AreaAnalytics[] = Object.entries(areaMap).map(([area, subjects]) => {
    // Média da área = Média das médias das disciplinas
    // Poderíamos ponderar pelo número de alunos, mas média simples das disciplinas é aceitável para analytics geral
    const average = subjects.length > 0
      ? subjects.reduce((acc, s) => acc + s.average, 0) / subjects.length
      : 0;

    return { area, average, subjects };
  });

  // ============================================
  // RANKINGS DE ALUNOS
  // ============================================

  const allStudentsRanking = [...studentAnalyticsList]
    .sort((a, b) => b.classification.average - a.classification.average);
  const topStudents = allStudentsRanking.slice(0, 10);

  const allCriticalStudents = studentAnalyticsList
    .filter(s => s.classification.classification === 'critico' || s.classification.classification === 'atencao')
    .sort((a, b) => {
      // Primeiro ordenar por classificação (crítico antes de atenção)
      if (a.classification.classification !== b.classification.classification) {
        return a.classification.classification === 'critico' ? -1 : 1;
      }
      // Depois por média (menor primeiro)
      return a.classification.average - b.classification.average;
    })
    ;
  const criticalStudents = allCriticalStudents.slice(0, 15);

  // ============================================
  // PREDIÇÕES (com histórico opcional)
  // ============================================

  const studentPredictions: StudentPrediction[] = filteredStudents.map((student) => {
    const classInfo = classById.get(student.classId);
    const studentGradesAll = (allGradesByStudentId.get(student.id) ?? []).filter(
      (grade) => grade.classId === student.classId,
    );
    const resolvePredictionYear = () => {
      if (targetSchoolYear) return targetSchoolYear;
      const classYear = classInfo?.currentYear;
      if (classYear === 1 || classYear === 2 || classYear === 3) return classYear;
      const availableYears = studentGradesAll.map((grade) => grade.schoolYear ?? 1);
      if (availableYears.length === 0) return 1;
      return Math.max(...availableYears);
    };

    const predictionYear = resolvePredictionYear();
    const currentGrades = studentGradesAll.filter(
      (grade) => (grade.schoolYear ?? 1) === predictionYear,
    );

    const historyGrades = (fullGradesByStudentId.get(student.id) ?? []).filter((grade) => {
      const gradeYear = grade.schoolYear ?? 1;
      if (gradeYear >= predictionYear) return false;
      if (filters.includeArchived) return true;
      const historyClass = classById.get(grade.classId);
      return historyClass ? !historyClass.archived : true;
    });

    const currentQuarter = filters.quarter !== 'all'
      ? filters.quarter
      : getLatestQuarter(currentGrades);

    const analysis = analyzeStudentPerformance(currentGrades, currentQuarter, {
      schoolYear: predictionYear,
      historicalGrades: historyGrades,
      minQuartersForPrediction: 2,
      includeHistoricalFallback: true,
    });

    const currentAverage = analysis.prediction.currentAverage ?? 0;
    const hasSufficientData = analysis.prediction.method !== 'insufficient_data';

    return {
      student,
      classId: student.classId,
      className: classInfo?.name || 'Sem turma',
      predicted: analysis.prediction.predicted,
      confidence: analysis.prediction.confidence,
      method: analysis.prediction.method,
      risk: analysis.risk,
      trend: analysis.trend.trend,
      currentAverage,
      dataPoints: analysis.prediction.dataPoints,
      hasSufficientData,
    };
  });

  const predictionSummary: PredictionSummary = {
    total: studentPredictions.length,
    highRisk: studentPredictions.filter((p) => p.risk >= 70 && p.hasSufficientData).length,
    mediumRisk: studentPredictions.filter((p) => p.risk >= 40 && p.risk < 70 && p.hasSufficientData).length,
    lowRisk: studentPredictions.filter((p) => p.risk < 40 && p.hasSufficientData).length,
    insufficient: studentPredictions.filter((p) => !p.hasSufficientData).length,
  };

  // ============================================
  // OVERVIEW
  // ============================================

  const totalClassifications = countClassifications(studentAnalyticsList);

  const overallAverage = filteredGrades.length > 0
    ? filteredGrades.reduce((s, g) => s + g.grade, 0) / filteredGrades.length
    : 0;

  const totalPresent = filteredAttendance.filter(a => a.status === 'presente').length;
  const overallFrequency = filteredAttendance.length > 0
    ? (totalPresent / filteredAttendance.length) * 100
    : 100;

  const overview: SchoolOverview = {
    totalStudents: displayStudents.length,
    totalClasses: displayClasses.length,
    overallAverage,
    overallFrequency,
    totalIncidents: filteredIncidents.length,
    classifications: totalClassifications,
  };

  const buildMonthlyTrendData = (sourceIncidents: Incident[]): MonthlyIncidentTrend[] => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const nowInBrasilia = getBrasiliaMonthYear(now);
    const trend: MonthlyIncidentTrend[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(Date.UTC(nowInBrasilia.year, nowInBrasilia.month, 15));
      date.setUTCMonth(date.getUTCMonth() - i);
      const referenceMonthYear = getBrasiliaMonthYear(date);
      const month = referenceMonthYear.month;
      const year = referenceMonthYear.year;

      const count = sourceIncidents.filter((incident) => {
        const incidentDate = parseLocalDate(incident.date);
        const resolvedDate = Number.isNaN(incidentDate.getTime())
          ? parseLocalDate(incident.createdAt)
          : incidentDate;
        if (Number.isNaN(resolvedDate.getTime())) return false;
        const resolvedMonthYear = getBrasiliaMonthYear(resolvedDate);
        return (
          resolvedMonthYear.month === month &&
          resolvedMonthYear.year === year
        );
      }).length;

      trend.push({
        month: monthNames[month],
        monthLabel: `${monthNames[month]}/${String(year).slice(-2)}`,
        year,
        count,
      });
    }

    return trend;
  };

  // ============================================
  // BEHAVIORAL ANALYTICS (NOVO)
  // ============================================

  // Acompanhamentos por severidade
  const severityCounts = {
    leve: filteredIncidents.filter(i => i.finalSeverity === 'leve').length,
    intermediaria: filteredIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
    grave: filteredIncidents.filter(i => i.finalSeverity === 'grave').length,
    gravissima: filteredIncidents.filter(i => i.finalSeverity === 'gravissima').length,
  };

  const totalIncidentsCount = filteredIncidents.length;
  const incidentsBySeverity: IncidentBySeverity[] = [
    { severity: 'leve', count: severityCounts.leve, percent: totalIncidentsCount > 0 ? (severityCounts.leve / totalIncidentsCount) * 100 : 0 },
    { severity: 'intermediaria', count: severityCounts.intermediaria, percent: totalIncidentsCount > 0 ? (severityCounts.intermediaria / totalIncidentsCount) * 100 : 0 },
    { severity: 'grave', count: severityCounts.grave, percent: totalIncidentsCount > 0 ? (severityCounts.grave / totalIncidentsCount) * 100 : 0 },
    { severity: 'gravissima', count: severityCounts.gravissima, percent: totalIncidentsCount > 0 ? (severityCounts.gravissima / totalIncidentsCount) * 100 : 0 },
  ];

  // Ranking de turmas por acompanhamentos
  const classIncidentRanking: ClassIncidentRanking[] = filteredClasses.map(cls => {
    const classIncidents = incidentsByClassId.get(cls.id) ?? [];
    const classStudentCount = filteredStudentsByClassId.get(cls.id)?.length ?? 0;

    // Count severities
    const severities = {
      leve: classIncidents.filter(i => i.finalSeverity === 'leve').length,
      intermediaria: classIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
      grave: classIncidents.filter(i => i.finalSeverity === 'grave').length,
      gravissima: classIncidents.filter(i => i.finalSeverity === 'gravissima').length,
    };

    return {
      classData: cls,
      incidentCount: classIncidents.length,
      studentCount: classStudentCount,
      incidentsPerStudent: classStudentCount > 0 ? classIncidents.length / classStudentCount : 0,
      openIncidents: classIncidents.filter(i => i.status !== 'resolvida').length,
      severities,
    };
  }).sort((a, b) => b.incidentCount - a.incidentCount);

  // Top alunos por acompanhamentos
  const studentIncidentMap = new Map<string, { count: number; lastDate: string | null; severities: { leve: number; intermediaria: number; grave: number; gravissima: number } }>();

  filteredIncidents.forEach(incident => {
    incident.studentIds.forEach(studentId => {
      const current = studentIncidentMap.get(studentId) || {
        count: 0,
        lastDate: null,
        severities: { leve: 0, intermediaria: 0, grave: 0, gravissima: 0 }
      };
      current.count++;
      current.severities[incident.finalSeverity as keyof typeof current.severities]++;
      if (!current.lastDate || incident.date > current.lastDate) {
        current.lastDate = incident.date;
      }
      studentIncidentMap.set(studentId, current);
    });
  });

  const topStudentsByIncidents: StudentIncidentRanking[] = Array.from(studentIncidentMap.entries())
    .map(([studentId, data]) => {
      const student = filteredStudentsById.get(studentId);
      const studentClass = student ? filteredClassById.get(student.classId) : undefined;
      return student ? {
        student,
        className: studentClass?.name || 'Sem turma',
        incidentCount: data.count,
        lastIncidentDate: data.lastDate,
        severities: data.severities,
      } : null;
    })
    .filter((s): s is StudentIncidentRanking => s !== null)
    .sort((a, b) => b.incidentCount - a.incidentCount)
    .slice(0, 10);

  // Tendência mensal (últimos 6 meses)
  const monthlyTrend = buildMonthlyTrendData(filteredIncidents);

  const openIncidentsCount = filteredIncidents.filter(i => i.status !== 'resolvida').length;
  const resolvedIncidentsCount = filteredIncidents.filter(i => i.status === 'resolvida').length;
  const averageIncidentsPerStudent = filteredStudents.length > 0
    ? filteredIncidents.length / filteredStudents.length
    : 0;

  const behavioralAnalytics: BehavioralAnalytics = {
    incidentsBySeverity,
    classIncidentRanking,
    topStudentsByIncidents,
    monthlyTrend,
    openIncidentsCount,
    resolvedIncidentsCount,
    averageIncidentsPerStudent,
  };

  // ============================================
  // FAMILY ANALYTICS (NOVO)
  // ============================================

  const familySeverityCounts = {
    leve: filteredFamilyIncidents.filter(i => i.finalSeverity === 'leve').length,
    intermediaria: filteredFamilyIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
    grave: filteredFamilyIncidents.filter(i => i.finalSeverity === 'grave').length,
    gravissima: filteredFamilyIncidents.filter(i => i.finalSeverity === 'gravissima').length,
  };

  const totalFamilyIncidentsCount = filteredFamilyIncidents.length;
  const familyIncidentsBySeverity: IncidentBySeverity[] = [
    { severity: 'leve', count: familySeverityCounts.leve, percent: totalFamilyIncidentsCount > 0 ? (familySeverityCounts.leve / totalFamilyIncidentsCount) * 100 : 0 },
    { severity: 'intermediaria', count: familySeverityCounts.intermediaria, percent: totalFamilyIncidentsCount > 0 ? (familySeverityCounts.intermediaria / totalFamilyIncidentsCount) * 100 : 0 },
    { severity: 'grave', count: familySeverityCounts.grave, percent: totalFamilyIncidentsCount > 0 ? (familySeverityCounts.grave / totalFamilyIncidentsCount) * 100 : 0 },
    { severity: 'gravissima', count: familySeverityCounts.gravissima, percent: totalFamilyIncidentsCount > 0 ? (familySeverityCounts.gravissima / totalFamilyIncidentsCount) * 100 : 0 },
  ];

  const familyClassIncidentRanking: ClassIncidentRanking[] = candidateClasses.map((cls) => {
    const classIncidents = familyIncidentsByClassId.get(cls.id) ?? [];
    const classStudentCount = candidateStudentsByClassId.get(cls.id)?.length ?? 0;

    const severities = {
      leve: classIncidents.filter(i => i.finalSeverity === 'leve').length,
      intermediaria: classIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
      grave: classIncidents.filter(i => i.finalSeverity === 'grave').length,
      gravissima: classIncidents.filter(i => i.finalSeverity === 'gravissima').length,
    };

    return {
      classData: cls,
      incidentCount: classIncidents.length,
      studentCount: classStudentCount,
      incidentsPerStudent: classStudentCount > 0 ? classIncidents.length / classStudentCount : 0,
      openIncidents: classIncidents.filter(i => i.status !== 'resolvida').length,
      severities,
    };
  }).sort((a, b) => b.incidentCount - a.incidentCount);

  const familyStudentIncidentMap = new Map<string, { count: number; lastDate: string | null; severities: { leve: number; intermediaria: number; grave: number; gravissima: number } }>();

  filteredFamilyIncidents.forEach((incident) => {
    incident.studentIds.forEach((studentId) => {
      const current = familyStudentIncidentMap.get(studentId) || {
        count: 0,
        lastDate: null,
        severities: { leve: 0, intermediaria: 0, grave: 0, gravissima: 0 },
      };
      current.count++;
      current.severities[incident.finalSeverity as keyof typeof current.severities]++;
      if (!current.lastDate || incident.date > current.lastDate) {
        current.lastDate = incident.date;
      }
      familyStudentIncidentMap.set(studentId, current);
    });
  });

  const topStudentsByFamilyIncidents: StudentIncidentRanking[] = Array.from(familyStudentIncidentMap.entries())
    .map(([studentId, data]) => {
      const student = candidateStudentsById.get(studentId);
      const studentClass = student ? classById.get(student.classId) : undefined;
      return student ? {
        student,
        className: studentClass?.name || 'Sem turma',
        incidentCount: data.count,
        lastIncidentDate: data.lastDate,
        severities: data.severities,
      } : null;
    })
    .filter((entry): entry is StudentIncidentRanking => entry !== null)
    .sort((a, b) => b.incidentCount - a.incidentCount)
    .slice(0, 10);

  const familyMonthlyTrend = buildMonthlyTrendData(filteredFamilyIncidents);
  const openFamilyIncidentsCount = filteredFamilyIncidents.filter(i => i.status !== 'resolvida').length;
  const resolvedFamilyIncidentsCount = filteredFamilyIncidents.filter(i => i.status === 'resolvida').length;
  const averageFamilyIncidentsPerStudent = candidateStudents.length > 0
    ? filteredFamilyIncidents.length / candidateStudents.length
    : 0;

  const familyAnalytics: FamilyAnalytics = {
    incidentsBySeverity: familyIncidentsBySeverity,
    classIncidentRanking: familyClassIncidentRanking,
    topStudentsByIncidents: topStudentsByFamilyIncidents,
    monthlyTrend: familyMonthlyTrend,
    openIncidentsCount: openFamilyIncidentsCount,
    resolvedIncidentsCount: resolvedFamilyIncidentsCount,
    averageIncidentsPerStudent: averageFamilyIncidentsPerStudent,
  };

  // ============================================
  // INSIGHTS AUTOMÁTICOS (com categorias)
  // ============================================

  const insights: Insight[] = [];

  // === INSIGHTS ACADÊMICOS ===

  // Insight: Alunos críticos
  if (totalClassifications.critico > 0) {
    const percent = ((totalClassifications.critico / filteredStudents.length) * 100).toFixed(0);
    const description = subjectSet
      ? `${percent}% dos alunos estão com média abaixo de 6.0 nas disciplinas selecionadas.`
      : `${percent}% dos alunos estão reprovados em 3 ou mais disciplinas e precisam de intervenção imediata.`;
    insights.push({
      id: 'critical-students',
      type: 'alert',
      category: 'risk',
      title: `${totalClassifications.critico} alunos em situação crítica`,
      description,
      actionLabel: 'Ver alunos',
      actionData: { filter: 'critico' },
    });
  }

  // Insight: Turma com maior taxa de críticos
  const classWithMostCritical = classRanking.find(c =>
    c.studentCount > 0 && (c.classifications.critico / c.studentCount) > 0.3
  );
  if (classWithMostCritical) {
    const percent = ((classWithMostCritical.classifications.critico / classWithMostCritical.studentCount) * 100).toFixed(0);
    const description = subjectSet
      ? `${percent}% dos alunos desta turma estão com média abaixo de 6.0 nas disciplinas selecionadas.`
      : `${percent}% dos alunos desta turma estão em situação crítica.`;
    insights.push({
      id: 'class-critical',
      type: 'warning',
      category: 'risk',
      title: `${classWithMostCritical.classData.name} precisa de atenção`,
      description,
      actionLabel: 'Ver turma',
      actionData: { classId: classWithMostCritical.classData.id },
    });
  }

  // Insight: Disciplina com maior reprovação
  const worstSubject = worstSubjects[0];
  if (worstSubject && worstSubject.studentsBelow6Percent > 30) {
    insights.push({
      id: 'worst-subject',
      type: 'warning',
      category: 'academic',
      title: `${worstSubject.subject} é a disciplina mais crítica`,
      description: `${worstSubject.studentsBelow6Percent.toFixed(0)}% das notas estão abaixo de 6.0 (média: ${worstSubject.average.toFixed(1)}).`,
      actionLabel: 'Filtrar disciplina',
      actionData: { subject: worstSubject.subject },
    });
  }

  // Insight: Alunos de excelência
  if (totalClassifications.excelencia > 0) {
    const percent = ((totalClassifications.excelencia / filteredStudents.length) * 100).toFixed(0);
    const description = subjectSet
      ? `${percent}% dos alunos têm média igual ou acima de 8.0 nas disciplinas selecionadas.`
      : `${percent}% dos alunos têm média geral acima de 8.0 em todas as disciplinas.`;
    insights.push({
      id: 'excellence-students',
      type: 'success',
      category: 'academic',
      title: `${totalClassifications.excelencia} alunos de excelência`,
      description,
      actionLabel: 'Ver alunos',
      actionData: { filter: 'excelencia' },
    });
  }

  // Insight: Frequência baixa
  if (overallFrequency < 80) {
    insights.push({
      id: 'low-frequency',
      type: 'alert',
      category: 'academic',
      title: 'Frequência abaixo do esperado',
      description: `A frequência média é de ${overallFrequency.toFixed(0)}%, abaixo dos 80% recomendados.`,
    });
  }

  // Insight: Melhor turma
  const bestClass = classRanking[0];
  if (bestClass && bestClass.average >= 7) {
    insights.push({
      id: 'best-class',
      type: 'success',
      category: 'academic',
      title: `${bestClass.classData.name} lidera o ranking`,
      description: `Média de ${bestClass.average.toFixed(1)} e ${bestClass.classifications.excelencia} alunos de excelência.`,
      actionLabel: 'Ver turma',
      actionData: { classId: bestClass.classData.id },
    });
  }

  const behaviorInsights = buildBehaviorInsights({
    openIncidentsCount,
    totalIncidents: filteredIncidents.length,
    severeIncidentsCount: severityCounts.grave + severityCounts.gravissima,
    severityBreakdown: {
      grave: severityCounts.grave,
      gravissima: severityCounts.gravissima,
    },
    classRanking: classIncidentRanking.map((item) => ({
      classId: item.classData.id,
      className: item.classData.name,
      incidentCount: item.incidentCount,
      incidentsPerStudent: item.incidentsPerStudent,
      openIncidents: item.openIncidents,
      studentCount: item.studentCount,
    })),
    monthlyTrend: monthlyTrend.map((item) => ({
      monthLabel: item.monthLabel,
      count: item.count,
    })),
    pendingIncidents: filteredIncidents
      .filter((incident) => incident.status !== 'resolvida')
      .map((incident) => ({
        date: incident.date,
        status: incident.status,
      })),
  });

  const familyInsights = buildFamilyInsights({
    openIncidentsCount: openFamilyIncidentsCount,
    totalIncidents: filteredFamilyIncidents.length,
    severeIncidentsCount: familySeverityCounts.grave + familySeverityCounts.gravissima,
    classRanking: familyClassIncidentRanking.map((item) => ({
      classId: item.classData.id,
      className: item.classData.name,
      incidentCount: item.incidentCount,
      incidentsPerStudent: item.incidentsPerStudent,
      openIncidents: item.openIncidents,
      studentCount: item.studentCount,
    })),
    monthlyTrend: familyMonthlyTrend.map((item) => ({
      monthLabel: item.monthLabel,
      count: item.count,
    })),
    pendingIncidents: filteredFamilyIncidents
      .filter((incident) => incident.status !== 'resolvida')
      .map((incident) => ({
        date: incident.date,
        status: incident.status,
      })),
  });

  const dashboardHighlights = buildDashboardHighlights({
    growthItems: classRanking
      .filter((item) => typeof item.growth === 'number')
      .map((item) => ({
        classId: item.classData.id,
        className: item.classData.name,
        growth: item.growth ?? 0,
        trendPoints: item.trendPoints ?? 0,
        studentCount: item.studentCount,
        gradeSampleCount: item.gradeSampleCount ?? 0,
      })),
  });

  const normalizeInsights = (source: Insight[]) => {
    const actionable = source
      .map((insight) => ({
        ...insight,
        priority: insight.priority ?? scoreInsightPriority(insight),
      }))
      .filter((insight) => {
        const hasAction = Boolean(insight.actionLabel);
        const isCritical = insight.type === 'alert' || insight.type === 'warning';
        return hasAction || isCritical;
      });

    return dedupeInsightsBySemanticKey(actionable).sort((a, b) => {
      const aPriority = a.priority ?? 0;
      const bPriority = b.priority ?? 0;
      return bPriority - aPriority;
    });
  };

  const academicInsights = normalizeInsights(insights.filter(i => i.category === 'academic'));
  const riskInsights = normalizeInsights(insights.filter(i => i.category === 'risk'));
  const normalizedBehaviorInsights = normalizeInsights(behaviorInsights);
  const normalizedFamilyInsights = normalizeInsights(familyInsights);
  const normalizedDashboardHighlights = normalizeInsights(dashboardHighlights);

  // === CATEGORIZAR INSIGHTS ===
  const categorizedInsights: CategorizedInsights = {
    dashboard: normalizedDashboardHighlights,
    academic: academicInsights,
    behavioral: normalizedBehaviorInsights,
    risk: riskInsights,
    family: normalizedFamilyInsights,
  };

  const mergedInsights = normalizeInsights([
    ...academicInsights,
    ...riskInsights,
    ...normalizedBehaviorInsights,
    ...normalizedFamilyInsights,
    ...normalizedDashboardHighlights,
  ]);

  // ============================================
  // DADOS DE COMPARAÇÃO
  // ============================================

  const comparisonData = filters.comparisonClassIds.length > 0
    ? buildComparisonCalendarData()
    : [];
  const comparisonCourseYearData =
    comparisonMode === 'courseYear'
      ? buildComparisonCourseYearData(comparisonCourseYear as 1 | 2 | 3)
      : [];

  const result: SchoolAnalyticsResult = {
    context: {
      mode: subjectSet ? 'subject' : 'general',
      classCount: displayClasses.length,
      studentCount: displayStudents.length,
      gradeCount: filteredGrades.length,
      subjectCount: selectedSubjects.length,
      hasSubjectFilter: selectedSubjects.length > 0,
      quarterLabel,
      schoolYear: filters.schoolYear,
      calendarYear: filters.calendarYear,
    },
    overview,
    classRanking,
    topStudents,
    criticalStudents,
    allStudentsRanking,
    allCriticalStudents,
    studentPredictions,
    predictionSummary,
    subjectAnalytics,
    areaAnalytics,
    bestSubjects,
    worstSubjects,
    behavioralAnalytics,
    familyAnalytics,
    insights: mergedInsights,
    categorizedInsights,
    comparisonData,
    comparisonCourseYearData,
    cohortAnalytics,
  };
  done({
    classes: displayClasses.length,
    students: displayStudents.length,
    grades: filteredGrades.length,
    incidents: filteredIncidents.length,
    familyIncidents: filteredFamilyIncidents.length,
    attendance: filteredAttendance.length,
    calendarYear: filters.calendarYear,
    quarter: filters.quarter,
  });
  return result;
}

export function useSchoolAnalytics(
  students: Student[],
  classes: Class[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[],
  filters: AnalyticsFilters
): SchoolAnalyticsResult {
  return useMemo(
    () =>
      computeSchoolAnalytics(
        students,
        classes,
        grades,
        attendance,
        incidents,
        filters,
      ),
    [students, classes, grades, attendance, incidents, filters],
  );
}


// Helper para formatar números
export function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals);
}

// Helper para obter cor do trend
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return 'text-success';
    case 'down': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

// Helper para obter ícone do trend
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '→';
  }
}
