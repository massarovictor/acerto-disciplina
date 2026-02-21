import { useEffect, useState } from 'react';

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
import {
  downloadCertificateFiles,
  generateCertificateFiles,
} from '@/lib/certificatePdfExport';
import { getBrasiliaISODate } from '@/lib/brasiliaDate';
import { Class, CreateSavedCertificateEventInput, SavedCertificateEvent, SavedCertificateEventStudent, Student } from '@/types';
import { Award, CalendarCheck, ClipboardCheck, Medal, Plus } from 'lucide-react';
import { CertificatesErrorBoundary } from './certificates/CertificatesErrorBoundary';
import { UnifiedCertificateDialog } from './certificates/UnifiedCertificateDialog';
import { SavedCertificateEventDialog } from './certificates/SavedCertificateEventDialog';
import { SavedCertificateEventsTable } from './certificates/SavedCertificateEventsTable';

interface CertificatesReportsProps {
  classes: Class[];
  students: Student[];
  enabled?: boolean;
}

const CertificatesReportsContent = ({
  classes,
  students,
}: CertificatesReportsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const {
    events,
    loading,
    error,
    createCertificateEventWithStudents,
    updateCertificateEvent,
    deleteCertificateEvent,
  } = useCertificateEvents();

  // Novo Dialog Unificado
  const [showUnifiedDialog, setShowUnifiedDialog] = useState(false);
  const [detailEvent, setDetailEvent] = useState<SavedCertificateEvent | null>(null);

  useEffect(() => {
    if (!detailEvent?.id) return;

    const updatedEvent = events.find((event) => event.id === detailEvent.id) || null;
    setDetailEvent((current) => {
      if (!current) return current;
      if (!updatedEvent) return null;
      if (current.id !== updatedEvent.id) return current;
      return updatedEvent;
    });
  }, [events, detailEvent?.id]);

  const isAdmin = profile?.role === 'admin';

  const downloadEventStudents = async (
    event: SavedCertificateEvent,
    studentsSubset?: SavedCertificateEventStudent[],
    options?: { forceZip?: boolean; zipName?: string; successMessage?: string },
  ) => {
    const exportInput = buildExportInputFromSavedCertificateEvent(event, studentsSubset);
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
    return createCertificateEventWithStudents(input);
  };

  const handleDeleteSavedEvent = async (event: SavedCertificateEvent) => {
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

  const handleDownloadEvent = async (event: SavedCertificateEvent) => {
    try {
      await downloadEventStudents(event, undefined, {
        forceZip: event.students.length > 1,
        successMessage: `Arquivos de "${event.title}" baixados com sucesso.`,
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

  const handleDownloadStudent = async (
    event: SavedCertificateEvent,
    student: SavedCertificateEventStudent,
  ) => {
    try {
      await downloadEventStudents(event, [student], {
        forceZip: false,
        successMessage: `Certificado de ${student.studentNameSnapshot} baixado.`,
      });
    } catch (downloadError) {
      console.error('Erro ao baixar certificado individual:', downloadError);
      toast({
        variant: 'destructive',
        title: 'Erro no download',
        description: 'Não foi possível baixar o certificado do aluno.',
      });
    }
  };

  const handleDownloadStudentsFromDetail = async (
    event: SavedCertificateEvent,
    studentsSubset: SavedCertificateEventStudent[],
  ) => {
    try {
      await downloadEventStudents(event, studentsSubset, {
        forceZip: studentsSubset.length > 1,
        successMessage:
          studentsSubset.length === event.students.length
            ? `Todos os certificados de "${event.title}" foram baixados.`
            : `Subset com ${studentsSubset.length} aluno(s) baixado com sucesso.`,
      });
    } catch (downloadError) {
      console.error('Erro ao baixar subset de alunos:', downloadError);
      toast({
        variant: 'destructive',
        title: 'Erro no download',
        description: 'Não foi possível baixar a seleção de alunos.',
      });
    }
  };

  const handleDownloadSelectedEvents = async (selectedEvents: SavedCertificateEvent[]) => {
    const dateToken = getBrasiliaISODate(new Date());

    try {
      const filesToZip = [] as Awaited<ReturnType<typeof generateCertificateFiles>>;

      for (const event of selectedEvents) {
        const exportInput = buildExportInputFromSavedCertificateEvent(event);
        const generatedFiles = await generateCertificateFiles(exportInput);
        const eventToken = sanitizeCertificateFileToken(event.title || 'evento');
        const eventDateToken = getBrasiliaISODate(event.createdAt);
        const folderPath = `${eventToken}_${eventDateToken || dateToken}`;

        generatedFiles.forEach((file) => {
          filesToZip.push({
            ...file,
            folderPath,
          });
        });
      }

      await downloadCertificateFiles(filesToZip, {
        forceZip: true,
        zipFileName: `Certificados_lista_${dateToken}.zip`,
      });

      toast({
        title: 'Download em lote concluído',
        description: `${selectedEvents.length} evento(s) foram exportados em um único ZIP.`,
      });
    } catch (downloadError) {
      console.error('Erro no download em lote de eventos:', downloadError);
      toast({
        variant: 'destructive',
        title: 'Erro no download em lote',
        description: 'Não foi possível gerar o ZIP da lista selecionada.',
      });
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 mt-[-10px]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Emissão de Certificados</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gere, gerencie e valide os certificados emitidos pela escola.
          </p>
        </div>
        <Button
          className="shadow-sm"
          onClick={() => setShowUnifiedDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Emitir Certificados
        </Button>
      </div>

      <div className="space-y-4">
        <SavedCertificateEventsTable
          events={events}
          loading={loading}
          error={error}
          isAdmin={isAdmin}
          onOpenDetails={setDetailEvent}
          onDownloadEvent={handleDownloadEvent}
          onDeleteEvent={handleDeleteSavedEvent}
        />
      </div>

      <UnifiedCertificateDialog
        open={showUnifiedDialog}
        onOpenChange={setShowUnifiedDialog}
        classes={classes}
        students={students}
        onSaveEvent={handleCreateSavedEvent}
      />

      <SavedCertificateEventDialog
        open={!!detailEvent}
        onOpenChange={(open) => !open && setDetailEvent(null)}
        event={detailEvent}
        onDownloadStudent={handleDownloadStudent}
        onUpdateEvent={updateCertificateEvent}
      />
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
