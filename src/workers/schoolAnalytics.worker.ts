/// <reference lib="webworker" />

import { computeSchoolAnalytics } from "@/hooks/useSchoolAnalytics";
import type {
  AnalyticsFilters,
  SchoolAnalyticsResult,
} from "@/hooks/useSchoolAnalytics";
import { QUARTERS } from "@/lib/subjects";
import type {
  AttendanceRecord,
  Class,
  Grade,
  Incident,
  Student,
} from "@/types";

type AnalyticsDataPayload = {
  type: "setData";
  students: Student[];
  classes: Class[];
  grades: Grade[];
  attendance: AttendanceRecord[];
  incidents: Incident[];
};

type AnalyticsFiltersPayload = {
  type: "setFilters";
  requestId: number;
  filters: AnalyticsFilters;
};

type AnalyticsWorkerResponse = {
  requestId: number;
  result: SchoolAnalyticsResult;
};

let cachedStudents: Student[] = [];
let cachedClasses: Class[] = [];
let cachedGrades: Grade[] = [];
let cachedAttendance: AttendanceRecord[] = [];
let cachedIncidents: Incident[] = [];
let cachedFilters: AnalyticsFilters | null = null;
let dataVersion = 0;
const analyticsCache = new Map<string, SchoolAnalyticsResult>();
let precomputeToken = 0;

const normalizeArray = (values: string[]) => [...values].sort().join("|");
const getCacheKey = (filters: AnalyticsFilters) =>
  [
    dataVersion,
    normalizeArray(filters.series),
    normalizeArray(filters.classIds),
    normalizeArray(filters.subjects ?? []),
    normalizeArray(filters.comparisonClassIds),
    filters.comparisonMode ?? "calendar",
    filters.comparisonCourseYear ?? "",
    filters.quarter,
    filters.useQuarterRange ? "range" : "single",
    filters.quarterRangeStart ?? "",
    filters.quarterRangeEnd ?? "",
    filters.schoolYear,
    filters.calendarYear,
    filters.includeArchived ? "1" : "0",
  ].join("::");
const schedulePrecompute = (filters: AnalyticsFilters) => {
  precomputeToken += 1;
  const currentToken = precomputeToken;
  const quarterOptions = ["all", ...QUARTERS];
  const schoolYearOptions: AnalyticsFilters["schoolYear"][] = ["all", 1, 2, 3];
  const queue: AnalyticsFilters[] = [];

  schoolYearOptions.forEach((schoolYear) => {
    quarterOptions.forEach((quarter) => {
      const candidate = { ...filters, schoolYear, quarter };
      const key = getCacheKey(candidate);
      if (!analyticsCache.has(key)) {
        queue.push(candidate);
      }
    });
  });

  const runNext = () => {
    if (currentToken !== precomputeToken) return;
    if (queue.length === 0) return;
    const nextFilters = queue.shift()!;
    const cacheKey = getCacheKey(nextFilters);
    if (!analyticsCache.has(cacheKey)) {
      const result = computeSchoolAnalytics(
        cachedStudents,
        cachedClasses,
        cachedGrades,
        cachedAttendance,
        cachedIncidents,
        nextFilters,
      );
      analyticsCache.set(cacheKey, result);
    }
    setTimeout(runNext, 0);
  };

  runNext();
};

self.addEventListener(
  "message",
  (event: MessageEvent<AnalyticsDataPayload | AnalyticsFiltersPayload>) => {
    const payload = event.data;
    if (payload.type === "setData") {
      cachedStudents = payload.students;
      cachedClasses = payload.classes;
      cachedGrades = payload.grades;
      cachedAttendance = payload.attendance;
      cachedIncidents = payload.incidents;
      dataVersion += 1;
      analyticsCache.clear();
      precomputeToken += 1;
      return;
    }

    cachedFilters = payload.filters;
    const cacheKey = getCacheKey(payload.filters);
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      const response: AnalyticsWorkerResponse = {
        requestId: payload.requestId,
        result: cachedResult,
      };
      self.postMessage(response);
      return;
    }
    const result = computeSchoolAnalytics(
      cachedStudents,
      cachedClasses,
      cachedGrades,
      cachedAttendance,
      cachedIncidents,
      cachedFilters,
    );
    analyticsCache.set(cacheKey, result);
    schedulePrecompute(payload.filters);
    const response: AnalyticsWorkerResponse = {
      requestId: payload.requestId,
      result,
    };
    self.postMessage(response);
  },
);
