import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Presentation,
  ZoomIn,
  ZoomOut,
  Activity,
} from "lucide-react";
import { Class, Student, Incident } from "@/types";
import { CoverSlide } from "./slides/CoverSlide";
import { ClassOverviewSlide } from "./slides/ClassOverviewSlide";
import { AreaAnalysisSlide } from "./slides/AreaAnalysisSlide";
import { StudentMetricsSlide } from "./slides/StudentMetricsSlide";
import { StudentGradesTableSlide } from "./slides/StudentGradesTableSlide";
import { SchoolCoverSlide } from "./slides/SchoolCoverSlide";
import { SchoolOverviewSlide } from "./slides/SchoolOverviewSlide";
import { SchoolAreasSlide } from "./slides/SchoolAreasSlide";
import { SchoolSituationSlide } from "./slides/SchoolSituationSlide";
import { SchoolClassRankingSlide } from "./slides/SchoolClassRankingSlide";
import { SchoolIncidentsSlide } from "./slides/SchoolIncidentsSlide";
import { useToast } from "@/hooks/use-toast";
import {
  useProfessionalSubjects,
  useProfessionalSubjectTemplates,
  useGradesScoped,
  useGradesAnalytics,
} from "@/hooks/useData";
import { QUARTERS, SUBJECT_AREAS } from "@/lib/subjects";
import { calculateCurrentYearFromCalendar } from "@/lib/classYearCalculator";
import { calculateFinalGrade } from "@/lib/approvalCalculator";
import { getSchoolConfig, getDefaultConfig } from "@/lib/schoolConfig";

// Tipos para classificação por situação
type SituationType = "critico" | "atencao" | "aprovado" | "excelencia";
type ViewMode = "class" | "individual" | "situation" | "school";

const VIEW_MODES: ViewMode[] = ["class", "individual", "situation", "school"];

const isViewMode = (value: string): value is ViewMode =>
  VIEW_MODES.includes(value as ViewMode);

const SITUATION_OPTIONS: Array<{
  value: SituationType;
  label: string;
  description: string;
}> = [
  { value: "critico", label: "Crítico", description: "3+ disciplinas abaixo de 6" },
  { value: "atencao", label: "Atenção", description: "1-2 disciplinas abaixo de 6" },
  { value: "aprovado", label: "Aprovado", description: "Todas disciplinas ≥ 6" },
  { value: "excelencia", label: "Excelência", description: "Todas ≥ 6 e média geral ≥ 8" },
];

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

const getStartCalendarYear = (cls: Class) => {
  if (typeof cls.startCalendarYear === "number") return cls.startCalendarYear;
  if (cls.startYearDate) {
    const date = parseLocalDate(cls.startYearDate);
    if (!Number.isNaN(date.getTime())) return date.getFullYear();
  }
  const currentYear = new Date().getFullYear();
  const inferredYear =
    cls.currentYear && [1, 2, 3].includes(cls.currentYear)
      ? currentYear - (cls.currentYear - 1)
      : undefined;
  return inferredYear;
};

interface ClassSlidesProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
  enabled?: boolean;
  // DISABLED: Attendance feature temporarily removed
  // attendance: AttendanceRecord[];
}

import { useSearchParams } from "react-router-dom";

// ...

const ClassSlidesContent = ({
  classes,
  students,
  incidents,
  enabled = true,
}: ClassSlidesProps) => {
  const [searchParams] = useSearchParams();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);

  // Sync with URL params on mount
  const isInitialUrlSync = useRef(false);

  useEffect(() => {
    const classIdParam = searchParams.get('classId');
    const studentIdParam = searchParams.get('studentId');
    const viewParam = searchParams.get('view');
    const periodParam = searchParams.get('period');
    const yearParam = searchParams.get('year');

    let hasUrlParams = false;

    if (classIdParam && classes.some(c => c.id === classIdParam)) {
      setSelectedClass(classIdParam);
      hasUrlParams = true;
    }

    if (studentIdParam && students.some(s => s.id === studentIdParam)) {
      setSelectedStudent(studentIdParam);
      hasUrlParams = true;
    }

    if (viewParam && isViewMode(viewParam)) {
      setViewMode(viewParam);
      hasUrlParams = true;
    }

    if (periodParam && (['all', ...QUARTERS].includes(periodParam))) {
      setSelectedPeriod(periodParam);
    }

    if (yearParam) {
      const parsedYear = parseInt(yearParam, 10) as 1 | 2 | 3;
      if ([1, 2, 3].includes(parsedYear)) {
        setSelectedSchoolYear(parsedYear);
        hasUrlParams = true; // Mark as having vital params
      }
    }

    if (hasUrlParams) {
      isInitialUrlSync.current = true;
      // Reset flag after a delay to allow normal interaction
      setTimeout(() => {
        isInitialUrlSync.current = false;
      }, 1000);
    }
  }, [searchParams, classes, students]);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [selectedSituation, setSelectedSituation] = useState<SituationType | "">("");
  const [schoolName, setSchoolName] = useState("Instituição de Ensino");
  const [schoolPeriod, setSchoolPeriod] = useState("all");
  const { getProfessionalSubjects } = useProfessionalSubjects();
  const { templates } = useProfessionalSubjectTemplates();
  const { toast } = useToast();
  const slideContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideScale, setSlideScale] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const SLIDE_WIDTH = 1920;
  const SLIDE_HEIGHT = 1080;

  const schoolYearOptions: Array<{ value: 1 | 2 | 3; label: string }> = [
    { value: 1, label: "1º ano" },
    { value: 2, label: "2º ano" },
    { value: 3, label: "3º ano" },
  ];

  const { grades: scopedGrades } = useGradesScoped({
    classId: selectedClass || undefined,
    quarter: selectedPeriod === "all" ? undefined : selectedPeriod,
    schoolYear: selectedSchoolYear,
  }, { enabled });

  const [selectedCalendarYear, setSelectedCalendarYear] = useState<number>(new Date().getFullYear());

  const schoolClassIds = useMemo(
    () => {
      if (viewMode !== "school") return [];

      return classes.filter(cls => {
        const startYear = getStartCalendarYear(cls);
        const endYear = cls.endCalendarYear ?? (startYear ? startYear + 2 : undefined);

        if (!startYear) return false;

        return startYear !== undefined && startYear <= selectedCalendarYear && selectedCalendarYear <= (endYear || startYear + 2);
      }).map((cls) => cls.id);
    },
    [classes, viewMode, selectedCalendarYear],
  );
  const { grades: rawSchoolGrades } = useGradesAnalytics({
    classIds: schoolClassIds,
    quarter: schoolPeriod === "all" ? undefined : schoolPeriod,
  }, { enabled: enabled && viewMode === "school" });

  const schoolGrades = useMemo(() => {
    const filtered = rawSchoolGrades.filter(g => {
      // 1. Try to filter by School Year (Series) logic first - most robust for longitudinal data
      const cls = classes.find(c => c.id === g.classId);
      if (cls && cls.startCalendarYear && g.schoolYear) {
        // Calculate which series (1, 2, or 3) corresponds to the selected calendar year
        // e.g. Start 2024. Selected 2026. Diff = 2. Expected Year = 3.
        const expectedYear = selectedCalendarYear - cls.startCalendarYear + 1;

        // Validate if expected year is within valid range (1-3)
        if (expectedYear >= 1 && expectedYear <= 3) {
          return g.schoolYear === expectedYear;
        }
      }

      // 2. Fallback to recordedAt date if structural logic isn't possible
      if (!g.recordedAt) return false;

      // Parse year directly from ISO string (YYYY-MM-DD...)
      let gradeYear = 0;
      try {
        const yearStr = g.recordedAt.substring(0, 4);
        gradeYear = parseInt(yearStr, 10);
      } catch {
        const date = new Date(g.recordedAt);
        gradeYear = date.getFullYear();
      }

      return gradeYear === Number(selectedCalendarYear);
    });
    return filtered;
  }, [rawSchoolGrades, selectedCalendarYear, classes]);

  const classData = classes.find((c) => c.id === selectedClass);
  useEffect(() => {
    if (!selectedClass) {
      setSelectedSchoolYear(1);
      return;
    }

    // Se a mudança de turma foi causada pela sincronização inicial da URL e já definimos o ano,
    // ignoramos o recálculo automático para preservar o ano histórico vindo da URL.
    if (isInitialUrlSync.current) {
      return;
    }

    // Calcular dinamicamente o ano atual da turma baseado no ano calendário de início
    const classInfo = classes.find((c) => c.id === selectedClass);
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

  // Load school name from config
  useEffect(() => {
    const loadSchoolName = async () => {
      try {
        const config = await getSchoolConfig();
        setSchoolName(config.schoolName || "Instituição de Ensino");
      } catch (e) {
        console.error("Erro ao carregar nome da escola:", e);
      }
    };
    loadSchoolName();
  }, []);

  const templateSubjects = useMemo(() => {
    if (!classData?.templateId) return [];
    const template = templates.find((t) => t.id === classData.templateId);
    const yearData = template?.subjectsByYear.find(
      (y) => y.year === selectedSchoolYear,
    );
    return yearData?.subjects ?? [];
  }, [templates, classData?.templateId, selectedSchoolYear]);

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
  const classStudents = useMemo(
    () =>
      selectedClass
        ? students
          .filter((s) => s.classId === selectedClass)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        : [],
    [selectedClass, students],
  );
  const fallbackStartYearDate = classData?.startCalendarYear
    ? `${classData.startCalendarYear}-02-01`
    : undefined;
  const effectiveStartYearDate =
    classData?.startYearDate || fallbackStartYearDate;
  const schoolYearRange = useMemo(
    () => getSchoolYearRange(effectiveStartYearDate, selectedSchoolYear),
    [effectiveStartYearDate, selectedSchoolYear],
  );
  const classIncidents = useMemo(
    () => (selectedClass ? incidents.filter((i) => i.classId === selectedClass) : []),
    [incidents, selectedClass],
  );

  const classGrades = useMemo(
    () =>
      selectedClass
        ? scopedGrades.filter(
          (g) =>
            g.classId === selectedClass &&
            (g.schoolYear ?? 1) === selectedSchoolYear,
        )
        : [],
    [scopedGrades, selectedClass, selectedSchoolYear],
  );
  const studentData = students.find((s) => s.id === selectedStudent);

  const periodGrades = useMemo(() => {
    return selectedPeriod === "all"
      ? classGrades
      : classGrades.filter((g) => g.quarter === selectedPeriod);
  }, [classGrades, selectedPeriod]);

  const studentRankings = useMemo(() => {
    return classStudents
      .map((student) => {
        const filteredGrades = periodGrades.filter(
          (g) => g.studentId === student.id,
        );

        const average =
          filteredGrades.length > 0
            ? filteredGrades.reduce((sum, g) => sum + g.grade, 0) /
            filteredGrades.length
            : 0;

        return { student, average };
      })
      .sort((a, b) => {
        const diff = a.average - b.average;
        if (diff !== 0) return diff;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [classStudents, periodGrades]);

  // Classifica alunos por situação acadêmica
  const studentsBySituation = useMemo(() => {
    const result: Record<SituationType, { student: Student; average: number; subjectsBelowCount: number }[]> = {
      critico: [],
      atencao: [],
      aprovado: [],
      excelencia: [],
    };

    classStudents.forEach((student) => {
      // Obter todas as disciplinas únicas do aluno
      const studentGradesFiltered = periodGrades.filter((g) => g.studentId === student.id);
      const subjects = [...new Set(studentGradesFiltered.map((g) => g.subject))];

      if (subjects.length === 0) return; // Sem notas, não classificar

      // Calcular média final de cada disciplina
      let subjectsBelowCount = 0;
      let totalSum = 0;
      let totalCount = 0;

      subjects.forEach((subject) => {
        const subjectGrades = studentGradesFiltered.filter((g) => g.subject === subject);
        if (subjectGrades.length > 0) {
          const subjectAvg = subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length;
          totalSum += subjectAvg;
          totalCount++;
          if (subjectAvg < 6) {
            subjectsBelowCount++;
          }
        }
      });

      const overallAverage = totalCount > 0 ? totalSum / totalCount : 0;

      // Classificar
      if (subjectsBelowCount >= 3) {
        result.critico.push({ student, average: overallAverage, subjectsBelowCount });
      } else if (subjectsBelowCount >= 1) {
        result.atencao.push({ student, average: overallAverage, subjectsBelowCount });
      } else if (overallAverage >= 8) {
        result.excelencia.push({ student, average: overallAverage, subjectsBelowCount });
      } else {
        result.aprovado.push({ student, average: overallAverage, subjectsBelowCount });
      }
    });

    // Ordenar cada grupo do pior para o melhor
    // Crítico e Atenção: mais disciplinas reprovadas primeiro, depois menor média
    result.critico.sort((a, b) => {
      if (b.subjectsBelowCount !== a.subjectsBelowCount) {
        return b.subjectsBelowCount - a.subjectsBelowCount; // Mais reprovações primeiro
      }
      return a.average - b.average; // Menor média primeiro
    });
    result.atencao.sort((a, b) => {
      if (b.subjectsBelowCount !== a.subjectsBelowCount) {
        return b.subjectsBelowCount - a.subjectsBelowCount;
      }
      return a.average - b.average;
    });
    // Aprovado e Excelência: menor média primeiro (pior para melhor)
    result.aprovado.sort((a, b) => a.average - b.average);
    result.excelencia.sort((a, b) => a.average - b.average);

    return result;
  }, [classStudents, periodGrades]);

  const areasList = useMemo(() => {
    const list: string[] = [];
    if (
      periodGrades.some((g) => SUBJECT_AREAS[0].subjects.includes(g.subject))
    ) {
      list.push("Linguagens");
    }
    if (
      periodGrades.some((g) => SUBJECT_AREAS[1].subjects.includes(g.subject))
    ) {
      list.push("Ciências Humanas");
    }
    if (
      periodGrades.some((g) => SUBJECT_AREAS[2].subjects.includes(g.subject))
    ) {
      list.push("Ciências da Natureza");
    }
    if (
      periodGrades.some((g) => SUBJECT_AREAS[3].subjects.includes(g.subject))
    ) {
      list.push("Matemática");
    }
    if (
      professionalSubjects.length > 0 &&
      periodGrades.some((g) => professionalSubjects.includes(g.subject))
    ) {
      list.push("Formação Técnica");
    }
    return list;
  }, [periodGrades, professionalSubjects]);

  const classSlides = useMemo(() => {
    if (!selectedClass || !classData) return [];

    const slides = [
      <CoverSlide key="cover" classData={classData} period={selectedPeriod} />,
      <ClassOverviewSlide
        key="overview"
        classData={classData}
        students={classStudents}
        grades={classGrades}
        incidents={classIncidents}
        period={selectedPeriod}
      />,
    ];

    areasList.forEach((area) => {
      slides.push(
        <AreaAnalysisSlide
          key={`area-${area}`}
          areaName={area}
          grades={classGrades}
          period={selectedPeriod}
          professionalSubjects={professionalSubjects}
        />,
      );
    });

    studentRankings.forEach(({ student }, index) => {
      const position = studentRankings.length - index;
      slides.push(
        <StudentMetricsSlide
          key={`student-${student.id}`}
          student={student}
          grades={classGrades}
          incidents={classIncidents}
          period={selectedPeriod}
          position={position}
          totalStudents={studentRankings.length}
        />,
      );
      slides.push(
        <StudentGradesTableSlide
          key={`student-grades-${student.id}`}
          student={student}
          grades={classGrades}
          period={selectedPeriod}
        />,
      );
    });

    return slides;
  }, [
    areasList,
    classData,
    classGrades,
    classIncidents,
    classStudents,
    professionalSubjects,
    selectedClass,
    selectedPeriod,
    studentRankings,
  ]);

  const individualSlides = useMemo(() => {
    if (!selectedStudent || !studentData) return [];

    const studentGrades = classGrades.filter(
      (g) => g.studentId === selectedStudent,
    );
    const position = studentRankings.findIndex(
      (r) => r.student.id === selectedStudent,
    );
    const displayPosition =
      position >= 0 ? studentRankings.length - position : 0;

    return [
      <StudentMetricsSlide
        key="individual-metrics"
        student={studentData}
        grades={studentGrades}
        incidents={classIncidents}
        period={selectedPeriod}
        position={displayPosition}
        totalStudents={studentRankings.length}
      />,
      <StudentGradesTableSlide
        key="individual-grades"
        student={studentData}
        grades={studentGrades}
        period={selectedPeriod}
      />,
    ];
  }, [
    classGrades,
    classIncidents,
    selectedPeriod,
    selectedStudent,
    studentData,
    studentRankings,
  ]);

  // Slides por situação
  const situationSlides = useMemo(() => {
    if (!selectedClass || !selectedSituation) return [];

    const studentsInSituation = studentsBySituation[selectedSituation];
    if (!studentsInSituation || studentsInSituation.length === 0) return [];

    const slides: React.ReactNode[] = [];

    // Slide de capa da situação
    const situationLabel = SITUATION_OPTIONS.find(s => s.value === selectedSituation)?.label || selectedSituation;
    const situationDesc = SITUATION_OPTIONS.find(s => s.value === selectedSituation)?.description || "";

    slides.push(
      <CoverSlide
        key="situation-cover"
        classData={classData!}
        period={selectedPeriod}
        customTitle={`Alunos em situação: ${situationLabel}`}
        customSubtitle={`${studentsInSituation.length} aluno(s) - ${situationDesc}`}
      />
    );

    // Slides individuais de cada aluno
    studentsInSituation.forEach(({ student }, index) => {
      const studentGrades = classGrades.filter((g) => g.studentId === student.id);
      const position = studentRankings.findIndex((r) => r.student.id === student.id);
      const displayPosition = position >= 0 ? studentRankings.length - position : 0;

      slides.push(
        <StudentMetricsSlide
          key={`situation-metrics-${student.id}`}
          student={student}
          grades={studentGrades}
          incidents={classIncidents}
          period={selectedPeriod}
          position={displayPosition}
          totalStudents={studentRankings.length}
        />
      );
      slides.push(
        <StudentGradesTableSlide
          key={`situation-grades-${student.id}`}
          student={student}
          grades={studentGrades}
          period={selectedPeriod}
        />
      );
    });

    return slides;
  }, [
    selectedClass,
    selectedSituation,
    studentsBySituation,
    classData,
    classGrades,
    classIncidents,
    selectedPeriod,
    studentRankings,
  ]);

  // All professional subjects across all classes for school view
  const allProfessionalSubjects = useMemo(() => {
    const unique = new Set<string>();
    classes.forEach(cls => {
      const template = templates.find(t => t.id === cls.templateId);
      template?.subjectsByYear.forEach(y => {
        y.subjects.forEach(s => s?.trim() && unique.add(s.trim()));
      });
    });
    return Array.from(unique);
  }, [classes, templates]);

  // School-wide slides
  const schoolSlides = useMemo(() => {
    if (viewMode !== "school") return [];

    const period = schoolPeriod;
    const filteredGrades =
      period === "all"
        ? schoolGrades
        : schoolGrades.filter((g) => g.quarter === period);

    if (students.length === 0 && classes.length === 0) return [];

    // Determine which areas have data
    const schoolAreasList: string[] = [];
    if (filteredGrades.some(g => SUBJECT_AREAS[0].subjects.includes(g.subject))) {
      schoolAreasList.push("Linguagens");
    }
    if (filteredGrades.some(g => SUBJECT_AREAS[1].subjects.includes(g.subject))) {
      schoolAreasList.push("Ciências Humanas");
    }
    if (filteredGrades.some(g => SUBJECT_AREAS[2].subjects.includes(g.subject))) {
      schoolAreasList.push("Ciências da Natureza");
    }
    if (filteredGrades.some(g => SUBJECT_AREAS[3].subjects.includes(g.subject))) {
      schoolAreasList.push("Matemática");
    }
    if (allProfessionalSubjects.length > 0 && filteredGrades.some(g => allProfessionalSubjects.includes(g.subject))) {
      schoolAreasList.push("Formação Técnica");
    }

    const slides: React.ReactNode[] = [
      // 1. Cover
      <SchoolCoverSlide
        key="school-cover"
        schoolName={schoolName}
        period={period}
        totalClasses={classes.length}
        totalStudents={students.length}
      />,
      // 2. Overview with KPIs
      <SchoolOverviewSlide
        key="school-overview"
        schoolName={schoolName}
        classes={classes}
        students={students}
        grades={filteredGrades}
        incidents={incidents}
        period={period}
      />,
      // 3. Class Ranking
      <SchoolClassRankingSlide
        key="school-class-ranking"
        schoolName={schoolName}
        classes={classes}
        students={students}
        grades={filteredGrades}
        period={period}
      />,
    ];

    // 4-8. Individual Area Slides (like class view)
    schoolAreasList.forEach((area) => {
      slides.push(
        <AreaAnalysisSlide
          key={`school-area-${area}`}
          areaName={area}
          grades={filteredGrades}
          period={period}
          professionalSubjects={allProfessionalSubjects}
        />
      );
    });

    // 9. Incidents Slide
    slides.push(
      <SchoolIncidentsSlide
        key="school-incidents"
        schoolName={schoolName}
        classes={classes}
        incidents={incidents}
        period={period}
      />
    );

    // 10. Situation Distribution
    slides.push(
      <SchoolSituationSlide
        key="school-situation"
        schoolName={schoolName}
        classes={classes}
        students={students}
        grades={filteredGrades}
        period={period}
      />
    );

    return slides;
  }, [viewMode, schoolPeriod, schoolName, classes, students, schoolGrades, incidents, allProfessionalSubjects]);

  const activeSlides = viewMode === "class"
    ? classSlides
    : viewMode === "individual"
      ? individualSlides
      : viewMode === "situation"
        ? situationSlides
        : schoolSlides;
  const maxSlides = Math.max(1, activeSlides.length);
  const effectiveScale = slideScale * previewZoom;

  useEffect(() => {
    if (!activeSlides.length) return;
    if (currentSlide > activeSlides.length) {
      setCurrentSlide(activeSlides.length);
    }
  }, [activeSlides.length, currentSlide]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setPreviewZoom(1); // Reset zoom to 100% when entering/exiting fullscreen
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const container = slideContainerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      toast({
        title: "Não foi possível entrar em tela cheia",
        description: "Seu navegador bloqueou a ação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (!activeSlides.length) return;
      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        setCurrentSlide((prev) => Math.min(activeSlides.length, prev + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setCurrentSlide((prev) => Math.max(1, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeSlides.length, isFullscreen]);

  useEffect(() => {
    const container = slideContainerRef.current;
    if (!container) return;

    const updateScale = () => {
      // In fullscreen mode, use window dimensions for accurate scaling
      const width = isFullscreen ? window.innerWidth : container.getBoundingClientRect().width;
      const height = isFullscreen ? window.innerHeight : container.getBoundingClientRect().height;

      // Calculate scale with a small margin to prevent edge clipping
      const marginFactor = isFullscreen ? 0.95 : 1;
      const scale = Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT) * marginFactor || 1;
      setSlideScale(scale);
    };

    updateScale();

    // Also update on window resize for fullscreen changes
    window.addEventListener('resize', updateScale);
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, [SLIDE_HEIGHT, SLIDE_WIDTH, isFullscreen]);

  // Mouse wheel zoom
  useEffect(() => {
    const container = slideContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setPreviewZoom((prev) => {
          const next = parseFloat((prev + delta).toFixed(2));
          return Math.min(5, Math.max(0.1, next));
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);
  const handleOpenTrajectory = () => {
    if (!classData || !studentData) return;

    const params = new URLSearchParams();
    params.set('classId', classData.id);
    params.set('studentId', studentData.id);

    toast({
      title: "Abrindo trajetória em nova aba...",
      description: `Analisando ${studentData.name}`,
      duration: 1500,
    });

    window.open(`/trajetoria?${params.toString()}`, '_blank');
  };

  const handleExportPDF = async () => {
    if (isExporting || !activeSlides.length) return;

    setIsExporting(true);
    setExportingIndex(0);

    toast({
      title: "Iniciando exportação...",
      description: "Preparando os slides para o PDF.",
    });

    try {
      const { startSequentialPDF, addSlideToPDF, finishSequentialPDF } =
        await import("@/lib/pdfExport");

      const fileName =
        viewMode === "class"
          ? `apresentacao-turma-${classData?.name || "turma"}.pdf`
          : viewMode === "individual"
            ? `apresentacao-aluno-${studentData?.name || "aluno"}.pdf`
            : viewMode === "situation"
              ? `apresentacao-situacao-${selectedSituation || "filtro"}-${classData?.name || "turma"}.pdf`
              : `apresentacao-escola-${schoolName || "escola"}.pdf`;

      startSequentialPDF();

      for (let i = 0; i < activeSlides.length; i++) {
        setExportingIndex(i);

        // Update toast progress
        toast({
          title: `Processando apresentação...`,
          description: `Capturando slide ${i + 1} de ${activeSlides.length}`,
        });

        // Wait for React to render the new slide in the hidden container
        await new Promise((resolve) => setTimeout(resolve, 300));

        const success = await addSlideToPDF("export-slide-single", i === 0);
        if (!success) throw new Error(`Falha ao capturar o slide ${i + 1}`);
      }

      finishSequentialPDF(fileName);

      toast({
        title: "Exportação concluída!",
        description: `A apresentação foi gerada com sucesso.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportingIndex(null);
    }
  };

  const renderSlide = () => {
    if (viewMode === "school") {
      return activeSlides[currentSlide - 1] ?? null;
    }
    if (!selectedClass) return null;
    return activeSlides[currentSlide - 1] ?? null;
  };

  const shouldShowSlides =
    (viewMode === "school" && activeSlides.length > 0) ||
    (selectedClass &&
      activeSlides.length > 0 &&
      (viewMode === "class" ||
        (viewMode === "individual" && selectedStudent) ||
        (viewMode === "situation" && selectedSituation)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerador de Slides de Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              setViewMode(v as ViewMode);
              setCurrentSlide(1);
              if (v === "situation") {
                setSelectedSituation("");
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="class">Turma</TabsTrigger>
              <TabsTrigger value="individual">Individuais</TabsTrigger>
              <TabsTrigger value="situation">Situação</TabsTrigger>
              <TabsTrigger value="school">Escola</TabsTrigger>
            </TabsList>

            <TabsContent value="class" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Selecione a Turma</Label>
                  <Select
                    value={selectedClass}
                    onValueChange={(v) => {
                      setSelectedClass(v);
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano da turma</Label>
                  <Select
                    value={String(selectedSchoolYear)}
                    onValueChange={(value) => {
                      setSelectedSchoolYear(Number(value) as 1 | 2 | 3);
                      setCurrentSlide(1);
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYearOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={String(option.value)}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={(v) => {
                      setSelectedPeriod(v);
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ano Letivo Completo</SelectItem>
                      {QUARTERS.map((quarter) => (
                        <SelectItem key={quarter} value={quarter}>
                          {quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={selectedClass}
                    onValueChange={(v) => {
                      setSelectedClass(v);
                      setSelectedStudent("");
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano da turma</Label>
                  <Select
                    value={String(selectedSchoolYear)}
                    onValueChange={(value) => {
                      setSelectedSchoolYear(Number(value) as 1 | 2 | 3);
                      setCurrentSlide(1);
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYearOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={String(option.value)}
                        >
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
                    onValueChange={(v) => {
                      setSelectedStudent(v);
                      setCurrentSlide(1);
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {classStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={(v) => {
                      setSelectedPeriod(v);
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ano Letivo Completo</SelectItem>
                      {QUARTERS.map((quarter) => (
                        <SelectItem key={quarter} value={quarter}>
                          {quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="situation" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={selectedClass}
                    onValueChange={(v) => {
                      setSelectedClass(v);
                      setSelectedSituation("");
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano da turma</Label>
                  <Select
                    value={String(selectedSchoolYear)}
                    onValueChange={(value) => {
                      setSelectedSchoolYear(Number(value) as 1 | 2 | 3);
                      setCurrentSlide(1);
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYearOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={String(option.value)}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={(v) => {
                      setSelectedPeriod(v);
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ano Letivo Completo</SelectItem>
                      {QUARTERS.map((quarter) => (
                        <SelectItem key={quarter} value={quarter}>
                          {quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Situação</Label>
                  <Select
                    value={selectedSituation}
                    onValueChange={(v) => {
                      setSelectedSituation(v as SituationType);
                      setCurrentSlide(1);
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITUATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({studentsBySituation[option.value]?.length || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedClass && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  {SITUATION_OPTIONS.map((option) => {
                    const count = studentsBySituation[option.value]?.length || 0;
                    const bgColor = option.value === "critico" ? "bg-destructive/10 text-destructive"
                      : option.value === "atencao" ? "bg-warning/10 text-warning"
                        : option.value === "aprovado" ? "bg-success/10 text-success"
                          : "bg-info/10 text-info";
                    return (
                      <div key={option.value} className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
                        {option.label}: {count}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="school" className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 min-w-[200px] flex-1">
                  <Label>Período</Label>
                  <Select
                    value={schoolPeriod}
                    onValueChange={(v) => {
                      setSchoolPeriod(v);
                      setCurrentSlide(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ano Letivo Completo</SelectItem>
                      {QUARTERS.map((quarter) => (
                        <SelectItem key={quarter} value={quarter}>
                          {quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {viewMode === "school" && (
                  <div className="space-y-2 w-[120px]">
                    <Label>Ano</Label>
                    <Select
                      value={String(selectedCalendarYear)}
                      onValueChange={(val) => setSelectedCalendarYear(Number(val))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).reverse().map((year) => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex-1 min-w-[300px]">
                  <div className="p-2.5 bg-muted/50 rounded-lg text-sm text-muted-foreground border">
                    <p className="font-medium text-foreground truncate" title={schoolName}>{schoolName}</p>
                    <p className="text-xs">{classes.length} turmas • {students.length} alunos matriculados</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {shouldShowSlides && (
            <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting
                    ? "Processando..."
                    : "Exportar Apresentação (PDF)"}
                </Button>

                {/* Atalho para Trajetória */}
                {viewMode === "individual" && selectedStudent && (
                  <Button
                    variant="outline"
                    onClick={handleOpenTrajectory}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Ver Trajetória
                  </Button>
                )}

                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setPreviewZoom((prev) =>
                        Math.max(0.2, parseFloat((prev - 0.1).toFixed(2))),
                      )
                    }
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs font-mono"
                    onClick={() => setPreviewZoom(1)}
                    title="Resetar Zoom"
                  >
                    {Math.round(previewZoom * 100)}%
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setPreviewZoom((prev) =>
                        Math.min(3, parseFloat((prev + 0.1).toFixed(2))),
                      )
                    }
                    title="Aumentar Zoom"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <Button variant="outline" onClick={handleToggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Maximize2 className="h-4 w-4 mr-2" />
                  )}
                  {isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))}
                  disabled={currentSlide === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm font-medium px-4 min-w-[120px] text-center">
                  Slide {currentSlide} de {maxSlides}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentSlide(Math.min(maxSlides, currentSlide + 1))
                  }
                  disabled={currentSlide === maxSlides}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {shouldShowSlides ? (
        <div className="relative">
          <div
            id="slide-container"
            ref={slideContainerRef}
            className="aspect-[16/9] bg-muted border-2 rounded-lg shadow-xl relative overflow-hidden"
            onClick={(event) => {
              if (!isFullscreen || !activeSlides.length) return;
              if (event.shiftKey) {
                setCurrentSlide((prev) => Math.max(1, prev - 1));
              } else {
                setCurrentSlide((prev) =>
                  Math.min(activeSlides.length, prev + 1),
                );
              }
            }}
          >
            <div
              style={{
                width: SLIDE_WIDTH,
                height: SLIDE_HEIGHT,
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${effectiveScale})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease-out",
                background: "white",
              }}
            >
              {renderSlide()}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Presentation className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                Selecione uma turma {viewMode === "individual" && "e um aluno"}{" "}
                para visualizar os slides
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden container for PDF export - renders one slide at a time to be ultra-light */}
      {shouldShowSlides && exportingIndex !== null && (
        <div
          style={{
            position: "fixed",
            top: "-10000px",
            left: "-10000px",
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <div
            id="export-slide-single"
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              background: "white",
              overflow: "hidden",
            }}
          >
            {activeSlides[exportingIndex]}
          </div>
        </div>
      )}
    </div>
  );
};

export const ClassSlides = (props: ClassSlidesProps) => {
  if (!props.enabled) return null;
  return <ClassSlidesContent {...props} />;
};
