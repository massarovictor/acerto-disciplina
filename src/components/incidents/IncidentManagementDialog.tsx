import { useState } from 'react';
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
import { Clock } from 'lucide-react';

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
  const { updateIncident } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { toast } = useToast();

  const [newStatus, setNewStatus] = useState<IncidentStatus>(incident.status);
  const [commentText, setCommentText] = useState('');

  const incidentClass = classes.find(c => c.id === incident.classId);
  const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));

  const statusOptions = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'em-analise', label: 'Em Análise' },
    { value: 'resolvida', label: 'Resolvida' },
    { value: 'encerrada', label: 'Encerrada' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-status-open/10 text-status-open border-status-open';
      case 'em-analise': return 'bg-status-analysis/10 text-status-analysis border-status-analysis';
      case 'resolvida': return 'bg-status-resolved/10 text-status-resolved border-status-resolved';
      case 'encerrada': return 'bg-status-closed/10 text-status-closed border-status-closed';
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

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Ocorrência</DialogTitle>
          <DialogDescription>
            Altere o status e adicione comentários à ocorrência
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Info */}
          <div className="flex gap-2">
            <Badge variant="outline" className={getStatusColor(incident.status)}>
              {statusOptions.find(s => s.value === incident.status)?.label}
            </Badge>
            <Badge variant="outline" className={getSeverityColor(incident.finalSeverity)}>
              {incident.finalSeverity === 'leve' ? 'Leve' :
               incident.finalSeverity === 'intermediaria' ? 'Intermediária' :
               incident.finalSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Turma:</span> {incidentClass?.name || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Alunos:</span> {incidentStudents.map(s => s.name).join(', ')}
            </p>
            <p className="text-sm">
              <span className="font-medium">Registrada em:</span>{' '}
              {new Date(incident.createdAt).toLocaleDateString('pt-BR')} às{' '}
              {new Date(incident.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <Separator />

          {/* Status Change */}
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

          {/* Add Comment */}
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

          {/* Existing Comments */}
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
