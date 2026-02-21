import { useMemo, useState } from 'react';

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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CERTIFICATE_TYPE_LABEL, CERTIFICATE_TYPE_ORDER } from '@/lib/certificateEventTypes';
import { formatBrasiliaDateTime } from '@/lib/brasiliaDate';
import { SavedCertificateEvent, SavedCertificateType } from '@/types';
import { Download, Eye, Pencil, Trash2 } from 'lucide-react';

interface SavedCertificateEventsTableProps {
  events: SavedCertificateEvent[];
  loading: boolean;
  error?: string | null;
  isAdmin: boolean;
  onOpenDetails: (event: SavedCertificateEvent, editMode?: boolean) => void;
  onDownloadEvent: (event: SavedCertificateEvent) => Promise<void>;
  onDeleteEvent: (event: SavedCertificateEvent) => Promise<void>;
}

export const SavedCertificateEventsTable = ({
  events,
  loading,
  error,
  isAdmin,
  onOpenDetails,
  onDownloadEvent,
  onDeleteEvent,
}: SavedCertificateEventsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SavedCertificateType>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<SavedCertificateEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const groupedEvents = useMemo(() => {
    return CERTIFICATE_TYPE_ORDER.map((type) => ({
      type,
      events: filteredEvents.filter((event) => event.certificateType === type),
    })).filter((group) => group.events.length > 0 || typeFilter === group.type);
  }, [filteredEvents, typeFilter]);

  const handleDownloadEvent = async (event: SavedCertificateEvent) => {
    setDownloadingId(event.id);
    try {
      await onDownloadEvent(event);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

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
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome do evento ou turma"
            className="md:max-w-md"
          />
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as 'all' | SavedCertificateType)}
          >
            <SelectTrigger className="md:w-[240px]">
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

        <div className="rounded-md border p-3">
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
            <Accordion type="multiple" defaultValue={groupedEvents.map((group) => group.type)}>
              {groupedEvents.map((group) => (
                <AccordionItem key={group.type} value={group.type}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{CERTIFICATE_TYPE_LABEL[group.type]}</span>
                      <Badge variant="secondary">{group.events.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Turma</TableHead>
                            <TableHead>Alunos</TableHead>
                            <TableHead>Criado em</TableHead>
                            {isAdmin ? <TableHead>Autor</TableHead> : null}
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.events.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium">{event.title}</TableCell>
                              <TableCell>{event.classNameSnapshot}</TableCell>
                              <TableCell>{event.studentsCount}</TableCell>
                              <TableCell>{formatBrasiliaDateTime(event.createdAt)}</TableCell>
                              {isAdmin ? <TableCell>{event.createdByName}</TableCell> : null}
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onOpenDetails(event)}
                                    title="Visualizar detalhes"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onOpenDetails(event, true)}
                                    title="Editar certificado"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownloadEvent(event)}
                                    disabled={downloadingId === event.id}
                                    title="Baixar todos (ZIP ou PDF)"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingEvent(event)}
                                    disabled={deletingId === event.id}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir certificado salvo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove definitivamente o evento e todos os alunos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteEvent();
              }}
              disabled={!deletingEvent || deletingId === deletingEvent.id}
            >
              {deletingId && deletingEvent?.id === deletingId ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
