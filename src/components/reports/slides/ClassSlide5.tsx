import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, QrCode } from 'lucide-react';
import { Class, Student, Incident } from '@/types';

interface ClassSlide5Props {
  classData: Class;
  students: Student[];
  incidents: Incident[];
}

export const ClassSlide5 = ({ classData, students, incidents }: ClassSlide5Props) => {
  const criticalIncidents = incidents.filter(
    i => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
  );

  const openIncidents = incidents.filter(i => i.status === 'aberta' || i.status === 'acompanhamento');

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-1">Sumário Executivo - {classData.name}</h1>
        <p className="text-sm text-muted-foreground">
          Relatório para Coordenadores e Responsáveis
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {/* Priority Alerts */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Alertas Prioritários</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-muted-foreground mb-1">Ocorrências Críticas</p>
                <p className="text-3xl font-bold text-red-500">{criticalIncidents.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Requerem atenção imediata</p>
              </div>

              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-muted-foreground mb-1">Ocorrências Abertas</p>
                <p className="text-3xl font-bold text-yellow-500">{openIncidents.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Em acompanhamento</p>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-muted-foreground mb-1">Total de Alunos</p>
                <p className="text-3xl font-bold text-blue-500">{students.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Matriculados na turma</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Checklist */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Checklist de Ações</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Imediato (próximos 7 dias)</h4>
                <div className="space-y-2">
                  {[
                    { text: 'Reunião com responsáveis de alunos em risco', priority: 'high' },
                    { text: 'Análise de casos de ocorrências graves', priority: 'high' },
                    { text: 'Planejamento de reforço escolar', priority: 'medium' },
                  ].map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-background/50 rounded">
                      <input type="checkbox" className="mt-1" />
                      <span className="text-sm flex-1">{action.text}</span>
                      <Badge 
                        variant="outline" 
                        className={action.priority === 'high' ? 'border-red-500' : 'border-yellow-500'}
                      >
                        {action.priority === 'high' ? 'Urgente' : 'Média'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Curto Prazo (próximos 30 dias)</h4>
                <div className="space-y-2">
                  {[
                    { text: 'Implementar programa de monitoria', priority: 'medium' },
                    { text: 'Capacitação para professores', priority: 'low' },
                    { text: 'Reavaliação de alunos em recuperação', priority: 'medium' },
                  ].map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-background/50 rounded">
                      <input type="checkbox" className="mt-1" />
                      <span className="text-sm flex-1">{action.text}</span>
                      <Badge 
                        variant="outline"
                        className={action.priority === 'medium' ? 'border-yellow-500' : 'border-blue-500'}
                      >
                        {action.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer with Signatures and QR Code */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Assinaturas e Ciência</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Coordenador(a) Pedagógico(a)</p>
                  <div className="border-t-2 border-dashed border-muted-foreground/30 pt-2">
                    <p className="text-xs text-muted-foreground">Nome: _______________________________</p>
                    <p className="text-xs text-muted-foreground mt-1">Data: ___/___/______</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Diretor(a)</p>
                  <div className="border-t-2 border-dashed border-muted-foreground/30 pt-2">
                    <p className="text-xs text-muted-foreground">Nome: _______________________________</p>
                    <p className="text-xs text-muted-foreground mt-1">Data: ___/___/______</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6 h-full flex flex-col items-center justify-center">
              <QrCode className="h-24 w-24 text-muted-foreground mb-3" />
              <p className="text-xs text-center text-muted-foreground">
                Escaneie para acessar<br />o relatório completo
              </p>
              <div className="mt-4 p-2 bg-background/50 rounded text-center">
                <p className="text-xs font-mono">REL-{classData.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generation Info */}
      <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>
            Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
        <span>Sistema de Gestão Escolar | Confidencial</span>
      </div>
    </div>
  );
};