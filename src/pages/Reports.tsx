import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useClasses, useStudents, useIncidents, useGrades, useAttendance } from '@/hooks/useLocalStorage';
import { ReportOverview } from '@/components/reports/ReportOverview';
import { IntegratedReports } from '@/components/reports/IntegratedReports';
import { ClassSlides } from '@/components/reports/ClassSlides';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();
  const { grades } = useGrades();
  const { attendance } = useAttendance();

  // Calculate metrics
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">
          Visualize dados, gere relatórios e analise indicadores do sistema
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="integrated">Relatórios Integrados</TabsTrigger>
          <TabsTrigger value="slides">Slides de Apresentação</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <ReportOverview classes={classes} students={students} incidents={incidents} grades={grades} />
        </TabsContent>

        <TabsContent value="integrated" className="space-y-6 mt-6">
          <IntegratedReports classes={classes} students={students} />
        </TabsContent>

        <TabsContent value="slides" className="space-y-6 mt-6">
          <ClassSlides classes={classes} students={students} incidents={incidents} grades={grades} attendance={attendance} />
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
                          style={{ width: `${(item.count / Math.max(...studentsByClass.map(s => s.count))) * 100}%` }}
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
                        <Badge variant="outline" className={`${item.color.replace('bg-', 'bg-')}-bg border-${item.color.replace('bg-', '')}`}>
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
        </TabsContent>

        <TabsContent value="students" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gere relatórios individuais ou por turma com informações acadêmicas, disciplinares e de frequência.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <FileText className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Relatório Individual</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Gere um relatório completo com notas, frequência e ocorrências de um aluno específico.
                      </p>
                      <Button className="w-full">
                        Gerar Relatório Individual
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <Users className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Relatório de Turma</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Visualize estatísticas consolidadas de toda a turma com gráficos e indicadores.
                      </p>
                      <Button className="w-full">
                        Gerar Relatório de Turma
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <TrendingUp className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Boletim Escolar</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Exporte boletins com todas as notas e médias do período letivo.
                      </p>
                      <Button className="w-full">
                        Gerar Boletim
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <AlertTriangle className="h-8 w-8 text-severity-intermediate mb-3" />
                      <h3 className="font-semibold mb-2">Alunos em Situação de Risco</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Liste alunos com notas baixas, faltas excessivas ou múltiplas ocorrências.
                      </p>
                      <Button className="w-full" variant="outline">
                        Visualizar Lista
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Ocorrências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Analise padrões disciplinares e gere relatórios consolidados de ocorrências.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <FileText className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Relatório Consolidado</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Visualize todas as ocorrências do período com estatísticas e gráficos.
                      </p>
                      <Button className="w-full">
                        Gerar Relatório Consolidado
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <TrendingUp className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Análise de Tendências</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Identifique padrões e tendências nas ocorrências ao longo do tempo.
                      </p>
                      <Button className="w-full">
                        Ver Análise
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <AlertTriangle className="h-8 w-8 text-severity-critical mb-3" />
                      <h3 className="font-semibold mb-2">Ocorrências Críticas</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Foque nas ocorrências graves e gravíssimas que requerem atenção urgente.
                      </p>
                      <Button className="w-full" variant="outline">
                        Ver Ocorrências Críticas
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <Users className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Reincidência</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Identifique alunos com múltiplas ocorrências e padrões de comportamento.
                      </p>
                      <Button className="w-full" variant="outline">
                        Ver Relatório de Reincidência
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
