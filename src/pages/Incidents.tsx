import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Edit,
  Filter,
  ExternalLink
} from 'lucide-react';
import { getSeverityColor, getSeverityLabel, getUrgencyDot } from '@/lib/incidentUtils';
import { useIncidents, useClasses, useStudents } from '@/hooks/useData';

import { IncidentManagementDialog } from '@/components/incidents/IncidentManagementDialog';
import { IncidentWizard } from '@/components/incidents/IncidentWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Incident } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/useUIStore';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const Incidents = () => {
  const { user, profile } = useAuth();
  const { incidents, deleteIncident } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { toast } = useToast();

  // ✅ Usando Zustand store para persistir filtros entre navegações
  const { incidentsUI, setIncidentsUI } = useUIStore();
  const searchTerm = incidentsUI.searchTerm;
  const classFilter = incidentsUI.classFilter;
  const activeTab = incidentsUI.activeTab;

  const setSearchTerm = (value: string) => setIncidentsUI({ searchTerm: value });
  const setClassFilter = (value: string) => setIncidentsUI({ classFilter: value });
  const setActiveTab = (value: 'aberta' | 'acompanhamento' | 'resolvida') => setIncidentsUI({ activeTab: value });


  const [managingIncident, setManagingIncident] = useState<Incident | null>(null);
  const [deletingIncident, setDeletingIncident] = useState<Incident | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showNewIncidentDialog, setShowNewIncidentDialog] = useState(false);
  const [initialTab, setInitialTab] = useState<'info' | 'followup' | 'comments'>('info');
  const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

  // Get active classes for filter
  const activeClasses = classes.filter(c => !c.archived && c.active);
  const directorOwnedClasses = useMemo(() => {
    if (!profile || profile.role !== 'diretor' || !user) return [];
    return activeClasses.filter((incidentClass) => {
      const isClassDirectorByEmail =
        normalizeEmail(incidentClass.directorEmail) !== '' &&
        normalizeEmail(incidentClass.directorEmail) === normalizeEmail(user.email || profile.email);
      const isClassDirectorById =
        !!incidentClass.directorId && incidentClass.directorId === user.id;
      return isClassDirectorByEmail || isClassDirectorById;
    });
  }, [activeClasses, profile, user]);

  // Para diretor, aplica automaticamente o filtro da própria turma quando estiver em "all".
  useEffect(() => {
    if (profile?.role !== 'diretor') return;
    if (classFilter !== 'all') return;
    if (directorOwnedClasses.length === 0) return;

    const firstDirectorClass = [...directorOwnedClasses]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))[0];
    if (firstDirectorClass) {
      setClassFilter(firstDirectorClass.id);
    }
  }, [classFilter, directorOwnedClasses, profile?.role, setClassFilter]);

  // Filter incidents by status
  const openIncidents = incidents.filter(i => i.status === 'aberta');
  const followUpIncidents = incidents.filter(i => i.status === 'acompanhamento');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolvida');

  // Optimize lookups
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  // Filter and search logic with useMemo
  const getFilteredIncidents = useCallback((statusIncidents: Incident[]) => {
    let filtered = statusIncidents;

    // Filter by Class
    if (classFilter !== 'all') {
      filtered = filtered.filter(incident => incident.classId === classFilter);
    }

    // Filter by Search Term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(incident => {
        const incidentClass = classMap.get(incident.classId);
        // Check if ANY student in the incident matches
        const studentMatch = incident.studentIds.some(id =>
          studentMap.get(id)?.name.toLowerCase().includes(lowerSearch)
        );

        return (
          incidentClass?.name.toLowerCase().includes(lowerSearch) ||
          incident.description?.toLowerCase().includes(lowerSearch) ||
          studentMatch
        );
      });
    }

    return filtered;
  }, [classFilter, searchTerm, classMap, studentMap]);

  // Memoized lists to prevent unnecessary re-filtering
  const filteredOpenIncidents = useMemo(() => getFilteredIncidents(openIncidents), [openIncidents, getFilteredIncidents]);
  const filteredFollowUpIncidents = useMemo(() => getFilteredIncidents(followUpIncidents), [followUpIncidents, getFilteredIncidents]);
  const filteredResolvedIncidents = useMemo(() => getFilteredIncidents(resolvedIncidents), [resolvedIncidents, getFilteredIncidents]);

  const canManageIncident = useCallback((incident: Incident) => {
    if (!profile || !user) return false;
    if (profile.role === 'admin') return true;
    if (profile.role !== 'diretor') return false;

    const incidentClass = classMap.get(incident.classId);
    if (!incidentClass) return false;

    const isClassDirectorByEmail =
      normalizeEmail(incidentClass.directorEmail) !== '' &&
      normalizeEmail(incidentClass.directorEmail) === normalizeEmail(user.email || profile.email);
    const isClassDirectorById =
      !!incidentClass.directorId && incidentClass.directorId === user.id;

    return isClassDirectorByEmail || isClassDirectorById;
  }, [classMap, profile, user]);



  const renderIncidentsList = (incidentsList: Incident[]) => {
    if (incidentsList.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">Nenhuma ocorrência encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Não há ocorrências neste status.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {incidentsList.map((incident) => {
          const incidentClass = classes.find(c => c.id === incident.classId);
          const incidentStudents = students.filter(s => incident.studentIds.includes(s.id));
          const canManage = canManageIncident(incident);

          return (
            <div
              key={incident.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all bg-card shadow-sm cursor-pointer group"
              onClick={() => {
                if (incident.status === 'acompanhamento') {
                  setInitialTab('followup');
                } else {
                  setInitialTab('info');
                }
                setManagingIncident(incident);
              }}
            >
              <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${getUrgencyDot(incident.finalSeverity)} shadow-sm`} />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-foreground">{incidentStudents.map(s => s.name).join(', ') || 'Aluno não identificado'}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${getSeverityColor(incident.finalSeverity)}`}>
                    {getSeverityLabel(incident.finalSeverity)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{incidentClass?.name || 'Turma N/A'}</span>
                  <span>•</span>
                  <span>{incident.episodes.length} registro(s)</span>
                  <span>•</span>
                  <span>{new Date(incident.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                {incident.description && (
                  <p className="text-sm text-muted-foreground/90 line-clamp-2 mt-1.5 leading-relaxed">
                    {incident.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2 self-center ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (incident.status === 'acompanhamento') {
                      setInitialTab('followup');
                    } else {
                      setInitialTab('info');
                    }
                    setManagingIncident(incident);
                  }}
                >
                  {!canManage || incident.status === 'resolvida' ? (
                    <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <span className="sr-only">Abrir Detalhes</span>
                </Button>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingIncident(incident);
                      setDeleteConfirmationText('');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
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
    <PageContainer>
      <PageHeader
        title="Ocorrências"
        description="Gestão e acompanhamento comportamental"
        actions={
          <Button onClick={() => setShowNewIncidentDialog(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nova Ocorrência
          </Button>
        }
      />

      {/* Stats Cards - Design System Analytics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{openIncidents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requerem atenção imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acompanhamento</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{followUpIncidents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Casos em monitoramento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolvidas</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{resolvedIncidents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Casos fechados com sucesso</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por turma, aluno ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[250px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Turmas</SelectItem>
            {activeClasses.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs by Status */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'aberta' | 'acompanhamento' | 'resolvida')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1">
          <TabsTrigger value="aberta">
            Abertas ({filteredOpenIncidents.length})
          </TabsTrigger>
          <TabsTrigger value="acompanhamento">
            Em Acompanhamento ({filteredFollowUpIncidents.length})
          </TabsTrigger>
          <TabsTrigger value="resolvida">
            Resolvidas ({filteredResolvedIncidents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aberta" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências Abertas</CardTitle>
            </CardHeader>
            <CardContent>
              {renderIncidentsList(filteredOpenIncidents)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acompanhamento" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências em Acompanhamento</CardTitle>
            </CardHeader>
            <CardContent>
              {renderIncidentsList(filteredFollowUpIncidents)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolvida" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências Resolvidas</CardTitle>
            </CardHeader>
            <CardContent>
              {renderIncidentsList(filteredResolvedIncidents)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}


      {managingIncident && (
        <IncidentManagementDialog
          incident={managingIncident}
          open={!!managingIncident}
          onOpenChange={(open) => {
            if (!open) {
              setManagingIncident(null);
              setInitialTab('info');
            }
          }}
          initialTab={initialTab}
          onStatusChange={(newStatus) => {
            if (newStatus === 'acompanhamento') {
              setActiveTab('acompanhamento');
            } else if (newStatus === 'resolvida') {
              setActiveTab('resolvida');
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingIncident} onOpenChange={(open) => !open && setDeletingIncident(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.</p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Digite <span className="font-bold text-red-600">excluir</span> para confirmar:</p>
                <Input
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="excluir"
                  className="border-red-200 focus-visible:ring-red-500"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmationText.toLowerCase() !== 'excluir'}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                if (deletingIncident) {
                  try {
                    await deleteIncident(deletingIncident.id);
                    toast({
                      title: 'Ocorrência excluída',
                      description: 'A ocorrência foi removida com sucesso.',
                    });
                    setDeletingIncident(null);
                  } catch (error) {
                    toast({
                      title: 'Erro',
                      description: 'Não foi possível excluir a ocorrência.',
                      variant: 'destructive',
                    });
                  }
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Incident Dialog */}
      <Dialog open={showNewIncidentDialog} onOpenChange={setShowNewIncidentDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Registrar Nova Ocorrência
            </DialogTitle>
          </DialogHeader>
          <IncidentWizard onComplete={() => setShowNewIncidentDialog(false)} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default Incidents;
