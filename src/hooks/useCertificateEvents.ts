import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CertificateEventRow,
  CertificateEventStudentRow,
  CertificateEventWithStudentsRow,
  CreateCertificateEventWithStudentsInput,
  UpdateCertificateEventWithStudentsInput,
  mapSavedCertificateEvent,
  normalizeSavedCertificateStudents,
} from "@/lib/certificateEventTypes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { SavedCertificateEvent } from "@/types";

const CERTIFICATE_EVENTS_SELECT = "*, certificate_event_students(*)";
const CERTIFICATES_SCHEMA_MIGRATION_FILE =
  "2026-02-22_certificate_verification_and_signature.sql";
const CERTIFICATES_SCHEMA_OUTDATED_MESSAGE =
  "Schema de certificados desatualizado. Aplicar migration 2026-02-22 no Supabase e executar NOTIFY pgrst, 'reload schema';";

export type CertificateSchemaStatus = "compatible" | "incompatible";

interface UseCertificateEventsResult {
  events: SavedCertificateEvent[];
  loading: boolean;
  error: string | null;
  schemaStatus: CertificateSchemaStatus;
  schemaErrorMessage: string | null;
  listCertificateEvents: () => Promise<void>;
  refresh: () => Promise<void>;
  createCertificateEventWithStudents: (
    input: CreateCertificateEventWithStudentsInput,
  ) => Promise<SavedCertificateEvent>;
  updateCertificateEvent: (
    id: string,
    updates: UpdateCertificateEventInput,
  ) => Promise<SavedCertificateEvent>;
  deleteCertificateEvent: (id: string) => Promise<void>;
}

export type UpdateCertificateEventInput = UpdateCertificateEventWithStudentsInput;

const normalizeSnapshotName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const generateVerificationCode = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").toUpperCase();
  }

  const randomToken = Math.random().toString(36).slice(2, 14).toUpperCase();
  const timeToken = Date.now().toString(36).toUpperCase();
  return `${timeToken}${randomToken}`;
};

const extractErrorText = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (typeof error !== "object") return String(error);

  const record = error as Record<string, unknown>;
  return [record.message, record.details, record.hint, record.code]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" | ")
    .trim();
};

const isCertificateSchemaIncompatibleError = (error: unknown): boolean => {
  const normalized = extractErrorText(error).toLowerCase();
  if (!normalized) return false;

  if (
    normalized.includes(
      "could not find the 'verification_code' column of 'certificate_event_students' in the schema cache",
    )
  ) {
    return true;
  }

  if (
    normalized.includes(
      "could not find the 'verification_status' column of 'certificate_event_students' in the schema cache",
    )
  ) {
    return true;
  }

  if (
    normalized.includes("certificate_event_students") &&
    normalized.includes("verification_code") &&
    normalized.includes("schema cache")
  ) {
    return true;
  }

  if (
    normalized.includes("certificate_event_students") &&
    normalized.includes("verification_code") &&
    normalized.includes("does not exist")
  ) {
    return true;
  }

  return false;
};

const resolveCertificateOperationError = (
  error: unknown,
  fallbackMessage: string,
): { message: string; schemaIncompatible: boolean } => {
  if (isCertificateSchemaIncompatibleError(error)) {
    return {
      message: `${CERTIFICATES_SCHEMA_OUTDATED_MESSAGE} (migration: ${CERTIFICATES_SCHEMA_MIGRATION_FILE})`,
      schemaIncompatible: true,
    };
  }

  const extracted = extractErrorText(error);
  return {
    message: extracted || fallbackMessage,
    schemaIncompatible: false,
  };
};

export const useCertificateEvents = (): UseCertificateEventsResult => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<SavedCertificateEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaStatus, setSchemaStatus] =
    useState<CertificateSchemaStatus>("compatible");
  const [schemaErrorMessage, setSchemaErrorMessage] = useState<string | null>(null);

  const createdByName = useMemo(
    () => profile?.name || user?.email?.split("@")[0] || "Usuário",
    [profile?.name, user?.email],
  );

  const markSchemaIncompatible = useCallback((cause?: unknown) => {
    if (cause) {
      console.error("Schema incompatível para certificados detectado:", cause);
    }
    setSchemaStatus("incompatible");
    setSchemaErrorMessage(CERTIFICATES_SCHEMA_OUTDATED_MESSAGE);
    setError(CERTIFICATES_SCHEMA_OUTDATED_MESSAGE);
  }, []);

  const listCertificateEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      setError(null);
      setSchemaStatus("compatible");
      setSchemaErrorMessage(null);
      setLoading(false);
      return;
    }

    if (schemaStatus === "incompatible") {
      setError(schemaErrorMessage || CERTIFICATES_SCHEMA_OUTDATED_MESSAGE);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: selectError } = await supabase
        .from("certificate_events")
        .select(CERTIFICATE_EVENTS_SELECT)
        .order("created_at", { ascending: false });

      if (selectError) {
        const resolved = resolveCertificateOperationError(
          selectError,
          "Falha ao carregar certificados salvos.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(selectError);
        } else {
          setError(resolved.message);
        }
        setLoading(false);
        return;
      }

      const rawEvents = (data || []) as CertificateEventWithStudentsRow[];
      const repairedEvents: CertificateEventWithStudentsRow[] = [];

      for (const eventRow of rawEvents) {
        const eventStudents = (eventRow.certificate_event_students ||
          []) as CertificateEventStudentRow[];

        if (eventStudents.length === 0) {
          repairedEvents.push(eventRow);
          continue;
        }

        const repairedStudents: CertificateEventStudentRow[] = [];

        for (const row of eventStudents) {
          const currentCode = row.verification_code?.trim();
          if (currentCode) {
            repairedStudents.push({
              ...row,
              verification_code: currentCode.toUpperCase(),
            });
            continue;
          }

          const nextCode = generateVerificationCode();
          const { data: updatedRow, error: updateError } = await supabase
            .from("certificate_event_students")
            .update({
              verification_code: nextCode,
              verification_status:
                row.verification_status === "revoked" ? "revoked" : "valid",
            })
            .eq("id", row.id)
            .select("*")
            .single();

          if (updateError || !updatedRow) {
            const resolved = resolveCertificateOperationError(
              updateError,
              "Falha ao reparar código de verificação legado.",
            );
            if (resolved.schemaIncompatible) {
              markSchemaIncompatible(updateError);
            }
            throw new Error(resolved.message);
          }

          repairedStudents.push(updatedRow as CertificateEventStudentRow);
        }

        repairedEvents.push({
          ...eventRow,
          certificate_event_students: repairedStudents,
        });
      }

      const mapped = repairedEvents.map(
        mapSavedCertificateEvent,
      );

      setEvents(mapped);
      setSchemaStatus("compatible");
      setSchemaErrorMessage(null);
    } catch (unexpectedError) {
      const resolved = resolveCertificateOperationError(
        unexpectedError,
        "Falha inesperada ao carregar certificados salvos.",
      );
      if (resolved.schemaIncompatible) {
        markSchemaIncompatible(unexpectedError);
      }
      const message = resolved.message;
      setError(message);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [
    user?.id,
    schemaStatus,
    schemaErrorMessage,
    markSchemaIncompatible,
  ]);

  useEffect(() => {
    listCertificateEvents();
  }, [listCertificateEvents]);

  const createCertificateEventWithStudents = useCallback(
    async (input: CreateCertificateEventWithStudentsInput) => {
      if (schemaStatus === "incompatible") {
        throw new Error(schemaErrorMessage || CERTIFICATES_SCHEMA_OUTDATED_MESSAGE);
      }

      if (!user?.id) {
        throw new Error("Usuário não autenticado.");
      }

      const normalizedStudents = normalizeSavedCertificateStudents(input.students);
      if (normalizedStudents.length === 0) {
        throw new Error("Selecione ao menos um aluno para salvar o evento.");
      }

      const eventPayload = {
        owner_id: user.id,
        created_by_name: createdByName,
        title: input.title.trim(),
        certificate_type: input.certificateType,
        class_id: input.classId ?? null,
        class_name_snapshot: input.classNameSnapshot,
        school_year: input.schoolYear,
        period_mode: input.periodMode,
        selected_quarters: input.selectedQuarters,
        period_label: input.periodLabel,
        reference_type: input.referenceType ?? null,
        reference_value: input.referenceValue ?? null,
        reference_label: input.referenceLabel ?? null,
        base_text: input.baseText,
        teacher_name: input.teacherName ?? null,
        director_name: input.directorName ?? null,
        signature_mode: input.signatureMode ?? "digital_cursive",
        type_meta: input.typeMeta ?? {},
        students_count: normalizedStudents.length,
        updated_at: new Date().toISOString(),
      };

      const { data: insertedEvent, error: eventError } = await supabase
        .from("certificate_events")
        .insert(eventPayload)
        .select("*")
        .single();

      if (eventError || !insertedEvent) {
        const resolved = resolveCertificateOperationError(
          eventError,
          "Falha ao salvar evento de certificado.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(eventError);
        }
        throw new Error(resolved.message);
      }

      const studentsPayload = normalizedStudents.map((student) => ({
        owner_id: user.id,
        certificate_event_id: insertedEvent.id,
        student_id: student.studentId ?? null,
        student_name_snapshot: student.studentNameSnapshot,
        text_override: student.textOverride ?? null,
        highlight_status: student.highlightStatus ?? null,
        highlight_average: student.highlightAverage ?? null,
        verification_code: generateVerificationCode(),
        verification_status: "valid",
      }));

      const { data: insertedStudents, error: studentsError } = await supabase
        .from("certificate_event_students")
        .insert(studentsPayload)
        .select("*");

      if (studentsError) {
        const { error: rollbackError } = await supabase
          .from("certificate_events")
          .delete()
          .eq("id", insertedEvent.id);

        if (rollbackError) {
          console.error(
            "Falha no rollback de certificate_events após erro em certificate_event_students:",
            rollbackError,
          );
        }

        const resolved = resolveCertificateOperationError(
          studentsError,
          "Falha ao salvar alunos do evento de certificado.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(studentsError);
        }
        throw new Error(resolved.message);
      }

      const mappedEvent = mapSavedCertificateEvent({
        ...(insertedEvent as CertificateEventRow),
        certificate_event_students:
          (insertedStudents as CertificateEventStudentRow[]) || [],
      });

      setEvents((prev) => [mappedEvent, ...prev]);
      return mappedEvent;
    },
    [
      createdByName,
      user?.id,
      schemaStatus,
      schemaErrorMessage,
      markSchemaIncompatible,
    ],
  );

  const deleteCertificateEvent = useCallback(
    async (id: string) => {
      if (schemaStatus === "incompatible") {
        throw new Error(schemaErrorMessage || CERTIFICATES_SCHEMA_OUTDATED_MESSAGE);
      }

      const { error: deleteError } = await supabase
        .from("certificate_events")
        .delete()
        .eq("id", id);

      if (deleteError) {
        const resolved = resolveCertificateOperationError(
          deleteError,
          "Falha ao excluir evento de certificado.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(deleteError);
        }
        throw new Error(resolved.message);
      }

      setEvents((prev) => prev.filter((event) => event.id !== id));
    },
    [schemaStatus, schemaErrorMessage, markSchemaIncompatible],
  );

  const updateCertificateEvent = useCallback(
    async (id: string, updates: UpdateCertificateEventInput) => {
      if (schemaStatus === "incompatible") {
        throw new Error(schemaErrorMessage || CERTIFICATES_SCHEMA_OUTDATED_MESSAGE);
      }

      if (!user?.id) {
        throw new Error("Usuário não autenticado.");
      }

      const normalizedStudents = normalizeSavedCertificateStudents(updates.students);
      if (normalizedStudents.length === 0) {
        throw new Error("Selecione ao menos um aluno para salvar o evento.");
      }

      const { data: currentData, error: currentError } = await supabase
        .from("certificate_events")
        .select(CERTIFICATE_EVENTS_SELECT)
        .eq("id", id)
        .single();

      if (currentError || !currentData) {
        const resolved = resolveCertificateOperationError(
          currentError,
          "Não foi possível carregar o evento antes da atualização.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(currentError);
        }
        throw new Error(resolved.message);
      }

      const eventPayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        title: updates.title.trim(),
        certificate_type: updates.certificateType,
        class_id: updates.classId ?? null,
        class_name_snapshot: updates.classNameSnapshot,
        school_year: updates.schoolYear,
        period_mode: updates.periodMode,
        selected_quarters: updates.selectedQuarters,
        period_label: updates.periodLabel,
        reference_type: updates.referenceType ?? null,
        reference_value: updates.referenceValue ?? null,
        reference_label: updates.referenceLabel ?? null,
        base_text: updates.baseText.trim(),
        teacher_name: updates.teacherName?.trim() || null,
        director_name: updates.directorName?.trim() || null,
        signature_mode: updates.signatureMode ?? "digital_cursive",
        type_meta: updates.typeMeta ?? {},
        students_count: normalizedStudents.length,
      };

      const { error: updateError } = await supabase
        .from("certificate_events")
        .update(eventPayload)
        .eq("id", id);

      if (updateError) {
        const resolved = resolveCertificateOperationError(
          updateError,
          "Falha ao atualizar certificado.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(updateError);
        }
        throw new Error(resolved.message);
      }

      const currentRows =
        ((currentData as CertificateEventWithStudentsRow).certificate_event_students ||
          []) as CertificateEventStudentRow[];

      const availableByStudentId = new Map<string, CertificateEventStudentRow[]>();
      const availableByName = new Map<string, CertificateEventStudentRow[]>();

      currentRows.forEach((row) => {
        if (row.student_id) {
          const list = availableByStudentId.get(row.student_id) || [];
          list.push(row);
          availableByStudentId.set(row.student_id, list);
        }
        const normalizedName = normalizeSnapshotName(row.student_name_snapshot);
        const byNameList = availableByName.get(normalizedName) || [];
        byNameList.push(row);
        availableByName.set(normalizedName, byNameList);
      });

      const usedRowIds = new Set<string>();

      const takeFirstAvailable = (
        rows: CertificateEventStudentRow[] | undefined,
      ): CertificateEventStudentRow | undefined => {
        if (!rows || rows.length === 0) return undefined;
        const row = rows.find((item) => !usedRowIds.has(item.id));
        if (!row) return undefined;
        usedRowIds.add(row.id);
        return row;
      };

      type StudentMutationPayload = {
        student_id: string | null;
        student_name_snapshot: string;
        text_override: string | null;
        highlight_status: "confirmed" | "pending" | null;
        highlight_average: number | null;
        verification_code: string;
        verification_status: "valid" | "revoked";
      };

      const rowsToUpdate: Array<{
        id: string;
        payload: StudentMutationPayload;
      }> = [];

      const rowsToInsert: Array<
        StudentMutationPayload & {
          owner_id: string;
          certificate_event_id: string;
        }
      > = [];

      normalizedStudents.forEach((student) => {
        let matchedRow: CertificateEventStudentRow | undefined;

        if (student.studentId) {
          matchedRow = takeFirstAvailable(availableByStudentId.get(student.studentId));
        }

        if (!matchedRow) {
          const normalizedName = normalizeSnapshotName(student.studentNameSnapshot);
          matchedRow = takeFirstAvailable(availableByName.get(normalizedName));
        }

        const studentPayload: StudentMutationPayload = {
          student_id: student.studentId ?? null,
          student_name_snapshot: student.studentNameSnapshot,
          text_override: student.textOverride ?? null,
          highlight_status: student.highlightStatus ?? null,
          highlight_average: student.highlightAverage ?? null,
          verification_code:
            matchedRow?.verification_code?.trim() || generateVerificationCode(),
          verification_status:
            matchedRow?.verification_status === "revoked" ? "revoked" : "valid",
        };

        if (matchedRow) {
          rowsToUpdate.push({
            id: matchedRow.id,
            payload: studentPayload,
          });
          return;
        }

        rowsToInsert.push({
          owner_id: user.id,
          certificate_event_id: id,
          ...studentPayload,
        });
      });

      for (const row of rowsToUpdate) {
        const { error: updateStudentError } = await supabase
          .from("certificate_event_students")
          .update(row.payload)
          .eq("id", row.id);
        if (updateStudentError) {
          const resolved = resolveCertificateOperationError(
            updateStudentError,
            "Falha ao atualizar alunos do evento.",
          );
          if (resolved.schemaIncompatible) {
            markSchemaIncompatible(updateStudentError);
          }
          throw new Error(resolved.message);
        }
      }

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("certificate_event_students")
          .insert(rowsToInsert);
        if (insertError) {
          const resolved = resolveCertificateOperationError(
            insertError,
            "Falha ao inserir novos alunos no evento.",
          );
          if (resolved.schemaIncompatible) {
            markSchemaIncompatible(insertError);
          }
          throw new Error(resolved.message);
        }
      }

      const rowsToDelete = currentRows.filter((row) => !usedRowIds.has(row.id));
      if (rowsToDelete.length > 0) {
        const { error: deleteStudentsError } = await supabase
          .from("certificate_event_students")
          .delete()
          .in(
            "id",
            rowsToDelete.map((row) => row.id),
          );
        if (deleteStudentsError) {
          const resolved = resolveCertificateOperationError(
            deleteStudentsError,
            "Falha ao remover alunos não selecionados.",
          );
          if (resolved.schemaIncompatible) {
            markSchemaIncompatible(deleteStudentsError);
          }
          throw new Error(resolved.message);
        }
      }

      // Refresh do evento atualizado
      const { data, error: fetchError } = await supabase
        .from("certificate_events")
        .select(CERTIFICATE_EVENTS_SELECT)
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        const resolved = resolveCertificateOperationError(
          fetchError,
          "Não foi possível recarregar o evento atualizado.",
        );
        if (resolved.schemaIncompatible) {
          markSchemaIncompatible(fetchError);
        }
        throw new Error(resolved.message);
      }

      const mapped = mapSavedCertificateEvent(data as CertificateEventWithStudentsRow);
      setEvents((prev) => prev.map((ev) => (ev.id === id ? mapped : ev)));
      return mapped;
    },
    [
      user?.id,
      schemaStatus,
      schemaErrorMessage,
      markSchemaIncompatible,
    ],
  );

  return {
    events,
    loading,
    error,
    schemaStatus,
    schemaErrorMessage,
    listCertificateEvents,
    refresh: listCertificateEvents,
    createCertificateEventWithStudents,
    updateCertificateEvent,
    deleteCertificateEvent,
  };
};
