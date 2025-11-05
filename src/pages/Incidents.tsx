import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIncidents, useClasses, useStudents } from '@/hooks/useLocalStorage';
import { IncidentDetailsDialog } from '@/components/incidents/IncidentDetailsDialog';
import { IncidentManagementDialog } from '@/components/incidents/IncidentManagementDialog';
import { IncidentWizard } from '@/components/incidents/IncidentWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Incident } from '@/types';

const Incidents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [managingIncident, setManagingIncident] = useState<Incident | null>(null);
  const [showNewIncidentDialog, setShowNewIncidentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'aberta' | 'acompanhamento' | 'resolvida'>('aberta');

  // Filter incidents by status
  const openIncidents = incidents.filter(i => i.status === 'aberta');
  const followUpIncidents = incidents.filter(i => i.status === 'acompanhamento');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolvida');

  const filterIncidents = (statusIncidents: Incident[]) => {
    if (!searchTerm) return statusIncidents;
    
    return statusIncidents.filter(incident => {
      const incidentClass = classes.find(c => c.id === incident.classId);
      const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));
      
      return (
        incidentClass?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incidentStudents.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
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

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'leve': return 'Leve';
      case 'intermediaria': return 'Intermediária';
      case 'grave': return 'Grave';
      case 'gravissima': return 'Gravíssima';
      default: return severity;
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

  const renderIncidentsList = (statusIncidents: Incident[]) => {
    const filtered = filterIncidents(statusIncidents);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma ocorrência encontrada</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Não há ocorrências neste status.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((incident) => {
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
                    {getSeverityLabel(incident.finalSeverity)}
                  </Badge>
                  <span className="text-sm font-medium">{incidentClass?.name || 'Turma não encontrada'}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {incidentStudents.map(s => s.name).join(', ')} • {incident.episodes.length} episódio(s)
                </p>
                {incident.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
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
                  Ver
                </Button>
                {(user?.role === 'diretor' || user?.role === 'coordenador') && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setManagingIncident(incident)}
                  >
                    Gerenciar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe e gerencie as ocorrências por status
          </p>
        </div>
        {(user?.role === 'professor' || user?.role === 'diretor' || user?.role === 'coordenador') && (
          <Button size="lg" onClick={() => setShowNewIncidentDialog(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Registrar Ocorrência
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-open" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Acompanhamento</CardTitle>
            <Clock className="h-4 w-4 text-status-analysis" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followUpIncidents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-resolved" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedIncidents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por turma, aluno ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs by Status */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'aberta' | 'acompanhamento' | 'resolvida')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aberta">
            Abertas ({openIncidents.length})
          </TabsTrigger>
          <TabsTrigger value="acompanhamento">
            Em Acompanhamento ({followUpIncidents.length})
          </TabsTrigger>
          <TabsTrigger value="resolvida">
            Resolvidas ({resolvedIncidents.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="aberta" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências Abertas</CardTitle>
            </CardHeader>
            <CardContent>
              {renderIncidentsList(openIncidents)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="acompanhamento" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências em Acompanhamento</CardTitle>
            </CardHeader>
            <CardContent>
              {renderIncidentsList(followUpIncidents)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resolvida" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências Resolvidas</CardTitle>
            </CardHeader>
            <CardContent>
              {renderIncidentsList(resolvedIncidents)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedIncident && (
        <IncidentDetailsDialog
          incident={selectedIncident}
          open={!!selectedIncident}
          onOpenChange={(open) => !open && setSelectedIncident(null)}
        />
      )}

      {managingIncident && (
        <IncidentManagementDialog
          incident={managingIncident}
          open={!!managingIncident}
          onOpenChange={(open) => !open && setManagingIncident(null)}
          onStatusChange={(newStatus) => {
            // Quando o status mudar, trocar a aba
            if (newStatus === 'acompanhamento') {
              setActiveTab('acompanhamento');
            } else if (newStatus === 'resolvida') {
              setActiveTab('resolvida');
            }
          }}
        />
      )}

      {/* New Incident Dialog */}
      <Dialog open={showNewIncidentDialog} onOpenChange={setShowNewIncidentDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
          </DialogHeader>
          <IncidentWizard onComplete={() => setShowNewIncidentDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Incidents;
