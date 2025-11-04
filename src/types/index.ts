// Core types for the School Incidents System

export type UserRole = 'professor' | 'diretor' | 'coordenador' | 'secretaria';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedClasses?: string[]; // IDs of classes
}

export type IncidentStatus = 'aberta' | 'em-analise' | 'resolvida' | 'encerrada';
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
  severityOverrideReason?: string;
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
  series: string;
  course: string;
  directorId?: string;
  active: boolean;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  birthDate: string;
  gender: string;
  enrollment?: string;
  censusId?: string;
  cpf?: string;
  rg?: string;
  status: 'active' | 'inactive' | 'transferred';
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  quarter: string;
  grade: number;
  observation?: string;
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
