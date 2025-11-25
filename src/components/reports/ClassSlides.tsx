import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Download, Presentation } from 'lucide-react';
import { Class, Student, Incident, Grade, AttendanceRecord } from '@/types';
import { CoverSlide } from './slides/CoverSlide';
import { ClassOverviewSlide } from './slides/ClassOverviewSlide';
import { QuarterComparisonSlide } from './slides/QuarterComparisonSlide';
import { SubjectRankingSlide } from './slides/SubjectRankingSlide';
import { LanguagesAreaSlide } from './slides/LanguagesAreaSlide';
import { HumanitiesAreaSlide } from './slides/HumanitiesAreaSlide';
import { SciencesAreaSlide } from './slides/SciencesAreaSlide';
import { MathAreaSlide } from './slides/MathAreaSlide';
import { ProfessionalAreaSlide } from './slides/ProfessionalAreaSlide';
import { RiskAnalysisSlide } from './slides/RiskAnalysisSlide';
import { RecommendationsSlide } from './slides/RecommendationsSlide';
import { StudentMetricsSlide } from './slides/StudentMetricsSlide';
import { StudentGradesTableSlide } from './slides/StudentGradesTableSlide';
import { useToast } from '@/hooks/use-toast';
import { useProfessionalSubjects } from '@/hooks/useLocalStorage';
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

  // Carregar disciplinas profissionais da turma selecionada
  const professionalSubjects = selectedClass 
    ? getProfessionalSubjects(selectedClass) 
    : [];

  const classData = classes.find(c => c.id === selectedClass);
  const classStudents = selectedClass ? students.filter(s => s.classId === selectedClass) : [];
  const classIncidents = selectedClass ? incidents.filter(i => i.classId === selectedClass) : [];
  const classGrades = selectedClass ? grades.filter(g => g.classId === selectedClass) : [];
  const studentData = students.find(s => s.id === selectedStudent);

  // Calculate student rankings (lowest to highest)
  const studentRankings = classStudents.map(student => {
    const filteredGrades = selectedPeriod === 'all'
      ? classGrades.filter(g => g.studentId === student.id)
      : classGrades.filter(g => g.studentId === student.id && g.quarter === selectedPeriod);
    
    const average = filteredGrades.length > 0
      ? filteredGrades.reduce((sum, g) => sum + g.grade, 0) / filteredGrades.length
      : 0;

    return { student, average };
  }).sort((a, b) => a.average - b.average); // Lowest first

  // Calculate max slides for class view
  // Verificar quais áreas têm dados
  const hasLanguagesData = classGrades.some(g => 
    SUBJECT_AREAS[0].subjects.includes(g.subject)
  );
  const hasHumanitiesData = classGrades.some(g => 
    SUBJECT_AREAS[1].subjects.includes(g.subject)
  );
  const hasSciencesData = classGrades.some(g => 
    SUBJECT_AREAS[2].subjects.includes(g.subject)
  );
  const hasMathData = classGrades.some(g => 
    SUBJECT_AREAS[3].subjects.includes(g.subject)
  );
  const hasProfessionalData = professionalSubjects.length > 0 && classGrades.some(g =>
    professionalSubjects.includes(g.subject)
  );

  // Contar slides de análise (apenas para ano completo)
  const analysisSlides = selectedPeriod === 'all' ? [
    true, // Comparison
    true, // Ranking
    hasLanguagesData,
    hasHumanitiesData,
    hasSciencesData,
    hasMathData,
    hasProfessionalData,
    true, // Risk
    true, // Recommendations
  ].filter(Boolean).length : 0;

  const maxSlides = viewMode === 'class' 
    ? 2 + analysisSlides + (studentRankings.length * 2) // Cover + Overview + Analysis + Student slides
    : 2; // Individual view: 2 slides

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

    if (viewMode === 'class') {
      let slideIndex = 1;

      // Slide 1: Capa
      if (currentSlide === slideIndex++) {
        return <CoverSlide classData={classData!} period={selectedPeriod} />;
      }

      // Slide 2: Visão Geral
      if (currentSlide === slideIndex++) {
        return <ClassOverviewSlide 
          classData={classData!} 
          students={classStudents} 
          grades={classGrades} 
          incidents={classIncidents} 
          period={selectedPeriod} 
        />;
      }

      // Slides de análise (apenas para ano completo)
      if (selectedPeriod === 'all') {
        // Slide 3: Comparação Entre Bimestres
        if (currentSlide === slideIndex++) {
          return <QuarterComparisonSlide 
            grades={classGrades} 
            classData={{ name: classData!.name }} 
          />;
        }

        // Slide 4: Ranking de Disciplinas
        if (currentSlide === slideIndex++) {
          return <SubjectRankingSlide 
            grades={classGrades} 
            classData={{ name: classData!.name }}
            professionalSubjects={professionalSubjects}
          />;
        }

        // Slide 5: Linguagens (se houver dados)
        if (hasLanguagesData && currentSlide === slideIndex++) {
          return <LanguagesAreaSlide grades={classGrades} period={selectedPeriod} />;
        } else if (hasLanguagesData) {
          slideIndex++;
        }

        // Slide 6: Humanas (se houver dados)
        if (hasHumanitiesData && currentSlide === slideIndex++) {
          return <HumanitiesAreaSlide grades={classGrades} period={selectedPeriod} />;
        } else if (hasHumanitiesData) {
          slideIndex++;
        }

        // Slide 7: Natureza (se houver dados)
        if (hasSciencesData && currentSlide === slideIndex++) {
          return <SciencesAreaSlide grades={classGrades} period={selectedPeriod} />;
        } else if (hasSciencesData) {
          slideIndex++;
        }

        // Slide 8: Matemática (se houver dados)
        if (hasMathData && currentSlide === slideIndex++) {
          return <MathAreaSlide grades={classGrades} period={selectedPeriod} />;
        } else if (hasMathData) {
          slideIndex++;
        }

        // Slide 9: Profissional (se houver dados)
        if (hasProfessionalData && currentSlide === slideIndex++) {
          return <ProfessionalAreaSlide 
            grades={classGrades} 
            period={selectedPeriod}
            professionalSubjects={professionalSubjects}
          />;
        } else if (hasProfessionalData) {
          slideIndex++;
        }

        // Slide 10: Análise de Risco
        if (currentSlide === slideIndex++) {
          return <RiskAnalysisSlide 
            grades={classGrades} 
            students={classStudents}
            classData={{ name: classData!.name }}
          />;
        }

        // Slide 11: Recomendações
        if (currentSlide === slideIndex++) {
          return <RecommendationsSlide 
            grades={classGrades} 
            students={classStudents}
            classData={{ name: classData!.name }}
            professionalSubjects={professionalSubjects}
          />;
        }
      }

      // Slides de alunos (2 por aluno)
      const studentSlideOffset = currentSlide - slideIndex;
      if (studentSlideOffset >= 0) {
        const studentIndex = Math.floor(studentSlideOffset / 2);
        const isMetricsSlide = studentSlideOffset % 2 === 0;
        
        if (studentIndex < studentRankings.length) {
          const { student } = studentRankings[studentIndex];
          const position = studentRankings.length - studentIndex;
          
          if (isMetricsSlide) {
            return <StudentMetricsSlide 
              student={student} 
              grades={classGrades} 
              incidents={classIncidents} 
              period={selectedPeriod}
              position={position}
              totalStudents={studentRankings.length}
            />;
          } else {
            return <StudentGradesTableSlide 
              student={student} 
              grades={classGrades} 
              period={selectedPeriod}
            />;
          }
        }
      }
    } else {
      // Individual view
      if (!selectedStudent || !studentData) return null;
      
      const studentGrades = classGrades.filter(g => g.studentId === selectedStudent);
      const position = studentRankings.findIndex(r => r.student.id === selectedStudent);
      const displayPosition = position >= 0 ? studentRankings.length - position : 0;

      if (currentSlide === 1) {
        return <StudentMetricsSlide 
          student={studentData} 
          grades={studentGrades} 
          incidents={classIncidents} 
          period={selectedPeriod}
          position={displayPosition}
          totalStudents={studentRankings.length}
        />;
      } else {
        return <StudentGradesTableSlide 
          student={studentData} 
          grades={studentGrades} 
          period={selectedPeriod}
        />;
      }
    }

    return null;
  };

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

          {selectedClass && (viewMode === 'class' || selectedStudent) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>

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

      {selectedClass && (viewMode === 'class' || selectedStudent) ? (
        <div className="relative">
          <div id="slide-container" className="aspect-[16/9] bg-background border-2 rounded-lg overflow-hidden shadow-lg">
            {renderSlide()}
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