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
  const criticalIncidents = incidents.filter(i => i.finalSeverity === 'gravissima').length;

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
            <CardTitle className="text-sm font-medium">Total de Ocorrências</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {openIncidents} abertas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocorrências Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-severity-critical" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Gravíssimas
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
            <CardTitle>Ocorrências por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidentsByClass.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.class}</span>
                    <span className="text-sm text-muted-foreground">{item.count} ocorrências</span>
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
          <CardTitle>Distribuição de Ocorrências por Gravidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {incidentsBySeverity.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.severity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.count} ocorrências</span>
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
    </div>
  );
};