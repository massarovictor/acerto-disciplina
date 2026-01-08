import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, Presentation, ZoomIn, ZoomOut } from 'lucide-react';
import { Class, Student, Incident, Grade, AttendanceRecord } from '@/types';
import { CoverSlide } from './slides/CoverSlide';
import { ClassOverviewSlide } from './slides/ClassOverviewSlide';
import { AreaAnalysisSlide } from './slides/AreaAnalysisSlide';
import { StudentMetricsSlide } from './slides/StudentMetricsSlide';
import { StudentGradesTableSlide } from './slides/StudentGradesTableSlide';
import { useToast } from '@/hooks/use-toast';
import { useProfessionalSubjects } from '@/hooks/useData';
import { QUARTERS, SUBJECT_AREAS } from '@/lib/subjects';

interface ClassSlidesProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
  grades: Grade[];
  attendance: AttendanceRecord[];
}

export const ClassSlides = ({ classes, students, incidents, grades, attendance }: ClassSlidesProps) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(1);
  const [viewMode, setViewMode] = useState<'class' | 'individual'>('class');
  const { getProfessionalSubjects } = useProfessionalSubjects();
  const { toast } = useToast();
  const slideContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideScale, setSlideScale] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(1);
  const SLIDE_WIDTH = 1920;
  const SLIDE_HEIGHT = 1080;

  const professionalSubjects = selectedClass
    ? getProfessionalSubjects(selectedClass)
    : [];

  const classData = classes.find(c => c.id === selectedClass);
  const classStudents = selectedClass ? students.filter(s => s.classId === selectedClass) : [];
  const classIncidents = selectedClass ? incidents.filter(i => i.classId === selectedClass) : [];
  const classGrades = selectedClass ? grades.filter(g => g.classId === selectedClass) : [];
  const studentData = students.find(s => s.id === selectedStudent);

  const periodGrades = useMemo(() => {
    return selectedPeriod === 'all'
      ? classGrades
      : classGrades.filter(g => g.quarter === selectedPeriod);
  }, [classGrades, selectedPeriod]);

  const studentRankings = useMemo(() => {
    return classStudents
      .map(student => {
        const filteredGrades = periodGrades.filter(g => g.studentId === student.id);

        const average = filteredGrades.length > 0
          ? filteredGrades.reduce((sum, g) => sum + g.grade, 0) / filteredGrades.length
          : 0;

        return { student, average };
      })
      .sort((a, b) => {
        const diff = a.average - b.average;
        if (diff !== 0) return diff;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [classStudents, periodGrades]);

  const areasList = useMemo(() => {
    const list: string[] = [];
    if (periodGrades.some(g => SUBJECT_AREAS[0].subjects.includes(g.subject))) {
      list.push('Linguagens');
    }
    if (periodGrades.some(g => SUBJECT_AREAS[1].subjects.includes(g.subject))) {
      list.push('Ciências Humanas');
    }
    if (periodGrades.some(g => SUBJECT_AREAS[2].subjects.includes(g.subject))) {
      list.push('Ciências da Natureza');
    }
    if (periodGrades.some(g => SUBJECT_AREAS[3].subjects.includes(g.subject))) {
      list.push('Matemática');
    }
    if (professionalSubjects.length > 0 && periodGrades.some(g => professionalSubjects.includes(g.subject))) {
      list.push('Formação Técnica');
    }
    return list;
  }, [periodGrades, professionalSubjects]);

  const classSlides = useMemo(() => {
    if (!selectedClass || !classData) return [];

    const slides = [
      <CoverSlide
        key="cover"
        classData={classData}
        period={selectedPeriod}
      />,
      <ClassOverviewSlide
        key="overview"
        classData={classData}
        students={classStudents}
        grades={classGrades}
        incidents={classIncidents}
        period={selectedPeriod}
      />,
    ];

    areasList.forEach(area => {
      slides.push(
        <AreaAnalysisSlide
          key={`area-${area}`}
          areaName={area}
          grades={classGrades}
          period={selectedPeriod}
          professionalSubjects={professionalSubjects}
        />
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
        />
      );
      slides.push(
        <StudentGradesTableSlide
          key={`student-grades-${student.id}`}
          student={student}
          grades={classGrades}
          period={selectedPeriod}
        />
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

    const studentGrades = classGrades.filter(g => g.studentId === selectedStudent);
    const position = studentRankings.findIndex(r => r.student.id === selectedStudent);
    const displayPosition = position >= 0 ? studentRankings.length - position : 0;

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
  }, [classGrades, classIncidents, selectedPeriod, selectedStudent, studentData, studentRankings]);

  const activeSlides = viewMode === 'class' ? classSlides : individualSlides;
  const maxSlides = Math.max(1, activeSlides.length);
  const effectiveScale = slideScale * (isFullscreen ? 1 : previewZoom);

  useEffect(() => {
    if (!activeSlides.length) return;
    if (currentSlide > activeSlides.length) {
      setCurrentSlide(activeSlides.length);
    }
  }, [activeSlides.length, currentSlide]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const container = slideContainerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        setCurrentSlide(1);
        await container.requestFullscreen();
      }
    } catch {
      toast({
        title: 'Não foi possível entrar em tela cheia',
        description: 'Seu navegador bloqueou a ação. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (!activeSlides.length) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        setCurrentSlide(prev => Math.min(activeSlides.length, prev + 1));
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        setCurrentSlide(prev => Math.max(1, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [activeSlides.length, isFullscreen]);

  useEffect(() => {
    const container = slideContainerRef.current;
    if (!container) return;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const scale = Math.min(rect.width / SLIDE_WIDTH, rect.height / SLIDE_HEIGHT) || 1;
      setSlideScale(scale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, [SLIDE_HEIGHT, SLIDE_WIDTH]);
  const handleExportPDF = async () => {
    const slideElement = document.getElementById('slide-container');
    if (!slideElement) return;

    try {
      const { exportSlideAsPDF } = await import('@/lib/pdfExport');
      const fileName = viewMode === 'class'
        ? `relatorio-turma-${classData?.name || 'turma'}-slide-${currentSlide}.pdf`
        : `relatorio-aluno-${studentData?.name || 'aluno'}-slide-${currentSlide}.pdf`;

      await exportSlideAsPDF('slide-container', fileName);

      toast({
        title: 'Slide exportado com sucesso!',
        description: `O slide foi baixado como ${fileName}`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Ocorreu um erro ao gerar o PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const renderSlide = () => {
    if (!selectedClass) return null;
    return activeSlides[currentSlide - 1] ?? null;
  };

  const shouldShowSlides = selectedClass && activeSlides.length > 0 && (viewMode === 'class' || selectedStudent);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerador de Slides de Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as 'class' | 'individual'); setCurrentSlide(1); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="class">Slides por Turma</TabsTrigger>
              <TabsTrigger value="individual">Slides Individuais</TabsTrigger>
            </TabsList>

            <TabsContent value="class" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Selecione a Turma</Label>
                  <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setCurrentSlide(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setCurrentSlide(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ano Letivo Completo</SelectItem>
                      {QUARTERS.map(quarter => (
                        <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent(''); setCurrentSlide(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aluno</Label>
                  <Select value={selectedStudent} onValueChange={(v) => { setSelectedStudent(v); setCurrentSlide(1); }} disabled={!selectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {classStudents.map(student => (
                        <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setCurrentSlide(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ano Letivo Completo</SelectItem>
                      {QUARTERS.map(quarter => (
                        <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {shouldShowSlides && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                {!isFullscreen && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewZoom(prev => Math.min(1.3, parseFloat((prev + 0.1).toFixed(2))))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewZoom(prev => Math.max(0.7, parseFloat((prev - 0.1).toFixed(2))))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={handleToggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Maximize2 className="h-4 w-4 mr-2" />
                  )}
                  {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
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

                <span className="text-sm font-medium px-4">
                  Slide {currentSlide} de {maxSlides}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentSlide(Math.min(maxSlides, currentSlide + 1))}
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
            className="aspect-[16/9] bg-background border-2 rounded-lg shadow-lg relative"
            style={{ overflow: isFullscreen ? 'hidden' : 'auto' }}
            onClick={(event) => {
              if (!isFullscreen || !activeSlides.length) return;
              if (event.shiftKey) {
                setCurrentSlide(prev => Math.max(1, prev - 1));
              } else {
                setCurrentSlide(prev => Math.min(activeSlides.length, prev + 1));
              }
            }}
          >
            <div
              style={{
                width: SLIDE_WIDTH,
                height: SLIDE_HEIGHT,
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${effectiveScale})`,
                transformOrigin: 'center',
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
              <p>Selecione uma turma {viewMode === 'individual' && 'e um aluno'} para visualizar os slides</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
