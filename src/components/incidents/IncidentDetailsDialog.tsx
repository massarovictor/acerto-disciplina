import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Incident } from '@/types';
import { useClasses, useStudents } from '@/hooks/useData';
import { Clock, User, Calendar, FileText, ExternalLink, School } from 'lucide-react';
import { generateIncidentPDF } from '@/lib/incidentPdfExport';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

interface IncidentDetailsDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IncidentDetailsDialog = ({ incident, open, onOpenChange }: IncidentDetailsDialogProps) => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const navigate = useNavigate();
  const episodeMap = new Map(INCIDENT_EPISODES.map((episode) => [episode.id, episode.description]));

  const incidentClass = classes.find(c => c.id === incident.classId);
  const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));

  const handleNavigateToClass = () => {
    onOpenChange(false);
    navigate(`/turmas?highlight=${incident.classId}`);
  };

  const handleNavigateToStudent = (studentId: string) => {
    onOpenChange(false);
    navigate(`/alunos?highlight=${studentId}`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-status-open/10 text-status-open border-status-open';
      case 'acompanhamento': return 'bg-status-analysis/10 text-status-analysis border-status-analysis';
      case 'resolvida': return 'bg-status-resolved/10 text-status-resolved border-status-resolved';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-2xl">Detalhes da Ocorrência</DialogTitle>
              {incident.status === 'resolvida' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await generateIncidentPDF(incident, incidentClass, incidentStudents);
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
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={getStatusColor(incident.status)}>
                {incident.status === 'aberta' ? 'Aberta' :
                  incident.status === 'acompanhamento' ? 'Em Acompanhamento' :
                    'Resolvida'}
              </Badge>
              <Badge variant="outline" className={getSeverityColor(incident.finalSeverity)}>
                {incident.finalSeverity === 'leve' ? 'Leve' :
                  incident.finalSeverity === 'intermediaria' ? 'Intermediária' :
                    incident.finalSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
              </Badge>
              {incident.calculatedSeverity !== incident.finalSeverity && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Grau Alterado
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-semibold mb-3">Informações</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">{new Date(incident.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Turma</p>
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium text-primary hover:underline flex items-center gap-1"
                  onClick={handleNavigateToClass}
                >
                  <School className="h-4 w-4" />
                  {incidentClass?.name || 'Não encontrada'}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <p className="text-muted-foreground">Registrado em</p>
                <p className="font-medium">
                  {new Date(incident.createdAt).toLocaleDateString('pt-BR')} às {' '}
                  {new Date(incident.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Students Involved */}
          <div>
            <h3 className="font-semibold mb-3">Alunos Envolvidos ({incidentStudents.length})</h3>
            <div className="space-y-2">
              {incidentStudents.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                  onClick={() => handleNavigateToStudent(student.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium group-hover:text-primary transition-colors">{student.name}</p>
                    <p className="text-sm text-muted-foreground">Matrícula: {student.enrollment}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Episodes */}
          <div>
            <h3 className="font-semibold mb-3">Episódios Registrados</h3>
            <ul className="space-y-2">
              {incident.episodes.map((episode, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{episodeMap.get(episode) ?? episode}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Severity Comparison */}
          {incident.calculatedSeverity !== incident.finalSeverity && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Alteração de Grau</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Grau Calculado</p>
                      <Badge variant="outline" className={getSeverityColor(incident.calculatedSeverity)}>
                        {incident.calculatedSeverity === 'leve' ? 'Leve' :
                          incident.calculatedSeverity === 'intermediaria' ? 'Intermediária' :
                            incident.calculatedSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Grau Final</p>
                      <Badge variant="outline" className={getSeverityColor(incident.finalSeverity)}>
                        {incident.finalSeverity === 'leve' ? 'Leve' :
                          incident.finalSeverity === 'intermediaria' ? 'Intermediária' :
                            incident.finalSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
                      </Badge>
                    </div>
                  </div>
                  {incident.severityOverrideReason && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Motivo da Alteração</p>
                      <p className="text-sm p-3 bg-accent/50 rounded-lg">{incident.severityOverrideReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Description */}
          {incident.description && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Descrição Detalhada</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {incident.description}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          {incident.actions && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Providências Tomadas/Sugeridas</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {incident.actions}
                </p>
              </div>
            </>
          )}

          {/* Follow-up Information (for acompanhamento and resolvida) */}
          {(incident.status === 'acompanhamento' || incident.status === 'resolvida') && incident.followUps && incident.followUps.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Registro de Acompanhamento</h3>
                {incident.followUps.map((followUp) => (
                  <div key={followUp.id} className="space-y-4 p-4 bg-accent/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p className="font-medium">
                          {followUp.type === 'conversa_individual' ? 'Conversa Individual com Estudante' :
                            followUp.type === 'conversa_pais' ? 'Conversa com Pais/Responsáveis' :
                              'Registro de Situações Diversas'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data</p>
                        <p className="font-medium">{new Date(followUp.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Responsável pelo Registro</p>
                        <p className="font-medium">{followUp.responsavel || 'Não informado'}</p>
                      </div>
                    </div>

                    {followUp.type === 'conversa_pais' && (followUp.nomeResponsavelPai || followUp.grauParentesco) && (
                      <>
                        <Separator className="my-3" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {followUp.nomeResponsavelPai && (
                            <div>
                              <p className="text-muted-foreground">Nome do Responsável</p>
                              <p className="font-medium">{followUp.nomeResponsavelPai}</p>
                            </div>
                          )}
                          {followUp.grauParentesco && (
                            <div>
                              <p className="text-muted-foreground">Grau de Parentesco</p>
                              <p className="font-medium">{followUp.grauParentesco}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {(followUp.type === 'conversa_individual' || followUp.type === 'conversa_pais') && (
                      <>
                        {followUp.motivo && (
                          <>
                            <Separator className="my-3" />
                            <div>
                              <p className="text-muted-foreground text-sm mb-1">Motivo</p>
                              <p className="text-sm">{followUp.motivo}</p>
                            </div>
                          </>
                        )}

                        {followUp.providencias && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">Providências Tomadas/Sugeridas</p>
                            <p className="text-sm whitespace-pre-wrap">{followUp.providencias}</p>
                          </div>
                        )}

                        {followUp.assuntosTratados && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">Assuntos Tratados</p>
                            <p className="text-sm whitespace-pre-wrap">{followUp.assuntosTratados}</p>
                          </div>
                        )}

                        {followUp.encaminhamentos && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">Encaminhamentos/Combinados</p>
                            <p className="text-sm whitespace-pre-wrap">{followUp.encaminhamentos}</p>
                          </div>
                        )}
                      </>
                    )}

                    {followUp.type === 'situacoes_diversas' && (
                      <>
                        {followUp.disciplina && (
                          <>
                            <Separator className="my-3" />
                            <div>
                              <p className="text-muted-foreground text-sm mb-1">Disciplina/Professor</p>
                              <p className="text-sm">{followUp.disciplina}</p>
                            </div>
                          </>
                        )}

                        {followUp.tipoSituacao && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">Tipo de Situação</p>
                            <p className="text-sm">{followUp.tipoSituacao}</p>
                          </div>
                        )}

                        {followUp.descricaoSituacao && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">Descrição da Situação</p>
                            <p className="text-sm whitespace-pre-wrap">{followUp.descricaoSituacao}</p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Registrado em {new Date(followUp.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(followUp.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Comments */}
          {incident.comments && incident.comments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Comentários ({incident.comments.length})</h3>
                <div className="space-y-3">
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
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
