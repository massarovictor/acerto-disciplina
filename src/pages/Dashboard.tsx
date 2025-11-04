import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Ocorrências Abertas',
      value: '12',
      icon: AlertTriangle,
      trend: '+3 esta semana',
      color: 'text-status-open',
      bgColor: 'bg-status-open/10',
    },
    {
      title: 'Em Análise',
      value: '5',
      icon: FileText,
      trend: 'Aguardando resolução',
      color: 'text-status-analysis',
      bgColor: 'bg-status-analysis/10',
    },
    {
      title: 'Resolvidas',
      value: '24',
      icon: CheckCircle2,
      trend: 'Este mês',
      color: 'text-status-resolved',
      bgColor: 'bg-status-resolved/10',
    },
    {
      title: 'Total de Alunos',
      value: '156',
      icon: Users,
      trend: '3 turmas',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo(a), {user?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ocorrências Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate">
                      Intermediária
                    </Badge>
                    <span className="text-sm font-medium">Turma 2º A</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aluno(a): João Silva - Comportamento inadequado em sala
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registrado em 15/11/2025 às 10:30
                  </p>
                </div>
                <Badge>Aberta</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
