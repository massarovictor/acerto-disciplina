import { FollowUpRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText, MessageSquare, Users, ClipboardList } from 'lucide-react';
import { formatBrasiliaDate, formatBrasiliaDateTime } from '@/lib/brasiliaDate';

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
                  {formatBrasiliaDate(followUp.date, { dateStyle: 'long' })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Responsável: {followUp.responsavel}</span>
              </div>

              {followUp.type === 'conversa_pais' && (followUp.nomeResponsavelPai || followUp.grauParentesco) && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {followUp.nomeResponsavelPai && (
                    <div>
                      <p className="text-sm font-medium mb-1">Nome do Responsável</p>
                      <p className="text-sm text-muted-foreground">{followUp.nomeResponsavelPai}</p>
                    </div>
                  )}
                  {followUp.grauParentesco && (
                    <div>
                      <p className="text-sm font-medium mb-1">Grau de Parentesco</p>
                      <p className="text-sm text-muted-foreground">{followUp.grauParentesco}</p>
                    </div>
                  )}
                </div>
              )}

              {followUp.motivo && (
                <div>
                  <p className="text-sm font-medium mb-1">Motivo:</p>
                  <p className="text-sm text-muted-foreground">{followUp.motivo}</p>
                </div>
              )}

              {followUp.providencias && (
                <div>
                  <p className="text-sm font-medium mb-1">Providências Tomadas/Sugeridas:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{followUp.providencias}</p>
                </div>
              )}

              {followUp.assuntosTratados && (
                <div>
                  <p className="text-sm font-medium mb-1">Assuntos Tratados:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{followUp.assuntosTratados}</p>
                </div>
              )}

              {followUp.encaminhamentos && (
                <div>
                  <p className="text-sm font-medium mb-1">Encaminhamentos/Combinados:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{followUp.encaminhamentos}</p>
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
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{followUp.descricaoSituacao}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                <span>
                  Registrado em{' '}
                  {formatBrasiliaDateTime(followUp.createdAt, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
