import { FollowUpRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText, MessageSquare, Users, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FollowUpListProps {
  followUps: FollowUpRecord[];
}

export const FollowUpList = ({ followUps }: FollowUpListProps) => {
  const getFollowUpTypeLabel = (type: string) => {
    switch (type) {
      case 'conversa_individual':
        return 'Conversa Individual';
      case 'conversa_pais':
        return 'Conversa com Pais';
      case 'situacoes_diversas':
        return 'Situações Diversas';
      default:
        return type;
    }
  };

  const getFollowUpIcon = (type: string) => {
    switch (type) {
      case 'conversa_individual':
        return MessageSquare;
      case 'conversa_pais':
        return Users;
      case 'situacoes_diversas':
        return ClipboardList;
      default:
        return FileText;
    }
  };

  if (followUps.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum acompanhamento registrado ainda
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {followUps.map((followUp) => {
        const Icon = getFollowUpIcon(followUp.type);
        
        return (
          <Card key={followUp.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    {getFollowUpTypeLabel(followUp.type)}
                  </CardTitle>
                </div>
                <Badge variant="outline">
                  {format(new Date(followUp.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Responsável: {followUp.responsavel}</span>
              </div>

              {followUp.motivo && (
                <div>
                  <p className="text-sm font-medium mb-1">Motivo:</p>
                  <p className="text-sm text-muted-foreground">{followUp.motivo}</p>
                </div>
              )}

              {followUp.assuntosTratados && (
                <div>
                  <p className="text-sm font-medium mb-1">Assuntos Tratados:</p>
                  <p className="text-sm text-muted-foreground">{followUp.assuntosTratados}</p>
                </div>
              )}

              {followUp.encaminhamentos && (
                <div>
                  <p className="text-sm font-medium mb-1">Encaminhamentos/Combinados:</p>
                  <p className="text-sm text-muted-foreground">{followUp.encaminhamentos}</p>
                </div>
              )}

              {followUp.disciplina && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Disciplina:</span>
                  <span className="text-muted-foreground">{followUp.disciplina}</span>
                </div>
              )}

              {followUp.tipoSituacao && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Tipo:</span>
                  <span className="text-muted-foreground">{followUp.tipoSituacao}</span>
                </div>
              )}

              {followUp.descricaoSituacao && (
                <div>
                  <p className="text-sm font-medium mb-1">Descrição da Situação:</p>
                  <p className="text-sm text-muted-foreground">{followUp.descricaoSituacao}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                <span>
                  Registrado em {format(new Date(followUp.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
