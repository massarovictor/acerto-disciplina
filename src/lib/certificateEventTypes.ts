import {
  CreateSavedCertificateEventInput,
  CreateSavedCertificateEventStudentInput,
  SavedCertificateEvent,
  SavedCertificateEventStudent,
  SavedCertificateType,
} from "@/types";
import {
  ExportCertificatesPdfInput,
  HighlightStudentMeta,
} from "@/lib/certificatePdfExport";

export interface SavedCertificateHighlightMeta {
  status: "confirmed" | "pending";
  average: number | null;
}

export interface SavedCertificateMonitoriaMeta {
  workloadHours: number;
  monitoriaPeriod: string;
  activity: string;
}

export interface SavedCertificateEventMeta {
  eventName: string;
  eventDate: string;
  eventDateStart?: string;
  eventDateEnd?: string;
  location: string;
  workloadHours: number;
  role: string;
}

export interface CertificateEventTypeMeta {
  monitoriaMeta?: SavedCertificateMonitoriaMeta;
  eventMeta?: SavedCertificateEventMeta;
  highlightMetaByStudentId?: Record<string, SavedCertificateHighlightMeta>;
}

export interface CertificateEventRow {
  id: string;
  owner_id: string;
  created_by_name: string;
  title: string;
  certificate_type: SavedCertificateType;
  class_id: string | null;
  class_name_snapshot: string;
  school_year: number;
  period_mode: "quarters" | "annual";
  selected_quarters: string[] | null;
  period_label: string;
  reference_type: "subject" | "area" | null;
  reference_value: string | null;
  reference_label: string | null;
  base_text: string;
  teacher_name: string | null;
  director_name: string | null;
  signature_mode: "digital_cursive" | "physical_print" | null;
  type_meta: Record<string, unknown> | null;
  students_count: number;
  created_at: string;
  updated_at: string;
}

export interface CertificateEventStudentRow {
  id: string;
  owner_id: string;
  certificate_event_id: string;
  student_id: string | null;
  student_name_snapshot: string;
  text_override: string | null;
  highlight_status: "confirmed" | "pending" | null;
  highlight_average: number | null;
  verification_code: string | null;
  verification_status: "valid" | "revoked" | null;
  created_at: string;
}

export interface CertificateEventWithStudentsRow extends CertificateEventRow {
  certificate_event_students?: CertificateEventStudentRow[] | null;
}

export type CreateCertificateEventWithStudentsInput =
  CreateSavedCertificateEventInput;

export type CreateCertificateEventWithStudentsResult = SavedCertificateEvent;

export const CERTIFICATE_TYPE_LABEL: Record<SavedCertificateType, string> = {
  monitoria: "Monitoria",
  destaque: "Aluno Destaque",
  evento_participacao: "Evento: Participação",
  evento_organizacao: "Evento: Organização",
};

export const CERTIFICATE_TYPE_ORDER: SavedCertificateType[] = [
  "monitoria",
  "destaque",
  "evento_participacao",
  "evento_organizacao",
];

export const normalizeSavedCertificateStudents = (
  students: CreateSavedCertificateEventStudentInput[],
): CreateSavedCertificateEventStudentInput[] =>
  students.map((student) => ({
    studentId: student.studentId || undefined,
    studentNameSnapshot: student.studentNameSnapshot.trim(),
    textOverride: student.textOverride?.trim() || undefined,
    highlightStatus: student.highlightStatus,
    highlightAverage:
      typeof student.highlightAverage === "number" ? student.highlightAverage : null,
  }));

export const sanitizeCertificateFileToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export const mapSavedCertificateEventStudent = (
  row: CertificateEventStudentRow,
): SavedCertificateEventStudent => ({
  id: row.id,
  certificateEventId: row.certificate_event_id,
  ownerId: row.owner_id,
  studentId: row.student_id || undefined,
  studentNameSnapshot: row.student_name_snapshot,
  textOverride: row.text_override || undefined,
  highlightStatus: row.highlight_status || undefined,
  highlightAverage:
    typeof row.highlight_average === "number" ? row.highlight_average : row.highlight_average ?? null,
  verificationCode: row.verification_code || row.id,
  verificationStatus: row.verification_status || "valid",
  createdAt: row.created_at,
});

export const mapSavedCertificateEvent = (
  row: CertificateEventWithStudentsRow,
): SavedCertificateEvent => {
  const students = (row.certificate_event_students || []).map(
    mapSavedCertificateEventStudent,
  ).sort((a, b) =>
    a.studentNameSnapshot.localeCompare(b.studentNameSnapshot, "pt-BR"),
  );

  return {
    id: row.id,
    ownerId: row.owner_id,
    createdByName: row.created_by_name,
    title: row.title,
    certificateType: row.certificate_type,
    classId: row.class_id || undefined,
    classNameSnapshot: row.class_name_snapshot,
    schoolYear: row.school_year as 1 | 2 | 3,
    periodMode: row.period_mode,
    selectedQuarters: row.selected_quarters || [],
    periodLabel: row.period_label,
    referenceType: row.reference_type || undefined,
    referenceValue: row.reference_value || undefined,
    referenceLabel: row.reference_label || undefined,
    baseText: row.base_text,
    teacherName: row.teacher_name || undefined,
    directorName: row.director_name || undefined,
    signatureMode: row.signature_mode === "physical_print" ? "physical_print" : "digital_cursive",
    typeMeta: row.type_meta || {},
    studentsCount: row.students_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    students,
  };
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const buildReferenceLabel = (
  event: SavedCertificateEvent,
): string | undefined => {
  if (event.referenceLabel?.trim()) return event.referenceLabel.trim();
  if (!event.referenceType || !event.referenceValue) return undefined;

  const prefix = event.referenceType === "subject" ? "Disciplina" : "Área";
  return `${prefix}: ${event.referenceValue}`;
};

const readMonitoriaMeta = (
  typeMeta: Record<string, unknown>,
): SavedCertificateMonitoriaMeta | undefined => {
  const value = asRecord(typeMeta.monitoriaMeta);
  const workloadHours = asFiniteNumber(value.workloadHours);
  const monitoriaPeriod = asString(value.monitoriaPeriod);
  const activity = asString(value.activity);

  if (
    workloadHours === null ||
    !monitoriaPeriod ||
    !activity
  ) {
    return undefined;
  }

  return { workloadHours, monitoriaPeriod, activity };
};

const readEventMeta = (
  typeMeta: Record<string, unknown>,
): SavedCertificateEventMeta | undefined => {
  const value = asRecord(typeMeta.eventMeta);
  const eventName = asString(value.eventName);
  const eventDate = asString(value.eventDate);
  const location = asString(value.location);
  const role = asString(value.role);
  const workloadHours = asFiniteNumber(value.workloadHours);

  if (!eventName || !eventDate || !location || !role || workloadHours === null) {
    return undefined;
  }

  return {
    eventName,
    eventDate,
    eventDateStart: asString(value.eventDateStart),
    eventDateEnd: asString(value.eventDateEnd),
    location,
    workloadHours,
    role,
  };
};

const buildHighlightMetaByStudentId = (
  event: SavedCertificateEvent,
  selectedStudents: SavedCertificateEventStudent[],
): Record<string, HighlightStudentMeta> | undefined => {
  const metaById: Record<string, HighlightStudentMeta> = {};

  const metaFromEvent = asRecord(asRecord(event.typeMeta).highlightMetaByStudentId);
  Object.entries(metaFromEvent).forEach(([studentId, rawValue]) => {
    const value = asRecord(rawValue);
    const status =
      value.status === "confirmed" || value.status === "pending"
        ? value.status
        : undefined;

    if (!status) return;

    metaById[studentId] = {
      status,
      average: asFiniteNumber(value.average),
    };
  });

  selectedStudents.forEach((student) => {
    if (!student.highlightStatus) return;
    const exportStudentId = student.studentId || student.id;
    metaById[exportStudentId] = {
      status: student.highlightStatus,
      average:
        typeof student.highlightAverage === "number"
          ? student.highlightAverage
          : null,
    };
  });

  return Object.keys(metaById).length > 0 ? metaById : undefined;
};

export const buildExportInputFromSavedCertificateEvent = (
  event: SavedCertificateEvent,
  studentsSubset?: SavedCertificateEventStudent[],
): ExportCertificatesPdfInput => {
  const selectedStudents =
    studentsSubset && studentsSubset.length > 0 ? studentsSubset : event.students;

  const resolvedStudents = selectedStudents.map((student) => ({
    id: student.studentId || student.id,
    name: student.studentNameSnapshot,
  }));

  const textOverrides = selectedStudents.reduce<Record<string, string>>(
    (acc, student) => {
      const text = student.textOverride?.trim();
      if (!text) return acc;
      const exportStudentId = student.studentId || student.id;
      acc[exportStudentId] = text;
      return acc;
    },
    {},
  );

  const typeMeta = asRecord(event.typeMeta);
  const verificationCodesByStudentId = selectedStudents.reduce<Record<string, string>>(
    (acc, student) => {
      const exportStudentId = student.studentId || student.id;
      const code = student.verificationCode?.trim();
      if (!code) return acc;
      acc[exportStudentId] = code;
      return acc;
    },
    {},
  );

  return {
    certificateType: event.certificateType,
    classData: {
      id: event.classId,
      name: event.classNameSnapshot,
    },
    schoolYear: event.schoolYear,
    periodLabel: event.periodLabel,
    referenceLabel: buildReferenceLabel(event),
    baseText: event.baseText,
    students: resolvedStudents,
    textOverrides,
    teacherName: event.teacherName,
    directorName: event.directorName,
    signatureMode: event.signatureMode,
    verificationCodesByStudentId:
      Object.keys(verificationCodesByStudentId).length > 0
        ? verificationCodesByStudentId
        : undefined,
    monitoriaMeta: event.certificateType === "monitoria" ? readMonitoriaMeta(typeMeta) : undefined,
    eventMeta:
      event.certificateType === "evento_participacao" ||
      event.certificateType === "evento_organizacao"
        ? readEventMeta(typeMeta)
        : undefined,
    highlightMetaByStudentId:
      event.certificateType === "destaque"
        ? buildHighlightMetaByStudentId(event, selectedStudents)
        : undefined,
  };
};
