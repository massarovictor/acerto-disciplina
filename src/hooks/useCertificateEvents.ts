import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CertificateEventRow,
  CertificateEventStudentRow,
  CertificateEventWithStudentsRow,
  CreateCertificateEventWithStudentsInput,
  mapSavedCertificateEvent,
  normalizeSavedCertificateStudents,
} from "@/lib/certificateEventTypes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import { SavedCertificateEvent } from "@/types";

const CERTIFICATE_EVENTS_SELECT = "*, certificate_event_students(*)";

interface UseCertificateEventsResult {
  events: SavedCertificateEvent[];
  loading: boolean;
  error: string | null;
  listCertificateEvents: () => Promise<void>;
  refresh: () => Promise<void>;
  createCertificateEventWithStudents: (
    input: CreateCertificateEventWithStudentsInput,
  ) => Promise<SavedCertificateEvent>;
  updateCertificateEvent: (id: string, updates: UpdateCertificateEventInput) => Promise<void>;
  deleteCertificateEvent: (id: string) => Promise<void>;
}

export interface UpdateCertificateEventInput {
  title?: string;
  baseText?: string;
  teacherName?: string;
  directorName?: string;
}

export const useCertificateEvents = (): UseCertificateEventsResult => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<SavedCertificateEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createdByName = useMemo(
    () => profile?.name || user?.email?.split("@")[0] || "Usuário",
    [profile?.name, user?.email],
  );

  const listCertificateEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      setError(null);
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
        setError(selectError.message);
        setLoading(false);
        return;
      }

      const mapped = ((data || []) as CertificateEventWithStudentsRow[]).map(
        mapSavedCertificateEvent,
      );

      setEvents(mapped);
    } catch (unexpectedError) {
      const message =
        unexpectedError instanceof Error
          ? unexpectedError.message
          : "Falha inesperada ao carregar certificados salvos.";
      setError(message);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    listCertificateEvents();
  }, [listCertificateEvents]);

  const createCertificateEventWithStudents = useCallback(
    async (input: CreateCertificateEventWithStudentsInput) => {
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

      let eventInsertResponse = await supabase
        .from("certificate_events")
        .insert(eventPayload)
        .select("*")
        .single();

      if (
        eventInsertResponse.error &&
        /signature_mode/i.test(eventInsertResponse.error.message || "")
      ) {
        const { signature_mode, ...legacyPayload } = eventPayload;
        eventInsertResponse = await supabase
          .from("certificate_events")
          .insert(legacyPayload)
          .select("*")
          .single();
      }

      const { data: insertedEvent, error: eventError } = eventInsertResponse;

      if (eventError || !insertedEvent) {
        throw new Error(eventError?.message || "Falha ao salvar evento de certificado.");
      }

      const studentsPayload = normalizedStudents.map((student) => ({
        owner_id: user.id,
        certificate_event_id: insertedEvent.id,
        student_id: student.studentId ?? null,
        student_name_snapshot: student.studentNameSnapshot,
        text_override: student.textOverride ?? null,
        highlight_status: student.highlightStatus ?? null,
        highlight_average: student.highlightAverage ?? null,
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

        throw new Error(
          studentsError.message || "Falha ao salvar alunos do evento de certificado.",
        );
      }

      const mappedEvent = mapSavedCertificateEvent({
        ...(insertedEvent as CertificateEventRow),
        certificate_event_students:
          (insertedStudents as CertificateEventStudentRow[]) || [],
      });

      setEvents((prev) => [mappedEvent, ...prev]);
      return mappedEvent;
    },
    [createdByName, user?.id],
  );

  const deleteCertificateEvent = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("certificate_events")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(
          deleteError.message || "Falha ao excluir evento de certificado.",
        );
      }

      setEvents((prev) => prev.filter((event) => event.id !== id));
    },
    [],
  );

  const updateCertificateEvent = useCallback(
    async (id: string, updates: UpdateCertificateEventInput) => {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) payload.title = updates.title.trim();
      if (updates.baseText !== undefined) payload.base_text = updates.baseText.trim();
      if (updates.teacherName !== undefined) payload.teacher_name = updates.teacherName.trim() || null;
      if (updates.directorName !== undefined) payload.director_name = updates.directorName.trim() || null;

      const { error: updateError } = await supabase
        .from("certificate_events")
        .update(payload)
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message || "Falha ao atualizar certificado.");
      }

      // Refresh do evento atualizado
      const { data, error: fetchError } = await supabase
        .from("certificate_events")
        .select(CERTIFICATE_EVENTS_SELECT)
        .eq("id", id)
        .single();

      if (!fetchError && data) {
        const mapped = mapSavedCertificateEvent(data as CertificateEventWithStudentsRow);
        setEvents((prev) => prev.map((ev) => (ev.id === id ? mapped : ev)));
      }
    },
    [],
  );

  return {
    events,
    loading,
    error,
    listCertificateEvents,
    refresh: listCertificateEvents,
    createCertificateEventWithStudents,
    updateCertificateEvent,
    deleteCertificateEvent,
  };
};
