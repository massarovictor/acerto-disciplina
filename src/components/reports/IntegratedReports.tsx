import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, FileDown, UserCheck, Calendar } from "lucide-react";
import { Class, Student, Incident } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  useProfessionalSubjects,
  useProfessionalSubjectTemplates,
  useGrades,
} from "@/hooks/useData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateStudentReportPDF } from "@/lib/studentReportPdfExport";
import { generateProfessionalClassReportPDF } from "@/lib/classReportPdfExport";
import { SUBJECT_AREAS, QUARTERS } from "@/lib/subjects";
import { calculateCurrentYearFromCalendar } from "@/lib/classYearCalculator";

interface IntegratedReportsProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
}

export const IntegratedReports = ({
  classes,
  students,
  incidents,
}: IntegratedReportsProps) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("anual");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { grades } = useGrades();
  // DISABLED: Attendance feature temporarily removed
  // const { attendance } = useAttendance();
  const { getProfessionalSubjects } = useProfessionalSubjects();
  const { templates } = useProfessionalSubjectTemplates();

  const schoolYearOptions: Array<{ value: 1 | 2 | 3; label: string }> = [
    { value: 1, label: "1º ano" },
    { value: 2, label: "2º ano" },
    { value: 3, label: "3º ano" },
  ];

  const selectedClassData = useMemo(
    () => classes.find((cls) => cls.id === selectedClass) || null,
    [classes, selectedClass],
  );

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSchoolYear(1);
      return;
    }
    // Calcular dinamicamente o ano atual da turma baseado no ano calendário de início
    const classInfo = classes.find((cls) => cls.id === selectedClass);
    if (!classInfo) {
      setSelectedSchoolYear(1);
      return;
    }

    // Usar startCalendarYear para cálculo simples: anoAtual - anoInício + 1
    if (classInfo.startCalendarYear) {
      const calculatedYear = calculateCurrentYearFromCalendar(
        classInfo.startCalendarYear,
      );
      setSelectedSchoolYear(calculatedYear);
    } else {
      // Fallback para currentYear armazenado
      const defaultYear = classInfo.currentYear ?? 1;
      const normalizedYear = [1, 2, 3].includes(defaultYear as number)
        ? (defaultYear as 1 | 2 | 3)
        : 1;
      setSelectedSchoolYear(normalizedYear);
    }
  }, [selectedClass, classes]);

  const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);
  const addMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  };
  const addYears = (date: Date, years: number) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };
  const getQuarterRange = (
    startYearDate: string | undefined,
    schoolYear: number,
    quarter: string,
  ) => {
    if (!startYearDate) return null;
    const index = QUARTERS.indexOf(quarter);
    if (index < 0) return null;
    const startDate = parseLocalDate(startYearDate);
    if (Number.isNaN(startDate.getTime())) return null;
    const yearOffset = schoolYear - 1;
    const currentYearStart = addYears(startDate, yearOffset);
    const rangeStart = addMonths(currentYearStart, index * 2);
    const rangeEnd = addMonths(currentYearStart, index * 2 + 2);
    return { start: rangeStart, end: rangeEnd };
  };
  const getSchoolYearRange = (
    startYearDate: string | undefined,
    schoolYear: number,
  ) => {
    if (!startYearDate) return null;
    const startDate = parseLocalDate(startYearDate);
    if (Number.isNaN(startDate.getTime())) return null;
    const yearOffset = schoolYear - 1;
    const yearStart = addYears(startDate, yearOffset);
    const yearEnd = addMonths(yearStart, 8);
    return { start: yearStart, end: yearEnd };
  };
  const isDateInRange = (
    value: string,
    range: { start: Date; end: Date } | null,
  ) => {
    if (!range) return true;
    const date = parseLocalDate(value);
    if (Number.isNaN(date.getTime())) return false;
    return date >= range.start && date < range.end;
  };

  const classStudents = useMemo(
    () =>
      selectedClass ? students.filter((s) => s.classId === selectedClass) : [],
    [selectedClass, students],
  );

  const fallbackStartYearDate = selectedClassData?.startCalendarYear
    ? `${selectedClassData.startCalendarYear}-02-01`
    : undefined;
  const effectiveStartYearDate =
    selectedClassData?.startYearDate || fallbackStartYearDate;
  const schoolYearRange = useMemo(
    () => getSchoolYearRange(effectiveStartYearDate, selectedSchoolYear),
    [effectiveStartYearDate, selectedSchoolYear],
  );

  const classGrades = useMemo(
    () =>
      selectedClass
        ? grades.filter(
            (g) =>
              g.classId === selectedClass &&
              (g.schoolYear ?? 1) === selectedSchoolYear,
          )
        : [],
    [grades, selectedClass, selectedSchoolYear],
  );

  const classIncidents = useMemo(
    () =>
      selectedClass
        ? incidents.filter(
            (i) =>
              i.classId === selectedClass &&
              isDateInRange(i.date, schoolYearRange),
          )
        : [],
    [incidents, selectedClass, schoolYearRange],
  );

  // DISABLED: Attendance feature temporarily removed
  // const classAttendance = useMemo(
  //   () =>
  //     selectedClass
  //       ? attendance.filter(
  //         a =>
  //           a.classId === selectedClass &&
  //           isDateInRange(a.date, schoolYearRange)
  //       )
  //       : [],
  //   [attendance, selectedClass, schoolYearRange]
  // );
  const classAttendance: any[] = []; // Empty array - attendance disabled

  const templateSubjects = useMemo(() => {
    if (!selectedClassData?.templateId) return [];
    const template = templates.find(
      (t) => t.id === selectedClassData.templateId,
    );
    const yearData = template?.subjectsByYear.find(
      (y) => y.year === selectedSchoolYear,
    );
    return yearData?.subjects ?? [];
  }, [templates, selectedClassData?.templateId, selectedSchoolYear]);

  const manualSubjects = useMemo(
    () => (selectedClass ? getProfessionalSubjects(selectedClass) : []),
    [selectedClass, getProfessionalSubjects],
  );

  const professionalSubjects = useMemo(() => {
    const unique = new Set<string>();
    [...templateSubjects, ...manualSubjects].forEach((subject) => {
      if (subject?.trim()) {
        unique.add(subject.trim());
      }
    });
    return Array.from(unique);
  }, [templateSubjects, manualSubjects]);
  const reportSubjects = useMemo(() => {
    if (!selectedClassData) return [];
    const gradeSubjects = [
      ...new Set(classGrades.map((grade) => grade.subject)),
    ];
    if (gradeSubjects.length > 0) {
      return gradeSubjects.sort();
    }
    const baseSubjects = SUBJECT_AREAS.flatMap((area) => area.subjects);
    return [...new Set([...baseSubjects, ...professionalSubjects])].sort();
  }, [selectedClassData, classGrades, professionalSubjects]);

  const classAverage =
    classGrades.length > 0
      ? classGrades.reduce((sum, grade) => sum + grade.grade, 0) /
        classGrades.length
      : 0;

  const selectedStudentData = selectedStudent
    ? classStudents.find((student) => student.id === selectedStudent) || null
    : null;

  const selectedStudentMetrics = useMemo(() => {
    if (!selectedStudentData) return null;

    const studentGrades = classGrades.filter(
      (g) => g.studentId === selectedStudentData.id,
    );
    const subjects = [...new Set(studentGrades.map((g) => g.subject))];
    const subjectAverages = subjects.map((subject) => {
      const gradesBySubject = studentGrades.filter(
        (g) => g.subject === subject,
      );
      const average =
        gradesBySubject.length > 0
          ? gradesBySubject.reduce((sum, g) => sum + g.grade, 0) /
            gradesBySubject.length
          : 0;
      return { subject, average };
    });

    const overallAverage =
      subjectAverages.length > 0
        ? subjectAverages.reduce((sum, s) => sum + s.average, 0) /
          subjectAverages.length
        : 0;

    const subjectsBelowAverage = subjectAverages
      .filter((s) => s.average < 6)
      .map((s) => s.subject);

    const studentIncidents = classIncidents.filter((i) =>
      i.studentIds.includes(selectedStudentData.id),
    );
    const studentAttendance = classAttendance.filter(
      (a) => a.studentId === selectedStudentData.id,
    );
    const absences = studentAttendance.filter(
      (a) => a.status !== "presente",
    ).length;
    const presenceRate =
      studentAttendance.length > 0
        ? ((studentAttendance.length - absences) / studentAttendance.length) *
          100
        : 100;

    return {
      average: overallAverage,
      subjectsBelowAverage,
      incidents: studentIncidents.length,
      absences,
      presenceRate,
    };
  }, [selectedStudentData, classGrades, classIncidents, classAttendance]);

  const handleOpenPeriodDialog = () => {
    if (!selectedClassData) {
      toast({
        variant: "destructive",
        title: "Selecione uma turma",
        description: "Escolha a turma para gerar o relatório.",
      });
      return;
    }
    setSelectedPeriod("anual");
    setShowPeriodDialog(true);
  };

  const handleGenerateClassReport = async () => {
    if (!selectedClassData) return;

    setIsGenerating(true);
    try {
      const periodRange =
        selectedPeriod !== "anual"
          ? getQuarterRange(
              effectiveStartYearDate,
              selectedSchoolYear,
              selectedPeriod,
            )
          : schoolYearRange;
      const reportAttendance = classAttendance.filter((record) =>
        isDateInRange(record.date, periodRange),
      );
      const reportIncidents = classIncidents.filter((incident) =>
        isDateInRange(incident.date, periodRange),
      );

      await generateProfessionalClassReportPDF(
        selectedClassData,
        classStudents,
        classGrades,
        reportIncidents,
        reportAttendance,
        professionalSubjects,
        selectedPeriod,
      );

      setShowPeriodDialog(false);
      toast({
        title: "Relatório Gerado",
        description: `O relatório qualitativo da turma ${selectedClassData.name} foi baixado.`,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório de turma (PDF generation failed)");
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o PDF. Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleIndividualReport = async () => {
    if (!selectedClassData || !selectedStudentData) {
      toast({
        variant: "destructive",
        title: "Selecione a turma e o aluno",
        description: "Escolha o aluno que receberá o relatório individual.",
      });
      return;
    }

    try {
      await generateStudentReportPDF(
        selectedStudentData,
        selectedClassData,
        classGrades,
        classIncidents,
        classAttendance,
        reportSubjects,
      );

      toast({
        title: "Relatório Gerado",
        description: `O relatório de ${selectedStudentData.name} foi baixado.`,
      });
    } catch (error) {
      console.error(
        "Erro ao gerar relatório individual (PDF generation failed)",
      );
      toast({
        variant: "destructive",
        title: "Erro na geração",
        description: "Não foi possível criar o PDF. Tente novamente.",
      });
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Relatório de Turma
                </CardTitle>
                <CardDescription>
                  Gera um boletim da turma com resumo e tabela anual de notas.
                </CardDescription>
              </div>
              {selectedClassData && (
                <Badge variant="secondary">{selectedClassData.name}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Selecione a turma</Label>
              <Select
                value={selectedClass}
                onValueChange={(value) => {
                  setSelectedClass(value);
                  setSelectedStudent("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma turma cadastrada
                    </div>
                  ) : (
                    classes
                      .filter((cls) => !cls.archived)
                      .map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano da turma</Label>
              <Select
                value={String(selectedSchoolYear)}
                onValueChange={(value) =>
                  setSelectedSchoolYear(Number(value) as 1 | 2 | 3)
                }
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYearOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassData ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-between">
                  <span>Total de alunos</span>
                  <span className="font-semibold text-foreground">
                    {classStudents.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Média geral</span>
                  <span className="font-semibold text-foreground">
                    {classAverage.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ocorrências registradas</span>
                  <span className="font-semibold text-foreground">
                    {classIncidents.length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Escolha uma turma para visualizar o resumo e habilitar o
                download do PDF.
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleOpenPeriodDialog}
              disabled={!selectedClass}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Gerar Relatório Qualitativo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Relatório Individual
                </CardTitle>
                <CardDescription>
                  Gera um boletim individual com resumo de atenção, ocorrências
                  e notas do ano.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select
                value={selectedClass}
                onValueChange={(value) => {
                  setSelectedClass(value);
                  setSelectedStudent("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma turma cadastrada
                    </div>
                  ) : (
                    classes
                      .filter((cls) => !cls.archived)
                      .map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano da turma</Label>
              <Select
                value={String(selectedSchoolYear)}
                onValueChange={(value) =>
                  setSelectedSchoolYear(Number(value) as 1 | 2 | 3)
                }
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYearOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedClass
                        ? "Escolha o aluno"
                        : "Selecione a turma primeiro"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {classStudents.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhum aluno encontrado
                    </div>
                  ) : (
                    classStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedStudentData && selectedStudentMetrics && (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Resumo
                  </p>
                  <p className="font-semibold text-foreground">
                    {selectedStudentData.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Média geral</p>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedStudentMetrics.average.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ocorrências</p>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedStudentMetrics.incidents}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Disciplinas &lt; 6
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedStudentMetrics.subjectsBelowAverage.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Presença</p>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedStudentMetrics.presenceRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {selectedStudentMetrics.subjectsBelowAverage.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Disciplinas em atenção
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedStudentMetrics.subjectsBelowAverage.join(", ")}
                    </p>
                  </>
                )}
              </div>
            )}

            <Button
              className="w-full"
              variant="secondary"
              onClick={handleIndividualReport}
              disabled={!selectedStudent}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Gerar Relatório Individual
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              O modelo individual segue o boletim com resumo, ocorrências e
              tabela anual de notas.
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Dialog de seleção de período */}
      <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gerar Relatório Qualitativo
            </DialogTitle>
            <DialogDescription>
              Selecione o período para análise. O relatório inclui análise por
              área do conhecimento, correlação comportamento x desempenho,
              predições de risco e recomendações.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="text-sm font-medium mb-3 block">
              Período de análise
            </Label>
            <RadioGroup
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="anual" id="anual" />
                <Label htmlFor="anual" className="flex-1 cursor-pointer">
                  <span className="font-medium">Ano Completo</span>
                  <p className="text-xs text-muted-foreground">
                    Análise consolidada de todos os bimestres
                  </p>
                </Label>
              </div>

              {QUARTERS.map((quarter) => (
                <div
                  key={quarter}
                  className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <RadioGroupItem value={quarter} id={quarter} />
                  <Label htmlFor={quarter} className="flex-1 cursor-pointer">
                    <span className="font-medium">{quarter}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPeriodDialog(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button onClick={handleGenerateClassReport} disabled={isGenerating}>
              {isGenerating ? "Gerando..." : "Gerar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
