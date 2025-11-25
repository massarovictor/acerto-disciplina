// Local storage utilities for data persistence

const STORAGE_KEYS = {
  AUTH_USER: 'school_incidents_auth_user',
  INCIDENTS: 'school_incidents_data',
  CLASSES: 'school_incidents_classes',
  STUDENTS: 'school_incidents_students',
  GRADES: 'school_incidents_grades',
  ATTENDANCE: 'school_incidents_attendance',
  FOLLOWUPS: 'school_incidents_followups',
  PROFESSIONAL_SUBJECTS: 'school_incidents_professional_subjects', // Disciplinas profissionais por turma
  PROFESSIONAL_SUBJECT_TEMPLATES: 'school_incidents_professional_subject_templates', // Templates de disciplinas profissionais
} as const;

export const storage = {
  get<T>(key: keyof typeof STORAGE_KEYS): T | null {
    try {
      const item = localStorage.getItem(STORAGE_KEYS[key]);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  remove(key: keyof typeof STORAGE_KEYS): void {
    localStorage.removeItem(STORAGE_KEYS[key]);
  },

  clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};
