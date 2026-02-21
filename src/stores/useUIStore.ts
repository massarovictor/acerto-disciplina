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
    typeFilter: 'all' | 'disciplinar' | 'acompanhamento_familiar';
    searchTerm: string;
}

interface AnalyticsUIState {
    activeTab: 'dashboard' | 'subjects' | 'classes' | 'ranking-alunos' | 'behavior';
    filters: {
        series: string[];
        classIds: string[];
        subjects: string[];
        quarter: string;
        useQuarterRange?: boolean;
        quarterRangeStart?: string;
        quarterRangeEnd?: string;
        schoolYear: 1 | 2 | 3 | 'all';
        calendarYear: number | 'all';
        includeArchived: boolean;
        comparisonClassIds: string[];
        comparisonMode?: 'calendar' | 'courseYear';
        comparisonCourseYear?: 1 | 2 | 3;
    };
}

interface ClassesUIState {
    activeTab: string;
}

interface GradesAttendanceUIState {
    activeTab: string;
}

interface ReportsUIState {
    activeTab: 'integrated' | 'slides' | 'certificates';
}

interface TrajectoryUIState {
    viewMode: 'individual' | 'macro';
    selectedClassId: string;
    selectedStudentId: string;
    selectedSubject: string;
    activeTab: string;
    gridYear: number;
    gridQuarter: string;
    gridCalendarYear: number;
    source?: '' | 'analytics' | 'reports';
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

    // Trajectory page
    trajectoryUI: TrajectoryUIState;

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

    // Actions - Trajectory
    setTrajectoryUI: (data: Partial<TrajectoryUIState>) => void;
    resetTrajectoryUI: () => void;
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
    typeFilter: 'all',
    searchTerm: '',
};

// Ano atual para filtro padrão
const currentCalendarYear = new Date().getFullYear();

const initialAnalyticsUI: AnalyticsUIState = {
    activeTab: 'dashboard',
    filters: {
        series: [],
        classIds: [],
        subjects: [],
        quarter: 'all',
        useQuarterRange: false,
        quarterRangeStart: '1º Bimestre',
        quarterRangeEnd: '4º Bimestre',
        schoolYear: 'all',
        calendarYear: currentCalendarYear,  // ✅ Ano atual por padrão
        includeArchived: false,
        comparisonClassIds: [],
        comparisonMode: 'calendar',
        comparisonCourseYear: 1,
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

const initialTrajectoryUI: TrajectoryUIState = {
    viewMode: 'individual',
    selectedClassId: '',
    selectedStudentId: '',
    selectedSubject: '',
    activeTab: 'summary',
    gridYear: 6,
    gridQuarter: '1º Bimestre',
    gridCalendarYear: new Date().getFullYear() - 4, // Default: ano atual - 4 (aproximação para 6º ano)
    source: '',
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
            trajectoryUI: initialTrajectoryUI,

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

            // Actions - Trajectory
            setTrajectoryUI: (data) =>
                set((state) => ({
                    trajectoryUI: { ...state.trajectoryUI, ...data },
                })),
            resetTrajectoryUI: () =>
                set({ trajectoryUI: initialTrajectoryUI }),
        }),
        {
            name: 'acerto-ui', // Nome da chave no localStorage
        }
    )
);
