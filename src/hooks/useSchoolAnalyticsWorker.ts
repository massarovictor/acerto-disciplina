import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalyticsFilters,
  SchoolAnalyticsResult,
} from "@/hooks/useSchoolAnalytics";
import { EMPTY_ANALYTICS_RESULT } from "@/hooks/useSchoolAnalytics";
import {
  buildAnalyticsCacheKey,
  buildAnalyticsDataSignature,
  getCachedAnalytics,
  setCachedAnalytics,
} from "@/lib/analyticsCache";
import type {
  AttendanceRecord,
  Class,
  Grade,
  Incident,
  Student,
} from "@/types";

type WorkerDataPayload = {
  type: "setData";
  students: Student[];
  classes: Class[];
  grades: Grade[];
  attendance: AttendanceRecord[];
  incidents: Incident[];
};

type WorkerFiltersPayload = {
  type: "setFilters";
  requestId: number;
  filters: AnalyticsFilters;
};

type WorkerResponse = {
  requestId: number;
  result: SchoolAnalyticsResult;
};

export function useSchoolAnalyticsWorker(
  students: Student[],
  classes: Class[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[],
  filters: AnalyticsFilters,
) {
  const [analytics, setAnalytics] = useState<SchoolAnalyticsResult>(
    EMPTY_ANALYTICS_RESULT,
  );
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const requestCacheKeyRef = useRef(new Map<number, string>());
  const lastAppliedKeyRef = useRef("");
  const lastRequestKeyRef = useRef("");
  const lastDataSignatureRef = useRef("");
  const skipNextFiltersComputeRef = useRef(false);
  const filtersRef = useRef(filters);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/schoolAnalytics.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== requestIdRef.current) return;
      setAnalytics(event.data.result);
      setLoading(false);
      const cachedKey = requestCacheKeyRef.current.get(event.data.requestId);
      if (cachedKey) {
        lastAppliedKeyRef.current = cachedKey;
        requestCacheKeyRef.current.delete(event.data.requestId);
        void setCachedAnalytics(cachedKey, event.data.result);
      }
    };

    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;
      requestCacheKeyRef.current.clear();
    };
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const hasData =
    students.length > 0 ||
    classes.length > 0 ||
    grades.length > 0 ||
    attendance.length > 0 ||
    incidents.length > 0;

  const dataSignature = useMemo(() => {
    if (!hasData) return "";
    return buildAnalyticsDataSignature(
      students,
      classes,
      grades,
      attendance,
      incidents,
    );
  }, [students, classes, grades, attendance, incidents, hasData]);

  const cacheKey = useMemo(() => {
    if (!dataSignature) return "";
    return buildAnalyticsCacheKey(dataSignature, filters);
  }, [dataSignature, filters]);

  const requestCompute = (currentFilters: AnalyticsFilters) => {
    if (!workerRef.current || !dataSignature) return;
    const currentCacheKey = buildAnalyticsCacheKey(
      dataSignature,
      currentFilters,
    );
    if (!currentCacheKey) return;
    if (currentCacheKey === lastAppliedKeyRef.current) {
      setLoading(false);
      return;
    }
    if (currentCacheKey === lastRequestKeyRef.current) return;
    lastRequestKeyRef.current = currentCacheKey;
    requestIdRef.current += 1;
    setLoading(true);
    requestCacheKeyRef.current.set(requestIdRef.current, currentCacheKey);
    const payload: WorkerFiltersPayload = {
      type: "setFilters",
      requestId: requestIdRef.current,
      filters: currentFilters,
    };
    workerRef.current.postMessage(payload);
  };

  useEffect(() => {
    let cancelled = false;
    if (!cacheKey) return;
    getCachedAnalytics(cacheKey).then((cached) => {
      if (!cancelled && cached) {
        setAnalytics(cached);
        lastAppliedKeyRef.current = cacheKey;
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  useEffect(() => {
    if (!workerRef.current) return;
    if (!hasData) {
      setAnalytics(EMPTY_ANALYTICS_RESULT);
      setLoading(false);
      lastDataSignatureRef.current = "";
      lastAppliedKeyRef.current = "";
      lastRequestKeyRef.current = "";
      return;
    }
    if (!dataSignature || dataSignature === lastDataSignatureRef.current) {
      return;
    }
    lastDataSignatureRef.current = dataSignature;
    const payload: WorkerDataPayload = {
      type: "setData",
      students,
      classes,
      grades,
      attendance,
      incidents,
    };
    workerRef.current.postMessage(payload);
    requestCompute(filtersRef.current);
    skipNextFiltersComputeRef.current = true;
  }, [dataSignature, hasData, students, classes, grades, attendance, incidents]);

  useEffect(() => {
    if (!workerRef.current || !hasData) return;
    if (skipNextFiltersComputeRef.current) {
      skipNextFiltersComputeRef.current = false;
      return;
    }
    requestCompute(filters);
  }, [filters, hasData]);

  return { analytics, loading };
}
