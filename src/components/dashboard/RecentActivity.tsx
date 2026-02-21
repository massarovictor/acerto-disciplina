import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock } from "lucide-react";
import { Class, Incident, Student } from "@/types";
import { getUrgencyDot } from "@/lib/incidentUtils";
import { getIncidentTypeLabel, getIncidentSeverityLabel } from "@/lib/incidentType";
import { RecentActivityDialog } from "./RecentActivityDialog";

interface RecentActivityProps {
    incidents: Incident[];
    classes: Class[];
    students: Student[];
}

export const RecentActivity = ({ incidents, classes, students }: RecentActivityProps) => {
    const [showAllDialog, setShowAllDialog] = useState(false);

    const recentIncidents = useMemo(
      () =>
        [...incidents]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      [incidents],
    );

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'agora';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
        return `${Math.floor(diffInSeconds / 86400)}d atrás`;
    };

    return (
        <>
          <Card className="col-span-1 md:col-span-2 flex flex-col h-full">
              <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
                  <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-muted-foreground text-xs hover:text-primary sm:w-auto sm:justify-start"
                      onClick={() => setShowAllDialog(true)}
                  >
                      Ver todas <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px]">
                  {recentIncidents.length > 0 ? (
                      <div className="space-y-4">
                          {recentIncidents.map((incident) => {
                              const studentId = incident.studentIds?.[0];
                              const student = students.find(s => s.id === studentId);
                              const severityColor = getUrgencyDot(incident.finalSeverity);

                              return (
                                  <div key={incident.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                      <Avatar className="h-9 w-9 border">
                                          <AvatarImage src={student?.photoUrl} />
                                          <AvatarFallback className="text-xs bg-muted">
                                              {student?.name?.substring(0, 2).toUpperCase() || 'AL'}
                                          </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 space-y-1">
                                          <div className="flex items-center justify-between">
                                              <p className="text-sm font-medium leading-none truncate max-w-[220px]">
                                                  {student?.name || 'Aluno não encontrado'}
                                              </p>
                                              <div className="flex items-center text-xs text-muted-foreground">
                                                  <Clock className="mr-1 h-3 w-3" />
                                                  {formatTimeAgo(incident.createdAt)}
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                              <div className={`h-2 w-2 rounded-full ${severityColor}`} />
                                              <span className="text-xs text-muted-foreground">
                                                  {getIncidentTypeLabel(incident.incidentType)}
                                              </span>
                                              <span className="text-xs text-muted-foreground">•</span>
                                              <span className="text-xs text-muted-foreground">
                                                  {getIncidentSeverityLabel(incident.finalSeverity, incident.incidentType)}
                                              </span>
                                              {incident.status === 'resolvida' && (
                                                  <Badge
                                                      variant="outline"
                                                      className="text-[10px] h-4 px-1 py-0 ml-auto border-[#10B981]/35 text-[#10B981] bg-[#10B981]/10 dark:bg-[#10B981]/20"
                                                  >
                                                      Resolvida
                                                  </Badge>
                                              )}
                                          </div>
                                          <p className="text-xs text-muted-foreground line-clamp-1">
                                              {incident.description}
                                          </p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                          <div className="p-3 rounded-full bg-muted/50">
                              <Clock className="h-6 w-6 opacity-30" />
                          </div>
                          <p className="text-sm">Nenhuma atividade recente</p>
                      </div>
                  )}
              </CardContent>
          </Card>

          <RecentActivityDialog
            open={showAllDialog}
            onOpenChange={setShowAllDialog}
            incidents={incidents}
            classes={classes}
            students={students}
          />
        </>
    );
};
