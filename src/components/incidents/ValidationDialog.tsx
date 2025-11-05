import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Incident, FollowUpType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ValidationDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValidate: (incidentId: string, updates: Partial<Incident>) => void;
}

export const ValidationDialog = ({ incident, open, onOpenChange, onValidate }: ValidationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [approved, setApproved] = useState(true);
  const [notes, setNotes] = useState('');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('conversa_individual');

  const handleValidate = () => {
    if (!user) return;

    const updates: Partial<Incident> = {
      status: approved ? 'acompanhamento' : 'aberta',
      validatedBy: user.id,
      validatedAt: new Date().toISOString(),
    };

    if (notes) {
      updates.comments = [
        ...(incident.comments || []),
        {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          text: `Validação: ${approved ? 'Aprovada' : 'Rejeitada'}. ${notes}`,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    onValidate(incident.id, updates);
    
    toast({
      title: approved ? 'Ocorrência validada' : 'Ocorrência retornada',
      description: approved ? 'Acompanhamento iniciado com sucesso' : 'Solicitado mais informações',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Validar Ocorrência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ação</Label>
            <Select value={approved ? 'approve' : 'reject'} onValueChange={(v) => setApproved(v === 'approve')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Validar e iniciar acompanhamento</SelectItem>
                <SelectItem value="reject">Retornar para mais informações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {approved && (
            <div className="space-y-2">
              <Label>Tipo de Acompanhamento</Label>
              <Select value={followUpType} onValueChange={(v) => setFollowUpType(v as FollowUpType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversa_individual">Conversa Individual com Estudante</SelectItem>
                  <SelectItem value="conversa_pais">Conversa com Pais/Responsáveis</SelectItem>
                  <SelectItem value="situacoes_diversas">Registro de Situações Diversas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a validação..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleValidate}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
