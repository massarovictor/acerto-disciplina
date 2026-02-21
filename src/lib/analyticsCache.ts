import type { AnalyticsFilters, SchoolAnalyticsResult } from "@/hooks/useSchoolAnalytics";
import type { AttendanceRecord, Class, Grade, Incident, Student } from "@/types";

type CacheEntry = {
  key: string;
  createdAt: number;
  result: SchoolAnalyticsResult;
};

const DB_NAME = "analytics-cache";
const STORE_NAME = "analytics_results";
const DB_VERSION = 1;
const CACHE_VERSION = "3";
const MAX_ENTRIES = 50;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

const openDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

export const getCachedAnalytics = async (
  key: string,
): Promise<SchoolAnalyticsResult | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      const entry = request.result as CacheEntry | undefined;
      if (!entry) {
        resolve(null);
        return;
      }
      const isExpired = Date.now() - entry.createdAt > MAX_AGE_MS;
      if (isExpired) {
        void deleteCachedAnalytics(key);
        resolve(null);
        return;
      }
      if (!entry.result || !(entry.result as SchoolAnalyticsResult).context) {
        void deleteCachedAnalytics(key);
        resolve(null);
        return;
      }
      resolve(entry.result);
    };
    request.onerror = () => resolve(null);
  });
};

export const deleteCachedAnalytics = async (key: string): Promise<void> => {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

const pruneCache = async (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = (request.result as CacheEntry[]) ?? [];
      const now = Date.now();
      const validEntries: CacheEntry[] = [];

      entries.forEach((entry) => {
        if (now - entry.createdAt > MAX_AGE_MS) {
          store.delete(entry.key);
        } else {
          validEntries.push(entry);
        }
      });

      if (validEntries.length > MAX_ENTRIES) {
        validEntries.sort((a, b) => a.createdAt - b.createdAt);
        const overflow = validEntries.length - MAX_ENTRIES;
        for (let i = 0; i < overflow; i += 1) {
          store.delete(validEntries[i].key);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

export const setCachedAnalytics = async (
  key: string,
  result: SchoolAnalyticsResult,
): Promise<void> => {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, result, createdAt: Date.now() } satisfies CacheEntry);
    tx.oncomplete = () => {
      void pruneCache(db).finally(() => resolve());
    };
    tx.onerror = () => resolve();
  });
};

const normalizeArray = (values: string[]) => [...values].sort().join("|");

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

const maxTimestamp = <T,>(items: T[], getValue: (item: T) => string | undefined) => {
  let maxValue = "";
  items.forEach((item) => {
    const value = getValue(item);
    if (value && value > maxValue) {
      maxValue = value;
    }
  });
  return maxValue;
};

export const buildAnalyticsDataSignature = (
  students: Student[],
  classes: Class[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[],
) => {
  const classFingerprint = classes
    .map((cls) =>
      [
        cls.id,
        cls.archived ? "1" : "0",
        cls.series,
        cls.startCalendarYear ?? "",
        cls.endCalendarYear ?? "",
        cls.startYearDate ?? "",
        cls.currentYear ?? "",
      ].join(":"),
    )
    .sort()
    .join("|");
  const studentFingerprint = students
    .map((student) =>
      [
        student.id,
        student.classId,
        student.status,
        student.updatedAt ?? student.createdAt ?? "",
      ].join(":"),
    )
    .sort()
    .join("|");

  const gradesMax = maxTimestamp(grades, (grade) => grade.recordedAt);
  const attendanceMax = maxTimestamp(attendance, (record) => record.recordedAt);
  const incidentMax = maxTimestamp(
    incidents,
    (incident) => incident.updatedAt ?? incident.createdAt ?? incident.date,
  );

  return [
    `c:${classes.length}:${hashString(classFingerprint)}`,
    `s:${students.length}:${hashString(studentFingerprint)}`,
    `g:${grades.length}:${gradesMax}`,
    `a:${attendance.length}:${attendanceMax}`,
    `i:${incidents.length}:${incidentMax}`,
  ].join("::");
};

export const buildAnalyticsCacheKey = (
  dataSignature: string,
  filters: AnalyticsFilters,
) =>
  [
    "analytics",
    CACHE_VERSION,
    dataSignature,
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
