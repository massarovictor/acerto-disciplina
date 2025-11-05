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
import { useIncidents, useClasses, useStudents } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, Plus } from 'lucide-react';
import { calculateSuggestedAction, suggestFollowUpType } from '@/lib/incidentActions';

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
  const { user } = useAuth();
  const { incidents, updateIncident, addFollowUp } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { toast } = useToast();

  const [newStatus, setNewStatus] = useState<IncidentStatus>(incident.status);
  const [commentText, setCommentText] = useState('');
  const [tab, setTab] = useState<'info' | 'followup' | 'comments'>(initialTab);
  
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
  
  // Sempre pega a versão mais recente dos incidents
  const currentIncident = incidents.find(i => i.id === incident.id) || incident;

  // Sincroniza newStatus quando currentIncident mudar
  useEffect(() => {
    setNewStatus(currentIncident.status);
  }, [currentIncident.status]);

  // Auto-preencher acompanhamento quando mudar para status acompanhamento
  useEffect(() => {
    if (currentIncident.status === 'acompanhamento' && !currentIncident.followUps?.length) {
      const suggested = calculateSuggestedAction(
        currentIncident.studentIds,
        currentIncident.finalSeverity,
        incidents,
        students
      );
      const autoType = suggestFollowUpType(suggested, currentIncident.finalSeverity);
      
      setFollowUpType(autoType);
      setFollowUpProvidencias(suggested);
      
      if (currentIncident.finalSeverity === 'grave' || currentIncident.finalSeverity === 'gravissima') {
        setFollowUpMotivo('1 - Comportamento inadequado');
      } else if (currentIncident.finalSeverity === 'intermediaria') {
        setFollowUpMotivo('2 - Conflitos/Relação interpessoal');
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
    }
  }, [currentIncident.status, currentIncident.followUps, incidents, students, currentIncident.studentIds, currentIncident.finalSeverity]);

  const incidentClass = classes.find(c => c.id === currentIncident.classId);
  const incidentStudents = students.filter(s => currentIncident.studentIds.includes(s.id));

  const canManage = user?.role === 'diretor' || user?.role === 'coordenador';
  const canStartFollowUp = currentIncident.status === 'aberta' && canManage;
  const canEditFollowUp = currentIncident.status === 'acompanhamento';
  const canResolve = currentIncident.status === 'acompanhamento' && 
                     (currentIncident.followUps?.length || 0) > 0 && 
                     canManage;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-status-open/10 text-status-open border-status-open';
      case 'acompanhamento': return 'bg-status-analysis/10 text-status-analysis border-status-analysis';
      case 'resolvida': return 'bg-status-resolved/10 text-status-resolved border-status-resolved';
      default: return '';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'leve': return 'bg-severity-light-bg text-severity-light border-severity-light';
      case 'intermediaria': return 'bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate';
      case 'grave': return 'bg-severity-serious-bg text-severity-serious border-severity-serious';
      case 'gravissima': return 'bg-severity-critical-bg text-severity-critical border-severity-critical';
      default: return '';
    }
  };

  const handleSave = () => {
    if (!user) return;

    const updatedComments = [...(incident.comments || [])];
    
    if (commentText.trim()) {
      updatedComments.push({
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        text: commentText,
        createdAt: new Date().toISOString(),
      });
    }

    updateIncident(incident.id, {
      status: newStatus,
      comments: updatedComments,
    });

    toast({
      title: 'Ocorrência atualizada',
      description: 'As alterações foram salvas com sucesso.',
    });

    setCommentText('');
  };

  const handleStartFollowUp = () => {
    if (!user) return;

    // Muda status para acompanhamento
    updateIncident(incident.id, {
      status: 'acompanhamento',
    });

    toast({
      title: 'Acompanhamento iniciado',
      description: 'Preencha os detalhes da ação realizada na aba Acompanhamento.',
    });

    // Notifica mudança de status para o componente pai trocar a aba
    onStatusChange?.('acompanhamento');

    // Muda para a aba de acompanhamento
    setTab('followup');
  };

  const handleSaveFollowUp = () => {
    if (!user) return;

    const followUp: any = {
      type: followUpType,
      date: followUpDate,
      responsavel: followUpResponsavel,
      createdBy: user.id,
    };

    if (followUpType === 'conversa_individual' || followUpType === 'conversa_pais') {
      followUp.motivo = followUpMotivo;
      followUp.providencias = followUpProvidencias;
      followUp.assuntosTratados = followUpAssuntosTratados;
      followUp.encaminhamentos = followUpEncaminhamentos;
    }

    if (followUpType === 'situacoes_diversas') {
      followUp.disciplina = followUpDisciplina;
      followUp.tipoSituacao = followUpTipoSituacao;
      followUp.descricaoSituacao = followUpDescricaoSituacao;
    }

    // Se já existe acompanhamento, atualizar. Se não, adicionar
    if (currentIncident.followUps?.length > 0) {
      // Atualizar followUp existente
      const updatedFollowUps = [followUp];
      updateIncident(incident.id, {
        followUps: updatedFollowUps.map((fu, idx) => ({
          ...fu,
          id: currentIncident.followUps![idx]?.id || Date.now().toString(),
          incidentId: incident.id,
          createdAt: currentIncident.followUps![idx]?.createdAt || new Date().toISOString(),
        })),
      });
    } else {
      // Adicionar novo
      addFollowUp(incident.id, followUp);
    }

    toast({
      title: 'Acompanhamento salvo',
      description: 'O registro foi atualizado com sucesso',
    });
  };

  const handleResolve = () => {
    if (!user) return;

    updateIncident(incident.id, {
      status: 'resolvida',
    });

    onStatusChange?.('resolvida');

    toast({
      title: 'Ocorrência resolvida',
      description: 'A ocorrência foi marcada como resolvida com sucesso.',
    });

    // Fecha o dialog após resolver
    setTimeout(() => {
      onOpenChange(false);
    }, 500);
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

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Turma:</span> {incidentClass?.name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Data:</span>{' '}
                {new Date(currentIncident.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Alunos:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {incidentStudents.map(student => (
                    <Badge 
                      key={student.id} 
                      variant="secondary"
                      className="cursor-default"
                    >
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {canStartFollowUp && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Pronto para iniciar o acompanhamento?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Clique no botão para mudar o status e registrar as ações de acompanhamento desta ocorrência.
                  </p>
                  <Button 
                    onClick={handleStartFollowUp}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Iniciar Acompanhamento
                  </Button>
                </div>
              </div>
            )}

            {canEditFollowUp && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Ocorrência em Acompanhamento</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Preencha o acompanhamento na aba abaixo. Cada ocorrência tem apenas um registro de acompanhamento.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => setTab('followup')}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {currentIncident.followUps?.length > 0 ? 'Editar' : 'Registrar'} Acompanhamento
                    </Button>
                    {canResolve && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleResolve}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolver Ocorrência
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {currentIncident.description}
                  </p>
                </div>

                {currentIncident.suggestedAction && (
                  <div className="space-y-2">
                    <Label>Providência Sugerida (Automática)</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {currentIncident.suggestedAction}
                    </p>
                  </div>
                )}

                {currentIncident.actions && (
                  <div className="space-y-2">
                    <Label>Providências Tomadas</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {currentIncident.actions}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="status">Alterar Status</Label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as IncidentStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="followup" className="space-y-4 mt-4">
                {canEditFollowUp ? (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium">Registro de Acompanhamento</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentIncident.followUps?.length > 0 
                          ? 'Edite os dados do acompanhamento existente.' 
                          : 'Preencha as informações do acompanhamento. Os campos foram preenchidos automaticamente com base na gravidade.'}
                      </p>
                    </div>

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
                    />

                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveFollowUp}>
                        Salvar Acompanhamento
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      O acompanhamento só pode ser editado quando a ocorrência está em status "Em Acompanhamento".
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Adicionar Comentário</Label>
                  <Textarea
                    id="comment"
                    placeholder="Adicione observações sobre a ocorrência..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
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
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={handleSave}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
