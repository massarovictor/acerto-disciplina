import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Download, Presentation } from 'lucide-react';
import { Class, Student, Incident, Grade, AttendanceRecord } from '@/types';
import { ClassSlide1 } from './slides/ClassSlide1';
import { ClassSlide2 } from './slides/ClassSlide2';
import { ClassSlide3 } from './slides/ClassSlide3';
import { ClassSlide4 } from './slides/ClassSlide4';
import { ClassSlide5 } from './slides/ClassSlide5';
import { StudentSlide1 } from './slides/StudentSlide1';
import { StudentSlide2 } from './slides/StudentSlide2';

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
  const [currentSlide, setCurrentSlide] = useState(1);
  const [viewMode, setViewMode] = useState<'class' | 'individual'>('class');

  const classData = classes.find(c => c.id === selectedClass);
  const classStudents = selectedClass ? students.filter(s => s.classId === selectedClass) : [];
  const classIncidents = selectedClass ? incidents.filter(i => i.classId === selectedClass) : [];
  const studentData = students.find(s => s.id === selectedStudent);

  const maxSlides = viewMode === 'class' ? 5 : 2;

  const handleExportPDF = () => {
    console.log('Exportando slides para PDF');
    // TODO: Implement PDF export
  };

  const renderSlide = () => {
    if (!selectedClass) return null;

    if (viewMode === 'class') {
      switch (currentSlide) {
        case 1:
          return <ClassSlide1 classData={classData!} students={classStudents} grades={grades} />;
        case 2:
          return <ClassSlide2 classData={classData!} students={classStudents} incidents={classIncidents} grades={grades} />;
        case 3:
          return <ClassSlide3 classData={classData!} students={classStudents} grades={grades} />;
        case 4:
          return <ClassSlide4 classData={classData!} students={classStudents} incidents={classIncidents} grades={grades} />;
        case 5:
          return <ClassSlide5 classData={classData!} students={classStudents} incidents={classIncidents} />;
        default:
          return null;
      }
    } else {
      if (!selectedStudent || !studentData) return null;
      
      switch (currentSlide) {
        case 1:
          return <StudentSlide1 student={studentData} grades={grades} incidents={incidents} />;
        case 2:
          return <StudentSlide2 student={studentData} grades={grades} incidents={incidents} attendance={attendance} />;
        default:
          return null;
      }
    }
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
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
          <div className="aspect-[16/9] bg-background border-2 rounded-lg overflow-hidden shadow-lg">
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