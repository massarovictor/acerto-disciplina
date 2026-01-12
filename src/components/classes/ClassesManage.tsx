import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useClasses,
  useStudents,
  useGrades,
  // useAttendance, // DISABLED: Attendance feature temporarily removed
  useProfessionalSubjects,
  useIncidents,
  useProfessionalSubjectTemplates,
  useAuthorizedEmails,
  useProfiles,
} from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Edit,
  Trash2,
  Eye,
  School,
  Calendar,
  AlertTriangle,
  Archive,
  Clock,
} from "lucide-react";
import { Class } from "@/types";
import { getAcademicYear, shouldArchiveClass } from "@/lib/classYearCalculator";
import { useAuth } from "@/contexts/AuthContext";

interface ClassesManageProps {
  highlightId?: string | null;
}

export const ClassesManage = ({ highlightId }: ClassesManageProps) => {
  const { classes, updateClass, deleteClass, archiveClass } = useClasses();
  const { students, updateStudent } = useStudents();
  const { grades, deleteGrade } = useGrades();
  // DISABLED: Attendance feature temporarily removed
  // const { attendance, deleteAttendance } = useAttendance();
  const attendance: any[] = []; // Empty array placeholder
  const deleteAttendance = async (id: string) => { }; // No-op placeholder
  const { setProfessionalSubjectsForClass } = useProfessionalSubjects();
  const { incidents } = useIncidents();
  const { templates, getTemplate } = useProfessionalSubjectTemplates();
  const { authorizedEmails } = useAuthorizedEmails();
  const { profiles } = useProfiles();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "with-director" | "without-director"
  >("all");
  const [viewingClass, setViewingClass] = useState<Class | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    classData: Class;
    studentCount: number;
    gradeCount: number;
    attendanceCount: number;
    incidentCount: number;
  } | null>(null);
  const [archiveReason, setArchiveReason] = useState("Arquivamento manual");
  const [editFormData, setEditFormData] = useState({
    templateId: "",
    letter: "",
    course: "",
    directorId: "",
    directorEmail: "",
    active: true,
    startCalendarYear: undefined as number | undefined,
    endCalendarYear: undefined as number | undefined,
    currentSeries: 1 as 1 | 2 | 3,
    startYearDate: "",
  });
  const [templateSubjects, setTemplateSubjects] = useState<string[]>([]);
  const [templateSubjectsByYear, setTemplateSubjectsByYear] = useState<
    { year: number; subjects: string[] }[]
  >([]);
  const [syncTemplateSubjects, setSyncTemplateSubjects] = useState(false);
  const [archivingClass, setArchivingClass] = useState<Class | null>(null);
  const normalizeName = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();

  const filteredClasses = useMemo(() => classes.filter((cls) => {
    // Filtrar apenas turmas não arquivadas
    if (cls.archived) return false;

    const matchesSearch =
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.series.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "with-director")
      return matchesSearch && (cls.directorId || cls.directorEmail);
    if (filterStatus === "without-director")
      return matchesSearch && !cls.directorId && !cls.directorEmail;
    return matchesSearch;
  }), [classes, searchTerm, filterStatus]);

  const getDirectorName = (cls: Class) => {
    if (cls.directorId) {
      if (cls.directorId === profile?.id) return profile?.name || profile?.email || "Diretor (Eu)";
      const foundProfile = profiles.find(p => p.id === cls.directorId);
      if (foundProfile) return foundProfile.name || foundProfile.email;
    }
    if (cls.directorEmail) return cls.directorEmail;
    return null;
  };

  const getStudentCount = (classId: string) => {
    return students.filter((s) => s.classId === classId).length;
  };

  const handleEditClick = (cls: Class) => {
    // Calcular série atual
    const currentYear = new Date().getFullYear();
    let currentSeries: 1 | 2 | 3 = 1;
    if (cls.startCalendarYear) {
      const yearsElapsed = currentYear - cls.startCalendarYear + 1;
      currentSeries = Math.min(Math.max(yearsElapsed, 1), 3) as 1 | 2 | 3;
    }

    setEditFormData({
      templateId: cls.templateId || "",
      letter: cls.letter || "",
      course: cls.course || "",
      directorId: cls.directorId || "",
      directorEmail: cls.directorEmail || "",
      active: cls.active,
      startCalendarYear: cls.startCalendarYear,
      endCalendarYear: cls.endCalendarYear,
      currentSeries,
      startYearDate:
        cls.startYearDate || (cls.startCalendarYear ? `${cls.startCalendarYear}-02-01` : ""),
    });
    setSyncTemplateSubjects(false);
    setEditingClass(cls);
  };


  useEffect(() => {
    if (!editingClass) {
      setTemplateSubjects([]);
      setTemplateSubjectsByYear([]);
      return;
    }

    const hasTemplate = !!editFormData.templateId && editFormData.templateId !== "none" && editFormData.templateId !== "";
    if (!hasTemplate) {
      setTemplateSubjects([]);
      setTemplateSubjectsByYear([]);
      return;
    }

    const template = templates.find((t) => t.id === editFormData.templateId);
    if (!template) {
      setTemplateSubjects([]);
      setTemplateSubjectsByYear([]);
      return;
    }

    setTemplateSubjectsByYear(template.subjectsByYear);
    const yearData = template.subjectsByYear.find((y) => y.year === editFormData.currentSeries);
    setTemplateSubjects(yearData?.subjects ?? template.subjectsByYear[0]?.subjects ?? []);

    if (template.course && editFormData.course !== template.course) {
      setEditFormData((prev) => ({
        ...prev,
        course: template.course,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingClass, editFormData.templateId, editFormData.currentSeries, templates]);

  useEffect(() => {
    if (!editingClass) return;
    setSyncTemplateSubjects(false);
  }, [editingClass, editFormData.templateId]);

  useEffect(() => {
    if (!editingClass) return;
    if (!editFormData.startCalendarYear || !editFormData.endCalendarYear) return;

    const currentYear = new Date().getFullYear();
    let nextSeries: 1 | 2 | 3 = 1;

    if (currentYear < editFormData.startCalendarYear) {
      nextSeries = 1;
    } else if (currentYear > editFormData.endCalendarYear) {
      nextSeries = 3;
    } else {
      const yearsElapsed = currentYear - editFormData.startCalendarYear + 1;
      nextSeries = Math.min(Math.max(yearsElapsed, 1), 3) as 1 | 2 | 3;
    }

    if (editFormData.currentSeries !== nextSeries) {
      setEditFormData((prev) => ({
        ...prev,
        currentSeries: nextSeries,
      }));
    }
  }, [editingClass, editFormData.startCalendarYear, editFormData.endCalendarYear, editFormData.currentSeries]);

  const handleSaveEdit = async () => {
    if (!editingClass) return;

    const trimmedCourse = editFormData.course.trim();
    const hasTemplate =
      !!editFormData.templateId && editFormData.templateId !== "none" && editFormData.templateId !== "";
    const selectedTemplate = hasTemplate
      ? templates.find((t) => t.id === editFormData.templateId)
      : undefined;

    // Validação
    if (!editFormData.letter) {
      toast({
        title: "Erro",
        description: "Preencha a letra da turma.",
        variant: "destructive",
      });
      return;
    }

    if (!editFormData.startCalendarYear || !editFormData.endCalendarYear) {
      toast({
        title: "Erro",
        description: "Informe o ano de início e término da turma.",
        variant: "destructive",
      });
      return;
    }

    if (editFormData.endCalendarYear < editFormData.startCalendarYear) {
      toast({
        title: "Erro",
        description: "O ano de término deve ser maior ou igual ao ano de início.",
        variant: "destructive",
      });
      return;
    }

    const resolvedCourse = selectedTemplate?.course ?? trimmedCourse;

    if (!resolvedCourse) {
      toast({
        title: "Erro",
        description: "Informe o curso da turma.",
        variant: "destructive",
      });
      return;
    }

    const normalizedLetter = editFormData.letter.trim().toUpperCase();
    const newName = `${editFormData.startCalendarYear}-${editFormData.endCalendarYear} ${resolvedCourse.trim()} ${normalizedLetter}`.trim();

    const normalizedName = normalizeName(newName);
    const duplicate = classes.find(
      (c) => !c.archived && c.id !== editingClass.id && normalizeName(c.name) === normalizedName,
    );
    if (duplicate) {
      toast({
        title: "Erro",
        description: "Já existe uma turma com este nome.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateClass(editingClass.id, {
        name: newName,
        series: `${editFormData.currentSeries}º ano`,
        letter: normalizedLetter,
        course: resolvedCourse.trim() || undefined,
        directorId: editFormData.directorId || undefined,
        directorEmail: editFormData.directorEmail || undefined,
        active: editFormData.active,
        startYear: 1,
        currentYear: editFormData.currentSeries,
        startCalendarYear: editFormData.startCalendarYear,
        endCalendarYear: editFormData.endCalendarYear,
        startYearDate: editFormData.startYearDate || undefined,
        templateId: hasTemplate && editFormData.templateId ? editFormData.templateId : null,
      });

      if (hasTemplate && syncTemplateSubjects) {
        await setProfessionalSubjectsForClass(editingClass.id, templateSubjects);
      }

      toast({
        title: "Sucesso",
        description: "Turma atualizada com sucesso.",
      });

      setEditingClass(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a turma.",
        variant: "destructive",
      });
    }
  };


  const handleDeleteClick = (cls: Class) => {
    // Coletar informações sobre dados vinculados
    const studentCount = students.filter((s) => s.classId === cls.id).length;
    const gradeCount = grades.filter((g) => g.classId === cls.id).length;
    const attendanceCount = attendance.filter(
      (a) => a.classId === cls.id,
    ).length;
    const incidentCount = incidents.filter((i) => i.classId === cls.id).length;

    // BLOQUEIO: Se houver ocorrências, não permitir exclusão
    if (incidentCount > 0) {
      toast({
        title: "Exclusão bloqueada",
        description: `Esta turma possui ${incidentCount} ocorrência(s) vinculada(s). Arquive a turma em vez de excluí-la para manter o histórico.`,
        variant: "destructive",
      });
      return;
    }

    setDeleteConfirmData({
      classData: cls,
      studentCount,
      gradeCount,
      attendanceCount,
      incidentCount,
    });
  };

  const handleCascadeDelete = async () => {
    if (!deleteConfirmData) return;

    const { classData, studentCount, gradeCount, attendanceCount } =
      deleteConfirmData;

    try {
      await Promise.all(
        grades
          .filter((g) => g.classId === classData.id)
          .map((grade) => deleteGrade(grade.id)),
      );

      await Promise.all(
        attendance
          .filter((a) => a.classId === classData.id)
          .map((att) => deleteAttendance(att.id)),
      );

      await Promise.all(
        students
          .filter((s) => s.classId === classData.id)
          .map((student) =>
            updateStudent(student.id, { status: "transferred" }),
          ),
      );

      await setProfessionalSubjectsForClass(classData.id, []);
      await deleteClass(classData.id);

      toast({
        title: "Turma excluída",
        // DISABLED: Frequência removida temporariamente
        description: `Turma excluída com sucesso. ${studentCount} aluno(s) transferido(s) e ${gradeCount} nota(s) removidas.`,
      });

      setDeleteConfirmData(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a turma.",
        variant: "destructive",
      });
    }
  };

  const editHasTemplate =
    !!editFormData.templateId && editFormData.templateId !== "none" && editFormData.templateId !== "";

  const handleArchive = async () => {
    if (!archivingClass) return;

    try {
      await archiveClass(archivingClass.id, archiveReason);

      await Promise.all(
        students
          .filter((s) => s.classId === archivingClass.id)
          .map((student) => updateStudent(student.id, { status: "inactive" })),
      );

      toast({
        title: "Turma arquivada",
        description: `A turma ${archivingClass.name} foi arquivada com sucesso.`,
      });

      setArchivingClass(null);
      setArchiveReason("Arquivamento manual");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar a turma.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, série ou curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                Todas
              </Button>
              <Button
                variant={
                  filterStatus === "without-director" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setFilterStatus("without-director")}
              >
                Sem Diretor
              </Button>
              <Button
                variant={
                  filterStatus === "with-director" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setFilterStatus("with-director")}
              >
                Com Diretor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Turmas ({filteredClasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhuma turma encontrada
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca ou crie uma nova turma.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Série Atual</TableHead>
                    <TableHead>Diretor</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => {
                    const currentYear = new Date().getFullYear();
                    const cycleComplete = cls.endCalendarYear && currentYear > cls.endCalendarYear;

                    // Calcular série atual baseado nos anos
                    let computedSeries = cls.currentYear || 1;
                    if (cls.startCalendarYear) {
                      const yearsElapsed = currentYear - cls.startCalendarYear + 1;
                      computedSeries = Math.min(Math.max(yearsElapsed, 1), 3) as 1 | 2 | 3;
                    }

                    const isHighlighted = highlightId === cls.id;

                    return (
                      <TableRow
                        key={cls.id}
                        className={isHighlighted ? "bg-primary/10 animate-pulse ring-2 ring-primary/50" : ""}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{cls.name}</div>
                            {cls.course && (
                              <div className="text-sm text-muted-foreground">{cls.course}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cls.startCalendarYear && cls.endCalendarYear ? (
                            <Badge variant="outline">
                              {cls.startCalendarYear} - {cls.endCalendarYear}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cycleComplete
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-700 border-blue-500/30"
                            }
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {cycleComplete ? "Concluído" : `${computedSeries}º ano`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(cls.directorId || cls.directorEmail) ? (
                            <div>
                              <p className="font-medium">
                                {getDirectorName(cls)}
                              </p>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-severity-critical-bg text-severity-critical border-severity-critical"
                            >
                              Sem diretor
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStudentCount(cls.id)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              cls.active
                                ? "bg-severity-light-bg text-severity-light border-severity-light"
                                : "bg-muted text-muted-foreground border-muted"
                            }
                          >
                            {cls.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingClass(cls)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(cls)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* Botão de arquivamento - pisca quando ciclo completo */}
                            {(() => {
                              const currentYear = new Date().getFullYear();
                              const cycleComplete = cls.endCalendarYear && currentYear > cls.endCalendarYear;

                              if (cycleComplete) {
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setArchiveReason("Conclusão do curso - ciclo completo");
                                      setArchivingClass(cls);
                                    }}
                                    title="⚠️ Ciclo concluído - ARQUIVAR TURMA"
                                    className="animate-pulse bg-amber-500/20 border-amber-500 text-amber-700 hover:bg-amber-500/30"
                                  >
                                    <Archive className="h-4 w-4 mr-1" />
                                    Arquivar
                                  </Button>
                                );
                              }

                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setArchiveReason("Arquivamento manual");
                                    setArchivingClass(cls);
                                  }}
                                  title="Arquivar turma"
                                >
                                  <Archive className="h-4 w-4 text-amber-600" />
                                </Button>
                              );
                            })()}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(cls)}
                            >
                              <Trash2 className="h-4 w-4 text-severity-critical" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      {viewingClass && (
        <Dialog
          open={!!viewingClass}
          onOpenChange={(open) => !open && setViewingClass(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Turma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{viewingClass.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Série</Label>
                <p className="font-medium">{viewingClass.series}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Curso</Label>
                <p className="font-medium">{viewingClass.course || "-"}</p>
              </div>
              {viewingClass.startYear && (
                <div>
                  <Label className="text-muted-foreground">Ano de Início</Label>
                  <p className="font-medium">{viewingClass.startYear}º ano</p>
                </div>
              )}
              {viewingClass.currentYear && (
                <div className="flex flex-col gap-2 w-fit">
                  <Label className="text-muted-foreground">Ano Atual</Label>
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-700 border-blue-500/30"
                  >
                    {viewingClass.currentYear}º ano
                    {viewingClass.startYearDate &&
                      ` (${getAcademicYear(viewingClass.startYearDate, viewingClass.currentYear)})`}
                  </Badge>
                </div>
              )}
              {viewingClass.startYearDate && (
                <div>
                  <Label className="text-muted-foreground">
                    Data de Início do 1º Ano
                  </Label>
                  <p className="font-medium">
                    {new Date(viewingClass.startYearDate).toLocaleDateString(
                      "pt-BR",
                    )}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Diretor</Label>
                <p className="font-medium">
                  {getDirectorName(viewingClass) || "Não atribuído"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Alunos Matriculados
                </Label>
                <p className="font-medium">
                  {getStudentCount(viewingClass.id)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground flex flex-col w-fit">
                  Status
                </Label>
                <Badge
                  variant="outline"
                  className={
                    viewingClass.active
                      ? "bg-severity-light-bg text-severity-light border-severity-light"
                      : "bg-muted text-muted-foreground border-muted"
                  }
                >
                  {viewingClass.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingClass && (
        <Dialog
          open={!!editingClass}
          onOpenChange={(open) => !open && setEditingClass(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Turma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Preview do nome */}
              <div className="p-3 border rounded-md bg-muted/50">
                <Label className="text-muted-foreground text-xs">Nome da Turma</Label>
                <p className="font-semibold text-lg">
                  {editFormData.startCalendarYear}-{editFormData.endCalendarYear} {editFormData.course} {editFormData.letter}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Template */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-template">Template de Disciplinas</Label>
                  <Select
                    value={editFormData.templateId || "none"}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        templateId: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger id="edit-template">
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ano de Início */}
                <div className="space-y-2">
                  <Label htmlFor="edit-startCalendarYear">Ano de Início *</Label>
                  <Select
                    value={editFormData.startCalendarYear?.toString() || ""}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        startCalendarYear: parseInt(value),
                        endCalendarYear: parseInt(value) + 2,
                        startYearDate: editFormData.startYearDate || `${parseInt(value)}-02-01`,
                      })
                    }
                  >
                    <SelectTrigger id="edit-startCalendarYear">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ano de Término */}
                <div className="space-y-2">
                  <Label htmlFor="edit-endCalendarYear">Ano de Término *</Label>
                  <Select
                    value={editFormData.endCalendarYear?.toString() || ""}
                    onValueChange={(value) =>
                      setEditFormData((prev) => {
                        const nextEnd = parseInt(value);
                        if (prev.startCalendarYear && nextEnd < prev.startCalendarYear) {
                          return {
                            ...prev,
                            endCalendarYear: prev.startCalendarYear + 2,
                          };
                        }
                        return {
                          ...prev,
                          endCalendarYear: nextEnd,
                        };
                      })
                    }
                  >
                    <SelectTrigger id="edit-endCalendarYear">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de Início do 1º Ano */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-startYearDate">Data de Início do 1º Ano</Label>
                  <Input
                    id="edit-startYearDate"
                    type="date"
                    value={editFormData.startYearDate}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        startYearDate: e.target.value,
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Usada para organizar bimestres e relatórios por ano letivo.
                  </p>
                </div>

                {/* Série Atual */}
                <div className="space-y-2">
                  <Label>Série Atual</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge variant="secondary" className="text-base">
                      {editFormData.currentSeries}º ano
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      (calculado)
                    </span>
                  </div>
                </div>

                {/* Letra */}
                <div className="space-y-2">
                  <Label htmlFor="edit-letter">Letra *</Label>
                  <Input
                    id="edit-letter"
                    placeholder="Ex: A, B, C"
                    value={editFormData.letter}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        letter: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={1}
                  />
                </div>

                {/* Curso */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-course">Curso *</Label>
                  <Input
                    id="edit-course"
                    placeholder="Ex: Informática, Redes de Computadores"
                    value={editFormData.course}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        course: e.target.value,
                      })
                    }
                    disabled={editHasTemplate}
                  />
                </div>

                {/* Disciplinas do Template */}
                {editHasTemplate && templateSubjectsByYear.length > 0 && (
                  <div className="space-y-3 md:col-span-2">
                    <Label>Disciplinas Profissionais por Ano</Label>
                    {templateSubjectsByYear.map((yearData) => {
                      const isCurrent = yearData.year === editFormData.currentSeries;
                      return (
                        <div key={yearData.year} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              {yearData.year}º Ano
                            </p>
                            {isCurrent && (
                              <Badge variant="secondary" className="text-xs">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <div
                            className={`flex flex-wrap gap-2 p-3 border rounded-md ${isCurrent ? "bg-amber-50/50 border-amber-200" : "bg-muted/50"
                              }`}
                          >
                            {yearData.subjects.map((subject, index) => (
                              <Badge
                                key={`${yearData.year}-${index}`}
                                variant="outline"
                                className="bg-amber-500/10 text-amber-700 border-amber-500/30"
                              >
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {editHasTemplate && (
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sync-template-subjects"
                        checked={syncTemplateSubjects}
                        onCheckedChange={setSyncTemplateSubjects}
                      />
                      <Label htmlFor="sync-template-subjects">
                        Atualizar disciplinas profissionais da turma com este template
                      </Label>
                    </div>
                    {syncTemplateSubjects && (
                      <p className="text-sm text-amber-700">
                        Isso substituirá as disciplinas profissionais atuais pela lista do ano corrente do template.
                      </p>
                    )}
                  </div>
                )}

                {/* Diretor */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-director">Diretor de Turma</Label>
                  <Select
                    value={editFormData.directorEmail || "none"}
                    onValueChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        directorEmail: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger id="edit-director">
                      <SelectValue placeholder="Selecione o diretor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem diretor atribuído</SelectItem>
                      {authorizedEmails.map((auth) => (
                        <SelectItem key={auth.email} value={auth.email}>
                          {auth.email} ({auth.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="edit-active"
                    checked={editFormData.active}
                    onCheckedChange={(checked) =>
                      setEditFormData({ ...editFormData, active: checked })
                    }
                  />
                  <Label htmlFor="edit-active">Turma ativa</Label>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setEditingClass(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmData}
        onOpenChange={(open) => !open && setDeleteConfirmData(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-severity-critical" />
              Confirmar Exclusão em Cascata
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a excluir a turma{" "}
                <strong>{deleteConfirmData?.classData.name}</strong>.
              </p>

              {deleteConfirmData &&
                (deleteConfirmData.studentCount > 0 ||
                  deleteConfirmData.gradeCount > 0) && (
                  <div className="bg-severity-critical-bg p-4 rounded-md space-y-2">
                    <p className="font-semibold text-severity-critical">
                      Esta turma possui dados vinculados:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {deleteConfirmData.studentCount > 0 && (
                        <li>
                          {deleteConfirmData.studentCount} aluno(s) - serão
                          marcados como 'Transferidos'
                        </li>
                      )}
                      {deleteConfirmData.gradeCount > 0 && (
                        <li>
                          {deleteConfirmData.gradeCount} nota(s) - serão
                          permanentemente excluídas
                        </li>
                      )}
                      {/* DISABLED: Frequência removida temporariamente
                      {deleteConfirmData.attendanceCount > 0 && (
                        <li>
                          {deleteConfirmData.attendanceCount} registro(s) de
                          frequência - serão permanentemente excluídos
                        </li>
                      )}
                      */}
                    </ul>
                  </div>
                )}

              <p className="font-semibold text-severity-critical">
                Esta ação não pode ser desfeita. Tem certeza que deseja
                continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCascadeDelete}
              className="bg-severity-critical hover:bg-severity-critical/90"
            >
              Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!archivingClass}
        onOpenChange={(open) => !open && setArchivingClass(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-600" />
              Confirmar Arquivamento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a arquivar a turma{" "}
                <strong>{archivingClass?.name}</strong>.
              </p>
              <p className="text-muted-foreground">
                A turma será movida para a lista de turmas arquivadas e seus alunos
                serão marcados como inativos. Você pode desarquivar a turma a qualquer
                momento.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Arquivar Turma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
