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
  category: 'academic' | 'behavioral' | 'risk';  // Nova categoria
  title: string;
  description: string;
  actionLabel?: string;
  actionData?: any;
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

export interface CategorizedInsights {
  academic: Insight[];
  behavioral: Insight[];
  risk: Insight[];
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
  critico: '#DC2626',
  atencao: '#F59E0B',
  aprovado: '#10B981',
  excelencia: '#2563EB',
};

export const CLASSIFICATION_LABELS: Record<StudentClassification, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  aprovado: 'Aprovado',
  excelencia: 'Excelência',
};

export const CLASSIFICATION_BG_COLORS: Record<StudentClassification, string> = {
  critico: 'bg-red-100 text-red-800 border-red-200',
  atencao: 'bg-amber-100 text-amber-800 border-amber-200',
  aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  excelencia: 'bg-blue-100 text-blue-800 border-blue-200',
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
  insights: [],
  categorizedInsights: {
    academic: [],
    behavioral: [],
    risk: [],
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
  const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);
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

  let filteredGrades = useAllYears ? allGrades : yearGrades;
  const hasQuarterRange =
    filters.useQuarterRange &&
    filters.quarterRangeStart &&
    filters.quarterRangeEnd;
  if (hasQuarterRange) {
    const startIndex = getQuarterIndex(filters.quarterRangeStart!);
    const endIndex = getQuarterIndex(filters.quarterRangeEnd!);
    if (startIndex >= 0 && endIndex >= 0) {
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);
      filteredGrades = filteredGrades.filter((g) => {
        const qIndex = getQuarterIndex(g.quarter);
        return qIndex >= minIndex && qIndex <= maxIndex;
      });
    }
  } else if (filters.quarter !== 'all') {
    filteredGrades = filteredGrades.filter(g => g.quarter === filters.quarter);
  }

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

    let comparisonGrades = comparisonYearGrades;
    if (hasQuarterRange) {
      const startIndex = getQuarterIndex(filters.quarterRangeStart!);
      const endIndex = getQuarterIndex(filters.quarterRangeEnd!);
      if (startIndex >= 0 && endIndex >= 0) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        comparisonGrades = comparisonGrades.filter((grade) => {
          const qIndex = getQuarterIndex(grade.quarter);
          return qIndex >= minIndex && qIndex <= maxIndex;
        });
      }
    } else if (filters.quarter !== 'all') {
      comparisonGrades = comparisonGrades.filter((grade) => grade.quarter === filters.quarter);
    }

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
    const comparisonIncidents = incidents.filter((incident) =>
      comparisonClassIdsSet.has(incident.classId) &&
      isDateInRange(incident.date, classRanges.get(incident.classId)),
    );

    const comparisonStudentIdsWithGrades = new Set(comparisonGrades.map((grade) => grade.studentId));
    const comparisonStudents = comparisonStudentsAll.filter((student) =>
      comparisonStudentIdsWithGrades.has(student.id),
    );
    const comparisonGradesByClassId = groupById(comparisonGrades, (grade) => grade.classId);
    const comparisonGradesByStudentId = groupById(comparisonGrades, (grade) => grade.studentId);
    const comparisonGradesForClassificationByStudentId = groupById(
      comparisonGradesForClassification,
      (grade) => grade.studentId,
    );
    const comparisonClassificationGradesByStudentId = subjectSet
      ? comparisonGradesByStudentId
      : comparisonGradesForClassificationByStudentId;
    const comparisonGradesByClassStudentId = new Map<string, Map<string, Grade[]>>();
    comparisonGrades.forEach((grade) => {
      let classMap = comparisonGradesByClassStudentId.get(grade.classId);
      if (!classMap) {
        classMap = new Map<string, Grade[]>();
        comparisonGradesByClassStudentId.set(grade.classId, classMap);
      }
      let studentGrades = classMap.get(grade.studentId);
      if (!studentGrades) {
        studentGrades = [];
        classMap.set(grade.studentId, studentGrades);
      }
      studentGrades.push(grade);
    });

    const comparisonStudentsByClassId = groupById(comparisonStudents, (student) => student.classId);
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
      const classGrades = comparisonGradesByClassId.get(cls.id) ?? [];
      const classYearGrades = comparisonYearGradesByClassId.get(cls.id) ?? [];
      const classAttendance = comparisonAttendanceByClassId.get(cls.id) ?? [];
      const classIncidents = comparisonIncidentsByClassId.get(cls.id) ?? [];
      const classGradesByStudentId = comparisonGradesByClassStudentId.get(cls.id);

      let totalStudentAverages = 0;
      let studentCountWithGrades = 0;

      classStudents.forEach((studentAnalytics) => {
        const studentGrades = classGradesByStudentId?.get(studentAnalytics.student.id) ?? [];
        if (studentGrades.length > 0) {
          const studentAvg =
            studentGrades.reduce((sum, grade) => sum + grade.grade, 0) /
            studentGrades.length;
          totalStudentAverages += studentAvg;
          studentCountWithGrades += 1;
        }
      });

      const average = studentCountWithGrades > 0 ? totalStudentAverages / studentCountWithGrades : 0;

      const present = classAttendance.filter((record) => record.status === 'presente').length;
      const frequency =
        classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

      const classifications = {
        critico: classStudents.filter((student) => student.classification.classification === 'critico').length,
        atencao: classStudents.filter((student) => student.classification.classification === 'atencao').length,
        aprovado: classStudents.filter((student) => student.classification.classification === 'aprovado').length,
        excelencia: classStudents.filter((student) => student.classification.classification === 'excelencia').length,
      };

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

    let comparisonGrades = comparisonGradesBase;
    if (hasQuarterRange) {
      const startIndex = getQuarterIndex(filters.quarterRangeStart!);
      const endIndex = getQuarterIndex(filters.quarterRangeEnd!);
      if (startIndex >= 0 && endIndex >= 0) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        comparisonGrades = comparisonGrades.filter((grade) => {
          const qIndex = getQuarterIndex(grade.quarter);
          return qIndex >= minIndex && qIndex <= maxIndex;
        });
      }
    } else if (filters.quarter !== 'all') {
      comparisonGrades = comparisonGrades.filter((grade) => grade.quarter === filters.quarter);
    }

    let comparisonGradesForClassification = comparisonGrades;

    if (subjectSet) {
      comparisonGrades = comparisonGrades.filter((grade) =>
        matchesSelectedSubject(grade.subject),
      );
    }

    let comparisonAttendance = attendance.filter((record) =>
      comparisonClassIdsSet.has(record.classId),
    );
    let comparisonIncidents = incidents.filter((incident) =>
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

    const comparisonGradesByClassId = groupById(comparisonGrades, (grade) => grade.classId);
    const comparisonGradesByStudentId = groupById(comparisonGrades, (grade) => grade.studentId);
    const comparisonGradesForClassificationByStudentId = groupById(
      comparisonGradesForClassification,
      (grade) => grade.studentId,
    );
    const comparisonClassificationGradesByStudentId = subjectSet
      ? comparisonGradesByStudentId
      : comparisonGradesForClassificationByStudentId;
    const comparisonGradesByClassStudentId = new Map<string, Map<string, Grade[]>>();
    comparisonGrades.forEach((grade) => {
      let classMap = comparisonGradesByClassStudentId.get(grade.classId);
      if (!classMap) {
        classMap = new Map<string, Grade[]>();
        comparisonGradesByClassStudentId.set(grade.classId, classMap);
      }
      let studentGrades = classMap.get(grade.studentId);
      if (!studentGrades) {
        studentGrades = [];
        classMap.set(grade.studentId, studentGrades);
      }
      studentGrades.push(grade);
    });

    const comparisonStudentsByClassId = groupById(comparisonStudents, (student) => student.classId);
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
      const classGrades = comparisonGradesByClassId.get(cls.id) ?? [];
      const classYearGrades = comparisonYearGradesByClassId.get(cls.id) ?? [];
      const classAttendance = comparisonAttendanceByClassId.get(cls.id) ?? [];
      const classIncidents = comparisonIncidentsByClassId.get(cls.id) ?? [];
      const classGradesByStudentId = comparisonGradesByClassStudentId.get(cls.id);

      let totalStudentAverages = 0;
      let studentCountWithGrades = 0;

      classStudents.forEach((studentAnalytics) => {
        const studentGrades = classGradesByStudentId?.get(studentAnalytics.student.id) ?? [];
        if (studentGrades.length > 0) {
          const studentAvg =
            studentGrades.reduce((sum, grade) => sum + grade.grade, 0) /
            studentGrades.length;
          totalStudentAverages += studentAvg;
          studentCountWithGrades += 1;
        }
      });

      const average = studentCountWithGrades > 0 ? totalStudentAverages / studentCountWithGrades : 0;

      const present = classAttendance.filter((record) => record.status === 'presente').length;
      const frequency =
        classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

      const classifications = {
        critico: classStudents.filter((student) => student.hasGrades && student.classification.classification === 'critico').length,
        atencao: classStudents.filter((student) => student.hasGrades && student.classification.classification === 'atencao').length,
        aprovado: classStudents.filter((student) => student.hasGrades && student.classification.classification === 'aprovado').length,
        excelencia: classStudents.filter((student) => student.hasGrades && student.classification.classification === 'excelencia').length,
      };

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
        classifications,
        incidentCount: classIncidents.length,
        trend,
      };
    });
  };

  let filteredAttendance = attendance.filter(a => candidateClassIds.has(a.classId));
  let filteredIncidents = incidents.filter(i => candidateClassIds.has(i.classId));

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

    filteredIncidents = incidents.filter(i => {
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

    // Filtrar ocorrências pelo ano calendário  
    filteredIncidents = filteredIncidents.filter(i => {
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
  const filteredStudentsByClassId = groupById(filteredStudents, (student) => student.classId);
  const gradesByClassId = groupById(filteredGrades, (grade) => grade.classId);
  const gradesByStudentId = groupById(filteredGrades, (grade) => grade.studentId);
  const gradesForClassificationByStudentId = groupById(
    filteredGradesForClassification,
    (grade) => grade.studentId,
  );
  const gradesByClassStudentId = new Map<string, Map<string, Grade[]>>();
  filteredGrades.forEach((grade) => {
    let classMap = gradesByClassStudentId.get(grade.classId);
    if (!classMap) {
      classMap = new Map<string, Grade[]>();
      gradesByClassStudentId.set(grade.classId, classMap);
    }
    let studentGrades = classMap.get(grade.studentId);
    if (!studentGrades) {
      studentGrades = [];
      classMap.set(grade.studentId, studentGrades);
    }
    studentGrades.push(grade);
  });
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
    const classGrades = gradesByClassId.get(cls.id) ?? [];
    const classYearGrades = yearGradesByClassId.get(cls.id) ?? [];
    const classAttendance = attendanceByClassId.get(cls.id) ?? [];
    const classIncidents = incidentsByClassId.get(cls.id) ?? [];
    const classGradesByStudentId = gradesByClassStudentId.get(cls.id);

    // Calcular média da turma: Média das médias dos alunos
    let totalStudentAverages = 0;
    let studentCountWithGrades = 0;

    classStudents.forEach(studentAnalytics => {
      const student = studentAnalytics.student;
      const studentGrades = classGradesByStudentId?.get(student.id) ?? [];

      if (studentGrades.length > 0) {
        // Média do aluno = Soma das notas / Quantidade de notas
        // Nota: Assumindo que todas as notas têm o mesmo peso
        const studentAvg = studentGrades.reduce((s, g) => s + g.grade, 0) / studentGrades.length;
        totalStudentAverages += studentAvg;
        studentCountWithGrades++;
      }
    });

    const average = studentCountWithGrades > 0 ? totalStudentAverages / studentCountWithGrades : 0;

    const present = classAttendance.filter(a => a.status === 'presente').length;
    const frequency = classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

    const classifications = {
      critico: classStudents.filter(s => s.hasGrades && s.classification.classification === 'critico').length,
      atencao: classStudents.filter(s => s.hasGrades && s.classification.classification === 'atencao').length,
      aprovado: classStudents.filter(s => s.hasGrades && s.classification.classification === 'aprovado').length,
      excelencia: classStudents.filter(s => s.hasGrades && s.classification.classification === 'excelencia').length,
    };

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

  const totalClassifications = {
    critico: studentAnalyticsList.filter(s => s.hasGrades && s.classification.classification === 'critico').length,
    atencao: studentAnalyticsList.filter(s => s.hasGrades && s.classification.classification === 'atencao').length,
    aprovado: studentAnalyticsList.filter(s => s.hasGrades && s.classification.classification === 'aprovado').length,
    excelencia: studentAnalyticsList.filter(s => s.hasGrades && s.classification.classification === 'excelencia').length,
  };

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

  // ============================================
  // BEHAVIORAL ANALYTICS (NOVO)
  // ============================================

  // Ocorrências por severidade
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

  // Ranking de turmas por ocorrências
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

  // Top alunos por ocorrências
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
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const now = new Date();
  const monthlyTrend: MonthlyIncidentTrend[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth();
    const year = date.getFullYear();

    const count = filteredIncidents.filter(incident => {
      const incidentDate = new Date(incident.date);
      return incidentDate.getMonth() === month && incidentDate.getFullYear() === year;
    }).length;

    monthlyTrend.push({
      month: monthNames[month],
      year,
      count,
    });
  }

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

  // Insight: Crescimento de desempenho
  const growthClasses = classRanking.filter((c) => typeof c.growth === 'number');
  if (growthClasses.length > 0) {
    const bestGrowth = growthClasses.reduce((best, current) =>
      (current.growth ?? 0) > (best.growth ?? 0) ? current : best,
    );
    if ((bestGrowth.growth ?? 0) >= 0.5) {
      insights.push({
        id: 'best-growth',
        type: 'success',
        category: 'academic',
        title: `${bestGrowth.classData.name} teve maior crescimento`,
        description: `Evolução de ${(bestGrowth.growth ?? 0).toFixed(1)} pontos entre o primeiro e o último bimestre disponível.`,
      });
    }

    const worstGrowth = growthClasses.reduce((worst, current) =>
      (current.growth ?? 0) < (worst.growth ?? 0) ? current : worst,
    );
    if ((worstGrowth.growth ?? 0) <= -0.5) {
      insights.push({
        id: 'worst-growth',
        type: 'warning',
        category: 'academic',
        title: `${worstGrowth.classData.name} apresentou queda de desempenho`,
        description: `Queda de ${(Math.abs(worstGrowth.growth ?? 0)).toFixed(1)} ponto(s) entre o primeiro e o último bimestre disponível.`,
      });
    }
  }

  // === INSIGHTS COMPORTAMENTAIS ===

  // Insight: Ocorrências altas
  if (averageIncidentsPerStudent > 0.5) {
    insights.push({
      id: 'high-incidents',
      type: 'warning',
      category: 'behavioral',
      title: 'Alto índice de ocorrências',
      description: `Média de ${averageIncidentsPerStudent.toFixed(1)} ocorrências por aluno. Considere ações preventivas.`,
    });
  }

  // Insight: Ocorrências graves/gravíssimas
  const severeIncidents = severityCounts.grave + severityCounts.gravissima;
  if (severeIncidents > 0) {
    insights.push({
      id: 'severe-incidents',
      type: 'alert',
      category: 'behavioral',
      title: `${severeIncidents} ocorrências graves`,
      description: `Há ${severityCounts.grave} ocorrências graves e ${severityCounts.gravissima} gravíssimas que requerem atenção especial.`,
    });
  }

  // Insight: Ocorrências pendentes
  if (openIncidentsCount > 5) {
    insights.push({
      id: 'pending-incidents',
      type: 'warning',
      category: 'behavioral',
      title: `${openIncidentsCount} ocorrências pendentes`,
      description: `Existem ocorrências aguardando resolução. Considere revisar e dar encaminhamento.`,
    });
  }

  // Insight: Turma com mais ocorrências
  const classWithMostIncidents = classIncidentRanking[0];
  if (classWithMostIncidents && classWithMostIncidents.incidentCount >= 5) {
    insights.push({
      id: 'class-most-incidents',
      type: 'warning',
      category: 'behavioral',
      title: `${classWithMostIncidents.classData.name} lidera em ocorrências`,
      description: `${classWithMostIncidents.incidentCount} ocorrências registradas (${classWithMostIncidents.incidentsPerStudent.toFixed(1)} por aluno).`,
      actionLabel: 'Ver turma',
      actionData: { classId: classWithMostIncidents.classData.id },
    });
  }

  // Insight: Melhoria no comportamento
  if (monthlyTrend.length >= 2) {
    const lastMonth = monthlyTrend[monthlyTrend.length - 1].count;
    const prevMonth = monthlyTrend[monthlyTrend.length - 2].count;
    if (prevMonth > 0 && lastMonth < prevMonth * 0.7) {
      insights.push({
        id: 'behavior-improvement',
        type: 'success',
        category: 'behavioral',
        title: 'Melhoria no comportamento',
        description: `Ocorrências reduziram ${(((prevMonth - lastMonth) / prevMonth) * 100).toFixed(0)}% em relação ao mês anterior.`,
      });
    }
  }

  // === CATEGORIZAR INSIGHTS ===
  const categorizedInsights: CategorizedInsights = {
    academic: insights.filter(i => i.category === 'academic'),
    behavioral: insights.filter(i => i.category === 'behavioral'),
    risk: insights.filter(i => i.category === 'risk'),
  };

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
    insights,
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
    case 'up': return 'text-emerald-600';
    case 'down': return 'text-red-600';
    default: return 'text-gray-500';
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
