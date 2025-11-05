import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search,
  Eye,
  Edit,
  Filter,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIncidents, useClasses, useStudents } from '@/hooks/useLocalStorage';
import { IncidentDetailsDialog } from '@/components/incidents/IncidentDetailsDialog';
import { Incident } from '@/types';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMyIncidents, setShowMyIncidents] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Calculate metrics
  const openIncidents = incidents.filter(i => i.status === 'aberta');
  const followUpIncidents = incidents.filter(i => i.status === 'acompanhamento');
  const thisMonthIncidents = incidents.filter(i => {
    const incidentDate = new Date(i.createdAt);
    const now = new Date();
    return incidentDate.getMonth() === now.getMonth() && 
           incidentDate.getFullYear() === now.getFullYear();
  });
  const resolvedThisMonth = thisMonthIncidents.filter(i => i.status === 'resolvida');
  const resolutionRate = thisMonthIncidents.length > 0 
    ? Math.round((resolvedThisMonth.length / thisMonthIncidents.length) * 100) 
    : 0;

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = searchTerm === '' || 
      classes.find(c => c.id === incident.classId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesUser = !showMyIncidents || incident.createdBy === user?.id;
    
    return matchesSearch && matchesStatus && matchesUser;
  });

  const stats = [
    {
      title: 'Abertas',
      value: openIncidents.length.toString(),
      icon: AlertTriangle,
      trend: `+${openIncidents.filter(i => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(i.createdAt) > weekAgo;
      }).length} esta semana`,
      color: 'text-status-open',
      bgColor: 'bg-status-open/10',
    },
    {
      title: 'Em Acompanhamento',
      value: followUpIncidents.length.toString(),
      icon: Clock,
      trend: 'Aguardando resolução',
      color: 'text-status-analysis',
      bgColor: 'bg-status-analysis/10',
    },
    {
      title: 'Total do Mês',
      value: thisMonthIncidents.length.toString(),
      icon: TrendingUp,
      trend: `${resolutionRate}% resolvidas`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

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

  const getUrgencyDot = (severity: string) => {
    switch (severity) {
      case 'leve': return 'bg-severity-light';
      case 'intermediaria': return 'bg-severity-intermediate';
      case 'grave': return 'bg-severity-serious';
      case 'gravissima': return 'bg-severity-critical';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo(a), {user?.name}
          </p>
        </div>
        {(user?.role === 'professor' || user?.role === 'diretor' || user?.role === 'coordenador') && (
          <Button size="lg" onClick={() => navigate('/ocorrencias')}>
            <Plus className="h-5 w-5 mr-2" />
            Registrar Ocorrência
          </Button>
        )}
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Secondary Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="text-center p-4 bg-card rounded-lg border">
          <p className="text-xs text-muted-foreground">Total Geral</p>
          <p className="text-xl font-bold mt-1">{incidents.length}</p>
        </div>
        <div className="text-center p-4 bg-card rounded-lg border">
          <p className="text-xs text-muted-foreground">Resolvidas (mês)</p>
          <p className="text-xl font-bold mt-1">{resolvedThisMonth.length}</p>
        </div>
        <div className="text-center p-4 bg-card rounded-lg border">
          <p className="text-xs text-muted-foreground">Taxa de Resolução</p>
          <p className="text-xl font-bold mt-1">{resolutionRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por turma ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === 'aberta' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('aberta')}
          >
            Abertas
          </Button>
          <Button
            variant={statusFilter === 'em-analise' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('em-analise')}
          >
            Em Análise
          </Button>
          <Button
            variant={statusFilter === 'resolvida' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('resolvida')}
          >
            Resolvidas
          </Button>
          <Button
            variant={statusFilter === 'encerrada' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('encerrada')}
          >
            Encerradas
          </Button>
        </div>
        <Button
          variant={showMyIncidents ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMyIncidents(!showMyIncidents)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Minhas Ocorrências
        </Button>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ocorrências</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma ocorrência encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {incidents.length === 0 
                  ? 'Registre a primeira ocorrência para começar.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
              {incidents.length === 0 && (user?.role === 'professor' || user?.role === 'diretor' || user?.role === 'coordenador') && (
                <Button onClick={() => navigate('/ocorrencias')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Ocorrência
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => {
                const incidentClass = classes.find(c => c.id === incident.classId);
                const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));
                
                return (
                  <div
                    key={incident.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-full ${getUrgencyDot(incident.finalSeverity)}`} />
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getSeverityColor(incident.finalSeverity)}>
                          {incident.finalSeverity === 'leve' ? 'Leve' :
                           incident.finalSeverity === 'intermediaria' ? 'Intermediária' :
                           incident.finalSeverity === 'grave' ? 'Grave' : 'Gravíssima'}
                        </Badge>
                        <span className="text-sm font-medium">{incidentClass?.name || 'Turma não encontrada'}</span>
                        <Badge variant="outline" className={getStatusColor(incident.status)}>
                          {incident.status === 'aberta' ? 'Aberta' :
                           incident.status === 'acompanhamento' ? 'Em Acompanhamento' :
                           'Resolvida'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {incidentStudents.map(s => s.name).join(', ')} • {incident.episodes.length} episódio(s)
                      </p>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {incident.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(incident.createdAt).toLocaleDateString('pt-BR')} às {new Date(incident.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Details Dialog */}
      {selectedIncident && (
        <IncidentDetailsDialog
          incident={selectedIncident}
          open={!!selectedIncident}
          onOpenChange={(open) => !open && setSelectedIncident(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
