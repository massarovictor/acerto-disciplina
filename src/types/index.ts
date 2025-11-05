// Core types for the School Incidents System

export type UserRole = 'professor' | 'diretor' | 'coordenador' | 'secretaria';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedClasses?: string[]; // IDs of classes
}

export type IncidentStatus = 'aberta' | 'acompanhamento' | 'resolvida';
export type IncidentSeverity = 'leve' | 'intermediaria' | 'grave' | 'gravissima';
export type FollowUpType = 'conversa_individual' | 'conversa_pais' | 'situacoes_diversas';

export interface IncidentEpisode {
  id: string;
  description: string;
  severity: IncidentSeverity;
  category: string;
}

export interface FollowUpRecord {
  id: string;
  incidentId: string;
  type: FollowUpType;
  date: string;
  responsavel: string;
  motivo?: string;
  providencias?: string;
  assuntosTratados?: string;
  encaminhamentos?: string;
  disciplina?: string;
  tipoSituacao?: string;
  descricaoSituacao?: string;
  createdBy: string;
  createdAt: string;
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
  suggestedAction?: string; // Auto-filled based on severity and history
  status: IncidentStatus;
  validatedBy?: string;
  validatedAt?: string;
  followUps?: FollowUpRecord[];
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
  photoUrl?: string;
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
