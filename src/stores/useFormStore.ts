import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Form Store - Persiste estados de formulários entre navegações
 * 
 * Os dados são salvos em localStorage para sobreviver a recarregamentos.
 * Quando o usuário navega entre páginas, os dados do formulário são preservados.
 */

// ==================== TYPES ====================

interface StudentFormData {
    name: string;
    classId: string;
    birthDate: string;
    gender: string;
    enrollment: string;
    censusId: string;
    cpf: string;
    rg: string;
    photoUrl: string;
}

interface IncidentFormData {
    title: string;
    description: string;
    severity: string;
    category: string;
    studentIds: string[];
    dateOccurred: string;
}

interface ClassFormData {
    templateId: string;
    letter: string;
    course: string;
    startCalendarYear: number;
    endCalendarYear: number;
    currentSeries: 1 | 2 | 3;
    startYearDate: string;
    directorEmail: string;
    active: boolean;
}

interface FormState {
    // Formulários
    studentForm: StudentFormData;
    incidentForm: IncidentFormData;
    classForm: ClassFormData;

    // Actions - Student
    setStudentForm: (data: Partial<StudentFormData>) => void;
    resetStudentForm: () => void;

    // Actions - Incident
    setIncidentForm: (data: Partial<IncidentFormData>) => void;
    resetIncidentForm: () => void;

    // Actions - Class
    setClassForm: (data: Partial<ClassFormData>) => void;
    resetClassForm: () => void;

    // Reset all
    resetAllForms: () => void;
}

// ==================== INITIAL VALUES ====================

const initialStudentForm: StudentFormData = {
    name: '',
    classId: '',
    birthDate: '',
    gender: '',
    enrollment: '',
    censusId: '',
    cpf: '',
    rg: '',
    photoUrl: '',
};

const initialIncidentForm: IncidentFormData = {
    title: '',
    description: '',
    severity: '',
    category: '',
    studentIds: [],
    dateOccurred: '',
};

const currentYear = new Date().getFullYear();
const initialClassForm: ClassFormData = {
    templateId: '',
    letter: '',
    course: '',
    startCalendarYear: currentYear,
    endCalendarYear: currentYear + 2,
    currentSeries: 1,
    startYearDate: `${currentYear}-02-01`,
    directorEmail: '',
    active: true,
};

// ==================== STORE ====================

export const useFormStore = create<FormState>()(
    persist(
        (set) => ({
            // Estado inicial
            studentForm: initialStudentForm,
            incidentForm: initialIncidentForm,
            classForm: initialClassForm,

            // Actions - Student
            setStudentForm: (data) =>
                set((state) => ({
                    studentForm: { ...state.studentForm, ...data },
                })),
            resetStudentForm: () =>
                set({ studentForm: initialStudentForm }),

            // Actions - Incident
            setIncidentForm: (data) =>
                set((state) => ({
                    incidentForm: { ...state.incidentForm, ...data },
                })),
            resetIncidentForm: () =>
                set({ incidentForm: initialIncidentForm }),

            // Actions - Class
            setClassForm: (data) =>
                set((state) => ({
                    classForm: { ...state.classForm, ...data },
                })),
            resetClassForm: () =>
                set({ classForm: initialClassForm }),

            // Reset all
            resetAllForms: () =>
                set({
                    studentForm: initialStudentForm,
                    incidentForm: initialIncidentForm,
                    classForm: initialClassForm,
                }),
        }),
        {
            name: 'acerto-forms', // Nome da chave no localStorage
        }
    )
);
