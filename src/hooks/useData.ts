import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDataStore } from "@/stores/useDataStore";
import {
  AttendanceRecord,
  Class,
  Comment,
  FollowUpRecord,
  Grade,
  Incident,
  ProfessionalSubjectTemplate,
  Student,
  User,
  HistoricalGrade,
  ExternalAssessment,
} from "@/types";
import {
  mapAttendanceFromDb,
  mapAttendanceToDb,
  mapClassFromDb,
  mapClassToDb,
  mapCommentFromDb,
  mapCommentToDb,
  mapFollowUpFromDb,
  mapFollowUpToDb,
  mapGradeFromDb,
  mapGradeToDb,
  mapIncidentFromDb,
  mapIncidentToDb,
  mapProfileFromDb,
  mapProfessionalSubjectFromDb,
  mapProfessionalSubjectToDb,
  mapStudentFromDb,
  mapStudentToDb,
  mapTemplateFromDb,
  mapTemplateToDb,
} from "@/services/supabase/mappers";
import { perfTimer } from "@/lib/perf";

const logError = (scope: string, error: unknown) => {
  console.error(`[Supabase:${scope}]`, error);
};

export function useProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<User[]>([]);

  const fetchProfiles = useCallback(async (force = false) => {
    if (!user?.id) {
      setProfiles([]);
      return;
    }

    const cacheKey = user.id;
    const cached = profilesCache.get(cacheKey);
    if (cached && !force) {
      setProfiles(cached);
      return;
    }

    const inflight = profilesInFlight.get(cacheKey);
    if (inflight) {
      await inflight;
      setProfiles(profilesCache.get(cacheKey) ?? []);
      return;
    }

    const fetchPromise = (async () => {
      const done = perfTimer("profiles.fetch");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id);

      if (error) {
        done({ ok: false });
        logError("profiles.select", error);
        return;
      }

      const mapped = (data || []).map(mapProfileFromDb);
      done({ ok: true, rows: data?.length ?? 0 });
      profilesCache.set(cacheKey, mapped);
      setProfiles(mapped);
    })();

    profilesInFlight.set(cacheKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      profilesInFlight.delete(cacheKey);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:profiles:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          fetchProfiles(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchProfiles]);

  return { profiles, refreshProfiles: () => fetchProfiles(true) };
}

export function useAuthorizedEmails() {
  const { user } = useAuth();
  const [authorizedEmails, setAuthorizedEmails] = useState<
    { email: string; role: string }[]
  >([]);

  const fetchAuthorizedEmails = useCallback(async (force = false) => {
    if (!user?.id) return;

    const cacheKey = user.id;
    const cached = authorizedEmailsCache.get(cacheKey);
    if (cached && !force) {
      setAuthorizedEmails(cached);
      return;
    }

    const inflight = authorizedEmailsInFlight.get(cacheKey);
    if (inflight) {
      await inflight;
      setAuthorizedEmails(authorizedEmailsCache.get(cacheKey) ?? []);
      return;
    }

    const fetchPromise = (async () => {
      const done = perfTimer("authorized_emails.fetch");
      const { data, error } = await supabase
        .from("authorized_emails")
        .select("email, role")
        .order("email");

      if (error) {
        done({ ok: false });
        logError("authorized_emails.select", error);
        return;
      }

      const rows = data ?? [];
      done({ ok: true, rows: rows.length });
      authorizedEmailsCache.set(cacheKey, rows);
      setAuthorizedEmails(rows);
    })();

    authorizedEmailsInFlight.set(cacheKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      authorizedEmailsInFlight.delete(cacheKey);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAuthorizedEmails();
  }, [fetchAuthorizedEmails]);

  return { authorizedEmails, refreshAuthorizedEmails: () => fetchAuthorizedEmails(true) };
}

export function useClasses() {
  const { user } = useAuth();
  const classes = useDataStore((state) => state.classes);
  const setClasses = useDataStore((state) => state.setClasses);
  const addClassToStore = useDataStore((state) => state.addClass);
  const updateClassInStore = useDataStore((state) => state.updateClass);
  const deleteClassFromStore = useDataStore((state) => state.deleteClass);
  const classesLoaded = useDataStore((state) => state.classesLoaded);
  const classesFetching = useDataStore((state) => state.classesFetching);
  const setClassesLoaded = useDataStore((state) => state.setClassesLoaded);
  const setClassesFetching = useDataStore((state) => state.setClassesFetching);

  const fetchClasses = useCallback(async (force = false) => {
    if (!user?.id) {
      setClasses([]);
      setClassesLoaded(false);
      return;
    }
    if (classesFetching) return;
    if (!force && classesLoaded) return;

    setClassesFetching(true);
    const done = perfTimer("classes.fetch");
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      done({ ok: false });
      logError("classes.select", error);
      setClassesFetching(false);
      return;
    }

    done({ ok: true, rows: data?.length ?? 0 });
    setClasses((data || []).map(mapClassFromDb));
    setClassesLoaded(true);
    setClassesFetching(false);
  }, [
    user?.id,
    classesLoaded,
    classesFetching,
    setClasses,
    setClassesLoaded,
    setClassesFetching,
  ]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:classes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        () => {
          fetchClasses();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchClasses]);

  const addClass = async (classData: Omit<Class, "id">) => {
    if (!user?.id) return null;

    const payload = mapClassToDb(classData, user.id);

    const { data, error } = await supabase
      .from("classes")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      logError("classes.insert", error);
      throw error;
    }

    const newClass = mapClassFromDb(data);
    addClassToStore(newClass);
    return newClass;
  };

  const updateClass = async (id: string, updates: Partial<Class>) => {
    if (!user?.id) return;
    const base = classes.find((c) => c.id === id);
    if (!base) return;

    const hasArchivedAt = Object.prototype.hasOwnProperty.call(
      updates,
      "archivedAt",
    );
    const hasArchivedReason = Object.prototype.hasOwnProperty.call(
      updates,
      "archivedReason",
    );
    const hasTemplateId = Object.prototype.hasOwnProperty.call(
      updates,
      "templateId",
    );
    const hasName = Object.prototype.hasOwnProperty.call(updates, "name");

    const nextCourse = updates.course ?? base.course;
    const nextStartYear = updates.startYear ?? base.startYear;
    const nextStartYearDate = updates.startYearDate ?? base.startYearDate;
    const nextStartCalendarYear =
      updates.startCalendarYear ?? base.startCalendarYear;
    const nextEndCalendarYear = updates.endCalendarYear ?? base.endCalendarYear;
    const nextLetter = updates.letter ?? base.letter;
    const nextTemplateId = hasTemplateId
      ? (updates.templateId ?? null)
      : base.templateId;

    const payload = mapClassToDb(
      {
        name: updates.name ?? base.name,
        series: updates.series ?? base.series,
        letter: updates.letter ?? base.letter,
        course: nextCourse,
        directorId: updates.directorId ?? base.directorId,
        directorEmail: updates.directorEmail ?? base.directorEmail,
        active: updates.active ?? base.active,
        startYear: nextStartYear,
        currentYear: updates.currentYear ?? base.currentYear,
        startYearDate: nextStartYearDate,
        startCalendarYear: nextStartCalendarYear,
        endCalendarYear: nextEndCalendarYear,
        archived: updates.archived ?? base.archived,
        archivedAt: hasArchivedAt
          ? (updates.archivedAt ?? null)
          : (base.archivedAt ?? null),
        archivedReason: hasArchivedReason
          ? (updates.archivedReason ?? null)
          : (base.archivedReason ?? null),
        templateId: nextTemplateId,
      },
      user.id,
      { omitName: !hasName },
    );

    const { data, error } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      logError("classes.update", error);
      throw error;
    }

    if (data) {
      const updatedClass = mapClassFromDb(data);
      updateClassInStore(id, updatedClass);
    }
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      logError("classes.delete", error);
      throw error;
    }
    deleteClassFromStore(id);
  };

  const archiveClass = async (id: string, reason?: string) => {
    await updateClass(id, {
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedReason: reason || "Arquivamento manual",
      active: false,
    });
  };

  const unarchiveClass = async (id: string) => {
    await updateClass(id, {
      archived: false,
      archivedAt: null,
      archivedReason: null,
      active: true,
    });
  };

  return {
    classes,
    refreshClasses: () => fetchClasses(true),
    addClass,
    updateClass,
    deleteClass,
    archiveClass,
    unarchiveClass,
  };
}

export function useStudents() {
  const { user } = useAuth();
  const students = useDataStore((state) => state.students);
  const setStudents = useDataStore((state) => state.setStudents);
  const addStudentToStore = useDataStore((state) => state.addStudent);
  const updateStudentInStore = useDataStore((state) => state.updateStudent);
  const deleteStudentFromStore = useDataStore((state) => state.deleteStudent);
  const studentsLoaded = useDataStore((state) => state.studentsLoaded);
  const studentsFetching = useDataStore((state) => state.studentsFetching);
  const setStudentsLoaded = useDataStore((state) => state.setStudentsLoaded);
  const setStudentsFetching = useDataStore((state) => state.setStudentsFetching);

  const fetchStudents = useCallback(async (force = false) => {
    if (!user?.id) {
      setStudents([]);
      setStudentsLoaded(false);
      return;
    }
    if (studentsFetching) return;
    if (!force && studentsLoaded) return;

    setStudentsFetching(true);
    const done = perfTimer("students.fetch");
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      done({ ok: false });
      logError("students.select", error);
      setStudentsFetching(false);
      return;
    }

    done({ ok: true, rows: data?.length ?? 0 });
    setStudents((data || []).map(mapStudentFromDb));
    setStudentsLoaded(true);
    setStudentsFetching(false);
  }, [
    user?.id,
    studentsLoaded,
    studentsFetching,
    setStudents,
    setStudentsLoaded,
    setStudentsFetching,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:students")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchStudents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchStudents]);

  const addStudent = async (student: Omit<Student, "id">) => {
    if (!user?.id) return null;
    const payload = mapStudentToDb(student, user.id);
    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      logError("students.insert", error);
      throw error;
    }

    const newStudent = mapStudentFromDb(data);
    addStudentToStore(newStudent);
    return newStudent;
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    if (!user?.id) return;
    const base = students.find((s) => s.id === id);
    if (!base) return;

    const payload = mapStudentToDb(
      {
        name: updates.name ?? base.name,
        classId: updates.classId ?? base.classId,
        birthDate: updates.birthDate ?? base.birthDate,
        gender: updates.gender ?? base.gender,
        enrollment: updates.enrollment ?? base.enrollment,
        censusId: updates.censusId ?? base.censusId,
        cpf: updates.cpf ?? base.cpf,
        rg: updates.rg ?? base.rg,
        photoUrl: updates.photoUrl ?? base.photoUrl,
        status: updates.status ?? base.status,
      },
      user.id,
    );

    const { error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id);
    if (error) {
      logError("students.update", error);
      throw error;
    }

    updateStudentInStore(id, updates);
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      logError("students.delete", error);
      throw error;
    }
    deleteStudentFromStore(id);
  };

  return {
    students,
    refreshStudents: () => fetchStudents(true),
    addStudent,
    updateStudent,
    deleteStudent,
    addStudents: async (studentsData: Omit<Student, "id">[]) => {
      if (!user?.id || studentsData.length === 0) return;
      const payload = studentsData.map(s => mapStudentToDb(s, user.id));

      const { data, error } = await supabase
        .from("students")
        .insert(payload)
        .select("*");

      if (error) {
        logError("students.bulk_insert", error);
        throw error;
      }

      if (data) {
        const newStudents = data.map(mapStudentFromDb);
        // Atualizar store local em lote
        const currentStudents = useDataStore.getState().students;
        setStudents([...newStudents, ...currentStudents]);
      }
    },
  };
}

export function useGrades() {
  const { user } = useAuth();
  const grades = useDataStore((state) => state.grades);
  const setGrades = useDataStore((state) => state.setGrades);
  const addGradeToStore = useDataStore((state) => state.addGrade);
  const updateGradeInStore = useDataStore((state) => state.updateGrade);
  const deleteGradeFromStore = useDataStore((state) => state.deleteGrade);
  const gradesLoaded = useDataStore((state) => state.gradesLoaded);
  const gradesFetching = useDataStore((state) => state.gradesFetching);
  const setGradesLoaded = useDataStore((state) => state.setGradesLoaded);
  const setGradesFetching = useDataStore((state) => state.setGradesFetching);

  const fetchGrades = useCallback(async (force = false) => {
    if (!user?.id) {
      setGrades([]);
      setGradesLoaded(false);
      return;
    }
    if (gradesFetching) return;
    if (!force && gradesLoaded) return;

    setGradesFetching(true);
    const done = perfTimer("grades.fetch");
    // Supabase has a server-side limit of 1000 rows per query.
    // We use pagination to get all grades.
    const PAGE_SIZE = 1000;
    let allGrades: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .order("recorded_at", { ascending: false })
        .range(from, to);

      if (error) {
        done({ ok: false, rows: allGrades.length, pages: page });
        logError("grades.select", error);
        setGradesFetching(false);
        return;
      }

      if (data && data.length > 0) {
        allGrades = [...allGrades, ...data];
        page++;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    done({ ok: true, rows: allGrades.length, pages: page, pageSize: PAGE_SIZE });
    setGrades(allGrades.map(mapGradeFromDb));
    setGradesLoaded(true);
    setGradesFetching(false);
  }, [
    user?.id,
    gradesLoaded,
    gradesFetching,
    setGrades,
    setGradesLoaded,
    setGradesFetching,
  ]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    if (!user?.id) return;

    const {
      setGrades,
      addGrade: addGradeToStore,
      deleteGrade: deleteGradeToStore
    } = useDataStore.getState();

    const channel = supabase
      .channel("realtime:grades")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grades" },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const saved = mapGradeFromDb(payload.new as any);
            addGradeToStore(saved);
          } else if (payload.eventType === 'DELETE') {
            deleteGradeToStore(payload.old.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchGrades]);

  const addGrade = async (grade: Omit<Grade, "id" | "recordedAt">) => {
    if (!user?.id) return;

    const payload = mapGradeToDb(grade, user.id);
    const { data, error } = await supabase
      .from("grades")
      .upsert(payload, {
        onConflict: "student_id,class_id,subject,quarter,school_year",
      })
      .select("*")
      .single();

    if (error) {
      logError("grades.upsert", error);
      throw error;
    }

    const saved = mapGradeFromDb(data);
    addGradeToStore(saved);
  };

  const addGrades = async (gradesData: Omit<Grade, "id" | "recordedAt">[]) => {
    if (!user?.id || gradesData.length === 0) return;

    const payload = gradesData.map(g => mapGradeToDb(g, user.id));

    // Supabase allows bulk upsert
    const { data, error } = await supabase
      .from("grades")
      .upsert(payload, {
        onConflict: "student_id,class_id,subject,quarter,school_year",
      })
      .select("*");

    if (error) {
      logError("grades.bulk_upsert", error);
      throw error;
    }

    if (data) {
      const savedGrades = data.map(mapGradeFromDb);
      const nextGrades = [...useDataStore.getState().grades];
      savedGrades.forEach((saved) => {
        const index = nextGrades.findIndex((g) => g.id === saved.id);
        if (index >= 0) {
          nextGrades[index] = saved;
        } else {
          nextGrades.unshift(saved);
        }
      });
      setGrades(nextGrades);
    }
  };

  const updateGrade = async (id: string, updates: Partial<Grade>) => {
    if (!user?.id) return;
    const base = grades.find((g) => g.id === id);
    if (!base) return;

    const payload = mapGradeToDb(
      {
        studentId: updates.studentId ?? base.studentId,
        classId: updates.classId ?? base.classId,
        subject: updates.subject ?? base.subject,
        quarter: updates.quarter ?? base.quarter,
        schoolYear: updates.schoolYear ?? base.schoolYear,
        grade: updates.grade ?? base.grade,
        observation: updates.observation ?? base.observation,
      },
      user.id,
    );

    const { error } = await supabase
      .from("grades")
      .update(payload)
      .eq("id", id);
    if (error) {
      logError("grades.update", error);
      throw error;
    }

    updateGradeInStore(id, {
      ...updates,
      recordedAt: new Date().toISOString(),
    });
  };

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) {
      logError("grades.delete", error);
      throw error;
    }
    deleteGradeFromStore(id);
  };

  const deleteGrades = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("grades").delete().in("id", ids);
    if (error) {
      logError("grades.bulk_delete", error);
      throw error;
    }
    const idsSet = new Set(ids);
    const currentGrades = useDataStore.getState().grades;
    setGrades(currentGrades.filter((grade) => !idsSet.has(grade.id)));
  };

  return {
    grades,
    refreshGrades: () => fetchGrades(true),
    addGrade,
    addGrades,
    updateGrade,
    deleteGrade,
    deleteGrades,
  };
}

type GradesScope = {
  classId?: string;
  classIds?: string[];
  studentId?: string;
  quarter?: string;
  schoolYear?: 1 | 2 | 3;
};

type HistoricalGradesScope = {
  studentIds?: string[];
};

const normalizeGradesScope = (scope: GradesScope) => {
  const classIds = scope.classIds?.length
    ? [...scope.classIds]
    : scope.classId
      ? [scope.classId]
      : [];
  classIds.sort();
  return {
    classIds,
    studentId: scope.studentId ?? null,
    quarter: scope.quarter ?? null,
    schoolYear: scope.schoolYear ?? null,
  };
};

const getGradesScopeKey = (scope: ReturnType<typeof normalizeGradesScope>) => {
  return [
    scope.classIds.join("|"),
    scope.studentId ?? "",
    scope.quarter ?? "",
    scope.schoolYear ?? "",
  ].join("::");
};

const analyticsGradesCache = new Map<string, Grade[]>();
const analyticsGradesInFlight = new Map<string, Promise<void>>();
const authorizedEmailsCache = new Map<string, { email: string; role: string }[]>();
const authorizedEmailsInFlight = new Map<string, Promise<void>>();
const profilesCache = new Map<string, User[]>();
const profilesInFlight = new Map<string, Promise<void>>();

const normalizeHistoricalGradesScope = (scope: HistoricalGradesScope) => {
  const studentIds = scope.studentIds?.length ? [...scope.studentIds] : [];
  studentIds.sort();
  return { studentIds };
};

const getHistoricalGradesScopeKey = (
  scope: ReturnType<typeof normalizeHistoricalGradesScope>,
) => {
  return scope.studentIds.join("|");
};

const historicalGradesAnalyticsCache = new Map<string, HistoricalGrade[]>();
const historicalGradesInFlight = new Map<string, Promise<void>>();
const historicalGradesGlobalInFlight = new Map<string, Promise<void>>();
const externalAssessmentsGlobalInFlight = new Map<string, Promise<void>>();
const professionalSubjectsCache = new Map<string, { id: string; classId: string; subject: string }[]>();
const professionalSubjectsInFlight = new Map<string, Promise<void>>();
const professionalSubjectTemplatesCache = new Map<string, ProfessionalSubjectTemplate[]>();
const professionalSubjectTemplatesInFlight = new Map<string, Promise<void>>();
const gradesScopedCache = new Map<string, Grade[]>();
const gradesScopedInFlight = new Map<string, Promise<Grade[]>>();

const gradeMatchesScope = (
  grade: Grade,
  scope: ReturnType<typeof normalizeGradesScope>,
) => {
  if (scope.classIds.length > 0 && !scope.classIds.includes(grade.classId)) {
    return false;
  }
  if (scope.studentId && grade.studentId !== scope.studentId) {
    return false;
  }
  if (scope.quarter && grade.quarter !== scope.quarter) {
    return false;
  }
  if (scope.schoolYear && (grade.schoolYear ?? 1) !== scope.schoolYear) {
    return false;
  }
  return true;
};

export function useGradesScoped(
  scope: GradesScope,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const normalizedScope = useMemo(
    () => normalizeGradesScope(scope),
    [
      scope.classId,
      scope.classIds?.join(","),
      scope.studentId,
      scope.quarter,
      scope.schoolYear,
    ],
  );
  const scopeKey = useMemo(() => getGradesScopeKey(normalizedScope), [normalizedScope]);

  const fetchGrades = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!user?.id) {
      setGrades([]);
      return;
    }

    const hasScope =
      normalizedScope.classIds.length > 0 || Boolean(normalizedScope.studentId);
    if (!hasScope) {
      setGrades([]);
      return;
    }

    const cached = gradesScopedCache.get(scopeKey);
    if (cached) {
      setGrades(cached);
      return;
    }

    const inflight = gradesScopedInFlight.get(scopeKey);
    if (inflight) {
      setLoading(true);
      const result = await inflight;
      setGrades(result);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchPromise = (async () => {
      const done = perfTimer("grades_scoped.fetch");

      const PAGE_SIZE = 1000;
      let allGrades: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("grades")
          .select("*")
          .order("recorded_at", { ascending: false });

        if (normalizedScope.classIds.length === 1) {
          query = query.eq("class_id", normalizedScope.classIds[0]);
        } else if (normalizedScope.classIds.length > 1) {
          query = query.in("class_id", normalizedScope.classIds);
        }
        if (normalizedScope.studentId) {
          query = query.eq("student_id", normalizedScope.studentId);
        }
        if (normalizedScope.quarter) {
          query = query.eq("quarter", normalizedScope.quarter);
        }
        if (normalizedScope.schoolYear) {
          query = query.eq("school_year", normalizedScope.schoolYear);
        }

        const { data, error } = await query.range(from, to);

        if (error) {
          done({ ok: false, rows: allGrades.length, pages: page });
          logError("grades_scoped.select", error);
          return [];
        }

        if (data && data.length > 0) {
          allGrades = [...allGrades, ...data];
          page += 1;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      done({ ok: true, rows: allGrades.length, pages: page, pageSize: PAGE_SIZE });
      const mapped = allGrades.map(mapGradeFromDb);
      gradesScopedCache.set(scopeKey, mapped);
      return mapped;
    })();

    gradesScopedInFlight.set(scopeKey, fetchPromise);
    try {
      const result = await fetchPromise;
      setGrades(result);
    } finally {
      gradesScopedInFlight.delete(scopeKey);
      setLoading(false);
    }
  }, [enabled, user?.id, normalizedScope, scopeKey]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const addGrade = async (grade: Omit<Grade, "id" | "recordedAt">) => {
    if (!user?.id) return;

    const payload = mapGradeToDb(grade, user.id);
    const { data, error } = await supabase
      .from("grades")
      .upsert(payload, {
        onConflict: "student_id,class_id,subject,quarter,school_year",
      })
      .select("*")
      .single();

    if (error) {
      logError("grades_scoped.upsert", error);
      throw error;
    }

    const saved = mapGradeFromDb(data);
    if (!gradeMatchesScope(saved, normalizedScope)) return;

    setGrades((prev) => {
      const existingIndex = prev.findIndex((g) => g.id === saved.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = saved;
        gradesScopedCache.set(scopeKey, updated);
        return updated;
      }
      const next = [saved, ...prev];
      gradesScopedCache.set(scopeKey, next);
      return next;
    });
  };

  const addGrades = async (gradesData: Omit<Grade, "id" | "recordedAt">[]) => {
    if (!user?.id || gradesData.length === 0) return;

    const payload = gradesData.map((g) => mapGradeToDb(g, user.id));
    const { data, error } = await supabase
      .from("grades")
      .upsert(payload, {
        onConflict: "student_id,class_id,subject,quarter,school_year",
      })
      .select("*");

    if (error) {
      logError("grades_scoped.bulk_upsert", error);
      throw error;
    }

    if (data) {
      const savedGrades = data
        .map(mapGradeFromDb)
        .filter((saved) => gradeMatchesScope(saved, normalizedScope));
      if (savedGrades.length === 0) return;

      setGrades((prev) => {
        const next = [...prev];
        savedGrades.forEach((saved) => {
          const index = next.findIndex((g) => g.id === saved.id);
          if (index >= 0) {
            next[index] = saved;
          } else {
            next.unshift(saved);
          }
        });
        gradesScopedCache.set(scopeKey, next);
        return next;
      });
    }
  };

  const updateGrade = async (id: string, updates: Partial<Grade>) => {
    if (!user?.id) return;
    const base = grades.find((g) => g.id === id);
    if (!base) return;

    const payload = mapGradeToDb(
      {
        studentId: updates.studentId ?? base.studentId,
        classId: updates.classId ?? base.classId,
        subject: updates.subject ?? base.subject,
        quarter: updates.quarter ?? base.quarter,
        schoolYear: updates.schoolYear ?? base.schoolYear,
        grade: updates.grade ?? base.grade,
        observation: updates.observation ?? base.observation,
      },
      user.id,
    );

    const { error } = await supabase.from("grades").update(payload).eq("id", id);
    if (error) {
      logError("grades_scoped.update", error);
      throw error;
    }

    setGrades((prev) => {
      const next = prev.map((grade) =>
        grade.id === id
          ? { ...grade, ...updates, recordedAt: new Date().toISOString() }
          : grade,
      );
      gradesScopedCache.set(scopeKey, next);
      return next;
    });
  };

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) {
      logError("grades_scoped.delete", error);
      throw error;
    }
    setGrades((prev) => {
      const next = prev.filter((grade) => grade.id !== id);
      gradesScopedCache.set(scopeKey, next);
      return next;
    });
  };

  const deleteGrades = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("grades").delete().in("id", ids);
    if (error) {
      logError("grades_scoped.bulk_delete", error);
      throw error;
    }
    const idsSet = new Set(ids);
    setGrades((prev) => {
      const next = prev.filter((grade) => !idsSet.has(grade.id));
      gradesScopedCache.set(scopeKey, next);
      return next;
    });
  };

  return {
    grades,
    loading,
    refreshGrades: fetchGrades,
    addGrade,
    addGrades,
    updateGrade,
    deleteGrade,
    deleteGrades,
  };
}

export function useGradesAnalytics(
  scope: GradesScope,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const normalizedScope = useMemo(
    () => normalizeGradesScope(scope),
    [
      scope.classId,
      scope.classIds?.join(","),
      scope.studentId,
      scope.quarter,
      scope.schoolYear,
    ],
  );
  const scopeKey = useMemo(() => getGradesScopeKey(normalizedScope), [normalizedScope]);

  const fetchGradesWithPagination = useCallback(async () => {
    const PAGE_SIZE = 1000;
    let allGrades: any[] = [];
    let page = 0;
    let hasMore = true;
    const done = perfTimer("grades_scoped.fetch");

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("grades")
        .select("*")
        .order("recorded_at", { ascending: false });

      if (normalizedScope.classIds.length === 1) {
        query = query.eq("class_id", normalizedScope.classIds[0]);
      } else if (normalizedScope.classIds.length > 1) {
        query = query.in("class_id", normalizedScope.classIds);
      }
      if (normalizedScope.studentId) {
        query = query.eq("student_id", normalizedScope.studentId);
      }
      if (normalizedScope.quarter) {
        query = query.eq("quarter", normalizedScope.quarter);
      }
      if (normalizedScope.schoolYear) {
        query = query.eq("school_year", normalizedScope.schoolYear);
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        done({ ok: false, rows: allGrades.length, pages: page });
        logError("grades_scoped.select", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        allGrades = [...allGrades, ...data];
        page += 1;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    done({ ok: true, rows: allGrades.length, pages: page, pageSize: PAGE_SIZE });
    setGrades(allGrades.map(mapGradeFromDb));
    setLoading(false);
  }, [normalizedScope]);

  const fetchGrades = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!user?.id) {
      setGrades([]);
      return;
    }

    const hasScope =
      normalizedScope.classIds.length > 0 || Boolean(normalizedScope.studentId);
    if (!hasScope) {
      setGrades([]);
      return;
    }

    const cached = analyticsGradesCache.get(scopeKey);
    if (cached) {
      setGrades(cached);
      return;
    }

    const inflight = analyticsGradesInFlight.get(scopeKey);
    if (inflight) {
      setLoading(true);
      await inflight;
      setGrades(analyticsGradesCache.get(scopeKey) ?? []);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchPromise = (async () => {
      const done = perfTimer("grades_analytics.fetch");
      const { data, error } = await supabase.rpc("fetch_grades_analytics", {
        class_ids: normalizedScope.classIds.length > 0 ? normalizedScope.classIds : null,
        student_id: normalizedScope.studentId,
        quarter: normalizedScope.quarter,
        school_year: normalizedScope.schoolYear,
      });

      if (error) {
        done({ ok: false, fallback: true, scopeKey });
        logError("grades_analytics.rpc", error);
        await fetchGradesWithPagination();
        return;
      }

      const rows = Array.isArray(data) ? data : data ?? [];
      done({ ok: true, rows: rows.length, scopeKey });
      const mapped = rows.map(mapGradeFromDb);
      analyticsGradesCache.set(scopeKey, mapped);
      setGrades(mapped);
    })();

    analyticsGradesInFlight.set(scopeKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      analyticsGradesInFlight.delete(scopeKey);
      setLoading(false);
    }
  }, [enabled, user?.id, normalizedScope, scopeKey, fetchGradesWithPagination]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  return {
    grades,
    loading,
    refreshGrades: fetchGrades,
  };
}

export function useHistoricalGradesAnalytics(scope: HistoricalGradesScope) {
  const { user } = useAuth();
  const [historicalGrades, setHistoricalGrades] = useState<HistoricalGrade[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedScope = useMemo(
    () => normalizeHistoricalGradesScope(scope),
    [scope.studentIds?.join(",")],
  );
  const scopeKey = useMemo(
    () => getHistoricalGradesScopeKey(normalizedScope),
    [normalizedScope],
  );

  const fetchHistoricalGrades = useCallback(async () => {
    if (!user?.id) {
      setHistoricalGrades([]);
      return;
    }

    if (normalizedScope.studentIds.length === 0) {
      setHistoricalGrades([]);
      return;
    }

    const cached = historicalGradesAnalyticsCache.get(scopeKey);
    if (cached) {
      setHistoricalGrades(cached);
      return;
    }

    const inflight = historicalGradesInFlight.get(scopeKey);
    if (inflight) {
      setLoading(true);
      await inflight;
      setHistoricalGrades(historicalGradesAnalyticsCache.get(scopeKey) ?? []);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchPromise = (async () => {
      const CHUNK_SIZE = 800;
      const PAGE_SIZE = 1000;
      let allRows: any[] = [];
      const done = perfTimer("historical_grades_analytics.fetch");

      for (let i = 0; i < normalizedScope.studentIds.length; i += CHUNK_SIZE) {
        const chunk = normalizedScope.studentIds.slice(i, i + CHUNK_SIZE);
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await supabase
            .from("historical_grades")
            .select("*")
            .in("student_id", chunk)
            .eq("school_level", "fundamental")
            .range(from, to);

          if (error) {
            done({ ok: false, rows: allRows.length });
            logError("historical_grades_analytics.select", error);
            return;
          }

          if (data && data.length > 0) {
            allRows = [...allRows, ...data];
            page += 1;
            hasMore = data.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }
      }

      done({ ok: true, rows: allRows.length });
      const mapped = allRows.map(mapHistoricalGradeFromDb);
      historicalGradesAnalyticsCache.set(scopeKey, mapped);
      setHistoricalGrades(mapped);
    })();

    historicalGradesInFlight.set(scopeKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      historicalGradesInFlight.delete(scopeKey);
      setLoading(false);
    }
  }, [user?.id, normalizedScope, scopeKey]);

  useEffect(() => {
    fetchHistoricalGrades();
  }, [fetchHistoricalGrades]);

  return {
    historicalGrades,
    loading,
    refreshHistoricalGrades: fetchHistoricalGrades,
  };
}

export function useAttendance() {
  const { user } = useAuth();
  const attendance = useDataStore((state) => state.attendance);
  const setAttendance = useDataStore((state) => state.setAttendance);
  const addAttendanceToStore = useDataStore((state) => state.addAttendance);
  const deleteAttendanceFromStore = useDataStore((state) => state.deleteAttendance);
  const attendanceLoaded = useDataStore((state) => state.attendanceLoaded);
  const attendanceFetching = useDataStore((state) => state.attendanceFetching);
  const setAttendanceLoaded = useDataStore((state) => state.setAttendanceLoaded);
  const setAttendanceFetching = useDataStore((state) => state.setAttendanceFetching);

  const fetchAttendance = useCallback(async (force = false) => {
    if (!user?.id) {
      setAttendance([]);
      setAttendanceLoaded(false);
      return;
    }
    if (attendanceFetching) return;
    if (!force && attendanceLoaded) return;

    setAttendanceFetching(true);
    const done = perfTimer("attendance.fetch");
    const { data, error } = await supabase.from("attendance").select("*");

    if (error) {
      done({ ok: false });
      logError("attendance.select", error);
      setAttendanceFetching(false);
      return;
    }

    done({ ok: true, rows: data?.length ?? 0 });
    setAttendance((data || []).map(mapAttendanceFromDb));
    setAttendanceLoaded(true);
    setAttendanceFetching(false);
  }, [
    user?.id,
    attendanceLoaded,
    attendanceFetching,
    setAttendance,
    setAttendanceLoaded,
    setAttendanceFetching,
  ]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:attendance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => {
          fetchAttendance();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAttendance]);

  const addAttendance = async (
    record: Omit<AttendanceRecord, "id" | "recordedAt">,
  ) => {
    if (!user?.id) return null;
    const payload = mapAttendanceToDb(record, user.id, user.id);
    const { data, error } = await supabase
      .from("attendance")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      logError("attendance.insert", error);
      throw error;
    }

    const newRecord = mapAttendanceFromDb(data);
    addAttendanceToStore(newRecord);
    return newRecord;
  };

  const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) {
      logError("attendance.delete", error);
      throw error;
    }
    deleteAttendanceFromStore(id);
  };

  return {
    attendance,
    refreshAttendance: () => fetchAttendance(true),
    addAttendance,
    deleteAttendance,
  };
}

export function useIncidents() {
  const { user, profile } = useAuth();

  // ✅ Usando store global para estado compartilhado entre componentes
  const incidents = useDataStore((state) => state.incidents);
  const setIncidents = useDataStore((state) => state.setIncidents);
  const storeAddIncident = useDataStore((state) => state.addIncident);
  const storeUpdateIncident = useDataStore((state) => state.updateIncident);
  const storeDeleteIncident = useDataStore((state) => state.deleteIncident);
  const incidentsLoaded = useDataStore((state) => state.incidentsLoaded);
  const incidentsFetching = useDataStore((state) => state.incidentsFetching);
  const setIncidentsLoaded = useDataStore((state) => state.setIncidentsLoaded);
  const setIncidentsFetching = useDataStore((state) => state.setIncidentsFetching);

  const fetchIncidents = useCallback(async (force = false) => {
    if (!user?.id) {
      setIncidents([]);
      setIncidentsLoaded(false);
      return;
    }
    if (incidentsFetching) return;
    if (!force && incidentsLoaded) return;

    setIncidentsFetching(true);
    const done = perfTimer("incidents.fetch");
    const { data: incidentRows, error } = await supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      done({ ok: false });
      logError("incidents.select", error);
      setIncidentsFetching(false);
      return;
    }

    const ids = (incidentRows || []).map((row) => row.id);
    if (ids.length === 0) {
      done({ ok: true, incidents: 0, followUps: 0, comments: 0 });
      setIncidents([]);
      setIncidentsLoaded(true);
      setIncidentsFetching(false);
      return;
    }

    const [
      { data: followUpRows, error: followUpError },
      { data: commentRows, error: commentError },
    ] = await Promise.all([
      supabase
        .from("follow_ups")
        .select("*")
        .in("incident_id", ids)
        .order("date", { ascending: true }),
      supabase
        .from("comments")
        .select("*")
        .in("incident_id", ids)
        .order("created_at", { ascending: true }),
    ]);

    if (followUpError) {
      logError("follow_ups.select", followUpError);
    }
    if (commentError) {
      logError("comments.select", commentError);
    }

    done({
      ok: true,
      incidents: incidentRows?.length ?? 0,
      followUps: followUpRows?.length ?? 0,
      comments: commentRows?.length ?? 0,
    });
    const followUpsByIncident = (followUpRows || []).reduce<
      Record<string, FollowUpRecord[]>
    >((acc, row) => {
      const mapped = mapFollowUpFromDb(row);
      acc[row.incident_id] = acc[row.incident_id] || [];
      acc[row.incident_id].push(mapped);
      return acc;
    }, {});

    const commentsByIncident = (commentRows || []).reduce<
      Record<string, Comment[]>
    >((acc, row) => {
      const mapped = mapCommentFromDb(row);
      acc[row.incident_id] = acc[row.incident_id] || [];
      acc[row.incident_id].push(mapped);
      return acc;
    }, {});

    const mappedIncidents = (incidentRows || []).map((row) => {
      const mapped = mapIncidentFromDb(row);
      mapped.followUps = followUpsByIncident[row.id] || [];
      mapped.comments = commentsByIncident[row.id] || [];
      return mapped;
    });

    setIncidents(mappedIncidents);
    setIncidentsLoaded(true);
    setIncidentsFetching(false);
  }, [
    user?.id,
    incidentsLoaded,
    incidentsFetching,
    setIncidents,
    setIncidentsLoaded,
    setIncidentsFetching,
  ]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => {
          fetchIncidents();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_ups" },
        () => {
          fetchIncidents();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => {
          fetchIncidents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchIncidents]);

  const addIncident = async (
    incident: Omit<Incident, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (!user?.id) return null;

    const { followUps, comments, ...incidentData } = incident;
    const payload = mapIncidentToDb(incidentData, user.id, user.id);

    const { data, error } = await supabase
      .from("incidents")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      logError("incidents.insert", error);
      throw error;
    }

    const newIncident = mapIncidentFromDb(data);
    storeAddIncident(newIncident); // ✅ Atualiza store global - todos os componentes veem
    return newIncident;
  };

  const updateIncident = async (id: string, updates: Partial<Incident>) => {
    if (!user?.id) return;
    const base = incidents.find((incident) => incident.id === id);
    if (!base) return;

    const payload = mapIncidentToDb(
      {
        classId: updates.classId ?? base.classId,
        date: updates.date ?? base.date,
        studentIds: updates.studentIds ?? base.studentIds,
        episodes: updates.episodes ?? base.episodes,
        calculatedSeverity:
          updates.calculatedSeverity ?? base.calculatedSeverity,
        finalSeverity: updates.finalSeverity ?? base.finalSeverity,
        severityOverrideReason:
          updates.severityOverrideReason ?? base.severityOverrideReason,
        description: updates.description ?? base.description,
        actions: updates.actions ?? base.actions,
        suggestedAction: updates.suggestedAction ?? base.suggestedAction,
        status: updates.status ?? base.status,
        validatedBy: updates.validatedBy ?? base.validatedBy,
        validatedAt: updates.validatedAt ?? base.validatedAt,
        createdBy: base.createdBy,
      },
      user.id,
      base.createdBy || user.id,
    );

    const { error } = await supabase
      .from("incidents")
      .update(payload)
      .eq("id", id);

    if (error) {
      logError("incidents.update", error);
      throw error;
    }

    storeUpdateIncident(id, updates); // ✅ Atualiza store global
  };

  const deleteIncident = async (id: string) => {
    const { error } = await supabase.from("incidents").delete().eq("id", id);
    if (error) {
      logError("incidents.delete", error);
      throw error;
    }
    storeDeleteIncident(id); // ✅ Atualiza store global
  };

  const addFollowUp = async (
    incidentId: string,
    followUp: Omit<FollowUpRecord, "id" | "incidentId" | "createdAt">,
  ) => {
    if (!user?.id) return;

    const payload = mapFollowUpToDb(followUp, incidentId, user.id, user.id);
    const { error } = await supabase.from("follow_ups").insert(payload);

    if (error) {
      logError("follow_ups.insert", error);
      throw error;
    }

    await fetchIncidents();
  };

  const saveFollowUp = async (
    incidentId: string,
    followUp: Omit<FollowUpRecord, "id" | "incidentId" | "createdAt">,
    followUpId?: string,
  ) => {
    if (!user?.id) return;
    const payload = mapFollowUpToDb(followUp, incidentId, user.id, user.id);
    let savedFollowUp: FollowUpRecord | null = null;

    if (followUpId) {
      const { data, error } = await supabase
        .from("follow_ups")
        .update(payload)
        .eq("id", followUpId)
        .select()
        .single();
      if (error) {
        logError("follow_ups.update", error);
        throw error;
      }
      savedFollowUp = mapFollowUpFromDb(data);
    } else {
      const { data, error } = await supabase
        .from("follow_ups")
        .insert(payload)
        .select()
        .single();
      if (error) {
        logError("follow_ups.insert", error);
        throw error;
      }
      savedFollowUp = mapFollowUpFromDb(data);
    }

    // Otimização: Atualizar store local imediatamente sem refetch total
    const currentIncidents = useDataStore.getState().incidents;
    const incidentToUpdate = currentIncidents.find(i => i.id === incidentId);

    if (incidentToUpdate && savedFollowUp) {
      const currentFollowUps = incidentToUpdate.followUps || [];
      let newFollowUps;

      if (followUpId) {
        newFollowUps = currentFollowUps.map(fu => fu.id === followUpId ? savedFollowUp! : fu);
      } else {
        newFollowUps = [...currentFollowUps, savedFollowUp];
      }

      // Ordenar por data
      newFollowUps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      storeUpdateIncident(incidentId, { followUps: newFollowUps });
    } else {
      // Fallback se não encontrar no store (improvável)
      await fetchIncidents();
    }
  };

  const addComment = async (incidentId: string, text: string) => {
    if (!user?.id) return;
    const payload = mapCommentToDb(
      {
        userId: user.id,
        userName: user.email ?? "Usuário",
        text,
      },
      incidentId,
      user.id,
    );

    const { data, error } = await supabase
      .from("comments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logError("comments.insert", error);
      throw error;
    }

    const savedComment = mapCommentFromDb(data);

    // Otimização: Atualizar store
    const currentIncidents = useDataStore.getState().incidents;
    const incidentToUpdate = currentIncidents.find(i => i.id === incidentId);

    if (incidentToUpdate) {
      const currentComments = incidentToUpdate.comments || [];
      const newComments = [...currentComments, savedComment];
      storeUpdateIncident(incidentId, { comments: newComments });
    } else {
      await fetchIncidents();
    }
  };

  return {
    incidents,
    refreshIncidents: () => fetchIncidents(true),
    addIncident,
    updateIncident,
    deleteIncident,
    addFollowUp,
    saveFollowUp,
    addComment,
  };
}

export function useProfessionalSubjects() {
  const { user } = useAuth();
  const [items, setItems] = useState<
    { id: string; classId: string; subject: string }[]
  >([]);

  const fetchSubjects = useCallback(async (force = false) => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    const cacheKey = user.id;
    const cached = professionalSubjectsCache.get(cacheKey);
    if (cached && !force) {
      setItems(cached);
      return;
    }

    const inflight = professionalSubjectsInFlight.get(cacheKey);
    if (inflight) {
      await inflight;
      setItems(professionalSubjectsCache.get(cacheKey) ?? []);
      return;
    }

    const fetchPromise = (async () => {
      const done = perfTimer("professional_subjects.fetch");
      const { data, error } = await supabase
        .from("professional_subjects")
        .select("*");

      if (error) {
        done({ ok: false });
        logError("professional_subjects.select", error);
        return;
      }

      const mapped = (data || []).map(mapProfessionalSubjectFromDb);
      done({ ok: true, rows: data?.length ?? 0 });
      professionalSubjectsCache.set(cacheKey, mapped);
      setItems(mapped);
    })();

    professionalSubjectsInFlight.set(cacheKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      professionalSubjectsInFlight.delete(cacheKey);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:professional_subjects")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "professional_subjects",
        },
        () => {
          fetchSubjects(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchSubjects]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, string[]>>((acc, item) => {
      acc[item.classId] = acc[item.classId] || [];
      acc[item.classId].push(item.subject);
      return acc;
    }, {});
  }, [items]);

  const getProfessionalSubjects = (classId: string): string[] => {
    return grouped[classId] || [];
  };

  const addProfessionalSubject = async (classId: string, subject: string) => {
    if (!user?.id) return;
    const payload = mapProfessionalSubjectToDb(classId, subject, user.id);
    const { error } = await supabase
      .from("professional_subjects")
      .insert(payload);
    if (error) {
      logError("professional_subjects.insert", error);
      throw error;
    }
    await fetchSubjects(true);
  };

  const removeProfessionalSubject = async (
    classId: string,
    subject: string,
  ) => {
    const { error } = await supabase
      .from("professional_subjects")
      .delete()
      .eq("class_id", classId)
      .eq("subject", subject);
    if (error) {
      logError("professional_subjects.delete", error);
      throw error;
    }
    await fetchSubjects(true);
  };

  const setProfessionalSubjectsForClass = async (
    classId: string,
    subjects: string[],
  ) => {
    if (!user?.id) return;
    await supabase
      .from("professional_subjects")
      .delete()
      .eq("class_id", classId);

    if (subjects.length === 0) {
      await fetchSubjects();
      return;
    }

    const payload = subjects.map((subject) =>
      mapProfessionalSubjectToDb(classId, subject, user.id),
    );

    const { error } = await supabase
      .from("professional_subjects")
      .insert(payload);
    if (error) {
      logError("professional_subjects.bulk_insert", error);
      throw error;
    }
    await fetchSubjects(true);
  };

  return {
    professionalSubjects: items,
    getProfessionalSubjects,
    addProfessionalSubject,
    removeProfessionalSubject,
    setProfessionalSubjectsForClass,
  };
}

export function useProfessionalSubjectTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ProfessionalSubjectTemplate[]>([]);

  const fetchTemplates = useCallback(async (force = false) => {
    if (!user?.id) {
      setTemplates([]);
      return;
    }

    const cacheKey = user.id;
    const cached = professionalSubjectTemplatesCache.get(cacheKey);
    if (cached && !force) {
      setTemplates(cached);
      return;
    }

    const inflight = professionalSubjectTemplatesInFlight.get(cacheKey);
    if (inflight) {
      await inflight;
      setTemplates(professionalSubjectTemplatesCache.get(cacheKey) ?? []);
      return;
    }

    const fetchPromise = (async () => {
      const done = perfTimer("professional_subject_templates.fetch");
      const { data, error } = await supabase
        .from("professional_subject_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        done({ ok: false });
        logError("templates.select", error);
        return;
      }

      const mapped = (data || []).map(mapTemplateFromDb);
      done({ ok: true, rows: data?.length ?? 0 });
      professionalSubjectTemplatesCache.set(cacheKey, mapped);
      setTemplates(mapped);
    })();

    professionalSubjectTemplatesInFlight.set(cacheKey, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      professionalSubjectTemplatesInFlight.delete(cacheKey);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:professional_subject_templates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "professional_subject_templates",
        },
        () => {
          fetchTemplates(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTemplates]);

  const addTemplate = async (
    template: Omit<
      ProfessionalSubjectTemplate,
      "id" | "createdAt" | "updatedAt"
    >,
  ) => {
    if (!user?.id) return null;
    const payload = mapTemplateToDb(template, user.id);
    const { data, error } = await supabase
      .from("professional_subject_templates")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      logError("templates.insert", error);
      throw error;
    }

    const newTemplate = mapTemplateFromDb(data);
    setTemplates((prev) => {
      const next = [newTemplate, ...prev];
      if (user?.id) {
        professionalSubjectTemplatesCache.set(user.id, next);
      }
      return next;
    });
    return newTemplate;
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<ProfessionalSubjectTemplate>,
  ) => {
    if (!user?.id) return;
    const base = templates.find((t) => t.id === id);
    if (!base) return;

    const payload = mapTemplateToDb(
      {
        name: updates.name ?? base.name,
        course: updates.course ?? base.course,
        subjectsByYear: updates.subjectsByYear ?? base.subjectsByYear,
      },
      user.id,
    );

    const { error } = await supabase
      .from("professional_subject_templates")
      .update(payload)
      .eq("id", id);

    if (error) {
      logError("templates.update", error);
      throw error;
    }

    setTemplates((prev) => {
      const next = prev.map((template) =>
        template.id === id ? { ...template, ...updates } : template,
      );
      if (user?.id) {
        professionalSubjectTemplatesCache.set(user.id, next);
      }
      return next;
    });
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from("professional_subject_templates")
      .delete()
      .eq("id", id);
    if (error) {
      logError("templates.delete", error);
      throw error;
    }
    setTemplates((prev) => prev.filter((template) => template.id !== id));
  };

  const getTemplate = (id: string): ProfessionalSubjectTemplate | undefined => {
    return templates.find((t) => t.id === id);
  };

  const getTemplatesByCourse = (
    course: string,
  ): ProfessionalSubjectTemplate[] => {
    return templates.filter(
      (t) =>
        t.course.toLowerCase().includes(course.toLowerCase()) ||
        course.toLowerCase().includes(t.course.toLowerCase()),
    );
  };

  return {
    templates,
    refreshTemplates: fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCourse,
  };
}

export function useArchivedClasses() {
  const { classes } = useClasses();
  const archivedClasses = classes.filter((c) => c.archived === true);
  return { archivedClasses };
}

// ========================
// Historical Grades Hook (6º-9º ano Fundamental)
// ========================

const mapHistoricalGradeFromDb = (row: any): HistoricalGrade => ({
  id: row.id,
  studentId: row.student_id,
  schoolLevel: row.school_level,
  gradeYear: row.grade_year,
  subject: row.subject,
  quarter: row.quarter,
  grade: Number(String(row.grade ?? '').replace(',', '.')),
  schoolName: row.school_name,
  calendarYear: row.calendar_year,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapHistoricalGradeToDb = (grade: Omit<HistoricalGrade, 'id' | 'createdAt' | 'updatedAt'>) => ({
  student_id: grade.studentId,
  school_level: grade.schoolLevel,
  grade_year: grade.gradeYear,
  subject: grade.subject,
  quarter: grade.quarter,
  grade: grade.grade,
  school_name: grade.schoolName,
  calendar_year: grade.calendarYear,
});

export function useHistoricalGradesScoped(
  studentId?: string,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const [historicalGrades, setHistoricalGrades] = useState<HistoricalGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const fetchHistoricalGrades = useCallback(async () => {
    if (!enabled) {
      setHistoricalGrades([]);
      setLoading(false);
      return;
    }
    if (!user?.id || !studentId) {
      setHistoricalGrades([]);
      return;
    }

    setLoading(true);
    const done = perfTimer("historical_grades_scoped.fetch");
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("historical_grades")
        .select("*")
        .eq("student_id", studentId)
        .order("calendar_year", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        done({ ok: false, rows: allData.length, pages: page });
        logError("historical_grades_scoped.select", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        page += 1;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    done({ ok: true, rows: allData.length, pages: page, pageSize: PAGE_SIZE });
    setHistoricalGrades(allData.map(mapHistoricalGradeFromDb));
    setLoading(false);
  }, [enabled, user?.id, studentId]);

  useEffect(() => {
    setHistoricalGrades([]);
  }, [studentId]);

  useEffect(() => {
    fetchHistoricalGrades();
  }, [fetchHistoricalGrades]);

  const addHistoricalGrade = async (
    grade: Omit<HistoricalGrade, "id" | "createdAt" | "updatedAt">,
  ) => {
    const { data, error } = await supabase
      .from("historical_grades")
      .upsert(mapHistoricalGradeToDb(grade), {
        onConflict: "student_id,school_level,grade_year,subject,quarter,calendar_year",
      })
      .select()
      .single();

    if (error) {
      logError("historical_grades_scoped.upsert", error);
      throw error;
    }

    const newGrade = mapHistoricalGradeFromDb(data);
    if (!studentId || newGrade.studentId !== studentId) return newGrade;

    setHistoricalGrades((prev) => {
      const existingIndex = prev.findIndex((g) => g.id === newGrade.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newGrade;
        return updated;
      }
      return [newGrade, ...prev];
    });
    return newGrade;
  };

  const deleteHistoricalGrade = async (id: string) => {
    const { error } = await supabase
      .from("historical_grades")
      .delete()
      .eq("id", id);

    if (error) {
      logError("historical_grades_scoped.delete", error);
      throw error;
    }

    setHistoricalGrades((prev) => prev.filter((grade) => grade.id !== id));
  };

  return {
    historicalGrades,
    loading,
    refreshHistoricalGrades: fetchHistoricalGrades,
    addHistoricalGrade,
    deleteHistoricalGrade,
  };
}

export function useHistoricalGrades() {
  const {
    historicalGrades,
    setHistoricalGrades,
    addHistoricalGrade: addHistoricalGradeToStore,
    addHistoricalGradesBatch: addHistoricalGradesBatchToStore,
    deleteHistoricalGrade: deleteHistoricalGradeFromStore,
    deleteHistoricalGradesBatch: deleteHistoricalGradesBatchToStore,
    historicalGradesLoaded,
    historicalGradesFetching,
    setHistoricalGradesLoaded,
    setHistoricalGradesFetching
  } = useDataStore();
  const [loading, setLoading] = useState(true);

  const fetchHistoricalGrades = useCallback(async (force = false) => {
    const inflight = historicalGradesGlobalInFlight.get("all");
    if (inflight) {
      setLoading(true);
      await inflight;
      setLoading(false);
      return;
    }
    if (historicalGradesFetching) {
      setLoading(false);
      return;
    }
    if (!force && historicalGradesLoaded) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHistoricalGradesFetching(true);

    const fetchPromise = (async () => {
      const done = perfTimer("historical_grades.fetch");
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      let ok = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("historical_grades")
          .select("*")
          .order("calendar_year", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) {
          ok = false;
          if (!error.message.includes("does not exist")) {
            logError("historical_grades.select", error);
          }
          hasMore = false;
        } else if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      done({ ok, rows: allData.length, pages: page, pageSize: PAGE_SIZE });
      setHistoricalGrades(allData.map(mapHistoricalGradeFromDb));
      setHistoricalGradesLoaded(ok);
    })();

    historicalGradesGlobalInFlight.set("all", fetchPromise);
    try {
      await fetchPromise;
    } finally {
      historicalGradesGlobalInFlight.delete("all");
      setHistoricalGradesFetching(false);
      setLoading(false);
    }
  }, [
    historicalGradesLoaded,
    historicalGradesFetching,
    setHistoricalGrades,
    setHistoricalGradesLoaded,
    setHistoricalGradesFetching,
  ]);

  useEffect(() => {
    fetchHistoricalGrades();
  }, [fetchHistoricalGrades]);

  useEffect(() => {
    const {
      addHistoricalGrade: addHistoricalGradeToStore,
      deleteHistoricalGrade: deleteHistoricalGradeFromStore
    } = useDataStore.getState();

    const channel = supabase
      .channel("realtime:historical_grades")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historical_grades" },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const saved = mapHistoricalGradeFromDb(payload.new as any);
            addHistoricalGradeToStore(saved);
          } else if (payload.eventType === 'DELETE') {
            deleteHistoricalGradeFromStore(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addHistoricalGrade = async (
    grade: Omit<HistoricalGrade, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const { data, error } = await supabase
      .from("historical_grades")
      .upsert(mapHistoricalGradeToDb(grade), {
        onConflict: "student_id,school_level,grade_year,subject,quarter,calendar_year",
      })
      .select()
      .single();

    if (error) {
      logError("historical_grades.upsert", error);
      throw error;
    }

    const newGrade = mapHistoricalGradeFromDb(data);
    addHistoricalGradeToStore(newGrade);
    return newGrade;
  };

  const addHistoricalGradesBatch = async (
    grades: Omit<HistoricalGrade, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => {
    const payloads = grades.map(g => mapHistoricalGradeToDb(g));
    const BATCH_SIZE = 50; // Reduzido de 200 para 50 para evitar erros de payload do Supabase
    const allSavedGrades: HistoricalGrade[] = [];

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from("historical_grades")
        .upsert(chunk, {
          onConflict: "student_id,school_level,grade_year,subject,quarter,calendar_year",
        })
        .select("*");

      if (error) {
        logError("historical_grades.upsert_batch", error);
        throw error;
      }

      if (data) {
        allSavedGrades.push(...data.map(mapHistoricalGradeFromDb));
      }
    }

    addHistoricalGradesBatchToStore(allSavedGrades);
    return allSavedGrades;
  };

  const deleteHistoricalGradesBatch = async (ids: string[]) => {
    if (!ids.length) return;

    const CHUNK_SIZE = 50;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("historical_grades")
        .delete()
        .in("id", chunk);

      if (error) {
        logError("historical_grades.delete_batch", error);
        throw error;
      }
    }

    deleteHistoricalGradesBatchToStore(ids);
  };

  const clearHistoricalGradesForStudents = async (
    studentIds: string[],
    level: "fundamental" | "medio" = "fundamental"
  ) => {
    if (!studentIds.length) return;

    const CHUNK_SIZE = 50;
    const allIdsToDelete: string[] = [];

    // Chunked Fetch
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      const chunk = studentIds.slice(i, i + CHUNK_SIZE);
      const { data: toDelete, error: fetchError } = await supabase
        .from("historical_grades")
        .select("id")
        .in("student_id", chunk)
        .eq("school_level", level);

      if (fetchError) {
        logError("historical_grades.fetch_for_clear", fetchError);
        throw fetchError;
      }

      if (toDelete) {
        allIdsToDelete.push(...toDelete.map(g => g.id));
      }
    }

    if (allIdsToDelete.length === 0) return;

    // Chunked Delete
    for (let i = 0; i < allIdsToDelete.length; i += CHUNK_SIZE) {
      const chunk = allIdsToDelete.slice(i, i + CHUNK_SIZE);
      const { error: deleteError } = await supabase
        .from("historical_grades")
        .delete()
        .in("id", chunk);

      if (deleteError) {
        logError("historical_grades.clear_students", deleteError);
        throw deleteError;
      }
    }

    deleteHistoricalGradesBatchToStore(allIdsToDelete);
  };

  const deleteHistoricalGrade = async (id: string) => {
    const { error } = await supabase
      .from("historical_grades")
      .delete()
      .eq("id", id);

    if (error) {
      logError("historical_grades.delete", error);
      throw error;
    }

    deleteHistoricalGradeFromStore(id);
  };

  const getStudentHistoricalGrades = useCallback(
    (studentId: string) => historicalGrades.filter((g) => g.studentId === studentId),
    [historicalGrades]
  );

  return {
    historicalGrades,
    loading,
    refreshHistoricalGrades: () => fetchHistoricalGrades(true),
    addHistoricalGrade,
    addHistoricalGradesBatch,
    deleteHistoricalGrade,
    deleteHistoricalGradesBatch,
    clearHistoricalGradesForStudents,
    getStudentHistoricalGrades,
  };
}

// ========================
// External Assessments Hook (SAEB, SIGE, Diagnósticas)
// ========================

const mapExternalAssessmentFromDb = (row: any): ExternalAssessment => ({
  id: row.id,
  studentId: row.student_id,
  assessmentType: row.assessment_type,
  assessmentName: row.assessment_name,
  subject: row.subject,
  score: row.score,
  maxScore: row.max_score,
  proficiencyLevel: row.proficiency_level,
  appliedDate: row.applied_date,
  schoolLevel: row.school_level,
  gradeYear: row.grade_year,
  quarter: row.quarter,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapExternalAssessmentToDb = (assessment: Omit<ExternalAssessment, 'id' | 'createdAt' | 'updatedAt'>) => ({
  student_id: assessment.studentId,
  assessment_type: assessment.assessmentType,
  assessment_name: assessment.assessmentName,
  subject: assessment.subject,
  score: assessment.score,
  max_score: assessment.maxScore,
  proficiency_level: assessment.proficiencyLevel,
  applied_date: assessment.appliedDate,
  school_level: assessment.schoolLevel,
  grade_year: assessment.gradeYear,
  quarter: assessment.quarter,
  notes: assessment.notes,
});

export function useExternalAssessmentsScoped(
  studentId?: string,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const [externalAssessments, setExternalAssessments] = useState<ExternalAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const fetchExternalAssessments = useCallback(async () => {
    if (!enabled) {
      setExternalAssessments([]);
      setLoading(false);
      return;
    }
    if (!user?.id || !studentId) {
      setExternalAssessments([]);
      return;
    }

    setLoading(true);
    const done = perfTimer("external_assessments_scoped.fetch");
    const { data, error } = await supabase
      .from("external_assessments")
      .select("*")
      .eq("student_id", studentId)
      .order("applied_date", { ascending: false });

    const rows = data?.length ?? 0;
    if (error) {
      logError("external_assessments_scoped.select", error);
      done({ ok: false, rows });
      setExternalAssessments([]);
      setLoading(false);
      return;
    }

    done({ ok: true, rows });
    setExternalAssessments((data || []).map(mapExternalAssessmentFromDb));
    setLoading(false);
  }, [enabled, user?.id, studentId]);

  useEffect(() => {
    setExternalAssessments([]);
  }, [studentId]);

  useEffect(() => {
    fetchExternalAssessments();
  }, [fetchExternalAssessments]);

  const addExternalAssessment = async (
    assessment: Omit<ExternalAssessment, "id" | "createdAt" | "updatedAt">,
  ) => {
    const { data, error } = await supabase
      .from("external_assessments")
      .insert(mapExternalAssessmentToDb(assessment))
      .select()
      .single();

    if (error) {
      logError("external_assessments_scoped.insert", error);
      throw error;
    }

    const newAssessment = mapExternalAssessmentFromDb(data);
    if (!studentId || newAssessment.studentId !== studentId) return newAssessment;

    setExternalAssessments((prev) => {
      const existingIndex = prev.findIndex((a) => a.id === newAssessment.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAssessment;
        return updated;
      }
      return [newAssessment, ...prev];
    });
    return newAssessment;
  };

  const deleteExternalAssessment = async (id: string) => {
    const { error } = await supabase
      .from("external_assessments")
      .delete()
      .eq("id", id);

    if (error) {
      logError("external_assessments_scoped.delete", error);
      throw error;
    }

    setExternalAssessments((prev) => prev.filter((a) => a.id !== id));
  };

  const updateExternalAssessment = async (assessment: ExternalAssessment) => {
    const { id, createdAt, updatedAt, ...payload } = assessment;
    const { data, error } = await supabase
      .from("external_assessments")
      .update(mapExternalAssessmentToDb(payload))
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logError("external_assessments_scoped.update", error);
      throw error;
    }

    const updatedAssessment = mapExternalAssessmentFromDb(data);
    if (!studentId || updatedAssessment.studentId !== studentId) return updatedAssessment;

    setExternalAssessments((prev) => {
      const existingIndex = prev.findIndex((a) => a.id === updatedAssessment.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = updatedAssessment;
        return updated;
      }
      return [updatedAssessment, ...prev];
    });
    return updatedAssessment;
  };

  const getStudentExternalAssessments = useCallback(
    (targetStudentId: string) =>
      externalAssessments.filter((a) => a.studentId === targetStudentId),
    [externalAssessments],
  );

  return {
    externalAssessments,
    loading,
    refreshExternalAssessments: fetchExternalAssessments,
    addExternalAssessment,
    deleteExternalAssessment,
    updateExternalAssessment,
    getStudentExternalAssessments,
  };
}

export function useExternalAssessments() {
  const {
    externalAssessments,
    setExternalAssessments,
    addExternalAssessment: addExternalAssessmentToStore,
    deleteExternalAssessment: deleteExternalAssessmentFromStore,
    externalAssessmentsLoaded,
    externalAssessmentsFetching,
    setExternalAssessmentsLoaded,
    setExternalAssessmentsFetching
  } = useDataStore();
  const [loading, setLoading] = useState(true);

  const fetchExternalAssessments = useCallback(async (force = false) => {
    const inflight = externalAssessmentsGlobalInFlight.get("all");
    if (inflight) {
      setLoading(true);
      await inflight;
      setLoading(false);
      return;
    }
    if (externalAssessmentsFetching) {
      setLoading(false);
      return;
    }
    if (!force && externalAssessmentsLoaded) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setExternalAssessmentsFetching(true);

    const fetchPromise = (async () => {
      const done = perfTimer("external_assessments.fetch");
      const { data, error } = await supabase
        .from("external_assessments")
        .select("*")
        .order("applied_date", { ascending: false });

      const rows = data?.length ?? 0;
      if (error) {
        if (!error.message.includes("does not exist")) {
          logError("external_assessments.select", error);
        }
        done({ ok: false, rows });
        setExternalAssessments([]);
      } else {
        done({ ok: true, rows });
        setExternalAssessments((data || []).map(mapExternalAssessmentFromDb));
      }
      setExternalAssessmentsLoaded(!error);
    })();

    externalAssessmentsGlobalInFlight.set("all", fetchPromise);
    try {
      await fetchPromise;
    } finally {
      externalAssessmentsGlobalInFlight.delete("all");
      setExternalAssessmentsFetching(false);
      setLoading(false);
    }
  }, [
    externalAssessmentsLoaded,
    externalAssessmentsFetching,
    setExternalAssessments,
    setExternalAssessmentsLoaded,
    setExternalAssessmentsFetching,
  ]);

  useEffect(() => {
    fetchExternalAssessments();
  }, [fetchExternalAssessments]);

  const addExternalAssessment = async (
    assessment: Omit<ExternalAssessment, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const { data, error } = await supabase
      .from("external_assessments")
      .insert(mapExternalAssessmentToDb(assessment))
      .select()
      .single();

    if (error) {
      logError("external_assessments.insert", error);
      throw error;
    }

    const newAssessment = mapExternalAssessmentFromDb(data);
    addExternalAssessmentToStore(newAssessment);
    return newAssessment;
  };

  const deleteExternalAssessment = async (id: string) => {
    const { error } = await supabase
      .from("external_assessments")
      .delete()
      .eq("id", id);

    if (error) {
      logError("external_assessments.delete", error);
      throw error;
    }

    deleteExternalAssessmentFromStore(id);
  };

  const updateExternalAssessment = async (assessment: ExternalAssessment) => {
    const { id, createdAt, updatedAt, ...payload } = assessment;
    const { data, error } = await supabase
      .from("external_assessments")
      .update(mapExternalAssessmentToDb(payload))
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logError("external_assessments.update", error);
      throw error;
    }

    const updatedAssessment = mapExternalAssessmentFromDb(data);
    addExternalAssessmentToStore(updatedAssessment);
    return updatedAssessment;
  };

  const getStudentExternalAssessments = useCallback(
    (studentId: string) => externalAssessments.filter((a) => a.studentId === studentId),
    [externalAssessments]
  );

  return {
    externalAssessments,
    loading,
    refreshExternalAssessments: () => fetchExternalAssessments(true),
    addExternalAssessment,
    deleteExternalAssessment,
    updateExternalAssessment,
    getStudentExternalAssessments,
  };
}
