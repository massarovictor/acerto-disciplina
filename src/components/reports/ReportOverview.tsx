import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { Class, Student, Incident, Grade } from '@/types';

interface ReportOverviewProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
  grades: Grade[];
}

export const ReportOverview = ({ classes, students, incidents, grades }: ReportOverviewProps) => {
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.status === 'aberta').length;
  const followUpIncidents = incidents.filter(i => i.status === 'acompanhamento').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolvida').length;
  const criticalIncidents = incidents.filter(i => i.finalSeverity === 'gravissima').length;
  
  const incidentsWithFollowUp = incidents.filter(i => i.followUps && i.followUps.length > 0).length;
  const followUpByType = {
    conversa_individual: incidents.filter(i => i.followUps?.some(f => f.type === 'conversa_individual')).length,
    conversa_pais: incidents.filter(i => i.followUps?.some(f => f.type === 'conversa_pais')).length,
    situacoes_diversas: incidents.filter(i => i.followUps?.some(f => f.type === 'situacoes_diversas')).length,
  };

  const studentsByClass = classes.map(cls => ({
    class: cls.name,
    count: students.filter(s => s.classId === cls.id).length,
  }));

  const incidentsByClass = classes.map(cls => ({
    class: cls.name,
    count: incidents.filter(i => i.classId === cls.id).length,
  }));

  const incidentsBySeverity = [
    { severity: 'Leve', count: incidents.filter(i => i.finalSeverity === 'leve').length, color: 'bg-severity-light' },
    { severity: 'Intermediária', count: incidents.filter(i => i.finalSeverity === 'intermediaria').length, color: 'bg-severity-intermediate' },
    { severity: 'Grave', count: incidents.filter(i => i.finalSeverity === 'grave').length, color: 'bg-severity-serious' },
    { severity: 'Gravíssima', count: incidents.filter(i => i.finalSeverity === 'gravissima').length, color: 'bg-severity-critical' },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              Em {classes.length} turmas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Acompanhamentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {openIncidents} em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acompanhamentos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-severity-critical" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Graves e gravíssimos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Notas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {grades.length > 0 
                ? (grades.reduce((acc, g) => acc + g.grade, 0) / grades.length).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {grades.length} notas lançadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alunos por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentsByClass.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.class}</span>
                    <span className="text-sm text-muted-foreground">{item.count} alunos</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${(item.count / Math.max(...studentsByClass.map(s => s.count), 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acompanhamentos por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidentsByClass.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.class}</span>
                    <span className="text-sm text-muted-foreground">{item.count} acompanhamentos</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-status-open h-full rounded-full"
                      style={{ width: `${(item.count / Math.max(...incidentsByClass.map(i => i.count), 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Severity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Acompanhamentos por Gravidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {incidentsBySeverity.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.severity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.count} acompanhamentos</span>
                    <Badge variant="outline">
                      {totalIncidents > 0 ? Math.round((item.count / totalIncidents) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                  <div 
                    className={`${item.color} h-full rounded-full`}
                    style={{ width: `${totalIncidents > 0 ? (item.count / totalIncidents) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Acompanhamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Abertas</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{openIncidents} acompanhamentos</span>
                    <Badge variant="outline" className="bg-status-open/10 text-status-open">
                      {totalIncidents > 0 ? Math.round((openIncidents / totalIncidents) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-status-open h-full rounded-full"
                    style={{ width: `${totalIncidents > 0 ? (openIncidents / totalIncidents) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Em Acompanhamento</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{followUpIncidents} acompanhamentos</span>
                    <Badge variant="outline" className="bg-status-analysis/10 text-status-analysis">
                      {totalIncidents > 0 ? Math.round((followUpIncidents / totalIncidents) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-status-analysis h-full rounded-full"
                    style={{ width: `${totalIncidents > 0 ? (followUpIncidents / totalIncidents) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Resolvidas</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{resolvedIncidents} acompanhamentos</span>
                    <Badge variant="outline" className="bg-status-resolved/10 text-status-resolved">
                      {totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-status-resolved h-full rounded-full"
                    style={{ width: `${totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Acompanhamento Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                <span className="text-sm font-medium">Total de Acompanhamentos</span>
                <Badge variant="default" className="text-base px-3 py-1">
                  {incidentsWithFollowUp}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Conversa Individual</span>
                    <span className="text-sm text-muted-foreground">{followUpByType.conversa_individual}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${incidentsWithFollowUp > 0 ? (followUpByType.conversa_individual / incidentsWithFollowUp) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Conversa com Pais</span>
                    <span className="text-sm text-muted-foreground">{followUpByType.conversa_pais}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${incidentsWithFollowUp > 0 ? (followUpByType.conversa_pais / incidentsWithFollowUp) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Situações Diversas</span>
                    <span className="text-sm text-muted-foreground">{followUpByType.situacoes_diversas}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${incidentsWithFollowUp > 0 ? (followUpByType.situacoes_diversas / incidentsWithFollowUp) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
