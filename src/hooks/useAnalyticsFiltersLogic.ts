/**
 * Hook com a lógica de filtros e preparação de dados para o Analytics
 */

import { useMemo, useCallback, useState } from 'react';
import { Class, Grade, ProfessionalSubject, ProfessionalSubjectTemplate } from '@/types';
import { AnalyticsFilters } from '@/hooks/useSchoolAnalytics';
import { QUARTERS, getAllSubjects } from '@/lib/subjects';
import { useGradesAnalytics } from '@/hooks/useData';

interface UseAnalyticsFiltersLogicProps {
    classes: Class[];
    professionalSubjects: ProfessionalSubject[];
    templates: ProfessionalSubjectTemplate[];
    filters: AnalyticsFilters;
    setAnalyticsFilters: (filters: AnalyticsFilters) => void;
}

export type AutoIndicatorKey =
    | 'classIds'
    | 'subjects'
    | 'schoolYear'
    | 'calendarYear'
    | 'quarter'
    | 'useQuarterRange'
    | 'comparisonClassIds';
export type AutoIndicators = Partial<Record<AutoIndicatorKey, boolean>>;

export function useAnalyticsFiltersLogic({
    classes,
    professionalSubjects,
    templates,
    filters,
    setAnalyticsFilters,
}: UseAnalyticsFiltersLogicProps) {

    // ===========================================
    // Helpers Puros
    // ===========================================

    const getStartCalendarYear = useCallback((cls: Class) => {
        if (typeof cls.startCalendarYear === 'number') return cls.startCalendarYear;
        if (cls.startYearDate) {
            const date = new Date(`${cls.startYearDate}T00:00:00`);
            if (!Number.isNaN(date.getTime())) return date.getFullYear();
        }
        const currentYear = new Date().getFullYear();
        const inferredYear =
            cls.currentYear && [1, 2, 3].includes(cls.currentYear)
                ? currentYear - (cls.currentYear - 1)
                : undefined;
        return inferredYear;
    }, []);

    const getQuarterIndex = (quarter: string) => QUARTERS.indexOf(quarter);

    const normalizeSubjectName = useCallback((value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim(), []);

    const normalizeSubjectTokens = useCallback((value: string) =>
        normalizeSubjectName(value)
            .split(/[^a-z0-9]+/g)
            .filter((token) => token.length >= 3), [normalizeSubjectName]);

    const normalizeCourseName = useCallback((value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim(), []);

    const parseSeriesYear = (value: string) => {
        const match = value.match(/\d+/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const getCourseYearForCalendarYear = useCallback((cls: Class, targetYear: number) => {
        const startYear = getStartCalendarYear(cls);
        if (!startYear) return null;
        const courseYear = targetYear - startYear + 1;
        if (courseYear < 1 || courseYear > 3) return null;
        return courseYear;
    }, [getStartCalendarYear]);

    const normalizeList = useCallback((values: string[]) =>
        Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'pt-BR')), []);


    // ===========================================
    // Lógica de Filtragem de Turmas
    // ===========================================

    const filterClassesBySeries = useCallback((
        list: Class[],
        series: string[],
        calendarYear: AnalyticsFilters['calendarYear'],
        schoolYear: AnalyticsFilters['schoolYear'],
    ) => {
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
                        ? Number(calendarYear)
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
    }, [getStartCalendarYear, getCourseYearForCalendarYear]);

    const classIdsForFetch = useMemo(() => {
        let baseClasses = filters.includeArchived
            ? classes
            : classes.filter((c) => !c.archived);

        if (filters.series.length > 0) {
            baseClasses = baseClasses.filter((c) =>
                filters.series.some((series) => c.series.includes(series)),
            );
        }

        baseClasses = filterClassesBySeries(
            baseClasses,
            filters.series,
            filters.calendarYear,
            filters.schoolYear,
        );

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
        filters.calendarYear,
        filters.schoolYear,
        filterClassesBySeries
    ]);

    // Busca de Notas (Centralizada)
    const { grades } = useGradesAnalytics({
        classIds: classIdsForFetch,
    });

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
        filterClassesBySeries
    ]);


    // ===========================================
    // Resolução de Templates e Disciplinas
    // ===========================================

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
    }, [templates, normalizeCourseName, normalizeSubjectName]);

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

            if (template) {
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
            }
        });

        return map;
    }, [classes, templatesById, templateSubjectsByCourse, normalizeCourseName, normalizeSubjectName]);

    const professionalSubjectsByClassId = useMemo(() => {
        const map = new Map<string, { all: Set<string>; labels: Map<string, string> }>();
        professionalSubjects.forEach((item) => {
            const key = item.classId;
            if (!map.has(key)) {
                map.set(key, { all: new Set(), labels: new Map() });
            }
            const entry = map.get(key)!;
            const normalized = normalizeSubjectName(item.subject);
            entry.all.add(normalized);
            if (!entry.labels.has(normalized)) {
                entry.labels.set(normalized, item.subject);
            }
        });
        return map;
    }, [professionalSubjects, normalizeSubjectName]);


    // ===========================================
    // Lista de Disciplinas Disponíveis
    // ===========================================

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
            const targetCalendarYear = Number(filters.calendarYear);
            const classByIdFromPool = new Map(classes.map((cls) => [cls.id, cls]));

            pool = pool.filter((grade) => {
                const cls = classByIdFromPool.get(grade.classId);
                if (!cls) return false;
                const startYear = getStartCalendarYear(cls);
                if (!startYear) return false;

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

        getAllSubjects().forEach((subject) => {
            const key = normalizeSubjectName(subject);
            if (!subjectLabelMap.has(key)) {
                subjectLabelMap.set(key, subject);
            }
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
        getStartCalendarYear,
        normalizeSubjectName,
    ]);


    // ===========================================
    // Lógica de "Auto Indicators"
    // ===========================================

    const [autoIndicators, setAutoIndicators] = useState<AutoIndicators>({});

    const computeEligibleClassIdsForSubjects = useCallback((nextFilters: AnalyticsFilters) => {
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
        const matchesSubjectSet = (
            subjects: Set<string> | undefined,
            labels?: Map<string, string>,
        ) => {
            if (!subjects) return false;
            for (const key of subjects) {
                if (subjectSet.has(key)) return true;
                const label = labels?.get(key) ?? key;
                if (matchesSelectedSubject(label)) return true;
            }
            return false;
        };

        scopedClasses.forEach((cls) => {
            const mapped = professionalSubjectsByClassId.get(cls.id);
            const templateEntry = templateSubjectsByClassId.get(cls.id);
            const templateSubjects =
                nextFilters.schoolYear === 'all'
                    ? templateEntry?.all
                    : templateEntry?.byYear.get(Number(nextFilters.schoolYear));
            if (
                matchesSubjectSet(mapped?.all, mapped?.labels) ||
                matchesSubjectSet(templateSubjects, templateEntry?.labels)
            ) {
                eligibleFromMapping.add(cls.id);
            }
        });

        const hasBaseSubject = getAllSubjects().some((subject) =>
            matchesSelectedSubject(subject),
        );
        if (hasBaseSubject) {
            scopedClasses.forEach((cls) => eligibleFromMapping.add(cls.id));
        }

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
            const targetCalendarYear = Number(nextFilters.calendarYear);
            pool = pool.filter((grade) => {
                const cls = classById.get(grade.classId);
                if (!cls) return false;
                const startYear = getStartCalendarYear(cls);
                if (!startYear) return false;
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
    }, [
        classes,
        grades,
        professionalSubjectsByClassId,
        templateSubjectsByClassId,
        filterClassesBySeries,
        getStartCalendarYear,
        normalizeSubjectName,
        normalizeSubjectTokens,
    ]);

    const subjectEligibleClassIds = useMemo(() => {
        const eligible = computeEligibleClassIdsForSubjects(filters);
        if (!eligible || eligible.size === 0) return [];
        return Array.from(eligible);
    }, [filters, computeEligibleClassIdsForSubjects]);

    const getCalendarYearsForSchoolYear = useCallback((list: Class[], schoolYear: 1 | 2 | 3) => {
        const years = new Set<number>();
        list.forEach((cls) => {
            const startYear = getStartCalendarYear(cls);
            if (!startYear) return;
            years.add(startYear + (schoolYear - 1));
        });
        return Array.from(years).sort((a, b) => a - b);
    }, [getStartCalendarYear]);

    // Função central de normalização de filtros (reduz estado impossível)
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

        // =====================================================================
        // 1. AUTO-CORRECÃO DE CONTEXTO (Prioridade: Turma > Ano)
        // Se o usuário selecionou uma turma específica, garantimos que o contexto
        // temporal (Ano Letivo/Calendário) seja compatível com ela ANTES de validar.
        // =====================================================================
        if (next.classIds.length === 1) {
            // Buscamos a turma na lista completa (sem restrições de filtro ainda)
            const targetClass = classes.find(c => c.id === next.classIds[0]);

            if (targetClass) {
                const startYear = getStartCalendarYear(targetClass);
                const classSchoolYear =
                    targetClass.currentYear && [1, 2, 3].includes(targetClass.currentYear)
                        ? (targetClass.currentYear as 1 | 2 | 3)
                        : undefined;

                if (classSchoolYear) {
                    const isSchoolYearSet = next.schoolYear !== 'all';
                    const isCalendarYearSet = next.calendarYear !== 'all';

                    const isYearIncompatible = isSchoolYearSet && next.schoolYear !== classSchoolYear;

                    let isCalendarIncompatible = false;
                    if (startYear && isCalendarYearSet) {
                        const calYear = Number(next.calendarYear);
                        if (calYear < startYear || calYear > startYear + 2) {
                            isCalendarIncompatible = true;
                        }
                    }

                    // Se houve alteração explícita de turma (patch) E o contexto atual é incompatível
                    // Forçamos o ajuste do contexto para mostrar a turma.
                    // Se não houve patch (apenas re-render), mantemos a lógica de correção apenas para evitar estado inválido.
                    if (isYearIncompatible || isCalendarIncompatible) {
                        next.schoolYear = classSchoolYear;

                        if (startYear) {
                            const targetCalendar = startYear + (classSchoolYear - 1);
                            if (next.calendarYear !== 'all' || isCalendarIncompatible) {
                                next.calendarYear = targetCalendar;
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // 2. VALIDAÇÃO DE ESCOPO
        // Agora que o contexto (anos) está ajustado, filtramos o que é válido.
        // =====================================================================
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

        // Detect Subject Conflict when changing Classes
        const classIdsChanged = 'classIds' in patch;
        let eligibleClassIds = computeEligibleClassIdsForSubjects(next);

        if (classIdsChanged && eligibleClassIds && eligibleClassIds.size > 0 && next.classIds.length > 0) {
            const incompatibleClasses = next.classIds.filter(id => !eligibleClassIds!.has(id));
            if (incompatibleClasses.length > 0) {
                // User selected a class incompatible with current subjects.
                // Priority: User Selection (Class) > Old State (Subjects).
                next.subjects = [];
                // Re-evaluate eligibility (empty subjects -> null/all allowed)
                eligibleClassIds = computeEligibleClassIdsForSubjects(next);
            }
        }

        if (eligibleClassIds && eligibleClassIds.size > 0) {
            if (next.classIds.length > 0) {
                next.classIds = next.classIds.filter((id) => eligibleClassIds.has(id));
            } else if ((next.subjects ?? []).length > 0) {
                next.classIds = Array.from(eligibleClassIds).sort();
            }
            next.comparisonClassIds = next.comparisonClassIds.filter((id) =>
                eligibleClassIds.has(id),
            );
        } else if ((next.subjects ?? []).length > 0) {
            if (!classIdsChanged) {
                next.classIds = [];
                next.comparisonClassIds = [];
            }
        }

        if ('useQuarterRange' in patch && next.useQuarterRange) {
            next.quarter = 'all';
        }
        if ('quarter' in patch && patch.quarter !== 'all') {
            next.useQuarterRange = false;
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
            if (allowedYears.length > 0 && !allowedYears.includes(Number(next.calendarYear))) {
                next.calendarYear = allowedYears[0];
            }
        }

        return next;
    }, [
        classes,
        computeEligibleClassIdsForSubjects,
        filterClassesBySeries,
        getCalendarYearsForSchoolYear,
        getStartCalendarYear,
        normalizeList,
    ]);

    const filtersEqual = useCallback((a: AnalyticsFilters, b: AnalyticsFilters) => {
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
    }, []);

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
        [filters, normalizeFilters, setAnalyticsFilters, filtersEqual],
    );

    return {
        classIdsForFetch,
        grades,
        subjectClassIds,
        availableSubjects,
        subjectEligibleClassIds,
        normalizeFilters,
        filtersEqual,
        autoIndicators,
        applyFilters,
    };
}
