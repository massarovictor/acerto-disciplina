// Core types for the School Incidents System

export type UserRole = 'admin' | 'professor' | 'diretor' | 'coordenador' | 'secretaria';

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
  nomeResponsavelPai?: string;
  grauParentesco?: string;
  createdBy: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  date: string;
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
  letter?: string;
  course?: string; // Opcional - pode ser digitado livremente
  directorId?: string;
  directorEmail?: string;
  active: boolean;
  startYear?: 1 | 2 | 3; // Ano de início da turma (série)
  currentYear?: 1 | 2 | 3; // Ano atual da turma (calculado automaticamente)
  startYearDate?: string; // Data de início do primeiro ano (para calcular anos seguintes)
  startCalendarYear?: number; // Ano letivo de início (ex: 2024)
  endCalendarYear?: number; // Ano letivo de fim (ex: 2026)
  archived?: boolean; // Se a turma foi arquivada
  archivedAt?: string | null; // Data de arquivamento
  archivedReason?: string | null; // Motivo do arquivamento
  templateId?: string | null; // ID do template usado para criar a turma
}


export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'approved' | 'recovery' | 'failed';

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
  status: StudentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  quarter: string;
  schoolYear?: 1 | 2 | 3;
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

export interface StudentAcademicStatus {
  studentId: string;
  classId: string;
  year: string; // Ano letivo (ex: "2024")
  status: 'approved' | 'recovery' | 'failed';
  finalGrades: Record<string, number>; // subject -> média final
  subjectsBelowAverage: string[]; // Disciplinas com média < 6
  calculatedAt: string;
}

export interface ProfessionalSubjectTemplate {
  id: string;
  name: string;
  course: string;
  subjectsByYear: {
    year: 1 | 2 | 3;
    subjects: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}
