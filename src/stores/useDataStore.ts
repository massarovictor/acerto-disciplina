import { create } from 'zustand';
import { Incident, Student, Class, Grade, AttendanceRecord } from '@/types';

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
}

export const useDataStore = create<DataState>()((set) => ({
    // Estado inicial
    incidents: [],
    students: [],
    classes: [],
    grades: [],
    attendance: [],

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
}));
