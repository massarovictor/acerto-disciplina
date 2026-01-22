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

    // Actions - Incidents
    setIncidents: (incidents: Incident[]) => void;
    addIncident: (incident: Incident) => void;
    updateIncident: (id: string, updates: Partial<Incident>) => void;
    deleteIncident: (id: string) => void;

    // Actions - Students
    setStudents: (students: Student[]) => void;
    addStudent: (student: Student) => void;
    updateStudent: (id: string, updates: Partial<Student>) => void;
    deleteStudent: (id: string) => void;

    // Actions - Classes
    setClasses: (classes: Class[]) => void;
    addClass: (classData: Class) => void;
    updateClass: (id: string, updates: Partial<Class>) => void;
    deleteClass: (id: string) => void;

    // Actions - Grades
    setGrades: (grades: Grade[]) => void;
    addGrade: (grade: Grade) => void;
    updateGrade: (id: string, updates: Partial<Grade>) => void;
    deleteGrade: (id: string) => void;

    // Actions - Attendance
    setAttendance: (attendance: AttendanceRecord[]) => void;
    addAttendance: (record: AttendanceRecord) => void;
    deleteAttendance: (id: string) => void;

    // Actions - Historical Grades
    setHistoricalGrades: (grades: HistoricalGrade[]) => void;
    addHistoricalGrade: (grade: HistoricalGrade) => void;
    addHistoricalGradesBatch: (grades: HistoricalGrade[]) => void;
    deleteHistoricalGrade: (id: string) => void;
    deleteHistoricalGradesBatch: (ids: string[]) => void;

    // Actions - External Assessments
    setExternalAssessments: (assessments: ExternalAssessment[]) => void;
    addExternalAssessment: (assessment: ExternalAssessment) => void;
    deleteExternalAssessment: (id: string) => void;
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

    // Actions - Attendance
    setAttendance: (attendance) => set({ attendance }),
    addAttendance: (record) =>
        set((state) => ({ attendance: [...state.attendance, record] })),
    deleteAttendance: (id) =>
        set((state) => ({
            attendance: state.attendance.filter((a) => a.id !== id),
        })),

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
}));
