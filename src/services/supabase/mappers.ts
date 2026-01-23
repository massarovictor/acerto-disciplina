import {
  AttendanceRecord,
  Class,
  Comment,
  FollowUpRecord,
  Grade,
  Incident,
  ProfessionalSubjectTemplate,
  Student,
  User,
} from '@/types';
import { calculateCurrentYear } from '@/lib/classYearCalculator';

export interface ProfileRow {
  id: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: string;
  owner_id: string;
  name: string;
  series: string;
  letter: string | null;
  course: string | null;
  director_id: string | null;
  director_email: string | null;
  active: boolean;
  start_year: number | null;
  current_year: number | null;
  start_year_date: string | null;
  start_calendar_year: number | null;
  end_calendar_year: number | null;
  archived: boolean;
  archived_at: string | null;
  archived_reason: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}


export interface StudentRow {
  id: string;
  owner_id: string;
  class_id: string;
  name: string;
  birth_date: string;
  gender: string;
  enrollment: string | null;
  census_id: string | null;
  cpf: string | null;
  rg: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GradeRow {
  id: string;
  owner_id: string;
  student_id: string;
  class_id: string;
  subject: string;
  quarter: string;
  school_year: number | null;
  grade: number;
  observation: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRow {
  id: string;
  owner_id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: string;
  recorded_by: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentRow {
  id: string;
  owner_id: string;
  class_id: string;
  date: string;
  student_ids: string[];
  episodes: string[];
  calculated_severity: string;
  final_severity: string;
  severity_override_reason: string | null;
  description: string | null;
  actions: string | null;
  suggested_action: string | null;
  status: string;
  validated_by: string | null;
  validated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpRow {
  id: string;
  owner_id: string;
  incident_id: string;
  type: string;
  date: string;
  responsavel: string | null;
  motivo: string | null;
  providencias: string | null;
  assuntos_tratados: string | null;
  encaminhamentos: string | null;
  disciplina: string | null;
  tipo_situacao: string | null;
  descricao_situacao: string | null;
  nome_responsavel_pai: string | null;
  grau_parentesco: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  owner_id: string;
  incident_id: string;
  user_id: string | null;
  user_name: string | null;
  text: string;
  created_at: string;
}

export interface ProfessionalSubjectTemplateRow {
  id: string;
  owner_id: string;
  name: string;
  course: string;
  subjects_by_year: ProfessionalSubjectTemplate['subjectsByYear'];
  created_at: string;
  updated_at: string;
}

export interface ProfessionalSubjectRow {
  id: string;
  owner_id: string;
  class_id: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

export const mapProfileFromDb = (row: ProfileRow): User => ({
  id: row.id,
  name: row.name,
  email: '',
  role: row.role as User['role'],
});

export const mapClassFromDb = (row: ClassRow): Class => {
  // CORREÇÃO CRÍTICA: Calcular currentYear automaticamente baseado na data de início
  // Se temos start_year_date e start_year, calcular o ano atual dinamicamente
  // Senão, usar o valor manual do banco (para compatibilidade com turmas antigas)
  let computedCurrentYear: Class['currentYear'];

  if (row.start_year_date && row.start_year) {
    try {
      computedCurrentYear = calculateCurrentYear(
        row.start_year_date,
        row.start_year
      ) as Class['currentYear'];
    } catch (error) {
      // Se falhar, usar valor manual do banco
      computedCurrentYear = row.current_year as Class['currentYear'];
    }
  } else {
    // Se não temos dados para calcular, usar valor manual
    computedCurrentYear = row.current_year as Class['currentYear'];
  }

  return {
    id: row.id,
    name: row.name,
    series: row.series,
    letter: row.letter ?? undefined,
    course: row.course ?? undefined,
    directorId: row.director_id ?? undefined,
    directorEmail: row.director_email ?? undefined,
    active: row.active,
    startYear: row.start_year as Class['startYear'],
    currentYear: computedCurrentYear,
    startYearDate: row.start_year_date ?? undefined,
    startCalendarYear: row.start_calendar_year ?? undefined,
    endCalendarYear: row.end_calendar_year ?? undefined,
    archived: row.archived,
    archivedAt: row.archived_at ?? undefined,
    archivedReason: row.archived_reason ?? undefined,
    templateId: row.template_id ?? undefined,
  };
};

export const mapClassToDb = (
  data: Omit<Class, 'id'>,
  ownerId: string,
  options: { omitName?: boolean } = {},
) => ({
  owner_id: ownerId,
  ...(options.omitName ? {} : { name: data.name }),
  series: data.series,
  letter: data.letter ?? null,
  course: data.course ?? null,
  director_id: data.directorId ?? null,
  director_email: data.directorEmail ?? null,
  active: data.active,
  start_year: data.startYear ?? null,
  current_year: data.currentYear ?? null,
  start_year_date: data.startYearDate ?? null,
  start_calendar_year: data.startCalendarYear ?? null,
  end_calendar_year: data.endCalendarYear ?? null,
  archived: data.archived ?? false,
  archived_at: data.archivedAt ?? null,
  archived_reason: data.archivedReason ?? null,
  template_id: data.templateId ?? null,
});


export const mapStudentFromDb = (row: StudentRow): Student => ({
  id: row.id,
  name: row.name,
  classId: row.class_id,
  birthDate: row.birth_date,
  gender: row.gender,
  enrollment: row.enrollment ?? undefined,
  censusId: row.census_id ?? undefined,
  cpf: row.cpf ?? undefined,
  rg: row.rg ?? undefined,
  photoUrl: row.photo_url ?? undefined,
  status: row.status as Student['status'],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapStudentToDb = (
  data: Omit<Student, 'id'>,
  ownerId: string,
) => ({
  owner_id: ownerId,
  class_id: data.classId,
  name: data.name,
  birth_date: data.birthDate,
  gender: data.gender,
  enrollment: data.enrollment ?? null,
  census_id: data.censusId ?? null,
  cpf: data.cpf ?? null,
  rg: data.rg ?? null,
  photo_url: data.photoUrl ?? null,
  status: data.status,
});

export const mapGradeFromDb = (row: GradeRow): Grade => ({
  id: row.id,
  studentId: row.student_id,
  classId: row.class_id,
  subject: row.subject,
  quarter: row.quarter,
  schoolYear: (row.school_year ?? 1) as Grade['schoolYear'],
  grade: Number(String(row.grade ?? '').replace(',', '.')),
  observation: row.observation ?? undefined,
  recordedAt: row.recorded_at,
});

export const mapGradeToDb = (
  data: Omit<Grade, 'id' | 'recordedAt'>,
  ownerId: string,
) => ({
  owner_id: ownerId,
  student_id: data.studentId,
  class_id: data.classId,
  subject: data.subject,
  quarter: data.quarter,
  school_year: data.schoolYear ?? 1,
  grade: data.grade,
  observation: data.observation ?? null,
  recorded_at: new Date().toISOString(),
});

export const mapAttendanceFromDb = (row: AttendanceRow): AttendanceRecord => ({
  id: row.id,
  studentId: row.student_id,
  classId: row.class_id,
  date: row.date,
  status: row.status as AttendanceRecord['status'],
  recordedBy: row.recorded_by ?? '',
  recordedAt: row.recorded_at,
});

export const mapAttendanceToDb = (
  data: Omit<AttendanceRecord, 'id' | 'recordedAt'>,
  ownerId: string,
  recordedBy: string | null,
) => ({
  owner_id: ownerId,
  student_id: data.studentId,
  class_id: data.classId,
  date: data.date,
  status: data.status,
  recorded_by: recordedBy,
  recorded_at: new Date().toISOString(),
});

export const mapIncidentFromDb = (row: IncidentRow): Incident => ({
  id: row.id,
  date: row.date,
  classId: row.class_id,
  studentIds: row.student_ids ?? [],
  episodes: row.episodes ?? [],
  calculatedSeverity: row.calculated_severity as Incident['calculatedSeverity'],
  finalSeverity: row.final_severity as Incident['finalSeverity'],
  severityOverrideReason: row.severity_override_reason ?? undefined,
  description: row.description ?? '',
  actions: row.actions ?? undefined,
  suggestedAction: row.suggested_action ?? undefined,
  status: row.status as Incident['status'],
  validatedBy: row.validated_by ?? undefined,
  validatedAt: row.validated_at ?? undefined,
  followUps: [],
  createdBy: row.created_by ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  comments: [],
});

export const mapIncidentToDb = (
  data: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'followUps' | 'comments'>,
  ownerId: string,
  createdBy: string | null,
) => ({
  owner_id: ownerId,
  class_id: data.classId,
  date: data.date,
  student_ids: data.studentIds,
  episodes: data.episodes,
  calculated_severity: data.calculatedSeverity,
  final_severity: data.finalSeverity,
  severity_override_reason: data.severityOverrideReason ?? null,
  description: data.description ?? null,
  actions: data.actions ?? null,
  suggested_action: data.suggestedAction ?? null,
  status: data.status,
  validated_by: data.validatedBy ?? null,
  validated_at: data.validatedAt ?? null,
  created_by: createdBy,
});

export const mapFollowUpFromDb = (row: FollowUpRow): FollowUpRecord => ({
  id: row.id,
  incidentId: row.incident_id,
  type: row.type as FollowUpRecord['type'],
  date: row.date,
  responsavel: row.responsavel ?? '',
  motivo: row.motivo ?? undefined,
  providencias: row.providencias ?? undefined,
  assuntosTratados: row.assuntos_tratados ?? undefined,
  encaminhamentos: row.encaminhamentos ?? undefined,
  disciplina: row.disciplina ?? undefined,
  tipoSituacao: row.tipo_situacao ?? undefined,
  descricaoSituacao: row.descricao_situacao ?? undefined,
  nomeResponsavelPai: row.nome_responsavel_pai ?? undefined,
  grauParentesco: row.grau_parentesco ?? undefined,
  createdBy: row.created_by ?? '',
  createdAt: row.created_at,
});

export const mapFollowUpToDb = (
  data: Omit<FollowUpRecord, 'id' | 'incidentId' | 'createdAt'>,
  incidentId: string,
  ownerId: string,
  createdBy: string | null,
) => ({
  owner_id: ownerId,
  incident_id: incidentId,
  type: data.type,
  date: data.date,
  responsavel: data.responsavel ?? null,
  motivo: data.motivo ?? null,
  providencias: data.providencias ?? null,
  assuntos_tratados: data.assuntosTratados ?? null,
  encaminhamentos: data.encaminhamentos ?? null,
  disciplina: data.disciplina ?? null,
  tipo_situacao: data.tipoSituacao ?? null,
  descricao_situacao: data.descricaoSituacao ?? null,
  nome_responsavel_pai: data.nomeResponsavelPai ?? null,
  grau_parentesco: data.grauParentesco ?? null,
  created_by: createdBy,
});

export const mapCommentFromDb = (row: CommentRow): Comment => ({
  id: row.id,
  userId: row.user_id ?? '',
  userName: row.user_name ?? '',
  text: row.text,
  createdAt: row.created_at,
});

export const mapCommentToDb = (
  data: Omit<Comment, 'id' | 'createdAt'>,
  incidentId: string,
  ownerId: string,
) => ({
  owner_id: ownerId,
  incident_id: incidentId,
  user_id: data.userId ?? null,
  user_name: data.userName ?? null,
  text: data.text,
});

export const mapTemplateFromDb = (
  row: ProfessionalSubjectTemplateRow,
): ProfessionalSubjectTemplate => ({
  id: row.id,
  name: row.name,
  course: row.course,
  subjectsByYear: row.subjects_by_year ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapTemplateToDb = (
  data: Omit<ProfessionalSubjectTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ownerId: string,
) => ({
  owner_id: ownerId,
  name: data.name,
  course: data.course,
  subjects_by_year: data.subjectsByYear,
});

export const mapProfessionalSubjectFromDb = (
  row: ProfessionalSubjectRow,
) => ({
  id: row.id,
  classId: row.class_id,
  subject: row.subject,
});

export const mapProfessionalSubjectToDb = (
  classId: string,
  subject: string,
  ownerId: string,
) => ({
  owner_id: ownerId,
  class_id: classId,
  subject,
});
