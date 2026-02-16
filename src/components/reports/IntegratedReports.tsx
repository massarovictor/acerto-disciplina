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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileDown,
  UserCheck,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import { Class, Student, Incident } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  useProfessionalSubjects,
  useProfessionalSubjectTemplates,
  useGradesScoped,
  useHistoricalGradesScoped,
  useExternalAssessmentsScoped,
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
import { generateTrajectoryReportPDF } from "@/lib/trajectoryReportPdfExport";
import { SUBJECT_AREAS, QUARTERS, FUNDAMENTAL_SUBJECT_AREAS } from "@/lib/subjects";
import { calculateCurrentYearFromCalendar } from "@/lib/classYearCalculator";

interface IntegratedReportsProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
  enabled?: boolean;
}

export const IntegratedReports = ({
  classes,
  students,
  incidents,
  enabled = true,
}: IntegratedReportsProps) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("anual");
  const [selectedIndividualPeriod, setSelectedIndividualPeriod] =
    useState<string>("anual");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const trajectoryFeatureIncomplete = true;
  const { toast } = useToast();
  const { grades, loading: isGradesLoading } = useGradesScoped({
    classId: selectedClass || undefined,
    schoolYear: selectedSchoolYear,
  }, { enabled });
  const { historicalGrades } = useHistoricalGradesScoped(
    selectedStudent || undefined,
    { enabled }
  );
  const { externalAssessments } = useExternalAssessmentsScoped(
    selectedStudent || undefined,
    { enabled }
  );
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
  const extractQuarterNumber = (value?: string) => {
    if (!value) return null;
    const match = String(value).match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const isGradeInPeriod = (quarterValue: string, period: string) => {
    if (period === "anual") return true;
    const gradeQuarterNumber = extractQuarterNumber(quarterValue);
    const selectedQuarterNumber = extractQuarterNumber(period);
    if (gradeQuarterNumber !== null && selectedQuarterNumber !== null) {
      return gradeQuarterNumber === selectedQuarterNumber;
    }
    return quarterValue.trim() === period.trim();
  };
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
  const getCalendarYearForSchoolYear = (
    classData: Class | null,
    schoolYear: 1 | 2 | 3,
  ): number | null => {
    if (!classData) return null;

    if (classData.startCalendarYear) {
      return classData.startCalendarYear + (schoolYear - 1);
    }

    if (classData.startYearDate) {
      const startDate = parseLocalDate(classData.startYearDate);
      if (!Number.isNaN(startDate.getTime())) {
        return startDate.getFullYear() + (schoolYear - 1);
      }
    }

    if (classData.endCalendarYear) {
      return classData.endCalendarYear - (3 - schoolYear);
    }

    return null;
  };
  const formatPeriodContextLabel = (
    period: string,
    schoolYear: 1 | 2 | 3,
    calendarYear: number | null,
  ) => {
    const periodLabel = period === "anual" ? "Ano Completo" : period;
    const schoolYearLabel = `${schoolYear}º ano`;
    return calendarYear
      ? `${periodLabel} • ${schoolYearLabel} • ${calendarYear}`
      : `${periodLabel} • ${schoolYearLabel}`;
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
      selectedClass
        ? students
          .filter((s) => s.classId === selectedClass)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        : [],
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
  const selectedCalendarYear = useMemo(
    () => getCalendarYearForSchoolYear(selectedClassData, selectedSchoolYear),
    [selectedClassData, selectedSchoolYear],
  );
  const classPeriodContextLabel = useMemo(
    () =>
      formatPeriodContextLabel(
        selectedPeriod,
        selectedSchoolYear,
        selectedCalendarYear,
      ),
    [selectedPeriod, selectedSchoolYear, selectedCalendarYear],
  );
  const individualPeriodContextLabel = useMemo(
    () =>
      formatPeriodContextLabel(
        selectedIndividualPeriod,
        selectedSchoolYear,
        selectedCalendarYear,
      ),
    [selectedIndividualPeriod, selectedSchoolYear, selectedCalendarYear],
  );
  const classPeriodRange = useMemo(
    () =>
      selectedPeriod !== "anual"
        ? getQuarterRange(
          effectiveStartYearDate,
          selectedSchoolYear,
          selectedPeriod,
        )
        : schoolYearRange,
    [effectiveStartYearDate, schoolYearRange, selectedPeriod, selectedSchoolYear],
  );
  const individualPeriodRange = useMemo(
    () =>
      selectedIndividualPeriod !== "anual"
        ? getQuarterRange(
          effectiveStartYearDate,
          selectedSchoolYear,
          selectedIndividualPeriod,
        )
        : schoolYearRange,
    [
      effectiveStartYearDate,
      schoolYearRange,
      selectedIndividualPeriod,
      selectedSchoolYear,
    ],
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
  const classGradesForPeriod = useMemo(
    () =>
      selectedPeriod === "anual"
        ? classGrades
        : classGrades.filter((grade) =>
          isGradeInPeriod(grade.quarter, selectedPeriod),
        ),
    [classGrades, selectedPeriod],
  );
  const individualGradesForPeriod = useMemo(
    () =>
      selectedIndividualPeriod === "anual"
        ? classGrades
        : classGrades.filter((grade) =>
          isGradeInPeriod(grade.quarter, selectedIndividualPeriod),
        ),
    [classGrades, selectedIndividualPeriod],
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
  const classIncidentsForPeriod = useMemo(
    () =>
      classIncidents.filter((incident) =>
        isDateInRange(incident.date, classPeriodRange),
      ),
    [classIncidents, classPeriodRange],
  );
  const individualIncidentsForPeriod = useMemo(
    () =>
      classIncidents.filter((incident) =>
        isDateInRange(incident.date, individualPeriodRange),
      ),
    [classIncidents, individualPeriodRange],
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
  const classAttendanceForPeriod = useMemo(
    () =>
      classAttendance.filter((record) =>
        isDateInRange(record.date, classPeriodRange),
      ),
    [classAttendance, classPeriodRange],
  );
  const individualAttendanceForPeriod = useMemo(
    () =>
      classAttendance.filter((record) =>
        isDateInRange(record.date, individualPeriodRange),
      ),
    [classAttendance, individualPeriodRange],
  );

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
  const individualReportSubjects = useMemo(() => {
    if (!selectedClassData) return [];
    const gradeSubjects = [
      ...new Set(individualGradesForPeriod.map((grade) => grade.subject)),
    ];
    if (gradeSubjects.length > 0) {
      return gradeSubjects.sort();
    }

    // Check if class is fundamental
    const isFundamental = selectedClassData.series
      ? ['6º', '7º', '8º', '9º'].some(s => selectedClassData.series.includes(s))
      : false;

    const areas = isFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS;
    const baseSubjects = areas.flatMap((area) => area.subjects);
    return [...new Set([...baseSubjects, ...professionalSubjects])].sort();
  }, [selectedClassData, individualGradesForPeriod, professionalSubjects]);

  const classAverage =
    classGradesForPeriod.length > 0
      ? classGradesForPeriod.reduce((sum, grade) => sum + grade.grade, 0) /
      classGradesForPeriod.length
      : 0;

  const selectedStudentData = selectedStudent
    ? classStudents.find((student) => student.id === selectedStudent) || null
    : null;

  const selectedStudentMetrics = useMemo(() => {
    if (!selectedStudentData) return null;

    const studentGrades = individualGradesForPeriod.filter(
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

    const studentIncidents = individualIncidentsForPeriod.filter((i) =>
      i.studentIds.includes(selectedStudentData.id),
    );

    return {
      average: overallAverage,
      subjectsBelowAverage,
      incidents: studentIncidents.length,
    };
  }, [
    selectedStudentData,
    individualGradesForPeriod,
    individualIncidentsForPeriod,
    individualAttendanceForPeriod,
  ]);

  const handleGenerateClassReport = async () => {
    if (!selectedClassData) return;
    if (isGradesLoading) {
      toast({
        variant: "destructive",
        title: "Aguarde o carregamento",
        description: "As notas da turma ainda estão sendo carregadas.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateProfessionalClassReportPDF(
        selectedClassData,
        classStudents,
        classGradesForPeriod,
        classIncidentsForPeriod,
        classAttendanceForPeriod,
        professionalSubjects,
        selectedPeriod,
        classPeriodContextLabel,
      );

      setShowClassReportDialog(false);
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
    if (isGradesLoading) {
      toast({
        variant: "destructive",
        title: "Aguarde o carregamento",
        description: "As notas do relatório ainda estão sendo carregadas.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateStudentReportPDF(
        selectedStudentData,
        selectedClassData,
        individualGradesForPeriod,
        individualIncidentsForPeriod,
        individualAttendanceForPeriod,
        individualReportSubjects,
        individualPeriodContextLabel,
      );

      setShowIndividualReportDialog(false);
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
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrajectoryReport = async () => {
    if (!selectedClassData || !selectedStudentData) {
      toast({
        variant: "destructive",
        title: "Selecione a turma e o aluno",
        description: "Escolha o aluno para gerar o relatório de trajetória.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateTrajectoryReportPDF(
        selectedStudentData,
        selectedClassData,
        historicalGrades,
        grades,
        externalAssessments,
        incidents
      );

      toast({
        title: "Relatório de Trajetória Gerado",
        description: `A trajetória completa de ${selectedStudentData.name} foi baixada.`,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório de trajetória:", error);
      toast({
        variant: "destructive",
        title: "Erro na geração",
        description: "Não foi possível criar o PDF de trajetória. Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Dialog Control States
  const [showClassReportDialog, setShowClassReportDialog] = useState(false);
  const [showIndividualReportDialog, setShowIndividualReportDialog] = useState(false);
  const [showTrajectoryReportDialog, setShowTrajectoryReportDialog] = useState(false);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Card 1: Relatório de Turma (Entry Point) */}
        <Card
          className="cursor-pointer hover:shadow-md transition-all h-full"
          onClick={() => {
            setSelectedPeriod("anual");
            setShowClassReportDialog(true);
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Relatório de Turma
            </CardTitle>
            <CardDescription>
              Boletim geral da turma com médias e ocorrências.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Gere um PDF compilado com o desempenho de todos os alunos da turma selecionada.
            </p>
            <Button variant="outline" className="w-full">
              Configurar e Gerar
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Relatório Individual (Entry Point) */}
        <Card
          className="cursor-pointer hover:shadow-md transition-all h-full"
          onClick={() => {
            setSelectedIndividualPeriod("anual");
            setShowIndividualReportDialog(true);
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-success" />
              Relatório Individual
            </CardTitle>
            <CardDescription>
              Boletim detalhado por aluno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize indicadores de atenção e gere um relatório focado em um único aluno.
            </p>
            <Button variant="outline" className="w-full">
              Selecionar Aluno
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Relatório de Trajetória (Entry Point) */}
        <Card
          className="cursor-pointer hover:shadow-md transition-all h-full"
          onClick={() => setShowTrajectoryReportDialog(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-info" />
              Relatório de Trajetória
              {trajectoryFeatureIncomplete && (
                <Badge variant="outline" className="text-[11px]">
                  Em construção
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Histórico escolar consolidado (parcial).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Gere um documento preliminar com histórico fundamental, avaliações externas e ensino médio.
            </p>
            {trajectoryFeatureIncomplete && (
              <p className="text-xs text-warning mb-3">
                Algumas análises ainda podem variar enquanto o módulo é finalizado.
              </p>
            )}
            <Button variant="outline" className="w-full">
              Gerar Trajetória (beta)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG: Relatório de Turma */}
      <Dialog open={showClassReportDialog} onOpenChange={setShowClassReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Configurar Relatório de Turma
            </DialogTitle>
            <DialogDescription>Selecione a turma e ano para gerar o boletim.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione a turma</Label>
              <Select value={selectedClass} onValueChange={(value) => { setSelectedClass(value); setSelectedStudent(""); }}>
                <SelectTrigger><SelectValue placeholder="Escolha a turma" /></SelectTrigger>
                <SelectContent>
                  {classes.filter(c => !c.archived).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano letivo</Label>
              <Select value={String(selectedSchoolYear)} onValueChange={(v) => setSelectedSchoolYear(Number(v) as 1 | 2 | 3)} disabled={!selectedClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {schoolYearOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anual">Ano Completo</SelectItem>
                  {QUARTERS.map((quarter) => (
                    <SelectItem key={quarter} value={quarter}>
                      {quarter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClassData && (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                <div className="flex justify-between"><span>Alunos:</span><span className="font-bold">{classStudents.length}</span></div>
                <div className="flex justify-between"><span>Média do Período:</span><span className="font-bold">{classAverage.toFixed(1)}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassReportDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerateClassReport} disabled={!selectedClass || isGenerating}>
              {isGenerating ? "Gerando..." : "Baixar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Relatório Individual */}
      <Dialog open={showIndividualReportDialog} onOpenChange={setShowIndividualReportDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-success" />
              Gerar Relatório Individual
            </DialogTitle>
            <DialogDescription>
              Selecione turma, ano, período e aluno para análise detalhada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Turma</Label>
                <Select value={selectedClass} onValueChange={(value) => { setSelectedClass(value); setSelectedStudent(""); }}>
                  <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>
                    {classes.filter(c => !c.archived).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={String(selectedSchoolYear)} onValueChange={(v) => setSelectedSchoolYear(Number(v) as 1 | 2 | 3)} disabled={!selectedClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {schoolYearOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={selectedIndividualPeriod}
                  onValueChange={setSelectedIndividualPeriod}
                  disabled={!selectedClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">Ano Completo</SelectItem>
                    {QUARTERS.map((quarter) => (
                      <SelectItem key={quarter} value={quarter}>
                        {quarter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder={selectedClass ? "Selecione o aluno" : "Selecione a turma antes"} /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {classStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedStudentData && selectedStudentMetrics && (
              <div className="rounded-lg border bg-success/10 p-4 text-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-lg">{selectedStudentData.name}</span>
                  <Badge variant={selectedStudentMetrics.average >= 6 ? "default" : "destructive"}>
                    Média no Período: {selectedStudentMetrics.average.toFixed(1)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Ocorrências</p>
                    <p className="font-bold">{selectedStudentMetrics.incidents}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Abaixo da Média</p>
                    <p className="font-bold">{selectedStudentMetrics.subjectsBelowAverage.length} disc.</p>
                  </div>
                </div>
                {selectedStudentMetrics.subjectsBelowAverage.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-bold text-destructive mb-1">Atenção em:</p>
                    <p className="text-xs">{selectedStudentMetrics.subjectsBelowAverage.join(", ")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividualReportDialog(false)}>Cancelar</Button>
            <Button onClick={handleIndividualReport} disabled={!selectedStudent || isGenerating} className="bg-success hover:bg-success text-white">
              <FileDown className="mr-2 h-4 w-4" />
              {isGenerating ? "Gerando PDF..." : "Baixar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Relatório de Trajetória */}
      <Dialog open={showTrajectoryReportDialog} onOpenChange={setShowTrajectoryReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-info" />
              Gerar Trajetória Completa
            </DialogTitle>
            <DialogDescription>
              Documento em evolução com histórico e vida escolar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {trajectoryFeatureIncomplete && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                <p className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Relatório de Trajetória em construção
                </p>
                <p className="mt-1">
                  Esta saída ainda não está 100% funcional. Use como apoio preliminar.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turma</Label>
                <Select value={selectedClass} onValueChange={(value) => { setSelectedClass(value); setSelectedStudent(""); }}>
                  <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>
                    {classes.filter(c => !c.archived).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Alinhando campos de seleção se desejar adicionar ano ou simplificar */}
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {classStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedStudentData && (
              <div className="rounded-lg border bg-info/10 p-4 text-sm space-y-2">
                <div className="flex justify-between items-center text-info font-medium">
                  <span>Registros Históricos</span>
                  <Badge variant="outline" className="bg-white border-info/30">{historicalGrades.filter(g => g.studentId === selectedStudentData.id).length} notas</Badge>
                </div>
                <div className="flex justify-between items-center text-info font-medium">
                  <span>Avaliações Externas</span>
                  <Badge variant="outline" className="bg-white border-info/30">{externalAssessments.filter(e => e.studentId === selectedStudentData.id).length} provas</Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrajectoryReportDialog(false)}>Cancelar</Button>
            <Button onClick={handleTrajectoryReport} disabled={!selectedStudent || isGenerating} className="bg-info hover:bg-info text-white">
              <FileDown className="mr-2 h-4 w-4" />
              {isGenerating ? "Gerando..." : "Baixar Trajetória"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};
