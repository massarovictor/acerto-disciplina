import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CERTIFICATE_TYPE_LABEL,
  CertificateEventTypeMeta,
} from '@/lib/certificateEventTypes';
import { formatBrasiliaDateTime } from '@/lib/brasiliaDate';
import { SavedCertificateEvent, SavedCertificateEventStudent } from '@/types';
import { Download, Pencil, Save, Search, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type UpdateCertificateEventInput } from '@/hooks/useCertificateEvents';

interface SavedCertificateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SavedCertificateEvent | null;
  onDownloadStudent: (
    event: SavedCertificateEvent,
    student: SavedCertificateEventStudent,
  ) => Promise<void>;
  onUpdateEvent?: (id: string, updates: UpdateCertificateEventInput) => Promise<void>;
}

const HIGHLIGHT_TONE_CLASS: Record<'confirmed' | 'pending', string> = {
  confirmed: 'bg-success/10 text-success border-success/30',
  pending: 'bg-warning/10 text-warning border-warning/30',
};

const formatHighlightAverage = (value?: number | null): string => {
  if (typeof value !== 'number') return '-';
  return value.toFixed(2).replace('.', ',');
};

export const SavedCertificateEventDialog = ({
  open,
  onOpenChange,
  event,
  onDownloadStudent,
  onUpdateEvent,
}: SavedCertificateEventDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBaseText, setEditBaseText] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !event) return;

    setSearchTerm('');
    setIsEditing(false);
    setEditTitle(event.title);
    setEditBaseText(event.baseText || '');
    setEditTeacherName(event.teacherName || '');
  }, [open, event]);

  const filteredStudents = useMemo(() => {
    if (!event) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return event.students;

    return event.students.filter((student) =>
      student.studentNameSnapshot.toLowerCase().includes(normalizedSearch),
    );
  }, [event, searchTerm]);

  const typeMeta = useMemo(() => {
    if (!event) return {} as CertificateEventTypeMeta;
    return (event.typeMeta || {}) as CertificateEventTypeMeta;
  }, [event]);

  if (!event) return null;

  const handleDownloadStudent = async (student: SavedCertificateEventStudent) => {
    setDownloadingStudentId(student.id);
    try {
      await onDownloadStudent(event, student);
    } finally {
      setDownloadingStudentId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (event.students.length === 0) return;

    setDownloadingAll(true);
    // Aqui reutilizamos o mesmo endpoint de lote na lógica de exportação global
    // Caso contrário o botão da tabela principal fará o download da turma completa
  };

  const handleSaveEdits = async () => {
    if (!event || !onUpdateEvent) return;
    setIsSaving(true);
    try {
      await onUpdateEvent(event.id, {
        title: editTitle,
        baseText: editBaseText,
        teacherName: editTeacherName,
      });
      setIsEditing(false);
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {isEditing ? (
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
          ) : (
            <DialogTitle>{event.title}</DialogTitle>
          )}
          <DialogDescription>
            Snapshot salvo em {formatBrasiliaDateTime(event.createdAt)} com {event.studentsCount} aluno(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{CERTIFICATE_TYPE_LABEL[event.certificateType]}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Turma</p>
              <p className="text-sm font-medium">{event.classNameSnapshot}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="text-sm font-medium">{event.periodLabel}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Referência</p>
              <p className="text-sm font-medium">{event.referenceLabel || '-'}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Autor</p>
              <p className="text-sm font-medium">{event.createdByName}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Assinatura</p>
              <p className="text-sm font-medium">
                {event.signatureMode === 'digital_cursive'
                  ? 'Digital cursiva'
                  : 'Física (impresso)'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total de alunos</p>
              <p className="text-sm font-medium">{event.studentsCount}</p>
            </div>
          </div>

          {(typeMeta.monitoriaMeta || typeMeta.eventMeta) && (
            <div className="rounded-md border p-3 text-sm">
              {typeMeta.monitoriaMeta ? (
                <div className="space-y-1">
                  <p>
                    <strong>Carga horária:</strong> {typeMeta.monitoriaMeta.workloadHours}h
                  </p>
                  <p>
                    <strong>Período da monitoria:</strong> {typeMeta.monitoriaMeta.monitoriaPeriod}
                  </p>
                </div>
              ) : null}
              {typeMeta.eventMeta ? (
                <div className="space-y-1">
                  <p>
                    <strong>Evento:</strong> {typeMeta.eventMeta.eventName}
                  </p>
                  <p>
                    <strong>Local:</strong> {typeMeta.eventMeta.location}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar aluno no snapshot..."
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-80 rounded-md border p-2">
              {filteredStudents.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Nenhum aluno encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1 ml-2">
                        <p className="text-sm font-medium truncate">{student.studentNameSnapshot}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          Código: {student.verificationCode}
                        </p>
                        {student.highlightStatus ? (
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={HIGHLIGHT_TONE_CLASS[student.highlightStatus]}
                            >
                              {student.highlightStatus === 'confirmed' ? 'Confirmado' : 'Pendente'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Média: {formatHighlightAverage(student.highlightAverage)}
                            </span>
                          </div>
                        ) : null}
                        {student.verificationStatus === 'revoked' ? (
                          <Badge variant="destructive" className="mt-1">
                            Revogado
                          </Badge>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadStudent(student)}
                        disabled={downloadingStudentId === student.id || downloadingAll || downloadingSelected}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Campos editáveis expandidos */}
          {isEditing && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label className="text-xs">Texto Base do Certificado</Label>
                <Textarea rows={4} value={editBaseText} onChange={(e) => setEditBaseText(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assinatura do Professor(a)</Label>
                <Input value={editTeacherName} onChange={(e) => setEditTeacherName(e.target.value)} placeholder="Nome que aparece como assinatura cursiva..." />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {onUpdateEvent && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEdits} disabled={isSaving}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
