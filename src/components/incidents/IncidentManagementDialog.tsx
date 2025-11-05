import { useState } from 'react';
import { FollowUpList } from './FollowUpList';
import { FollowUpDialog } from './FollowUpDialog';
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
import { Incident, IncidentStatus } from '@/types';
import { useIncidents, useClasses, useStudents } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, Plus } from 'lucide-react';

interface IncidentManagementDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IncidentManagementDialog = ({
  incident,
  open,
  onOpenChange,
}: IncidentManagementDialogProps) => {
  const { user } = useAuth();
  const { updateIncident, addFollowUp } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { toast } = useToast();

  const [newStatus, setNewStatus] = useState<IncidentStatus>(incident.status);
  const [commentText, setCommentText] = useState('');
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);

  const incidentClass = classes.find(c => c.id === incident.classId);
  const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));

  const canManage = user?.role === 'diretor' || user?.role === 'coordenador';
  const canStartFollowUp = incident.status === 'aberta' && canManage;
  const canAddFollowUp = incident.status === 'acompanhamento';

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
    // Muda status para acompanhamento e abre o dialog
    updateIncident(incident.id, {
      status: 'acompanhamento',
    });
    
    toast({
      title: 'Acompanhamento iniciado',
      description: 'Registre agora as ações de acompanhamento',
    });
    
    setShowFollowUpDialog(true);
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
              <Badge variant="outline" className={getStatusColor(incident.status)}>
                {statusOptions.find(s => s.value === incident.status)?.label}
              </Badge>
              <Badge variant="outline" className={getSeverityColor(incident.finalSeverity)}>
                {incident.finalSeverity === 'leve' ? 'Leve' :
                 incident.finalSeverity === 'intermediaria' ? 'Intermediária' :
                 incident.finalSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Turma:</span> {incidentClass?.name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Data:</span>{' '}
                {new Date(incident.createdAt).toLocaleDateString('pt-BR')}
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

            {canAddFollowUp && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Ocorrência em Acompanhamento</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Registre conversas individuais, reuniões com pais ou outras ações relacionadas a esta ocorrência.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => setShowFollowUpDialog(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Registrar Acompanhamento
                  </Button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="followups">
                  Acompanhamentos ({incident.followUps?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comentários ({incident.comments?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {incident.description}
                  </p>
                </div>

                {incident.suggestedAction && (
                  <div className="space-y-2">
                    <Label>Providência Sugerida (Automática)</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {incident.suggestedAction}
                    </p>
                  </div>
                )}

                {incident.actions && (
                  <div className="space-y-2">
                    <Label>Providências Tomadas</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {incident.actions}
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

              <TabsContent value="followups" className="space-y-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Registros de acompanhamento da ocorrência
                  </p>
                  {canAddFollowUp && (
                    <Button 
                      size="sm" 
                      onClick={() => setShowFollowUpDialog(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Novo Acompanhamento
                    </Button>
                  )}
                </div>
                <FollowUpList followUps={incident.followUps || []} />
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

                {incident.comments && incident.comments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Histórico de Comentários</Label>
                      {incident.comments.map((comment) => (
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

      <FollowUpDialog
        incident={incident}
        open={showFollowUpDialog}
        onOpenChange={setShowFollowUpDialog}
        onAddFollowUp={addFollowUp}
      />
    </>
  );
};
