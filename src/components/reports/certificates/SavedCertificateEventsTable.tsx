import { useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CERTIFICATE_TYPE_LABEL, CERTIFICATE_TYPE_ORDER } from '@/lib/certificateEventTypes';
import { formatBrasiliaDateTime } from '@/lib/brasiliaDate';
import { resolveCreatorDisplayName } from '@/lib/userDisplayName';
import { SavedCertificateEvent, SavedCertificateType } from '@/types';
import { Download, ExternalLink, Search, Trash2 } from 'lucide-react';

interface SavedCertificateEventsTableProps {
  events: SavedCertificateEvent[];
  loading: boolean;
  error?: string | null;
  actionsDisabled?: boolean;
  actionsDisabledReason?: string;
  onEditEvent: (event: SavedCertificateEvent) => void;
  onDownloadEvent: (
    event: SavedCertificateEvent,
    mode: 'zip_individual' | 'pdf_unico',
  ) => Promise<void>;
  onDeleteEvent: (event: SavedCertificateEvent) => Promise<void>;
}

export const SavedCertificateEventsTable = ({
  events,
  loading,
  error,
  actionsDisabled = false,
  actionsDisabledReason,
  onEditEvent,
  onDownloadEvent,
  onDeleteEvent,
}: SavedCertificateEventsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SavedCertificateType>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadEvent, setDownloadEvent] = useState<SavedCertificateEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<SavedCertificateEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!actionsDisabled) return;
    setDownloadEvent(null);
    setDeletingEvent(null);
  }, [actionsDisabled]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesType = typeFilter === 'all' || event.certificateType === typeFilter;
      if (!matchesType) return false;

      if (!normalizedSearch) return true;

      return (
        event.title.toLowerCase().includes(normalizedSearch) ||
        event.classNameSnapshot.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [events, searchTerm, typeFilter]);

  const sortedEvents = useMemo(
    () =>
      [...filteredEvents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [filteredEvents],
  );

  const handleDownloadEvent = async (
    event: SavedCertificateEvent,
    mode: 'zip_individual' | 'pdf_unico',
  ) => {
    if (actionsDisabled) return;

    setDownloadingId(event.id);
    try {
      await onDownloadEvent(event, mode);
    } finally {
      setDownloadingId(null);
      setDownloadEvent(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent || actionsDisabled) return;

    setDeletingId(deletingEvent.id);
    try {
      await onDeleteEvent(deletingEvent);
      setDeletingEvent(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                Filtrar e Buscar
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nome do evento ou turma..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as 'all' | SavedCertificateType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {CERTIFICATE_TYPE_ORDER.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CERTIFICATE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md border p-3">
          <div className="border-b border-border/60 pb-3 mb-3">
            <h3 className="text-base font-semibold text-foreground">Certificados Emitidos</h3>
            <p className="text-xs text-muted-foreground">
              Visualize, edite, baixe ou exclua certificados salvos.
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Carregando certificados salvos...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">{error}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum certificado salvo encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all bg-card shadow-sm cursor-pointer group"
                  onClick={() => {
                    if (actionsDisabled) return;
                    onEditEvent(event);
                  }}
                >
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-foreground">{event.title}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                        {CERTIFICATE_TYPE_LABEL[event.certificateType]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                        {event.periodLabel}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground/80">
                        {event.classNameSnapshot || 'Turma N/A'}
                      </span>
                      <span>&bull;</span>
                      <span>{event.studentsCount} aluno(s)</span>
                      <span>&bull;</span>
                      <span>{formatBrasiliaDateTime(event.createdAt)}</span>
                    </div>

                    {event.referenceLabel ? (
                      <p className="text-sm text-muted-foreground/90 line-clamp-2 mt-1.5 leading-relaxed">
                        Referência: {event.referenceLabel}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Criado por:</span>{' '}
                      {resolveCreatorDisplayName({
                        snapshotName: event.createdByName,
                        fallback: 'Usuario da equipe',
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2 self-center ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        if (actionsDisabled) return;
                        onEditEvent(event);
                      }}
                      disabled={actionsDisabled}
                      title="Abrir detalhes"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="sr-only">Abrir detalhes</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        if (actionsDisabled || downloadingId === event.id) return;
                        setDownloadEvent(event);
                      }}
                      disabled={actionsDisabled || downloadingId === event.id}
                      title="Baixar certificados"
                    >
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="sr-only">Baixar certificados</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        if (actionsDisabled || deletingId === event.id) return;
                        setDeletingEvent(event);
                      }}
                      disabled={actionsDisabled || deletingId === event.id}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {actionsDisabled && actionsDisabledReason ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {actionsDisabledReason}
        </div>
      ) : null}

      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir certificado salvo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove definitivamente o evento e todos os alunos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionsDisabled}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteEvent();
              }}
              disabled={actionsDisabled || !deletingEvent || deletingId === deletingEvent.id}
            >
              {deletingId && deletingEvent?.id === deletingId ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!downloadEvent} onOpenChange={(open) => !open && setDownloadEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escolha o formato de download</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione como deseja baixar os certificados de "{downloadEvent?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!downloadingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!downloadEvent) return;
                handleDownloadEvent(downloadEvent, 'zip_individual');
              }}
              disabled={actionsDisabled || !downloadEvent || !!downloadingId}
            >
              {downloadingId ? 'Baixando...' : 'ZIP com PDFs individuais'}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!downloadEvent) return;
                handleDownloadEvent(downloadEvent, 'pdf_unico');
              }}
              disabled={actionsDisabled || !downloadEvent || !!downloadingId}
            >
              {downloadingId ? 'Baixando...' : 'PDF único'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

