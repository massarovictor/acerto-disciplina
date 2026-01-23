import { create } from 'zustand';
import { Incident, Student, Class, Grade, AttendanceRecord, HistoricalGrade, ExternalAssessment } from '@/types';

/**
 * Data Store - Estado global de dados compartilhado entre todos os componentes
 * 
 * Isso resolve o problema de cada hook ter sua própria instância de useState.
 * Agora todos os componentes veem o mesmo estado e atualizações são instantâneas.
 */

interface DataState {
    // Dados
    incidents: Incident[];
    students: Student[];
    classes: Class[];
    grades: Grade[];
    attendance: AttendanceRecord[];
    historicalGrades: HistoricalGrade[];
    externalAssessments: ExternalAssessment[];

    // Status
    incidentsLoaded: boolean;
    incidentsFetching: boolean;
    studentsLoaded: boolean;
    studentsFetching: boolean;
    classesLoaded: boolean;
    classesFetching: boolean;
    gradesLoaded: boolean;
    gradesFetching: boolean;
    attendanceLoaded: boolean;
    attendanceFetching: boolean;
    historicalGradesLoaded: boolean;
    historicalGradesFetching: boolean;
    externalAssessmentsLoaded: boolean;
    externalAssessmentsFetching: boolean;

    // Actions - Incidents
    setIncidents: (incidents: Incident[]) => void;
    addIncident: (incident: Incident) => void;
    updateIncident: (id: string, updates: Partial<Incident>) => void;
    deleteIncident: (id: string) => void;
    setIncidentsLoaded: (loaded: boolean) => void;
    setIncidentsFetching: (fetching: boolean) => void;

    // Actions - Students
    setStudents: (students: Student[]) => void;
    addStudent: (student: Student) => void;
    updateStudent: (id: string, updates: Partial<Student>) => void;
    deleteStudent: (id: string) => void;
    setStudentsLoaded: (loaded: boolean) => void;
    setStudentsFetching: (fetching: boolean) => void;

    // Actions - Classes
    setClasses: (classes: Class[]) => void;
    addClass: (classData: Class) => void;
    updateClass: (id: string, updates: Partial<Class>) => void;
    deleteClass: (id: string) => void;
    setClassesLoaded: (loaded: boolean) => void;
    setClassesFetching: (fetching: boolean) => void;

    // Actions - Grades
    setGrades: (grades: Grade[]) => void;
    addGrade: (grade: Grade) => void;
    updateGrade: (id: string, updates: Partial<Grade>) => void;
    deleteGrade: (id: string) => void;
    setGradesLoaded: (loaded: boolean) => void;
    setGradesFetching: (fetching: boolean) => void;

    // Actions - Attendance
    setAttendance: (attendance: AttendanceRecord[]) => void;
    addAttendance: (record: AttendanceRecord) => void;
    deleteAttendance: (id: string) => void;
    setAttendanceLoaded: (loaded: boolean) => void;
    setAttendanceFetching: (fetching: boolean) => void;

    // Actions - Historical Grades
    setHistoricalGrades: (grades: HistoricalGrade[]) => void;
    addHistoricalGrade: (grade: HistoricalGrade) => void;
    addHistoricalGradesBatch: (grades: HistoricalGrade[]) => void;
    deleteHistoricalGrade: (id: string) => void;
    deleteHistoricalGradesBatch: (ids: string[]) => void;
    setHistoricalGradesLoaded: (loaded: boolean) => void;
    setHistoricalGradesFetching: (fetching: boolean) => void;

    // Actions - External Assessments
    setExternalAssessments: (assessments: ExternalAssessment[]) => void;
    addExternalAssessment: (assessment: ExternalAssessment) => void;
    deleteExternalAssessment: (id: string) => void;
    setExternalAssessmentsLoaded: (loaded: boolean) => void;
    setExternalAssessmentsFetching: (fetching: boolean) => void;
}

export const useDataStore = create<DataState>()((set) => ({
    // Estado inicial
    incidents: [],
    students: [],
    classes: [],
    grades: [],
    attendance: [],
    historicalGrades: [],
    externalAssessments: [],
    incidentsLoaded: false,
    incidentsFetching: false,
    studentsLoaded: false,
    studentsFetching: false,
    classesLoaded: false,
    classesFetching: false,
    gradesLoaded: false,
    gradesFetching: false,
    attendanceLoaded: false,
    attendanceFetching: false,
    historicalGradesLoaded: false,
    historicalGradesFetching: false,
    externalAssessmentsLoaded: false,
    externalAssessmentsFetching: false,

    // Actions - Incidents
    setIncidents: (incidents) => set({ incidents }),
    addIncident: (incident) =>
        set((state) => ({ incidents: [incident, ...state.incidents] })),
    updateIncident: (id, updates) =>
        set((state) => ({
            incidents: state.incidents.map((i) =>
                i.id === id ? { ...i, ...updates } : i
            ),
        })),
    deleteIncident: (id) =>
        set((state) => ({
            incidents: state.incidents.filter((i) => i.id !== id),
        })),
    setIncidentsLoaded: (loaded) => set({ incidentsLoaded: loaded }),
    setIncidentsFetching: (fetching) => set({ incidentsFetching: fetching }),

    // Actions - Students
    setStudents: (students) => set({ students }),
    addStudent: (student) =>
        set((state) => ({ students: [...state.students, student] })),
    updateStudent: (id, updates) =>
        set((state) => ({
            students: state.students.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            ),
        })),
    deleteStudent: (id) =>
        set((state) => ({
            students: state.students.filter((s) => s.id !== id),
        })),
    setStudentsLoaded: (loaded) => set({ studentsLoaded: loaded }),
    setStudentsFetching: (fetching) => set({ studentsFetching: fetching }),

    // Actions - Classes
    setClasses: (classes) => set({ classes }),
    addClass: (classData) =>
        set((state) => ({ classes: [...state.classes, classData] })),
    updateClass: (id, updates) =>
        set((state) => ({
            classes: state.classes.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            ),
        })),
    deleteClass: (id) =>
        set((state) => ({
            classes: state.classes.filter((c) => c.id !== id),
        })),
    setClassesLoaded: (loaded) => set({ classesLoaded: loaded }),
    setClassesFetching: (fetching) => set({ classesFetching: fetching }),

    // Actions - Grades
    setGrades: (grades) => set({ grades }),
    addGrade: (grade) =>
        set((state) => {
            const existingIndex = state.grades.findIndex((g) => g.id === grade.id);
            if (existingIndex >= 0) {
                const updated = [...state.grades];
                updated[existingIndex] = grade;
                return { grades: updated };
            }
            return { grades: [grade, ...state.grades] };
        }),
    updateGrade: (id, updates) =>
        set((state) => ({
            grades: state.grades.map((g) =>
                g.id === id ? { ...g, ...updates } : g
            ),
        })),
    deleteGrade: (id) =>
        set((state) => ({
            grades: state.grades.filter((g) => g.id !== id),
        })),
    setGradesLoaded: (loaded) => set({ gradesLoaded: loaded }),
    setGradesFetching: (fetching) => set({ gradesFetching: fetching }),

    // Actions - Attendance
    setAttendance: (attendance) => set({ attendance }),
    addAttendance: (record) =>
        set((state) => ({ attendance: [...state.attendance, record] })),
    deleteAttendance: (id) =>
        set((state) => ({
            attendance: state.attendance.filter((a) => a.id !== id),
        })),
    setAttendanceLoaded: (loaded) => set({ attendanceLoaded: loaded }),
    setAttendanceFetching: (fetching) => set({ attendanceFetching: fetching }),

    // Actions - Historical Grades
    setHistoricalGrades: (historicalGrades) => {
        // Deduplicate input to prevent warnings
        const unique = new Map(historicalGrades.map(g => [g.id, g]));
        set({ historicalGrades: Array.from(unique.values()) });
    },
    addHistoricalGrade: (grade) =>
        set((state) => {
            const existing = state.historicalGrades.findIndex((g) => g.id === grade.id);
            if (existing >= 0) {
                const updated = [...state.historicalGrades];
                updated[existing] = grade;
                return { historicalGrades: updated };
            }
            return { historicalGrades: [grade, ...state.historicalGrades] };
        }),
    addHistoricalGradesBatch: (newGrades) =>
        set((state) => {
            // Criar um Map para busca rápida de notas existentes por ID
            const gradesMap = new Map(state.historicalGrades.map(g => [g.id, g]));

            // Atualizar/Inserir novas notas no Map
            newGrades.forEach(grade => {
                gradesMap.set(grade.id, grade);
            });

            // Converter de volta para array
            return { historicalGrades: Array.from(gradesMap.values()) };
        }),
    deleteHistoricalGrade: (id) =>
        set((state) => ({
            historicalGrades: state.historicalGrades.filter((g) => g.id !== id),
        })),
    deleteHistoricalGradesBatch: (ids) =>
        set((state) => {
            const idsSet = new Set(ids);
            return {
                historicalGrades: state.historicalGrades.filter((g) => !idsSet.has(g.id)),
            };
        }),
    setHistoricalGradesLoaded: (loaded) => set({ historicalGradesLoaded: loaded }),
    setHistoricalGradesFetching: (fetching) => set({ historicalGradesFetching: fetching }),

    // Actions - External Assessments
    setExternalAssessments: (externalAssessments) => set({ externalAssessments }),
    addExternalAssessment: (assessment) =>
        set((state) => {
            const existing = state.externalAssessments.findIndex((a) => a.id === assessment.id);
            if (existing >= 0) {
                const updated = [...state.externalAssessments];
                updated[existing] = assessment;
                return { externalAssessments: updated };
            }
            return { externalAssessments: [assessment, ...state.externalAssessments] };
        }),
    deleteExternalAssessment: (id) =>
        set((state) => ({
            externalAssessments: state.externalAssessments.filter((a) => a.id !== id),
        })),
    setExternalAssessmentsLoaded: (loaded) => set({ externalAssessmentsLoaded: loaded }),
    setExternalAssessmentsFetching: (fetching) => set({ externalAssessmentsFetching: fetching }),
}));
