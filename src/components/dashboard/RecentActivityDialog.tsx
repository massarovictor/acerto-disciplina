import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Class, Incident, IncidentStatus, Student } from "@/types";
import { getIncidentSeverityLabel, getIncidentTypeLabel } from "@/lib/incidentType";
import { getUrgencyDot } from "@/lib/incidentUtils";
import { formatBrasiliaDateTime } from "@/lib/brasiliaDate";

interface RecentActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidents: Incident[];
  classes: Class[];
  students: Student[];
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
  aberta: "Aberta",
  acompanhamento: "Em acompanhamento",
  resolvida: "Resolvida",
};

export const RecentActivityDialog = ({
  open,
  onOpenChange,
  incidents,
  classes,
  students,
}: RecentActivityDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");

  const classMap = useMemo(() => new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass])), [classes]);
  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  const filteredIncidents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...incidents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((incident) => {
        if (statusFilter !== "all" && incident.status !== statusFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const incidentClass = classMap.get(incident.classId);
        const studentNames = incident.studentIds
          .map((studentId) => studentMap.get(studentId)?.name || "")
          .join(" ");

        return (
          incident.description.toLowerCase().includes(normalizedSearch) ||
          STATUS_LABEL[incident.status].toLowerCase().includes(normalizedSearch) ||
          getIncidentTypeLabel(incident.incidentType).toLowerCase().includes(normalizedSearch) ||
          (incidentClass?.name || "").toLowerCase().includes(normalizedSearch) ||
          studentNames.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [classMap, incidents, searchTerm, statusFilter, studentMap]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle className="text-xl">Atividade Recente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                Filtrar e Buscar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por aluno, turma ou descrição..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as IncidentStatus | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="acompanhamento">Em acompanhamento</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-md border">
            <div className="border-b border-border/60 px-4 py-3">
              <h3 className="text-base font-semibold text-foreground">Registros</h3>
              <p className="text-xs text-muted-foreground">
                {filteredIncidents.length} atividade(s) encontrada(s), ordenadas da mais recente para a mais antiga.
              </p>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhuma atividade encontrada com os filtros atuais.
              </div>
            ) : (
              <ScrollArea className="h-[55vh]">
                <div className="space-y-3 p-4">
                  {filteredIncidents.map((incident) => {
                    const incidentClass = classMap.get(incident.classId);
                    const incidentStudents = incident.studentIds
                      .map((studentId) => studentMap.get(studentId)?.name)
                      .filter((name): name is string => Boolean(name));
                    const severityDotClass = getUrgencyDot(incident.finalSeverity);

                    return (
                      <div
                        key={incident.id}
                        className="flex items-start gap-4 p-4 border rounded-lg bg-card shadow-sm"
                      >
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${severityDotClass}`} />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">
                              {incidentStudents.join(", ") || "Aluno não identificado"}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                              {getIncidentTypeLabel(incident.incidentType)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                              {getIncidentSeverityLabel(incident.finalSeverity, incident.incidentType)}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="font-medium text-foreground/80">
                              {incidentClass?.name || "Turma não encontrada"}
                            </span>
                            <span>•</span>
                            <span>{STATUS_LABEL[incident.status]}</span>
                            <span>•</span>
                            <span>{formatBrasiliaDateTime(incident.createdAt)}</span>
                          </div>

                          <p className="text-sm text-muted-foreground/90 line-clamp-2 mt-1.5 leading-relaxed">
                            {incident.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
