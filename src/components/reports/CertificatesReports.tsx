import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCertificateEvents } from '@/hooks/useCertificateEvents';
import {
  buildExportInputFromSavedCertificateEvent,
  sanitizeCertificateFileToken,
} from '@/lib/certificateEventTypes';
import { getBrasiliaISODate } from '@/lib/brasiliaDate';
import {
  Class,
  CreateSavedCertificateEventInput,
  SavedCertificateEvent,
  SavedCertificateEventStudent,
  Student,
  UpdateSavedCertificateEventInput,
} from '@/types';
import { CertificatesErrorBoundary } from './certificates/CertificatesErrorBoundary';
import { UnifiedCertificateDialog } from './certificates/UnifiedCertificateDialog';
import { SavedCertificateEventsTable } from './certificates/SavedCertificateEventsTable';

const CERTIFICATES_SCHEMA_BLOCK_REASON =
  "Schema de certificados desatualizado no Supabase. Aplique a migration 2026-02-22 e execute NOTIFY pgrst, 'reload schema'; para reativar emissão, edição e download.";

interface CertificatesReportsProps {
  classes: Class[];
  students: Student[];
  enabled?: boolean;
  createRequestNonce?: number;
}

const CertificatesReportsContent = ({
  classes,
  students,
  createRequestNonce,
}: CertificatesReportsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const {
    events,
    loading,
    error,
    schemaStatus,
    schemaErrorMessage,
    retrySchemaCheck,
    createCertificateEventWithStudents,
    updateCertificateEvent,
    deleteCertificateEvent,
  } = useCertificateEvents();

  const [showUnifiedDialog, setShowUnifiedDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SavedCertificateEvent | null>(null);
  const [isRetryingSchema, setIsRetryingSchema] = useState(false);
  const lastCreateRequestRef = useRef<number | undefined>(createRequestNonce);

  useEffect(() => {
    if (!editingEvent?.id) return;

    const updatedEvent = events.find((event) => event.id === editingEvent.id) || null;
    setEditingEvent((current) => {
      if (!current) return current;
      if (!updatedEvent) return null;
      if (current.id !== updatedEvent.id) return current;
      return updatedEvent;
    });
  }, [events, editingEvent?.id]);

  const isAdmin = profile?.role === 'admin';
  const schemaIncompatible = schemaStatus === 'incompatible';
  const schemaBlockMessage = schemaErrorMessage || CERTIFICATES_SCHEMA_BLOCK_REASON;

  useEffect(() => {
    if (!schemaIncompatible) return;
    setShowUnifiedDialog(false);
    setEditingEvent(null);
  }, [schemaIncompatible]);

  useEffect(() => {
    if (createRequestNonce === undefined) return;
    if (createRequestNonce === lastCreateRequestRef.current) return;
    lastCreateRequestRef.current = createRequestNonce;

    if (schemaIncompatible) {
      toast({
        variant: 'destructive',
        title: 'Schema incompatível',
        description: schemaBlockMessage,
      });
      return;
    }

    setEditingEvent(null);
    setShowUnifiedDialog(true);
  }, [createRequestNonce, schemaBlockMessage, schemaIncompatible, toast]);

  const downloadEventStudents = async (
    event: SavedCertificateEvent,
    studentsSubset?: SavedCertificateEventStudent[],
    options?: { forceZip?: boolean; zipName?: string; successMessage?: string },
  ) => {
    if (schemaIncompatible) {
      throw new Error(schemaBlockMessage);
    }

    const exportInput = buildExportInputFromSavedCertificateEvent(event, studentsSubset);
    const { generateCertificateFiles, downloadCertificateFiles } = await import(
      '@/lib/certificatePdfExport'
    );
    const files = await generateCertificateFiles(exportInput);

    if (files.length === 0) {
      throw new Error('Nenhum arquivo foi gerado para o evento selecionado.');
    }

    const titleToken = sanitizeCertificateFileToken(event.title || 'evento');
    const todayToken = getBrasiliaISODate(new Date());

    await downloadCertificateFiles(files, {
      forceZip: options?.forceZip,
      zipFileName:
        options?.zipName || `Certificados_${titleToken}_${todayToken}.zip`,
    });

    if (options?.successMessage) {
      toast({
        title: 'Download concluído',
        description: options.successMessage,
      });
    }
  };

  const handleCreateSavedEvent = async (input: CreateSavedCertificateEventInput) => {
    if (schemaIncompatible) {
      throw new Error(schemaBlockMessage);
    }
    return createCertificateEventWithStudents(input);
  };

  const handleDeleteSavedEvent = async (event: SavedCertificateEvent) => {
    if (schemaIncompatible) {
      toast({
        variant: 'destructive',
        title: 'Schema incompatível',
        description: schemaBlockMessage,
      });
      return;
    }

    try {
      await deleteCertificateEvent(event.id);
      toast({
        title: 'Certificado excluído',
        description: `O evento "${event.title}" foi removido da lista.`,
      });
    } catch (deleteError) {
      console.error('Erro ao excluir evento salvo:', deleteError);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o evento salvo.',
      });
    }
  };

  const handleDownloadEvent = async (
    event: SavedCertificateEvent,
    mode: 'zip_individual' | 'pdf_unico',
  ) => {
    if (schemaIncompatible) {
      toast({
        variant: 'destructive',
        title: 'Schema incompatível',
        description: schemaBlockMessage,
      });
      return;
    }

    try {
      if (mode === 'pdf_unico') {
        const exportInput = buildExportInputFromSavedCertificateEvent(event);
        const { downloadCombinedCertificatePdf } = await import(
          '@/lib/certificatePdfExport'
        );
        await downloadCombinedCertificatePdf(exportInput);
        toast({
          title: 'Download concluído',
          description: `PDF único de "${event.title}" baixado com sucesso.`,
        });
        return;
      }

      await downloadEventStudents(event, undefined, {
        forceZip: true,
        successMessage: `ZIP de "${event.title}" baixado com sucesso.`,
      });
    } catch (downloadError) {
      console.error('Erro ao baixar evento salvo:', downloadError);
      toast({
        variant: 'destructive',
        title: 'Erro no download',
        description: 'Não foi possível baixar os certificados deste evento.',
      });
    }
  };

  const handleUpdateSavedEvent = async (
    eventId: string,
    input: UpdateSavedCertificateEventInput,
  ) => {
    if (schemaIncompatible) {
      throw new Error(schemaBlockMessage);
    }

    try {
      const updated = await updateCertificateEvent(eventId, input);

      toast({
        title: 'Certificado atualizado',
        description: `O evento "${updated.title}" foi atualizado com sucesso.`,
      });
      return updated;
    } catch (updateError) {
      console.error('Erro ao atualizar evento salvo:', updateError);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações do certificado.',
      });
      throw updateError;
    }
  };

  const handleRetrySchemaCheck = async () => {
    setIsRetryingSchema(true);
    try {
      await retrySchemaCheck();
    } finally {
      setIsRetryingSchema(false);
    }
  };

  return (
    <>
      {schemaIncompatible ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              Certificados temporariamente bloqueados
            </CardTitle>
            <CardDescription className="text-destructive/90">
              {schemaBlockMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-destructive/90 space-y-1">
            <p>Ordem recomendada no SQL Editor:</p>
            <p>1. `2026-02-21_certificate_events.sql` (se necessário)</p>
            <p>2. `2026-02-22_certificate_verification_and_signature.sql`</p>
            <p>3. `NOTIFY pgrst, 'reload schema';`</p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleRetrySchemaCheck}
                disabled={loading || isRetryingSchema}
              >
                {isRetryingSchema ? 'Revalidando schema...' : 'Tentar novamente'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <SavedCertificateEventsTable
          events={events}
          loading={loading}
          error={schemaIncompatible ? null : error}
          isAdmin={isAdmin}
          actionsDisabled={schemaIncompatible}
          actionsDisabledReason={schemaBlockMessage}
          onEditEvent={(event) => {
            if (schemaIncompatible) return;
            setEditingEvent(event);
            setShowUnifiedDialog(true);
          }}
          onDownloadEvent={handleDownloadEvent}
          onDeleteEvent={handleDeleteSavedEvent}
        />
      </div>

      {!schemaIncompatible ? (
        <UnifiedCertificateDialog
          open={showUnifiedDialog}
          onOpenChange={(open) => {
            setShowUnifiedDialog(open);
            if (!open) setEditingEvent(null);
          }}
          mode={editingEvent ? 'edit' : 'create'}
          initialEvent={editingEvent || undefined}
          classes={classes}
          students={students}
          onSaveEvent={handleCreateSavedEvent}
          onSubmitEdit={handleUpdateSavedEvent}
        />
      ) : null}
    </>
  );
};

export const CertificatesReports = (props: CertificatesReportsProps) => {
  if (!props.enabled) return null;
  return (
    <CertificatesErrorBoundary>
      <CertificatesReportsContent {...props} />
    </CertificatesErrorBoundary>
  );
};
