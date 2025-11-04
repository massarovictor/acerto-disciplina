// Core types for the School Incidents System

export type UserRole = 'professor' | 'diretor' | 'coordenador' | 'secretaria';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedClasses?: string[]; // IDs of classes
}

export type IncidentStatus = 'aberta' | 'em_analise' | 'resolvida' | 'encerrada';
export type IncidentSeverity = 'leve' | 'intermediaria' | 'grave' | 'gravissima';

export interface IncidentEpisode {
  id: string;
  description: string;
  severity: IncidentSeverity;
  category: string;
}

export interface Incident {
  id: string;
  date: string;
  period: 'morning' | 'afternoon' | 'evening';
  classId: string;
  studentIds: string[];
  episodes: string[]; // Episode IDs
  calculatedSeverity: IncidentSeverity;
  finalSeverity: IncidentSeverity;
  severityOverride?: {
    reason: string;
    overriddenBy: string;
    overriddenAt: string;
    approved: boolean;
    approvedBy?: string;
    approvedAt?: string;
  };
  description: string;
  actions?: string;
  status: IncidentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  year: number; // 1, 2, or 3
  type: 'regular' | 'tecnico';
  directorId?: string;
  shift: 'morning' | 'afternoon' | 'evening';
}

export interface Student {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  enrollmentDate: string;
  status: 'active' | 'transferred' | 'graduated';
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  bimester: 1 | 2 | 3 | 4;
  value: number; // 0-10
  recordedBy: string;
  recordedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'presente' | 'falta' | 'falta_justificada' | 'atestado';
  recordedBy: string;
  recordedAt: string;
}
