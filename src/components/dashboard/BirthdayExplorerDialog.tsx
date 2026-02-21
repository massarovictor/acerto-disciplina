import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { BirthdayTimelineEntry, buildBirthdayTimeline } from "@/lib/birthdayTimeline";
import { Class, Student } from "@/types";

interface BirthdayExplorerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  classes: Class[];
}

type BirthdayTab = "upcoming" | "past";
type DayRange = "30" | "90" | "365";

const filterEntries = ({
  entries,
  searchTerm,
  maxDistance,
}: {
  entries: BirthdayTimelineEntry[];
  searchTerm: string;
  maxDistance: number;
}) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return entries.filter((entry) => {
    if (entry.distanceDays > maxDistance) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      entry.studentName.toLowerCase().includes(normalizedSearch) ||
      entry.className.toLowerCase().includes(normalizedSearch)
    );
  });
};

export const BirthdayExplorerDialog = ({
  open,
  onOpenChange,
  students,
  classes,
}: BirthdayExplorerDialogProps) => {
  const [tab, setTab] = useState<BirthdayTab>("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [dayRange, setDayRange] = useState<DayRange>("90");

  const timeline = useMemo(() => buildBirthdayTimeline(students, classes), [students, classes]);
  const maxDistance = Number(dayRange);

  const filteredUpcoming = useMemo(
    () => filterEntries({ entries: timeline.upcoming, searchTerm, maxDistance }),
    [maxDistance, searchTerm, timeline.upcoming],
  );
  const filteredPast = useMemo(
    () => filterEntries({ entries: timeline.past, searchTerm, maxDistance }),
    [maxDistance, searchTerm, timeline.past],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle className="text-xl">Aniversariantes</DialogTitle>
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
                      placeholder="Buscar por aluno ou turma..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <Select value={dayRange} onValueChange={(value) => setDayRange(value as DayRange)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Intervalo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Últimos/próximos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos/próximos 90 dias</SelectItem>
                      <SelectItem value="365">Últimos/próximos 12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(value) => setTab(value as BirthdayTab)} className="space-y-3">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
              <TabsTrigger value="upcoming">
                Próximos
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {filteredUpcoming.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="past">
                Passados
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {filteredPast.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              <div className="rounded-md border">
                {filteredUpcoming.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum aniversariante encontrado no período selecionado.
                  </div>
                ) : (
                  <ScrollArea className="h-[52vh]">
                    <div className="space-y-2 p-4">
                      {filteredUpcoming.map((entry) => (
                        <div
                          key={`upcoming-${entry.studentId}`}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card"
                        >
                          <div>
                            <p className="text-sm font-medium">{entry.studentName}</p>
                            <p className="text-xs text-muted-foreground">{entry.className}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={entry.distanceDays === 0 ? "default" : "outline"}>
                              {entry.relativeLabel}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{entry.dateLabel}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              <div className="rounded-md border">
                {filteredPast.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum aniversariante encontrado no período selecionado.
                  </div>
                ) : (
                  <ScrollArea className="h-[52vh]">
                    <div className="space-y-2 p-4">
                      {filteredPast.map((entry) => (
                        <div
                          key={`past-${entry.studentId}`}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card"
                        >
                          <div>
                            <p className="text-sm font-medium">{entry.studentName}</p>
                            <p className="text-xs text-muted-foreground">{entry.className}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={entry.distanceDays === 0 ? "default" : "outline"}>
                              {entry.relativeLabel}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{entry.dateLabel}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
