import { useState, useEffect } from 'react';
import { storage } from '@/lib/localStorage';
import { Incident, Class, Student, Grade, AttendanceRecord } from '@/types';
import { MOCK_CLASSES, MOCK_STUDENTS } from '@/data/mockData';

type StorageKey = 'INCIDENTS' | 'CLASSES' | 'STUDENTS' | 'GRADES' | 'ATTENDANCE';

export function useLocalStorage<T>(key: StorageKey, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storage.get<T>(key);
    return item !== null ? item : initialValue;
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Initialize mock data if empty
export function useInitializeData() {
  useEffect(() => {
    const classes = storage.get<Class[]>('CLASSES');
    const students = storage.get<Student[]>('STUDENTS');
    
    if (!classes || classes.length === 0) {
      storage.set('CLASSES', MOCK_CLASSES);
    }
    
    if (!students || students.length === 0) {
      storage.set('STUDENTS', MOCK_STUDENTS);
    }
  }, []);
}

// Hook for incidents
export function useIncidents() {
  const [incidents, setIncidents] = useLocalStorage<Incident[]>('INCIDENTS', []);
  
  const addIncident = (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newIncident: Incident = {
      ...incident,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIncidents((prev) => [...prev, newIncident]);
    return newIncident;
  };

  const updateIncident = (id: string, updates: Partial<Incident>) => {
    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id
          ? { ...incident, ...updates, updatedAt: new Date().toISOString() }
          : incident
      )
    );
  };

  const deleteIncident = (id: string) => {
    setIncidents((prev) => prev.filter((incident) => incident.id !== id));
  };

  return { incidents, addIncident, updateIncident, deleteIncident };
}

// Hook for classes
export function useClasses() {
  const [classes, setClasses] = useLocalStorage<Class[]>('CLASSES', MOCK_CLASSES);

  const addClass = (classData: Omit<Class, 'id'>) => {
    const newClass: Class = {
      ...classData,
      id: Date.now().toString(),
    };
    setClasses((prev) => [...prev, newClass]);
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<Class>) => {
    setClasses((prev) =>
      prev.map((cls) => (cls.id === id ? { ...cls, ...updates } : cls))
    );
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
  };

  return { classes, addClass, updateClass, deleteClass };
}

// Hook for students
export function useStudents() {
  const [students, setStudents] = useLocalStorage<Student[]>('STUDENTS', MOCK_STUDENTS);

  const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...student,
      id: Date.now().toString(),
    };
    setStudents((prev) => [...prev, newStudent]);
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((student) => (student.id === id ? { ...student, ...updates } : student))
    );
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return { students, addStudent, updateStudent, deleteStudent };
}

// Hook for grades
export function useGrades() {
  const [grades, setGrades] = useLocalStorage<Grade[]>('GRADES', []);

  const addGrade = (grade: Omit<Grade, 'id' | 'recordedAt'>) => {
    setGrades((prev) => {
      // Check if grade already exists for this student, class, subject, and quarter
      const existingIndex = prev.findIndex(
        g => g.studentId === grade.studentId && 
             g.classId === grade.classId && 
             g.subject === grade.subject && 
             g.quarter === grade.quarter
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
          : grade
      )
    );
  };

  return { grades, addGrade, updateGrade };
}

// Hook for attendance
export function useAttendance() {
  const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('ATTENDANCE', []);

  const addAttendance = (record: Omit<AttendanceRecord, 'id' | 'recordedAt'>) => {
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
