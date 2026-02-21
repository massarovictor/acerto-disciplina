import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Trophy,
  UserCheck,
  GraduationCap,
  FileDown,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { Class, Student, Incident } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  useProfessionalSubjects,
  useProfessionalSubjectTemplates,
  useGradesScoped,
  useGradesAnalytics,
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
import { exportClassRankingsWorkbook, exportClassRankingsPdf, type RankingType } from "@/lib/excelExport";
import { getSchoolConfig, getDefaultConfig } from "@/lib/schoolConfig";
import { SUBJECT_AREAS, QUARTERS, FUNDAMENTAL_SUBJECT_AREAS } from "@/lib/subjects";
import { calculateCurrentYearFromCalendar } from "@/lib/classYearCalculator";
import { isDisciplinaryIncident } from "@/lib/incidentType";

interface IntegratedReportsProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
  enabled?: boolean;
}

const normalizeSubjectToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const getDefaultSchoolYearForClass = (classInfo: Class): 1 | 2 | 3 => {
  if (classInfo.startCalendarYear) {
    return calculateCurrentYearFromCalendar(classInfo.startCalendarYear);
  }

  const defaultYear = classInfo.currentYear ?? 1;
  return [1, 2, 3].includes(defaultYear as number)
    ? (defaultYear as 1 | 2 | 3)
    : 1;
};

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

const IntegratedReportsContent = ({
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
  const [selectedRankingSchoolYears, setSelectedRankingSchoolYears] = useState<Array<1 | 2 | 3>>([1]);
  const [selectedRankingType, setSelectedRankingType] = useState<RankingType>("general");
  const [includeRankingIncidents, setIncludeRankingIncidents] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingRankingXls, setIsExportingRankingXls] = useState(false);
  const [isExportingRankingPdf, setIsExportingRankingPdf] = useState(false);
  const trajectoryFeatureIncomplete = true;
  const { toast } = useToast();
  const { grades, loading: isGradesLoading } = useGradesScoped({
    classId: selectedClass || undefined,
    schoolYear: selectedSchoolYear,
  }, { enabled });
  const { grades: classGradesAllYears, loading: isClassGradesAllYearsLoading } = useGradesAnalytics(
    { classId: selectedClass || undefined },
    { enabled: enabled && !!selectedClass },
  );
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
  const rankingTypeOptions: Array<{
    value: RankingType;
    label: string;
  }> = [
    {
      value: "general",
      label: "Ranking Geral",
    },
    {
      value: "common",
      label: "Ranking Base Comum",
    },
    {
      value: "technical",
      label: "Ranking Base Técnica",
    },
  ];

  const selectedClassData = useMemo(
    () => classes.find((cls) => cls.id === selectedClass) || null,
    [classes, selectedClass],
  );
  const disciplinaryIncidents = useMemo(
    () => incidents.filter((incident) => isDisciplinaryIncident(incident)),
    [incidents],
  );

  useEffect(() => {
    const updateSchoolYear = (value: 1 | 2 | 3) => {
      setSelectedSchoolYear((prev) => (prev === value ? prev : value));
    };

    if (!selectedClass) {
      updateSchoolYear(1);
      return;
    }
    // Calcular dinamicamente o ano atual da turma baseado no ano calendário de início
    const classInfo = classes.find((cls) => cls.id === selectedClass);
    if (!classInfo) {
      updateSchoolYear(1);
      return;
    }

    updateSchoolYear(getDefaultSchoolYearForClass(classInfo));
  }, [selectedClass, classes]);

  useEffect(() => {
    const updateRankingSchoolYears = (value: 1 | 2 | 3) => {
      setSelectedRankingSchoolYears((prev) =>
        prev.length === 1 && prev[0] === value ? prev : [value],
      );
    };

    if (!selectedClass) {
      updateRankingSchoolYears(1);
      return;
    }

    const classInfo = classes.find((cls) => cls.id === selectedClass);
    if (!classInfo) {
      updateRankingSchoolYears(1);
      return;
    }

    updateRankingSchoolYears(getDefaultSchoolYearForClass(classInfo));
  }, [selectedClass, classes]);

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
  const rankingSchoolYearRanges = useMemo(
    () =>
      selectedRankingSchoolYears
        .map((year) => getSchoolYearRange(effectiveStartYearDate, year))
        .filter((range): range is { start: Date; end: Date } => range !== null),
    [effectiveStartYearDate, selectedRankingSchoolYears],
  );
  const rankingIncidentsForExport = useMemo(() => {
    if (!selectedClass || !includeRankingIncidents) return [];

    return disciplinaryIncidents
      .filter((incident) => incident.classId === selectedClass)
      .filter((incident) => {
        if (rankingSchoolYearRanges.length === 0) return true;
        return rankingSchoolYearRanges.some((range) =>
          isDateInRange(incident.date, range),
        );
      });
  }, [
    disciplinaryIncidents,
    includeRankingIncidents,
    selectedClass,
    rankingSchoolYearRanges,
  ]);
  const rankingStudentsWithIncidentsCount = useMemo(() => {
    if (!includeRankingIncidents) return 0;
    const studentIds = new Set<string>();
    rankingIncidentsForExport.forEach((incident) => {
      incident.studentIds.forEach((studentId) => studentIds.add(studentId));
    });
    return studentIds.size;
  }, [includeRankingIncidents, rankingIncidentsForExport]);

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
  const classAttendance = useMemo<Array<{ date: string }>>(
    () => [],
    [],
  ); // Empty array - attendance disabled
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

  const rankingTemplateSubjects = useMemo(() => {
    if (!selectedClassData?.templateId) return [];
    const template = templates.find((t) => t.id === selectedClassData.templateId);
    if (!template) return [];

    return template.subjectsByYear
      .filter((yearData) => selectedRankingSchoolYears.includes(yearData.year))
      .flatMap((yearData) => yearData.subjects || []);
  }, [templates, selectedClassData?.templateId, selectedRankingSchoolYears]);
  const rankingGradeSubjectsBySelectedYears = useMemo(() => {
    const selectedYearsSet = new Set(selectedRankingSchoolYears);
    const subjects = new Set<string>();

    classGradesAllYears
      .filter((grade) => selectedYearsSet.has((grade.schoolYear ?? 1) as 1 | 2 | 3))
      .forEach((grade) => {
        const normalized = normalizeSubjectToken(grade.subject);
        if (normalized) subjects.add(normalized);
      });

    return subjects;
  }, [classGradesAllYears, selectedRankingSchoolYears]);

  const professionalSubjects = useMemo(() => {
    const unique = new Set<string>();
    [...templateSubjects, ...manualSubjects].forEach((subject) => {
      if (subject?.trim()) {
        unique.add(subject.trim());
      }
    });
    return Array.from(unique);
  }, [templateSubjects, manualSubjects]);

  const rankingTechnicalSubjects = useMemo(() => {
    const unique = new Set<string>();
    const templateSubjectSet = new Set(
      rankingTemplateSubjects.map((subject) => normalizeSubjectToken(subject)),
    );

    [...rankingTemplateSubjects, ...manualSubjects].forEach((subject) => {
      if (subject?.trim()) {
        const normalized = normalizeSubjectToken(subject);
        const belongsToSelectedYears =
          templateSubjectSet.has(normalized) ||
          rankingGradeSubjectsBySelectedYears.has(normalized);
        if (belongsToSelectedYears) {
          unique.add(subject.trim());
        }
      }
    });
    return Array.from(unique);
  }, [rankingTemplateSubjects, manualSubjects, rankingGradeSubjectsBySelectedYears]);
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
  ]);

  const toggleRankingSchoolYear = (year: 1 | 2 | 3, checked: boolean) => {
    setSelectedRankingSchoolYears((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, year])).sort((a, b) => a - b) as Array<1 | 2 | 3>;
      }

      if (prev.length === 1) {
        toast({
          variant: "destructive",
          title: "Selecione ao menos um ano",
          description: "O ranking precisa de pelo menos um ano de curso.",
        });
        return prev;
      }

      return prev.filter((currentYear) => currentYear !== year);
    });
  };

  const validateRankingExport = () => {
    if (!selectedClassData) return false;
    if (selectedRankingSchoolYears.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione os anos",
        description: "Marque pelo menos um ano de curso para exportar o ranking.",
      });
      return;
    }
    if (isClassGradesAllYearsLoading) {
      toast({
        variant: "destructive",
        title: "Aguarde o carregamento",
        description: "As notas da turma ainda estão sendo carregadas para exportação.",
      });
      return false;
    }
    return true;
  };

  const loadSchoolName = async () => {
    let schoolName = getDefaultConfig().schoolName;
    try {
      const config = await getSchoolConfig();
      schoolName = config.schoolName || schoolName;
    } catch {
      // Fallback silencioso para configuração padrão da escola.
    }
    return schoolName;
  };

  const handleExportClassRankingXls = async () => {
    if (!selectedClassData) return;
    if (!validateRankingExport()) return;

    setIsExportingRankingXls(true);
    try {
      const schoolName = await loadSchoolName();

      exportClassRankingsWorkbook({
        schoolName,
        classData: selectedClassData,
        students: classStudents,
        grades: classGradesAllYears,
        selectedSchoolYears: selectedRankingSchoolYears,
        technicalSubjects: rankingTechnicalSubjects,
        rankingType: selectedRankingType,
        rankingIncidents: {
          includeIncidents: includeRankingIncidents,
          incidents: includeRankingIncidents ? rankingIncidentsForExport : [],
        },
      });

      toast({
        title: "Ranking XLS gerado",
        description: `Planilha da turma ${selectedClassData.name} exportada com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao exportar ranking XLS:", error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível gerar a planilha XLS do ranking.",
      });
    } finally {
      setIsExportingRankingXls(false);
    }
  };

  const handleExportClassRankingPdf = async () => {
    if (!selectedClassData) return;
    if (!validateRankingExport()) return;

    setIsExportingRankingPdf(true);
    try {
      const schoolName = await loadSchoolName();

      await exportClassRankingsPdf({
        schoolName,
        classData: selectedClassData,
        students: classStudents,
        grades: classGradesAllYears,
        selectedSchoolYears: selectedRankingSchoolYears,
        technicalSubjects: rankingTechnicalSubjects,
        rankingType: selectedRankingType,
        rankingIncidents: {
          includeIncidents: includeRankingIncidents,
          incidents: includeRankingIncidents ? rankingIncidentsForExport : [],
        },
      });

      toast({
        title: "Ranking PDF gerado",
        description: `Relatório em PDF da turma ${selectedClassData.name} exportado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao exportar ranking PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível gerar o PDF do ranking.",
      });
    } finally {
      setIsExportingRankingPdf(false);
    }
  };

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
        disciplinaryIncidents
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
  const [showClassRankingDialog, setShowClassRankingDialog] = useState(false);
  const [showIndividualReportDialog, setShowIndividualReportDialog] = useState(false);
  const [showTrajectoryReportDialog, setShowTrajectoryReportDialog] = useState(false);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Relatório de Turma (Entry Point) */}
        <Card
          className="h-full cursor-pointer border-border shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md flex flex-col"
          onClick={() => {
            setSelectedPeriod("anual");
            setShowClassReportDialog(true);
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Relatório de Turma</CardTitle>
            <CardDescription>
              Síntese da turma com desempenho acadêmico e indicadores disciplinares.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Button variant="outline" className="w-full mt-auto">
              Configurar e Gerar
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Ranking de Turma (Entry Point) */}
        <Card
          className="h-full cursor-pointer border-border shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md flex flex-col"
          onClick={() => setShowClassRankingDialog(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ranking de Turma</CardTitle>
            <CardDescription>
              Ranking acadêmico com comparação por médias e filtros de acompanhamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Button variant="outline" className="w-full mt-auto">
              Configurar Ranking
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Relatório Individual (Entry Point) */}
        <Card
          className="h-full cursor-pointer border-border shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md flex flex-col"
          onClick={() => {
            setSelectedIndividualPeriod("anual");
            setShowIndividualReportDialog(true);
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Relatório Individual</CardTitle>
            <CardDescription>
              Análise individual com foco em desempenho, risco e acompanhamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Button variant="outline" className="w-full mt-auto">
              Selecionar Aluno
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Relatório de Trajetória (Entry Point) */}
        <Card
          className="h-full cursor-pointer border-border shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md flex flex-col"
          onClick={() => setShowTrajectoryReportDialog(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              Relatório de Trajetória
              {trajectoryFeatureIncomplete && (
                <Badge variant="outline" className="text-[11px]">
                  Em construção
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Histórico consolidado do aluno com evolução acadêmica longitudinal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Button variant="outline" className="w-full mt-auto">
              Gerar Trajetória (beta)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG: Relatório de Turma */}
      <Dialog open={showClassReportDialog} onOpenChange={setShowClassReportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-primary/15 dark:bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Configurar Relatório de Turma
            </DialogTitle>
            <DialogDescription>Selecione a turma e ano para gerar o boletim.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="space-y-4">
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
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setShowClassReportDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleGenerateClassReport}
              disabled={!selectedClass || isGenerating}
            >
              {isGenerating ? "Gerando..." : "Baixar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Ranking XLS de Turma */}
      <Dialog open={showClassRankingDialog} onOpenChange={setShowClassRankingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-primary/15 dark:bg-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              Exportar Ranking de Turma
            </DialogTitle>
            <DialogDescription>
              Gere ranking acadêmico em XLS ou PDF com médias e acompanhamentos conforme a configuração selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-2">
                    <Label>Turma</Label>
                    <Select
                      value={selectedClass}
                      onValueChange={(value) => {
                        setSelectedClass(value);
                        setSelectedStudent("");
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Escolha a turma" /></SelectTrigger>
                      <SelectContent>
                        {classes.filter(c => !c.archived).map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Anos considerados</Label>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      {schoolYearOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedRankingSchoolYears.includes(option.value)}
                            onCheckedChange={(checked) =>
                              toggleRankingSchoolYear(option.value, checked === true)
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O cálculo usa todas as notas disponíveis dos anos selecionados.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de ranking</Label>
                    <Select
                      value={selectedRankingType}
                      onValueChange={(value) =>
                        setSelectedRankingType(value as RankingType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {rankingTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-2">
                    <Label>Acompanhamentos</Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={includeRankingIncidents}
                        onCheckedChange={(checked) =>
                          setIncludeRankingIncidents(checked === true)
                        }
                      />
                      <span>Computar acompanhamentos no ranking</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Quando ativado, conta todos os acompanhamentos disciplinares do período selecionado, incluindo todos os status.
                    </p>
                  </div>
                </div>
              </div>

              {selectedClassData && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm grid gap-2 sm:grid-cols-2">
                  <div className="flex justify-between"><span>Alunos na turma:</span><span className="font-bold">{classStudents.length}</span></div>
                  <div className="flex justify-between"><span>Disciplinas técnicas detectadas:</span><span className="font-bold">{rankingTechnicalSubjects.length}</span></div>
                  <div className="flex justify-between"><span>Tipo selecionado:</span><span className="font-bold">{rankingTypeOptions.find((option) => option.value === selectedRankingType)?.label ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Acompanhamentos computados:</span><span className="font-bold">{includeRankingIncidents ? rankingIncidentsForExport.length : 0}</span></div>
                  <div className="flex justify-between"><span>Alunos com acompanhamento:</span><span className="font-bold">{includeRankingIncidents ? rankingStudentsWithIncidentsCount : 0}</span></div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-6 py-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setShowClassRankingDialog(false)}>Cancelar</Button>
            <Button
              variant="outline"
              onClick={handleExportClassRankingPdf}
              disabled={
                !selectedClass ||
                isGenerating ||
                isExportingRankingXls ||
                isExportingRankingPdf ||
                isClassGradesAllYearsLoading ||
                selectedRankingSchoolYears.length === 0 ||
                !selectedRankingType
              }
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExportingRankingPdf ? "Exportando PDF..." : "Exportar PDF"}
            </Button>
            <Button
              onClick={handleExportClassRankingXls}
              disabled={
                !selectedClass ||
                isGenerating ||
                isExportingRankingXls ||
                isExportingRankingPdf ||
                isClassGradesAllYearsLoading ||
                selectedRankingSchoolYears.length === 0 ||
                !selectedRankingType
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isExportingRankingXls ? "Exportando XLS..." : "Exportar Ranking XLS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Relatório Individual */}
      <Dialog open={showIndividualReportDialog} onOpenChange={setShowIndividualReportDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-success/15 dark:bg-success/20">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              Gerar Relatório Individual
            </DialogTitle>
            <DialogDescription>
              Selecione turma, ano, período e aluno para análise detalhada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">Acompanhamentos</p>
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
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setShowIndividualReportDialog(false)}>Cancelar</Button>
            <Button onClick={handleIndividualReport} disabled={!selectedStudent || isGenerating}>
              <FileDown className="mr-2 h-4 w-4" />
              {isGenerating ? "Gerando PDF..." : "Baixar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Relatório de Trajetória */}
      <Dialog open={showTrajectoryReportDialog} onOpenChange={setShowTrajectoryReportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-info/15 dark:bg-info/20">
                <GraduationCap className="h-5 w-5 text-info" />
              </div>
              Gerar Trajetória Completa
            </DialogTitle>
            <DialogDescription>
              Documento em evolução com histórico e vida escolar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="space-y-4">
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
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setShowTrajectoryReportDialog(false)}>Cancelar</Button>
            <Button onClick={handleTrajectoryReport} disabled={!selectedStudent || isGenerating}>
              <FileDown className="mr-2 h-4 w-4" />
              {isGenerating ? "Gerando..." : "Baixar Trajetória"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

export const IntegratedReports = (props: IntegratedReportsProps) => {
  if (!props.enabled) return null;
  return <IntegratedReportsContent {...props} />;
};
