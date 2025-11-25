import { useState, useEffect } from "react";
import { storage } from "@/lib/localStorage";
import {
  Incident,
  Class,
  Student,
  Grade,
  AttendanceRecord,
  ProfessionalSubjectTemplate,
} from "@/types";
import { MOCK_CLASSES, MOCK_STUDENTS } from "@/data/mockData";
import { generateSampleData } from "@/data/sampleData";
import {
  calculateCurrentYear,
  shouldArchiveClass,
} from "@/lib/classYearCalculator";

type StorageKey =
  | "INCIDENTS"
  | "CLASSES"
  | "STUDENTS"
  | "GRADES"
  | "ATTENDANCE"
  | "PROFESSIONAL_SUBJECTS"
  | "PROFESSIONAL_SUBJECT_TEMPLATES";

export function useLocalStorage<T>(key: StorageKey, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storage.get<T>(key);
    return item !== null ? item : initialValue;
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // SEMPRE ler o valor mais recente do localStorage para evitar race conditions
      const currentValue = storage.get<T>(key) ?? storedValue;
      const valueToStore =
        value instanceof Function ? value(currentValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
      console.log(
        `[useLocalStorage] ${key} atualizado. Novo total de itens:`,
        Array.isArray(valueToStore) ? valueToStore.length : "N/A",
      );
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Initialize mock data if empty
export function useInitializeData() {
  useEffect(() => {
    const classes = storage.get<Class[]>("CLASSES");
    const students = storage.get<Student[]>("STUDENTS");

    if (
      !classes ||
      classes.length === 0 ||
      !students ||
      students.length === 0
    ) {
      const sample = generateSampleData();
      storage.set("CLASSES", sample.classes);
      storage.set("STUDENTS", sample.students);
      storage.set("GRADES", sample.grades);
      storage.set("ATTENDANCE", sample.attendance);
      storage.set("INCIDENTS", sample.incidents);
      return;
    }

    if (!storage.get<Grade[]>("GRADES")) {
      storage.set("GRADES", []);
    }

    if (!storage.get<AttendanceRecord[]>("ATTENDANCE")) {
      storage.set("ATTENDANCE", []);
    }

    if (!storage.get<Incident[]>("INCIDENTS")) {
      storage.set("INCIDENTS", []);
    }
  }, []);
}

// Hook for incidents
export function useIncidents() {
  const [incidents, setIncidents] = useLocalStorage<Incident[]>(
    "INCIDENTS",
    [],
  );

  // Force re-render when localStorage changes (mesmo em outras abas/componentes)
  useEffect(() => {
    const handleStorageChange = () => {
      const updated = storage.get<Incident[]>("INCIDENTS");
      if (updated) {
        setIncidents(updated);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Também escuta mudanças internas
    const interval = setInterval(() => {
      const current = storage.get<Incident[]>("INCIDENTS");
      if (current && JSON.stringify(current) !== JSON.stringify(incidents)) {
        setIncidents(current);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [incidents]);

  const addIncident = (
    incident: Omit<Incident, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newIncident: Incident = {
      ...incident,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      followUps: [],
    };
    setIncidents((prev) => [...prev, newIncident]);
    return newIncident;
  };

  const updateIncident = (id: string, updates: Partial<Incident>) => {
    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id
          ? { ...incident, ...updates, updatedAt: new Date().toISOString() }
          : incident,
      ),
    );
  };

  const deleteIncident = (id: string) => {
    setIncidents((prev) => prev.filter((incident) => incident.id !== id));
  };

  const addFollowUp = (
    incidentId: string,
    followUp: Omit<
      import("@/types").FollowUpRecord,
      "id" | "incidentId" | "createdAt"
    >,
  ) => {
    setIncidents((prev) =>
      prev.map((incident) => {
        if (incident.id === incidentId) {
          const newFollowUp: import("@/types").FollowUpRecord = {
            ...followUp,
            id: Date.now().toString(),
            incidentId,
            createdAt: new Date().toISOString(),
          };
          return {
            ...incident,
            followUps: [...(incident.followUps || []), newFollowUp],
            updatedAt: new Date().toISOString(),
          };
        }
        return incident;
      }),
    );
  };

  return {
    incidents,
    addIncident,
    updateIncident,
    deleteIncident,
    addFollowUp,
  };
}

// Hook for classes
export function useClasses() {
  const [classes, setClasses] = useLocalStorage<Class[]>(
    "CLASSES",
    MOCK_CLASSES,
  );
  const { students, updateStudent } = useStudents();

  // Force re-render when localStorage changes (mesmo em outras abas/componentes)
  useEffect(() => {
    const handleStorageChange = () => {
      const updated = storage.get<Class[]>("CLASSES");
      if (updated) {
        console.log("[useClasses] Storage event detectado, atualizando estado");
        setClasses(updated);
      }
    };

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Also check periodically for changes (for same-tab updates)
    // Usar uma ref para comparar sem causar re-renders desnecessários
    let lastKnownValue = JSON.stringify(storage.get<Class[]>("CLASSES"));

    const interval = setInterval(() => {
      const current = storage.get<Class[]>("CLASSES");
      const currentString = JSON.stringify(current);
      if (current && currentString !== lastKnownValue) {
        console.log(
          "[useClasses] Detectada mudança no localStorage, atualizando estado",
        );
        lastKnownValue = currentString;
        setClasses(current);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [setClasses]);

  // Função para gerar número único de turma
  const generateClassNumber = (existingClasses: Class[]): string => {
    // Extrair todos os números existentes
    const existingNumbers = existingClasses
      .map((c) => c.classNumber)
      .filter(Boolean)
      .map((num) => {
        const match = num.match(/TURMA-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });

    // Encontrar o maior número
    const maxNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

    // Gerar próximo número
    const nextNumber = maxNumber + 1;
    const formattedNumber = `TURMA-${String(nextNumber).padStart(3, "0")}`;

    // Verificar se já existe (segurança extra)
    const exists = existingClasses.some(
      (c) => c.classNumber === formattedNumber,
    );
    if (exists) {
      // Se por algum motivo já existir, tentar próximo
      return generateClassNumber(existingClasses);
    }

    return formattedNumber;
  };

  // Calcular currentYear automaticamente e verificar arquivamento (executa apenas uma vez ao montar)
  useEffect(() => {
    const currentClasses = storage.get<Class[]>("CLASSES") || [];
    let needsUpdate = false;

    const updatedClasses = currentClasses.map((cls) => {
      const updated: Class = { ...cls };

      // Se tem startYearDate e startYear, calcular currentYear
      if (cls.startYearDate && cls.startYear && !cls.archived) {
        try {
          const calculatedYear = calculateCurrentYear(
            cls.startYearDate,
            cls.startYear,
          );
          if (cls.currentYear !== calculatedYear) {
            updated.currentYear = calculatedYear;
            needsUpdate = true;
          }

          // Verificar se deve ser arquivada
          if (
            shouldArchiveClass(cls.startYearDate, cls.startYear) &&
            !cls.archived
          ) {
            updated.archived = true;
            updated.archivedAt = new Date().toISOString();
            updated.archivedReason =
              "Arquivamento automático após completar 3 anos letivos";
            updated.active = false;
            needsUpdate = true;
            const studentsUpdated = students
              .filter((s) => s.classId === updated.id)
              .forEach((student) =>
                updateStudent(student.id, { status: "inactive" }),
              );
            console.log(studentsUpdated);
          }
        } catch (error) {
          console.error("Erro ao calcular ano da turma:", cls.id, error);
        }
      }

      return updated;
    });

    if (needsUpdate) {
      storage.set("CLASSES", updatedClasses);
      setClasses(updatedClasses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migração: adicionar classNumber a turmas que não têm
  useEffect(() => {
    const currentClasses = storage.get<Class[]>("CLASSES") || [];
    const needsMigration = currentClasses.some((c) => !c.classNumber);

    if (needsMigration) {
      let nextNumber = 1;
      const migratedClasses = currentClasses.map((cls) => {
        if (cls.classNumber) {
          // Atualizar nextNumber se necessário
          const match = cls.classNumber.match(/TURMA-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= nextNumber) nextNumber = num + 1;
          }
          return cls;
        }
        const newNumber = `TURMA-${String(nextNumber).padStart(3, "0")}`;
        nextNumber++;
        return {
          ...cls,
          classNumber: newNumber,
        };
      });
      storage.set("CLASSES", migratedClasses);
      setClasses(migratedClasses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addClass = (classData: Omit<Class, "id" | "classNumber">) => {
    // SEMPRE ler o valor mais recente do localStorage para evitar race conditions
    const currentClasses = storage.get<Class[]>("CLASSES") ?? classes;
    const classNumber = generateClassNumber(currentClasses);

    const newClass: Class = {
      ...classData,
      id: Date.now().toString(),
      classNumber,
    };

    console.log("[useClasses] Adicionando turma:", newClass);
    setClasses((prev) => {
      const updated = [...prev, newClass];
      console.log("[useClasses] Total de turmas agora:", updated.length);
      return updated;
    });
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<Class>) => {
    console.log("[useClasses] Atualizando turma:", id, updates);
    setClasses((prev) => {
      const updated = prev.map((cls) => {
        if (cls.id !== id) return cls;
        // Garantir que classNumber nunca seja alterado
        const { classNumber: _, ...restUpdates } = updates;
        const updatedClass = { ...cls, ...restUpdates };
        console.log("[useClasses] Turma atualizada:", updatedClass);
        return updatedClass;
      });
      console.log(
        "[useClasses] Total de turmas após atualização:",
        updated.length,
      );
      return updated;
    });
  };

  const deleteClass = (id: string) => {
    console.log("[useClasses] Deletando turma:", id);
    setClasses((prev) => {
      const updated = prev.filter((cls) => cls.id !== id);
      console.log(
        "[useClasses] Total de turmas após exclusão:",
        updated.length,
      );
      return updated;
    });
  };

  const archiveClass = (id: string, reason?: string) => {
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === id
          ? {
              ...cls,
              archived: true,
              archivedAt: new Date().toISOString(),
              archivedReason: reason || "Arquivamento manual",
              active: false,
            }
          : cls,
      ),
    );
  };

  const unarchiveClass = (id: string) => {
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === id
          ? {
              ...cls,
              archived: false,
              archivedAt: undefined,
              archivedReason: undefined,
              active: true,
            }
          : cls,
      ),
    );
  };

  return {
    classes,
    addClass,
    updateClass,
    deleteClass,
    archiveClass,
    unarchiveClass,
  };
}

// Hook for students
export function useStudents() {
  const [students, setStudents] = useLocalStorage<Student[]>(
    "STUDENTS",
    MOCK_STUDENTS,
  );

  const addStudent = (student: Omit<Student, "id">) => {
    console.log("[HOOK addStudent] Recebido:", student);
    console.log("[HOOK addStudent] classId:", student.classId);

    const newStudent: Student = {
      ...student,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único mesmo em chamadas rápidas
    };

    console.log("[HOOK addStudent] Novo aluno criado:", newStudent);

    setStudents((prev) => {
      const updated = [...prev, newStudent];
      console.log("[HOOK addStudent] Total de alunos agora:", updated.length);
      console.log("[HOOK addStudent] Aluno adicionado:", newStudent);
      return updated;
    });

    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, ...updates } : student,
      ),
    );
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return { students, addStudent, updateStudent, deleteStudent };
}

// Hook for grades
export function useGrades() {
  const [grades, setGrades] = useLocalStorage<Grade[]>("GRADES", []);

  const addGrade = (grade: Omit<Grade, "id" | "recordedAt">) => {
    setGrades((prev) => {
      // Check if grade already exists for this student, class, subject, and quarter
      const existingIndex = prev.findIndex(
        (g) =>
          g.studentId === grade.studentId &&
          g.classId === grade.classId &&
          g.subject === grade.subject &&
          g.quarter === grade.quarter,
      );

      const newGrade: Grade = {
        ...grade,
        id: existingIndex >= 0 ? prev[existingIndex].id : Date.now().toString(),
        recordedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        // Update existing grade
        const updated = [...prev];
        updated[existingIndex] = newGrade;
        return updated;
      } else {
        // Add new grade
        return [...prev, newGrade];
      }
    });
  };

  const updateGrade = (id: string, updates: Partial<Grade>) => {
    setGrades((prev) =>
      prev.map((grade) =>
        grade.id === id
          ? { ...grade, ...updates, recordedAt: new Date().toISOString() }
          : grade,
      ),
    );
  };

  return { grades, addGrade, updateGrade };
}

// Hook for attendance
export function useAttendance() {
  const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>(
    "ATTENDANCE",
    [],
  );

  const addAttendance = (
    record: Omit<AttendanceRecord, "id" | "recordedAt">,
  ) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: Date.now().toString(),
      recordedAt: new Date().toISOString(),
    };
    setAttendance((prev) => [...prev, newRecord]);
    return newRecord;
  };

  return { attendance, addAttendance };
}

// Hook for professional subjects by class
export function useProfessionalSubjects() {
  type ProfessionalSubjectsByClass = Record<string, string[]>; // classId -> subjects[]

  const [professionalSubjects, setProfessionalSubjects] =
    useLocalStorage<ProfessionalSubjectsByClass>("PROFESSIONAL_SUBJECTS", {});

  // Force re-render when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const updated = storage.get<ProfessionalSubjectsByClass>(
        "PROFESSIONAL_SUBJECTS",
      );
      if (updated) {
        setProfessionalSubjects(updated);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(() => {
      const current = storage.get<ProfessionalSubjectsByClass>(
        "PROFESSIONAL_SUBJECTS",
      );
      const currentString = JSON.stringify(current);
      const subjectsString = JSON.stringify(professionalSubjects);
      if (current && currentString !== subjectsString) {
        setProfessionalSubjects(current);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [professionalSubjects, setProfessionalSubjects]);

  const getProfessionalSubjects = (classId: string): string[] => {
    return professionalSubjects[classId] || [];
  };

  const addProfessionalSubject = (classId: string, subject: string) => {
    setProfessionalSubjects((prev) => {
      const classSubjects = prev[classId] || [];
      if (!classSubjects.includes(subject)) {
        return {
          ...prev,
          [classId]: [...classSubjects, subject],
        };
      }
      return prev;
    });
  };

  const removeProfessionalSubject = (classId: string, subject: string) => {
    setProfessionalSubjects((prev) => {
      const classSubjects = prev[classId] || [];
      return {
        ...prev,
        [classId]: classSubjects.filter((s) => s !== subject),
      };
    });
  };

  const setProfessionalSubjectsForClass = (
    classId: string,
    subjects: string[],
  ) => {
    setProfessionalSubjects((prev) => ({
      ...prev,
      [classId]: subjects,
    }));
  };

  return {
    getProfessionalSubjects,
    addProfessionalSubject,
    removeProfessionalSubject,
    setProfessionalSubjectsForClass,
  };
}

// Hook for professional subject templates
export function useProfessionalSubjectTemplates() {
  const [templates, setTemplates] = useLocalStorage<
    ProfessionalSubjectTemplate[]
  >("PROFESSIONAL_SUBJECT_TEMPLATES", []);

  const addTemplate = (
    template: Omit<
      ProfessionalSubjectTemplate,
      "id" | "createdAt" | "updatedAt"
    >,
  ) => {
    const newTemplate: ProfessionalSubjectTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = (
    id: string,
    updates: Partial<ProfessionalSubjectTemplate>,
  ) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === id
          ? { ...template, ...updates, updatedAt: new Date().toISOString() }
          : template,
      ),
    );
  };

  const deleteTemplate = (id: string) => {
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
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCourse,
  };
}

// Hook for archived classes
export function useArchivedClasses() {
  const { classes } = useClasses();
  const archivedClasses = classes.filter((c) => c.archived === true);
  return { archivedClasses };
}
