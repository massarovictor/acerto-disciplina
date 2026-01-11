import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Persiste estados de interface entre navegações
 * 
 * Mantém seleções como turma ativa, bimestre, ano, tabs abertas, filtros, etc.
 */

// ==================== TYPES ====================

interface GradesUIState {
    selectedClassId: string;
    selectedQuarter: string;
    selectedSchoolYear: number;
}

interface StudentsUIState {
    activeTab: string;
    selectedClassFilter: string;
}

interface IncidentsUIState {
    activeTab: 'aberta' | 'acompanhamento' | 'resolvida';
    classFilter: string;
    searchTerm: string;
}

interface AnalyticsUIState {
    filters: {
        series: string[];
        classIds: string[];
        quarter: string;
        schoolYear: number | 'all';
        calendarYear: number | 'all';
        includeArchived: boolean;
        comparisonClassIds: string[];
    };
}

interface ClassesUIState {
    activeTab: string;
}

interface GradesAttendanceUIState {
    activeTab: string;
}

interface ReportsUIState {
    activeTab: string;
}

interface UIState {
    // Grades/Attendance page
    gradesUI: GradesUIState;

    // Students page
    studentsUI: StudentsUIState;

    // Incidents page
    incidentsUI: IncidentsUIState;

    // Analytics page
    analyticsUI: AnalyticsUIState;

    // Classes page
    classesUI: ClassesUIState;

    // GradesAttendance page
    gradesAttendanceUI: GradesAttendanceUIState;

    // Reports page
    reportsUI: ReportsUIState;

    // Actions - Grades
    setGradesUI: (data: Partial<GradesUIState>) => void;
    resetGradesUI: () => void;

    // Actions - Students
    setStudentsUI: (data: Partial<StudentsUIState>) => void;
    resetStudentsUI: () => void;

    // Actions - Incidents
    setIncidentsUI: (data: Partial<IncidentsUIState>) => void;
    resetIncidentsUI: () => void;

    // Actions - Analytics
    setAnalyticsUI: (data: Partial<AnalyticsUIState>) => void;
    setAnalyticsFilters: (filters: Partial<AnalyticsUIState['filters']>) => void;
    resetAnalyticsUI: () => void;

    // Actions - Classes
    setClassesUI: (data: Partial<ClassesUIState>) => void;
    resetClassesUI: () => void;

    // Actions - GradesAttendance
    setGradesAttendanceUI: (data: Partial<GradesAttendanceUIState>) => void;
    resetGradesAttendanceUI: () => void;

    // Actions - Reports
    setReportsUI: (data: Partial<ReportsUIState>) => void;
    resetReportsUI: () => void;
}

// ==================== INITIAL VALUES ====================

const initialGradesUI: GradesUIState = {
    selectedClassId: '',
    selectedQuarter: '1º Bimestre',
    selectedSchoolYear: 1,
};

const initialStudentsUI: StudentsUIState = {
    activeTab: 'manage',
    selectedClassFilter: '',
};

const initialIncidentsUI: IncidentsUIState = {
    activeTab: 'aberta',
    classFilter: 'all',
    searchTerm: '',
};

const initialAnalyticsUI: AnalyticsUIState = {
    filters: {
        series: [],
        classIds: [],
        quarter: 'all',
        schoolYear: 'all',
        calendarYear: 'all',
        includeArchived: false,
        comparisonClassIds: [],
    },
};

const initialClassesUI: ClassesUIState = {
    activeTab: 'manage',
};

const initialGradesAttendanceUI: GradesAttendanceUIState = {
    activeTab: 'grades',
};

const initialReportsUI: ReportsUIState = {
    activeTab: 'integrated',
};

// ==================== STORE ====================

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            // Estado inicial
            gradesUI: initialGradesUI,
            studentsUI: initialStudentsUI,
            incidentsUI: initialIncidentsUI,
            analyticsUI: initialAnalyticsUI,
            classesUI: initialClassesUI,
            gradesAttendanceUI: initialGradesAttendanceUI,
            reportsUI: initialReportsUI,

            // Actions - Grades
            setGradesUI: (data) =>
                set((state) => ({
                    gradesUI: { ...state.gradesUI, ...data },
                })),
            resetGradesUI: () =>
                set({ gradesUI: initialGradesUI }),

            // Actions - Students
            setStudentsUI: (data) =>
                set((state) => ({
                    studentsUI: { ...state.studentsUI, ...data },
                })),
            resetStudentsUI: () =>
                set({ studentsUI: initialStudentsUI }),

            // Actions - Incidents
            setIncidentsUI: (data) =>
                set((state) => ({
                    incidentsUI: { ...state.incidentsUI, ...data },
                })),
            resetIncidentsUI: () =>
                set({ incidentsUI: initialIncidentsUI }),

            // Actions - Analytics
            setAnalyticsUI: (data) =>
                set((state) => ({
                    analyticsUI: { ...state.analyticsUI, ...data },
                })),
            setAnalyticsFilters: (filters) =>
                set((state) => ({
                    analyticsUI: {
                        ...state.analyticsUI,
                        filters: { ...state.analyticsUI.filters, ...filters },
                    },
                })),
            resetAnalyticsUI: () =>
                set({ analyticsUI: initialAnalyticsUI }),

            // Actions - Classes
            setClassesUI: (data) =>
                set((state) => ({
                    classesUI: { ...state.classesUI, ...data },
                })),
            resetClassesUI: () =>
                set({ classesUI: initialClassesUI }),

            // Actions - GradesAttendance
            setGradesAttendanceUI: (data) =>
                set((state) => ({
                    gradesAttendanceUI: { ...state.gradesAttendanceUI, ...data },
                })),
            resetGradesAttendanceUI: () =>
                set({ gradesAttendanceUI: initialGradesAttendanceUI }),

            // Actions - Reports
            setReportsUI: (data) =>
                set((state) => ({
                    reportsUI: { ...state.reportsUI, ...data },
                })),
            resetReportsUI: () =>
                set({ reportsUI: initialReportsUI }),
        }),
        {
            name: 'acerto-ui', // Nome da chave no localStorage
        }
    )
);
