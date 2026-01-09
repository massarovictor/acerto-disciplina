import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/types';
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
} from '@/services/supabase/mappers';
import { buildClassNumber } from '@/lib/classNumber';

const logError = (scope: string, error: unknown) => {
  console.error(`[Supabase:${scope}]`, error);
};

export function useProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<User[]>([]);

  const fetchProfiles = useCallback(async () => {
    if (!user?.id) {
      setProfiles([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);

    if (error) {
      logError('profiles.select', error);
      return;
    }

    setProfiles((data || []).map(mapProfileFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:profiles:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          fetchProfiles();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchProfiles]);

  return { profiles, refreshProfiles: fetchProfiles };
}

export function useClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);

  const fetchClasses = useCallback(async () => {
    if (!user?.id) {
      setClasses([]);
      return;
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('classes.select', error);
      return;
    }

    setClasses((data || []).map(mapClassFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:classes:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes', filter: `owner_id=eq.${user.id}` },
        () => {
          fetchClasses();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchClasses]);

  const getClassNumberFromData = (
    classData: Pick<Class, 'course' | 'startYearDate' | 'startYear'>,
  ): string => {
    const classNumber = buildClassNumber({
      course: classData.course,
      startYearDate: classData.startYearDate,
      startYear: classData.startYear,
    });

    if (!classNumber) {
      throw new Error('Dados insuficientes para gerar o numero da turma.');
    }

    return classNumber;
  };

  const addClass = async (classData: Omit<Class, 'id' | 'classNumber'>) => {
    if (!user?.id) return null;

    const classNumber = getClassNumberFromData(classData);
    const payload = mapClassToDb(
      { ...classData, classNumber },
      user.id,
      { omitName: true },
    );

    const { data, error } = await supabase
      .from('classes')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logError('classes.insert', error);
      throw error;
    }

    const newClass = mapClassFromDb(data);
    setClasses((prev) => [newClass, ...prev]);
    return newClass;
  };

  const updateClass = async (id: string, updates: Partial<Class>) => {
    if (!user?.id) return;
    const base = classes.find((c) => c.id === id);
    if (!base) return;

    const hasArchivedAt = Object.prototype.hasOwnProperty.call(updates, 'archivedAt');
    const hasArchivedReason = Object.prototype.hasOwnProperty.call(updates, 'archivedReason');
    const hasTemplateId = Object.prototype.hasOwnProperty.call(updates, 'templateId');

    const nextCourse = updates.course ?? base.course;
    const nextStartYear = updates.startYear ?? base.startYear;
    const nextStartYearDate = updates.startYearDate ?? base.startYearDate;
    const nextTemplateId = hasTemplateId ? updates.templateId ?? null : base.templateId;
    const nextClassNumber =
      buildClassNumber({
        course: nextCourse,
        startYearDate: nextStartYearDate,
        startYear: nextStartYear,
      }) ?? base.classNumber;

    const payload = mapClassToDb(
      {
        name: updates.name ?? base.name,
        series: updates.series ?? base.series,
        letter: updates.letter ?? base.letter,
        course: nextCourse,
        classNumber: nextClassNumber,
        directorId: updates.directorId ?? base.directorId,
        active: updates.active ?? base.active,
        startYear: nextStartYear,
        currentYear: updates.currentYear ?? base.currentYear,
        startYearDate: nextStartYearDate,
        archived: updates.archived ?? base.archived,
        archivedAt: hasArchivedAt ? updates.archivedAt ?? null : base.archivedAt ?? null,
        archivedReason: hasArchivedReason
          ? updates.archivedReason ?? null
          : base.archivedReason ?? null,
        templateId: nextTemplateId,
      },
      user.id,
      { omitName: true },
    );

    const { data, error } = await supabase
      .from('classes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logError('classes.update', error);
      throw error;
    }

    if (data) {
      const updatedClass = mapClassFromDb(data);
      setClasses((prev) =>
        prev.map((cls) => (cls.id === id ? updatedClass : cls)),
      );
    }
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) {
      logError('classes.delete', error);
      throw error;
    }
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
  };

  const archiveClass = async (id: string, reason?: string) => {
    await updateClass(id, {
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedReason: reason || 'Arquivamento manual',
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
    refreshClasses: fetchClasses,
    addClass,
    updateClass,
    deleteClass,
    archiveClass,
    unarchiveClass,
  };
}

export function useStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);

  const fetchStudents = useCallback(async () => {
    if (!user?.id) {
      setStudents([]);
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('students.select', error);
      return;
    }

    setStudents((data || []).map(mapStudentFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:students:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `owner_id=eq.${user.id}` },
        () => {
          fetchStudents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchStudents]);

  const addStudent = async (student: Omit<Student, 'id'>) => {
    if (!user?.id) return null;
    const payload = mapStudentToDb(student, user.id);
    const { data, error } = await supabase
      .from('students')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      logError('students.insert', error);
      throw error;
    }

    const newStudent = mapStudentFromDb(data);
    setStudents((prev) => [newStudent, ...prev]);
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
      .from('students')
      .update(payload)
      .eq('id', id);
    if (error) {
      logError('students.update', error);
      throw error;
    }

    setStudents((prev) =>
      prev.map((student) => (student.id === id ? { ...student, ...updates } : student)),
    );
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      logError('students.delete', error);
      throw error;
    }
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return { students, refreshStudents: fetchStudents, addStudent, updateStudent, deleteStudent };
}

export function useGrades() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);

  const fetchGrades = useCallback(async () => {
    if (!user?.id) {
      setGrades([]);
      return;
    }

    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('owner_id', user.id);

    if (error) {
      logError('grades.select', error);
      return;
    }

    setGrades((data || []).map(mapGradeFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:grades:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grades', filter: `owner_id=eq.${user.id}` },
        () => {
          fetchGrades();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchGrades]);

  const addGrade = async (grade: Omit<Grade, 'id' | 'recordedAt'>) => {
    if (!user?.id) return;

    const payload = mapGradeToDb(grade, user.id);
    const { data, error } = await supabase
      .from('grades')
      .upsert(payload, {
        onConflict: 'student_id,class_id,subject,quarter',
      })
      .select('*')
      .single();

    if (error) {
      logError('grades.upsert', error);
      throw error;
    }

    const saved = mapGradeFromDb(data);
    setGrades((prev) => {
      const existingIndex = prev.findIndex((g) => g.id === saved.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
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
        grade: updates.grade ?? base.grade,
        observation: updates.observation ?? base.observation,
      },
      user.id,
    );

    const { error } = await supabase.from('grades').update(payload).eq('id', id);
    if (error) {
      logError('grades.update', error);
      throw error;
    }

    setGrades((prev) =>
      prev.map((grade) =>
        grade.id === id ? { ...grade, ...updates, recordedAt: new Date().toISOString() } : grade,
      ),
    );
  };

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) {
      logError('grades.delete', error);
      throw error;
    }
    setGrades((prev) => prev.filter((grade) => grade.id !== id));
  };

  return { grades, refreshGrades: fetchGrades, addGrade, updateGrade, deleteGrade };
}

export function useAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const fetchAttendance = useCallback(async () => {
    if (!user?.id) {
      setAttendance([]);
      return;
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('owner_id', user.id);

    if (error) {
      logError('attendance.select', error);
      return;
    }

    setAttendance((data || []).map(mapAttendanceFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:attendance:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `owner_id=eq.${user.id}` },
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
    record: Omit<AttendanceRecord, 'id' | 'recordedAt'>,
  ) => {
    if (!user?.id) return null;
    const payload = mapAttendanceToDb(record, user.id, user.id);
    const { data, error } = await supabase
      .from('attendance')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logError('attendance.insert', error);
      throw error;
    }

    const newRecord = mapAttendanceFromDb(data);
    setAttendance((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) {
      logError('attendance.delete', error);
      throw error;
    }
    setAttendance((prev) => prev.filter((record) => record.id !== id));
  };

  return { attendance, refreshAttendance: fetchAttendance, addAttendance, deleteAttendance };
}

export function useIncidents() {
  const { user, profile } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const fetchIncidents = useCallback(async () => {
    if (!user?.id) {
      setIncidents([]);
      return;
    }

    const { data: incidentRows, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('incidents.select', error);
      return;
    }

    const ids = (incidentRows || []).map((row) => row.id);
    if (ids.length === 0) {
      setIncidents([]);
      return;
    }

    const [{ data: followUpRows, error: followUpError }, { data: commentRows, error: commentError }] =
      await Promise.all([
        supabase
          .from('follow_ups')
          .select('*')
          .eq('owner_id', user.id)
          .in('incident_id', ids)
          .order('date', { ascending: true }),
        supabase
          .from('comments')
          .select('*')
          .eq('owner_id', user.id)
          .in('incident_id', ids)
          .order('created_at', { ascending: true }),
      ]);

    if (followUpError) {
      logError('follow_ups.select', followUpError);
    }
    if (commentError) {
      logError('comments.select', commentError);
    }

    const followUpsByIncident = (followUpRows || []).reduce<Record<string, FollowUpRecord[]>>(
      (acc, row) => {
        const mapped = mapFollowUpFromDb(row);
        acc[row.incident_id] = acc[row.incident_id] || [];
        acc[row.incident_id].push(mapped);
        return acc;
      },
      {},
    );

    const commentsByIncident = (commentRows || []).reduce<Record<string, Comment[]>>(
      (acc, row) => {
        const mapped = mapCommentFromDb(row);
        acc[row.incident_id] = acc[row.incident_id] || [];
        acc[row.incident_id].push(mapped);
        return acc;
      },
      {},
    );

    const mappedIncidents = (incidentRows || []).map((row) => {
      const mapped = mapIncidentFromDb(row);
      mapped.followUps = followUpsByIncident[row.id] || [];
      mapped.comments = commentsByIncident[row.id] || [];
      return mapped;
    });

    setIncidents(mappedIncidents);
  }, [user?.id]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:incidents:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents', filter: `owner_id=eq.${user.id}` },
        () => {
          fetchIncidents();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follow_ups', filter: `owner_id=eq.${user.id}` },
        () => {
          fetchIncidents();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `owner_id=eq.${user.id}` },
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
    incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!user?.id) return null;

    const payload = mapIncidentToDb(
      {
        ...incident,
        followUps: undefined,
        comments: undefined,
      },
      user.id,
      user.id,
    );

    const { data, error } = await supabase
      .from('incidents')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logError('incidents.insert', error);
      throw error;
    }

    const newIncident = mapIncidentFromDb(data);
    setIncidents((prev) => [newIncident, ...prev]);
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
        calculatedSeverity: updates.calculatedSeverity ?? base.calculatedSeverity,
        finalSeverity: updates.finalSeverity ?? base.finalSeverity,
        severityOverrideReason: updates.severityOverrideReason ?? base.severityOverrideReason,
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
      .from('incidents')
      .update(payload)
      .eq('id', id);

    if (error) {
      logError('incidents.update', error);
      throw error;
    }

    setIncidents((prev) =>
      prev.map((incident) => (incident.id === id ? { ...incident, ...updates } : incident)),
    );
  };

  const deleteIncident = async (id: string) => {
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (error) {
      logError('incidents.delete', error);
      throw error;
    }
    setIncidents((prev) => prev.filter((incident) => incident.id !== id));
  };

  const addFollowUp = async (
    incidentId: string,
    followUp: Omit<FollowUpRecord, 'id' | 'incidentId' | 'createdAt'>,
  ) => {
    if (!user?.id) return;

    const payload = mapFollowUpToDb(followUp, incidentId, user.id, user.id);
    const { error } = await supabase.from('follow_ups').insert(payload);

    if (error) {
      logError('follow_ups.insert', error);
      throw error;
    }

    await fetchIncidents();
  };

  const saveFollowUp = async (
    incidentId: string,
    followUp: Omit<FollowUpRecord, 'id' | 'incidentId' | 'createdAt'>,
    followUpId?: string,
  ) => {
    if (!user?.id) return;
    const payload = mapFollowUpToDb(followUp, incidentId, user.id, user.id);

    if (followUpId) {
      const { error } = await supabase
        .from('follow_ups')
        .update(payload)
        .eq('id', followUpId);
      if (error) {
        logError('follow_ups.update', error);
        throw error;
      }
    } else {
      const { error } = await supabase.from('follow_ups').insert(payload);
      if (error) {
        logError('follow_ups.insert', error);
        throw error;
      }
    }

    await fetchIncidents();
  };

  const addComment = async (incidentId: string, text: string) => {
    if (!user?.id) return;
    const payload = mapCommentToDb(
      {
        userId: user.id,
        userName: profile?.name ?? user.email ?? 'Usuário',
        text,
      },
      incidentId,
      user.id,
    );

    const { error } = await supabase.from('comments').insert(payload);
    if (error) {
      logError('comments.insert', error);
      throw error;
    }

    await fetchIncidents();
  };

  return {
    incidents,
    refreshIncidents: fetchIncidents,
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
  const [items, setItems] = useState<{ id: string; classId: string; subject: string }[]>([]);

  const fetchSubjects = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    const { data, error } = await supabase
      .from('professional_subjects')
      .select('*')
      .eq('owner_id', user.id);

    if (error) {
      logError('professional_subjects.select', error);
      return;
    }

    setItems((data || []).map(mapProfessionalSubjectFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:professional_subjects:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'professional_subjects',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          fetchSubjects();
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
    const { error } = await supabase.from('professional_subjects').insert(payload);
    if (error) {
      logError('professional_subjects.insert', error);
      throw error;
    }
    await fetchSubjects();
  };

  const removeProfessionalSubject = async (classId: string, subject: string) => {
    const { error } = await supabase
      .from('professional_subjects')
      .delete()
      .eq('class_id', classId)
      .eq('subject', subject);
    if (error) {
      logError('professional_subjects.delete', error);
      throw error;
    }
    await fetchSubjects();
  };

  const setProfessionalSubjectsForClass = async (
    classId: string,
    subjects: string[],
  ) => {
    if (!user?.id) return;
    await supabase.from('professional_subjects').delete().eq('class_id', classId);

    if (subjects.length === 0) {
      await fetchSubjects();
      return;
    }

    const payload = subjects.map((subject) =>
      mapProfessionalSubjectToDb(classId, subject, user.id),
    );

    const { error } = await supabase
      .from('professional_subjects')
      .insert(payload);
    if (error) {
      logError('professional_subjects.bulk_insert', error);
      throw error;
    }
    await fetchSubjects();
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

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) {
      setTemplates([]);
      return;
    }

    const { data, error } = await supabase
      .from('professional_subject_templates')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('templates.select', error);
      return;
    }

    setTemplates((data || []).map(mapTemplateFromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime:professional_subject_templates:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'professional_subject_templates',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          fetchTemplates();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTemplates]);

  const addTemplate = async (
    template: Omit<ProfessionalSubjectTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!user?.id) return null;
    const payload = mapTemplateToDb(template, user.id);
    const { data, error } = await supabase
      .from('professional_subject_templates')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logError('templates.insert', error);
      throw error;
    }

    const newTemplate = mapTemplateFromDb(data);
    setTemplates((prev) => [newTemplate, ...prev]);
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
      .from('professional_subject_templates')
      .update(payload)
      .eq('id', id);

    if (error) {
      logError('templates.update', error);
      throw error;
    }

    setTemplates((prev) =>
      prev.map((template) => (template.id === id ? { ...template, ...updates } : template)),
    );
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('professional_subject_templates')
      .delete()
      .eq('id', id);
    if (error) {
      logError('templates.delete', error);
      throw error;
    }
    setTemplates((prev) => prev.filter((template) => template.id !== id));
  };

  const getTemplate = (id: string): ProfessionalSubjectTemplate | undefined => {
    return templates.find((t) => t.id === id);
  };

  const getTemplatesByCourse = (course: string): ProfessionalSubjectTemplate[] => {
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
