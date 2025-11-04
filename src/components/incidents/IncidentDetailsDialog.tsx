import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Incident } from '@/types';
import { useClasses, useStudents } from '@/hooks/useLocalStorage';
import { Clock, User, Calendar } from 'lucide-react';

interface IncidentDetailsDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IncidentDetailsDialog = ({ incident, open, onOpenChange }: IncidentDetailsDialogProps) => {
  const { classes } = useClasses();
  const { students } = useStudents();
  
  const incidentClass = classes.find(c => c.id === incident.classId);
  const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));

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
      case 'em-analise': return 'bg-status-analysis/10 text-status-analysis border-status-analysis';
      case 'resolvida': return 'bg-status-resolved/10 text-status-resolved border-status-resolved';
      case 'encerrada': return 'bg-status-closed/10 text-status-closed border-status-closed';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-3">
            <DialogTitle className="text-2xl">Detalhes da Ocorrência</DialogTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={getStatusColor(incident.status)}>
                {incident.status === 'aberta' ? 'Aberta' :
                 incident.status === 'em-analise' ? 'Em Análise' :
                 incident.status === 'resolvida' ? 'Resolvida' : 'Encerrada'}
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
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Período</p>
                  <p className="font-medium capitalize">{incident.period}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Turma</p>
                <p className="font-medium">{incidentClass?.name || 'Não encontrada'}</p>
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
                <div key={student.id} className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">Matrícula: {student.enrollment}</p>
                  </div>
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
                  <span className="text-sm">{episode}</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
