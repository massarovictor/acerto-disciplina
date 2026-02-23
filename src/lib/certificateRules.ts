import { calculateCurrentYearFromCalendar } from '@/lib/classYearCalculator';
import {
  FUNDAMENTAL_SUBJECT_AREAS,
  SUBJECT_AREAS,
  type SubjectArea,
} from '@/lib/subjects';
import { Class, Grade, ProfessionalSubjectTemplate, Student } from '@/types';

export interface SubjectReferenceOption {
  value: string;
  label: string;
}

export interface AreaReferenceOption {
  value: string;
  label: string;
  subjects: string[];
}

export interface HighlightSuggestion {
  studentId: string;
  studentName: string;
  average: number | null;
  status: 'confirmed' | 'pending';
  missingSubjects: string[];
  failingSubjects: string[];
}

const normalizeSubjectToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const mean = (values: number[]): number | null => {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sortableValue = (value: number | null): number =>
  value === null ? Number.NEGATIVE_INFINITY : value;

export const isFundamentalClass = (classData?: Class | null): boolean => {
  if (!classData?.series) return false;
  const normalizedSeries = classData.series
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return (
    ['6o', '7o', '8o', '9o'].some((yearToken) => normalizedSeries.includes(yearToken)) ||
    normalizedSeries.includes('fundamental')
  );
};

export const getDefaultSchoolYearForClass = (classInfo: Class): 1 | 2 | 3 => {
  if (classInfo.startCalendarYear) {
    return calculateCurrentYearFromCalendar(classInfo.startCalendarYear);
  }

  const defaultYear = classInfo.currentYear ?? 1;
  return [1, 2, 3].includes(defaultYear as number)
    ? (defaultYear as 1 | 2 | 3)
    : 1;
};

const resolveCommonSubjectAreas = (classData?: Class | null): SubjectArea[] => {
  if (isFundamentalClass(classData)) {
    return FUNDAMENTAL_SUBJECT_AREAS;
  }
  return SUBJECT_AREAS;
};

export const resolveCommonSubjectsForClass = (classData?: Class | null): string[] => {
  const commonAreas = resolveCommonSubjectAreas(classData);
  const unique = new Set<string>();

  commonAreas.forEach((area) => {
    area.subjects.forEach((subject) => {
      if (subject?.trim()) unique.add(subject.trim());
    });
  });

  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};

export const resolveAreaReferencesForClass = (
  classData?: Class | null,
  technicalSubjects: string[] = [],
): AreaReferenceOption[] => {
  const commonAreas = resolveCommonSubjectAreas(classData);
  const areaReferences: AreaReferenceOption[] = commonAreas.map((area) => ({
    value: area.name,
    label: area.name,
    subjects: [...area.subjects],
  }));

  if (technicalSubjects.length > 0) {
    areaReferences.push({
      value: 'Formação Técnica e Profissional',
      label: 'Formação Técnica e Profissional',
      subjects: [...technicalSubjects],
    });
  }

  return areaReferences;
};

interface ResolveTechnicalSubjectsParams {
  classData?: Class | null;
  schoolYear: 1 | 2 | 3;
  templates: ProfessionalSubjectTemplate[];
  manualSubjects: string[];
  grades: Grade[];
}

export const resolveTechnicalSubjectsForSchoolYear = ({
  classData,
  schoolYear,
  templates,
  manualSubjects,
  grades,
}: ResolveTechnicalSubjectsParams): string[] => {
  const template = classData?.templateId
    ? templates.find((item) => item.id === classData.templateId)
    : undefined;
  const templateSubjectsForYear =
    template?.subjectsByYear.find((yearData) => yearData.year === schoolYear)
      ?.subjects ?? [];

  const gradeSubjectsInYear = new Set<string>();
  grades
    .filter((grade) => (grade.schoolYear ?? 1) === schoolYear)
    .forEach((grade) => {
      const normalized = normalizeSubjectToken(grade.subject);
      if (normalized) gradeSubjectsInYear.add(normalized);
    });

  const templateSubjectKeys = new Set(
    templateSubjectsForYear.map((subject) => normalizeSubjectToken(subject)),
  );

  const unique = new Set<string>();
  [...templateSubjectsForYear, ...manualSubjects].forEach((subject) => {
    if (!subject?.trim()) return;

    const normalized = normalizeSubjectToken(subject);
    const belongsToYear =
      templateSubjectKeys.has(normalized) || gradeSubjectsInYear.has(normalized);

    if (belongsToYear) {
      unique.add(subject.trim());
    }
  });

  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};

export const resolveSubjectReferencesForClass = (
  classData: Class | null,
  technicalSubjects: string[],
): SubjectReferenceOption[] => {
  const commonSubjects = resolveCommonSubjectsForClass(classData);
  const unique = new Set<string>([...commonSubjects, ...technicalSubjects]);

  return Array.from(unique)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((subject) => ({ value: subject, label: subject }));
};

interface BuildHighlightSuggestionsParams {
  students: Student[];
  grades: Grade[];
  schoolYear: 1 | 2 | 3;
  selectedQuarters: string[];
  expectedSubjects: string[];
}

export const buildHighlightSuggestions = ({
  students,
  grades,
  schoolYear,
  selectedQuarters,
  expectedSubjects,
}: BuildHighlightSuggestionsParams): HighlightSuggestion[] => {
  const expectedSubjectKeys = new Map<string, string>();
  expectedSubjects.forEach((subject) => {
    const key = normalizeSubjectToken(subject);
    if (key) expectedSubjectKeys.set(key, subject);
  });

  const expectedKeys = Array.from(expectedSubjectKeys.keys());

  const scopedGrades = grades.filter((grade) => (grade.schoolYear ?? 1) === schoolYear);

  const suggestions = students
    .map((student) => {
      const studentGrades = scopedGrades.filter((grade) => grade.studentId === student.id);

      const gradeMap = new Map<string, number[]>();
      studentGrades.forEach((grade) => {
        const subjectKey = normalizeSubjectToken(grade.subject);
        if (!subjectKey || !expectedSubjectKeys.has(subjectKey)) return;
        if (!selectedQuarters.includes(grade.quarter)) return;
        if (!Number.isFinite(grade.grade)) return;

        const quarterKey = `${subjectKey}::${grade.quarter}`;
        const current = gradeMap.get(quarterKey) ?? [];
        current.push(grade.grade);
        gradeMap.set(quarterKey, current);
      });

      const availableQuarterAverages: number[] = [];
      const failingSubjects = new Set<string>();
      const missingSubjects = new Set<string>();

      expectedKeys.forEach((subjectKey) => {
        selectedQuarters.forEach((quarter) => {
          const quarterKey = `${subjectKey}::${quarter}`;
          const values = gradeMap.get(quarterKey);

          if (!values || values.length === 0) {
            missingSubjects.add(expectedSubjectKeys.get(subjectKey) || subjectKey);
            return;
          }

          const quarterAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
          availableQuarterAverages.push(quarterAverage);

          if (Math.round(quarterAverage * 10) / 10 < 6) {
            failingSubjects.add(expectedSubjectKeys.get(subjectKey) || subjectKey);
          }
        });
      });

      if (failingSubjects.size > 0) {
        return null;
      }

      return {
        studentId: student.id,
        studentName: student.name,
        average: mean(availableQuarterAverages),
        status: missingSubjects.size > 0 ? 'pending' : 'confirmed',
        missingSubjects: Array.from(missingSubjects).sort((a, b) =>
          a.localeCompare(b, 'pt-BR'),
        ),
        failingSubjects: Array.from(failingSubjects),
      } satisfies HighlightSuggestion;
    })
    .filter((item): item is HighlightSuggestion => Boolean(item));

  return suggestions.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'confirmed' ? -1 : 1;
    }

    const avgDiff = sortableValue(b.average) - sortableValue(a.average);
    if (avgDiff !== 0) return avgDiff;

    return a.studentName.localeCompare(b.studentName, 'pt-BR');
  });
};
