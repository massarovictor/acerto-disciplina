import { useState, useEffect } from 'react';
import { FollowUpList } from './FollowUpList';
import { FollowUpForm } from './FollowUpForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Incident, IncidentStatus, FollowUpType } from '@/types';
import { useIncidents, useClasses, useStudents } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, Plus, FileText } from 'lucide-react';
import { calculateSuggestedAction, getRequiredActionLevel, getRequiredFollowUpType } from '@/lib/incidentActions';
import { generateIncidentPDF } from '@/lib/incidentPdfExport';
import { generateIncidentParentNotificationPDF } from '@/lib/incidentParentNotificationPdfExport';
import { getSeverityColor, getStatusColor } from '@/lib/incidentUtils';
import { sendIncidentEmail } from '@/lib/emailService';
import { AddStudentsDialog } from './AddStudentsDialog';
import { X } from 'lucide-react';

interface IncidentManagementDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (newStatus: IncidentStatus) => void;
  initialTab?: 'info' | 'followup' | 'comments';
}

export const IncidentManagementDialog = ({
  incident,
  open,
  onOpenChange,
  onStatusChange,
  initialTab = 'info',
}: IncidentManagementDialogProps) => {
  const { user, profile } = useAuth();
  const { incidents, updateIncident, saveFollowUp, addComment } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { toast } = useToast();

  const [commentText, setCommentText] = useState('');
  const [tab, setTab] = useState<'info' | 'followup' | 'comments'>(initialTab);
  const [isSaving, setIsSaving] = useState(false);

  // Campos editáveis da ocorrência (para quando status = 'aberta')
  const [editDescription, setEditDescription] = useState('');
  const [editSuggestedAction, setEditSuggestedAction] = useState('');
  const [editActions, setEditActions] = useState('');
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(false);

  // Sincroniza a aba quando initialTab mudar
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Campos do acompanhamento
  const [followUpType, setFollowUpType] = useState<FollowUpType>('conversa_individual');
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpResponsavel, setFollowUpResponsavel] = useState('');
  const [followUpMotivo, setFollowUpMotivo] = useState('');
  const [followUpAssuntosTratados, setFollowUpAssuntosTratados] = useState('');
  const [followUpEncaminhamentos, setFollowUpEncaminhamentos] = useState('');
  const [followUpProvidencias, setFollowUpProvidencias] = useState('');
  const [followUpDisciplina, setFollowUpDisciplina] = useState('');
  const [followUpTipoSituacao, setFollowUpTipoSituacao] = useState('');
  const [followUpDescricaoSituacao, setFollowUpDescricaoSituacao] = useState('');
  const [followUpNomeResponsavelPai, setFollowUpNomeResponsavelPai] = useState('');
  const [followUpGrauParentesco, setFollowUpGrauParentesco] = useState('');

  // Sempre pega a versão mais recente dos incidents
  const currentIncident = incidents.find(i => i.id === incident.id) || incident;

  // Inicializa campos editáveis quando incident muda
  useEffect(() => {
    setEditDescription(currentIncident.description || '');
    setEditSuggestedAction(currentIncident.suggestedAction || '');
    setEditActions(currentIncident.actions || '');
  }, [currentIncident.id, currentIncident.description, currentIncident.suggestedAction, currentIncident.actions]);

  // Auto-preencher acompanhamento quando mudar para status acompanhamento
  useEffect(() => {
    if (currentIncident.status === 'acompanhamento' && !currentIncident.followUps?.length) {
      // Calculate required action level based on severity + accumulated history
      const requiredLevel = getRequiredActionLevel(
        currentIncident.studentIds,
        currentIncident.finalSeverity,
        incidents
      );
      const requiredType = getRequiredFollowUpType(requiredLevel);

      const suggested = calculateSuggestedAction(
        currentIncident.studentIds,
        currentIncident.finalSeverity,
        incidents,
        students
      );

      // Force the required follow-up type based on accumulation rules
      setFollowUpType(requiredType);
      setFollowUpProvidencias(suggested);

      if (currentIncident.finalSeverity === 'grave' || currentIncident.finalSeverity === 'gravissima') {
        setFollowUpMotivo('1 - Comportamento inadequado');
      } else if (currentIncident.finalSeverity === 'intermediaria') {
        setFollowUpMotivo('2 - Conflitos/Relação interpessoal');
      } else if (requiredType === 'conversa_pais') {
        // Accumulated leves requiring parent contact
        setFollowUpMotivo('6 - Rendimento (Intervenções por baixo rendimento/Elogios/Reconhecimento)');
      }
    }

    // Se já tem acompanhamento, carregar os dados
    if (currentIncident.followUps?.length > 0) {
      const followUp = currentIncident.followUps[0];
      setFollowUpType(followUp.type);
      setFollowUpDate(followUp.date);
      setFollowUpResponsavel(followUp.responsavel || '');
      setFollowUpMotivo(followUp.motivo || '');
      setFollowUpAssuntosTratados(followUp.assuntosTratados || '');
      setFollowUpEncaminhamentos(followUp.encaminhamentos || '');
      setFollowUpProvidencias(followUp.providencias || '');
      setFollowUpDisciplina(followUp.disciplina || '');
      setFollowUpTipoSituacao(followUp.tipoSituacao || '');
      setFollowUpDescricaoSituacao(followUp.descricaoSituacao || '');
      setFollowUpNomeResponsavelPai(followUp.nomeResponsavelPai || '');
      setFollowUpGrauParentesco(followUp.grauParentesco || '');
    }
  }, [currentIncident.status, currentIncident.followUps, incidents, students, currentIncident.studentIds, currentIncident.finalSeverity]);

  const incidentClass = classes.find(c => c.id === currentIncident.classId);
  const incidentStudents = students.filter(s => currentIncident.studentIds.includes(s.id));
  const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

  // Permissões:
  // - Admin pode gerenciar TODAS as ocorrências
  // - Diretor pode gerenciar apenas ocorrências da turma sob sua responsabilidade
  // - Professor somente registra ocorrência (não gerencia acompanhamento/resolução)
  const isAdmin = profile?.role === 'admin';
  const isDirectorRole = profile?.role === 'diretor';
  const isClassDirectorByEmail =
    normalizeEmail(incidentClass?.directorEmail) !== '' &&
    normalizeEmail(incidentClass?.directorEmail) === normalizeEmail(user?.email || profile?.email);
  const isClassDirectorById =
    !!incidentClass?.directorId && !!user?.id && incidentClass.directorId === user.id;
  const isClassDirector = isClassDirectorByEmail || isClassDirectorById;
  const canManage = isAdmin || (isDirectorRole && isClassDirector);

  // Permissões específicas por status
  const canStartFollowUp = currentIncident.status === 'aberta' && canManage;
  const canEditFollowUp = currentIncident.status === 'acompanhamento' && canManage;
  const canResolve = currentIncident.status === 'acompanhamento' &&
    (currentIncident.followUps?.length || 0) > 0 &&
    canManage;
  const canDownloadParentNotification =
    currentIncident.status === 'acompanhamento' && canManage;

  const canAddStudents = canManage && currentIncident.status === 'acompanhamento';


  // Permite edição se for admin/diretor E (status aberta OU acompanhamento)
  const isEditableInfo = canManage && (['aberta', 'acompanhamento'].includes(currentIncident.status));


  const motivoOptions = [
    '1 - Comportamento inadequado',
    '2 - Conflitos/Relação interpessoal',
    '3 - Atrasos ou faltas não justificados',
    '4 - Apoio pedagógico',
    '5 - Infrequência/Risco de abandono',
    '6 - Rendimento (Intervenções por baixo rendimento/Elogios/Reconhecimento)',
    '7 - Problemas de saúde',
    '8 - Questões socioemocionais',
    '9 - Desengajamento com atividades',
    '10 - Desinteresse/Desmotivação',
    '11 - Outros...',
  ];

  const tipoSituacaoOptions = [
    '1 - Indisciplina',
    '2 - Infrequência',
    '3 - Faltas por transporte',
    '4 - Atrasos',
    '5 - Problemas de saúde',
    '6 - Saídas da escola/sala',
    '7 - Desrespeito às normas da escola',
    '8 - Realização/não-entrega de atividades',
  ];

  const statusOptions = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'acompanhamento', label: 'Em Acompanhamento' },
    { value: 'resolvida', label: 'Resolvida' },
  ];



  // Verifica se há alterações para salvar
  const hasEditChanges =
    editDescription !== (currentIncident.description || '') ||
    editSuggestedAction !== (currentIncident.suggestedAction || '') ||
    editActions !== (currentIncident.actions || '');

  const handleRemoveStudent = async (studentId: string) => {
    if (!canAddStudents) return;

    if (currentIncident.studentIds.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'A ocorrência deve ter pelo menos um aluno envolvido.'
      });
      return;
    }

    const newStudentIds = currentIncident.studentIds.filter(id => id !== studentId);

    // Se o removido era o único no followUp (caso raro de inconsistência), limpo? 
    // Por simplicidade, apenas atualizamos a lista da ocorrência.

    await updateIncident(currentIncident.id, {
      studentIds: newStudentIds
    });

    toast({
      title: 'Aluno removido',
      description: 'O aluno foi removido da ocorrência com sucesso.'
    });
  };

  const handleSaveEdit = async () => {
    if (!user || !canManage) return;
    setIsSaving(true);

    try {
      await updateIncident(currentIncident.id, {
        description: editDescription,
        suggestedAction: editSuggestedAction,
        actions: editActions,
      });

      toast({
        title: 'Ocorrência atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user || !canManage) return;

    if (commentText.trim()) {
      try {
        await addComment(currentIncident.id, commentText.trim());
        toast({
          title: 'Comentário adicionado',
          description: 'O comentário foi salvo com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o comentário.',
          variant: 'destructive',
        });
        return;
      }
    }

    setCommentText('');
    onOpenChange(false);
  };

  const handleStartFollowUp = async () => {
    if (!user || !canStartFollowUp) return;

    try {
      await updateIncident(incident.id, {
        status: 'acompanhamento',
      });

      // Enviar email de acompanhamento ao diretor
      if (incidentClass?.directorEmail) {
        sendIncidentEmail('incident_followup', incident, incidentClass, students)
          .catch(err => console.error('Erro ao enviar email:', err));
      }

      toast({
        title: 'Acompanhamento iniciado',
        description: 'Preencha os detalhes da ação realizada na aba Acompanhamento.',
      });

      onStatusChange?.('acompanhamento');
      setTab('followup');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o acompanhamento.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFollowUp = async () => {
    if (!user || !canEditFollowUp) return;

    const followUp: any = {
      type: followUpType,
      date: followUpDate,
      responsavel: followUpResponsavel || user.email,
      createdBy: user.id,
    };

    if (followUpType === 'conversa_individual' || followUpType === 'conversa_pais') {
      followUp.motivo = followUpMotivo;
      followUp.providencias = followUpProvidencias;
      followUp.assuntosTratados = followUpAssuntosTratados;
      followUp.encaminhamentos = followUpEncaminhamentos;
    }

    if (followUpType === 'conversa_pais') {
      followUp.nomeResponsavelPai = followUpNomeResponsavelPai;
      followUp.grauParentesco = followUpGrauParentesco;
    }

    if (followUpType === 'situacoes_diversas') {
      followUp.disciplina = followUpDisciplina;
      followUp.tipoSituacao = followUpTipoSituacao;
      followUp.descricaoSituacao = followUpDescricaoSituacao;
    }

    const existingFollowUpId = currentIncident.followUps?.[0]?.id;
    try {
      setIsSaving(true);
      await saveFollowUp(incident.id, followUp, existingFollowUpId);

      toast({
        title: 'Acompanhamento salvo',
        description: 'O registro foi atualizado com sucesso. Você pode resolver a ocorrência agora se desejar.',
      });

      // Manter o diálogo aberto para permitir resolução imediata
      // onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o acompanhamento.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!user || !canResolve) return;

    try {
      await updateIncident(incident.id, {
        status: 'resolvida',
      });

      // Enviar email de resolução ao diretor
      if (incidentClass?.directorEmail) {
        sendIncidentEmail('incident_resolved', incident, incidentClass, students)
          .catch(err => console.error('Erro ao enviar email:', err));
      }

      onStatusChange?.('resolvida');

      toast({
        title: 'Ocorrência resolvida',
        description: 'A ocorrência foi marcada como resolvida com sucesso.',
      });

      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível resolver a ocorrência.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Ocorrência</DialogTitle>
            <DialogDescription>
              Altere o status, adicione comentários e registre acompanhamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header Info */}
            <div className="flex gap-2 flex-wrap items-center justify-between pr-6">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={getStatusColor(currentIncident.status)}>
                  {statusOptions.find(s => s.value === currentIncident.status)?.label}
                </Badge>
                <Badge variant="outline" className={getSeverityColor(currentIncident.finalSeverity)}>
                  {currentIncident.finalSeverity === 'leve' ? 'Leve' :
                    currentIncident.finalSeverity === 'intermediaria' ? 'Intermediária' :
                      currentIncident.finalSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {canDownloadParentNotification && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await generateIncidentParentNotificationPDF(
                          currentIncident,
                          incidentClass,
                          incidentStudents,
                          incidents,
                        );
                        toast({
                          title: 'Notificacao gerada',
                          description: 'O PDF de notificacao para os responsaveis foi baixado.',
                        });
                      } catch (error) {
                        console.error('Erro ao gerar notificacao em PDF:', error);
                        toast({
                          title: 'Erro',
                          description: 'Nao foi possivel gerar o PDF de notificacao.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Baixar Notificacao
                  </Button>
                )}

                {currentIncident.status === 'resolvida' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await generateIncidentPDF(currentIncident, incidentClass, incidentStudents);
                      } catch (error) {
                        console.error('Erro ao gerar PDF:', error);
                      }
                    }}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Turma:</span> {incidentClass?.name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Data:</span>{' '}
                {new Date(currentIncident.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Alunos:</span>
                  {canAddStudents && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setIsAddStudentsOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar Alunos
                    </Button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {incidentStudents.map(student => (
                    <Badge
                      key={student.id}
                      variant="secondary"
                      className={`cursor-default flex items-center gap-1 ${canAddStudents ? 'pr-1' : ''}`}
                    >
                      {student.name}
                      {canAddStudents && incidentStudents.length > 1 && (
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                          title="Remover aluno"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialog para adicionar alunos */}
            {canAddStudents && incidentClass && (
              <AddStudentsDialog
                open={isAddStudentsOpen}
                onOpenChange={setIsAddStudentsOpen}
                classId={incidentClass.id}
                existingStudentIds={currentIncident.studentIds}
                onAddStudents={async (newIds) => {
                  await updateIncident(currentIncident.id, {
                    studentIds: [...currentIncident.studentIds, ...newIds]
                  });
                  toast({
                    title: 'Alunos adicionados',
                    description: `${newIds.length} alunos foram adicionados à ocorrência.`
                  });
                }}
              />
            )}


            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'info' | 'followup' | 'comments')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="followup">
                  Acompanhamento {currentIncident.followUps?.length > 0 && '✓'}
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comentários ({currentIncident.comments?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  {isEditableInfo ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      placeholder="Descrição da ocorrência..."
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {currentIncident.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Providência Sugerida</Label>
                  {isEditableInfo ? (
                    <Textarea
                      value={editSuggestedAction}
                      onChange={(e) => setEditSuggestedAction(e.target.value)}
                      rows={3}
                      placeholder="Ação sugerida..."
                      className="resize-none"
                    />
                  ) : (
                    currentIncident.suggestedAction && (
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {currentIncident.suggestedAction}
                      </p>
                    )
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Providências Tomadas</Label>
                  {isEditableInfo ? (
                    <Textarea
                      value={editActions}
                      onChange={(e) => setEditActions(e.target.value)}
                      rows={3}
                      placeholder="Providências já realizadas..."
                      className="resize-none"
                    />
                  ) : (
                    currentIncident.actions && (
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {currentIncident.actions}
                      </p>
                    )
                  )}
                </div>

                {/* Botão de Salvar Edições */}
                {isEditableInfo && hasEditChanges && (
                  <>
                    <Separator />
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      variant="secondary"
                      className="w-full gap-2"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </>
                )}

                {canStartFollowUp && (
                  <>
                    <Separator />
                    <Button
                      onClick={handleStartFollowUp}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Iniciar Acompanhamento
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="followup" className="space-y-4 mt-4">
                {canEditFollowUp ? (
                  <>
                    <FollowUpForm
                      type={followUpType}
                      setType={setFollowUpType}
                      date={followUpDate}
                      setDate={setFollowUpDate}
                      responsavel={followUpResponsavel}
                      setResponsavel={setFollowUpResponsavel}
                      motivo={followUpMotivo}
                      setMotivo={setFollowUpMotivo}
                      assuntosTratados={followUpAssuntosTratados}
                      setAssuntosTratados={setFollowUpAssuntosTratados}
                      encaminhamentos={followUpEncaminhamentos}
                      setEncaminhamentos={setFollowUpEncaminhamentos}
                      providencias={followUpProvidencias}
                      setProvidencias={setFollowUpProvidencias}
                      disciplina={followUpDisciplina}
                      setDisciplina={setFollowUpDisciplina}
                      tipoSituacao={followUpTipoSituacao}
                      setTipoSituacao={setFollowUpTipoSituacao}
                      descricaoSituacao={followUpDescricaoSituacao}
                      setDescricaoSituacao={setFollowUpDescricaoSituacao}
                      nomeResponsavelPai={followUpNomeResponsavelPai}
                      setNomeResponsavelPai={setFollowUpNomeResponsavelPai}
                      grauParentesco={followUpGrauParentesco}
                      setGrauParentesco={setFollowUpGrauParentesco}
                    />

                    <div className="flex justify-between pt-4 border-t">
                      {canResolve && (
                        <Button
                          variant="outline"
                          onClick={handleResolve}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Resolver Ocorrência
                        </Button>
                      )}
                      <Button onClick={handleSaveFollowUp} className="ml-auto" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Acompanhamento'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 mt-2">
                    {currentIncident.followUps && currentIncident.followUps.length > 0 ? (
                      <FollowUpList followUps={currentIncident.followUps} />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Nenhum acompanhamento registrado para esta ocorrência.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Adicionar Comentário</Label>
                  <Textarea
                    id="comment"
                    placeholder={canManage ? "Adicione observações sobre a ocorrência..." : "Sem permissão para comentar nesta ocorrência."}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                    disabled={!canManage}
                  />
                </div>

                {currentIncident.comments && currentIncident.comments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Histórico de Comentários</Label>
                      {currentIncident.comments.map((comment) => (
                        <div key={comment.id} className="border rounded-lg p-3 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{comment.userName}</span>
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(comment.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Actions */}
            {tab === 'comments' && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button onClick={handleSave} disabled={!canManage || !commentText.trim()}>
                  Salvar Comentário
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
