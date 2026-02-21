// Core types for the School Incidents System

export type UserRole = 'admin' | 'professor' | 'diretor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedClasses?: string[]; // IDs of classes
}

export type IncidentStatus = 'aberta' | 'acompanhamento' | 'resolvida';
export type IncidentSeverity = 'leve' | 'intermediaria' | 'grave' | 'gravissima';
export type IncidentType = 'disciplinar' | 'acompanhamento_familiar';
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
  incidentType: IncidentType;
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
  directorId?: string | null;
  directorEmail?: string | null;
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

export interface ProfessionalSubject {
  id: string;
  classId: string;
  subject: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectByYear {
  year: 1 | 2 | 3;
  subjects: string[];
}

export interface ProfessionalSubjectTemplate {
  id: string;
  name: string;
  course: string;
  subjectsByYear: SubjectByYear[];
  createdAt: string;
  updatedAt: string;
}

// Tipos para Trajetória Acadêmica (Avaliação Longitudinal)

export type SchoolLevel = 'fundamental' | 'medio';

export interface HistoricalGrade {
  id: string;
  studentId: string;
  schoolLevel: SchoolLevel;
  gradeYear: number; // 6, 7, 8, 9 para fundamental; 1, 2, 3 para médio
  subject: string;
  quarter: string;
  grade: number;
  schoolName?: string; // Escola onde cursou (se transferido)
  calendarYear: number; // Ano calendário (ex: 2022)
  createdAt: string;
  updatedAt?: string;
}

export type ExternalAssessmentType = 'SAEB' | 'SIGE' | 'SPAECE' | 'Diagnóstica' | 'Simulado' | 'Outro';

// Posição temporal na timeline
export interface TemporalPosition {
  level: SchoolLevel;
  year?: number; // 6-9 para fundamental, 1-3 para médio
  afterQuarter?: string; // Para posicionar após um bimestre específico
  afterYear?: number; // Para posicionar após um ano do fundamental
}

export interface ExternalAssessment {
  id: string;
  studentId: string;
  assessmentType: ExternalAssessmentType;
  assessmentName: string; // Nome específico da avaliação
  subject?: string; // Disciplina (opcional, algumas são gerais)
  score: number;
  maxScore: number;
  proficiencyLevel?: string; // Nível de proficiência (ex: Básico, Proficiente)
  appliedDate: string;

  // Posicionamento temporal explícito
  schoolLevel: SchoolLevel;
  gradeYear: number;
  quarter?: string;

  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SavedCertificateType =
  | "monitoria"
  | "destaque"
  | "evento_participacao"
  | "evento_organizacao";

export type SavedCertificatePeriodMode = "quarters" | "annual";
export type SavedCertificateReferenceType = "subject" | "area";
export type SignatureMode = "digital_cursive" | "physical_print";
export type CertificateVerificationStatus = "valid" | "revoked";

export interface SavedCertificateEventStudent {
  id: string;
  certificateEventId: string;
  ownerId: string;
  studentId?: string;
  studentNameSnapshot: string;
  textOverride?: string;
  highlightStatus?: "confirmed" | "pending";
  highlightAverage?: number | null;
  verificationCode: string;
  verificationStatus: CertificateVerificationStatus;
  createdAt: string;
}

export interface SavedCertificateEvent {
  id: string;
  ownerId: string;
  createdByName: string;
  title: string;
  certificateType: SavedCertificateType;
  classId?: string;
  classNameSnapshot: string;
  schoolYear: 1 | 2 | 3;
  periodMode: SavedCertificatePeriodMode;
  selectedQuarters: string[];
  periodLabel: string;
  referenceType?: SavedCertificateReferenceType;
  referenceValue?: string;
  referenceLabel?: string;
  baseText: string;
  teacherName?: string;
  directorName?: string;
  signatureMode: SignatureMode;
  typeMeta: Record<string, unknown>;
  studentsCount: number;
  createdAt: string;
  updatedAt: string;
  students: SavedCertificateEventStudent[];
}

export interface CreateSavedCertificateEventStudentInput {
  studentId?: string;
  studentNameSnapshot: string;
  textOverride?: string;
  highlightStatus?: "confirmed" | "pending";
  highlightAverage?: number | null;
}

export interface CreateSavedCertificateEventInput {
  title: string;
  certificateType: SavedCertificateType;
  classId?: string;
  classNameSnapshot: string;
  schoolYear: 1 | 2 | 3;
  periodMode: SavedCertificatePeriodMode;
  selectedQuarters: string[];
  periodLabel: string;
  referenceType?: SavedCertificateReferenceType;
  referenceValue?: string;
  referenceLabel?: string;
  baseText: string;
  teacherName?: string;
  directorName?: string;
  signatureMode?: SignatureMode;
  typeMeta?: Record<string, unknown>;
  students: CreateSavedCertificateEventStudentInput[];
}

export interface UpdateSavedCertificateEventInput {
  title: string;
  certificateType: SavedCertificateType;
  classId?: string;
  classNameSnapshot: string;
  schoolYear: 1 | 2 | 3;
  periodMode: SavedCertificatePeriodMode;
  selectedQuarters: string[];
  periodLabel: string;
  referenceType?: SavedCertificateReferenceType;
  referenceValue?: string;
  referenceLabel?: string;
  baseText: string;
  teacherName?: string;
  directorName?: string;
  signatureMode?: SignatureMode;
  typeMeta?: Record<string, unknown>;
  students: CreateSavedCertificateEventStudentInput[];
}
