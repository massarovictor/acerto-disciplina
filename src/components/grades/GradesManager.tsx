import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useClasses, useStudents, useGrades, useProfessionalSubjects } from '@/hooks/useLocalStorage';
import { AlertTriangle, Save, Plus, X, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  SUBJECT_AREAS, 
  QUARTERS 
} from '@/lib/subjects';

interface StudentGrades {
  studentId: string;
  grades: Record<string, string>; // subject -> grade
}

export const GradesManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { grades, addGrade } = useGrades();
  const { toast } = useToast();
  const { 
    getProfessionalSubjects, 
    addProfessionalSubject, 
    removeProfessionalSubject,
    setProfessionalSubjectsForClass 
  } = useProfessionalSubjects();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [studentGrades, setStudentGrades] = useState<StudentGrades[]>([]);
  const [newProfessionalSubject, setNewProfessionalSubject] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [lastInitialized, setLastInitialized] = useState<{ class: string; quarter: string } | null>(null);

  const classStudents = students.filter(s => s.classId === selectedClass);
  const selectedClassData = classes.find(c => c.id === selectedClass);
  
  // Verificar se a turma está arquivada
  const isClassArchived = selectedClassData?.archived === true;
  
  // Obter disciplinas profissionais da turma (armazenadas no localStorage)
  const professionalSubjects = selectedClass ? getProfessionalSubjects(selectedClass) : [];
  
  // Usar uma string para rastrear mudanças nas disciplinas profissionais
  const professionalSubjectsStr = professionalSubjects.join(',');

  // Calcular allSubjects dentro do useEffect para evitar problemas de dependência
  const allSubjects = [
    ...SUBJECT_AREAS.flatMap(area => area.subjects),
    ...professionalSubjects,
  ];

  // Initialize grades when class or quarter changes
  useEffect(() => {
    if (!selectedClass || !selectedQuarter) {
      setStudentGrades([]);
      setLastInitialized(null);
      return;
    }

    // Só reinicializar se mudou a turma ou bimestre
    const needsReinit = !lastInitialized || 
                       lastInitialized.class !== selectedClass || 
                       lastInitialized.quarter !== selectedQuarter;

    if (needsReinit) {
      const currentAllSubjects = [
        ...SUBJECT_AREAS.flatMap(area => area.subjects),
        ...professionalSubjects,
      ];
      
      const initialGrades = classStudents.map(student => {
        const studentGradeData: Record<string, string> = {};
        
        currentAllSubjects.forEach(subject => {
          const existingGrade = grades.find(
            g => g.studentId === student.id && 
                 g.subject === subject && 
                 g.quarter === selectedQuarter
          );
          studentGradeData[subject] = existingGrade ? String(existingGrade.grade) : '';
        });

        return {
          studentId: student.id,
          grades: studentGradeData,
        };
      });

      setStudentGrades(initialGrades);
      setLastInitialized({ class: selectedClass, quarter: selectedQuarter });
    } else {
      // Se apenas adicionou novas disciplinas profissionais, adicionar campos vazios sem resetar
      const currentAllSubjects = [
        ...SUBJECT_AREAS.flatMap(area => area.subjects),
        ...professionalSubjects,
      ];
      
      setStudentGrades(prev => {
        return prev.map(sg => {
          const updatedGrades = { ...sg.grades };
          currentAllSubjects.forEach(subject => {
            if (!(subject in updatedGrades)) {
              const existingGrade = grades.find(
                g => g.studentId === sg.studentId && 
                     g.subject === subject && 
                     g.quarter === selectedQuarter
              );
              updatedGrades[subject] = existingGrade ? String(existingGrade.grade) : '';
            }
          });
          return { ...sg, grades: updatedGrades };
        });
      });
    }
  }, [selectedClass, selectedQuarter, professionalSubjectsStr, classStudents.length]);

  const handleGradeChange = (studentId: string, subject: string, value: string) => {
    setStudentGrades(prev =>
      prev.map(sg =>
        sg.studentId === studentId
          ? { ...sg, grades: { ...sg.grades, [subject]: value } }
          : sg
      )
    );
  };

  const handleAddProfessionalSubject = () => {
    if (newProfessionalSubject.trim() && selectedClass) {
      addProfessionalSubject(selectedClass, newProfessionalSubject.trim());
      setNewProfessionalSubject('');
      setShowAddDialog(false);
      toast({
        title: 'Disciplina adicionada',
        description: 'A disciplina foi adicionada com sucesso e estará disponível em Notas e Frequência.',
      });
    }
  };

  const handleRemoveProfessionalSubject = (subject: string) => {
    if (selectedClass) {
      removeProfessionalSubject(selectedClass, subject);
    }
  };

  const handleSaveStudentGrades = () => {
    if (!selectedStudent || !selectedClass || !selectedQuarter) return;

    const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
    if (!studentGrade) return;

    let savedCount = 0;
    let lowGradesCount = 0;
    const savedByArea: Record<string, number> = {};

    Object.entries(studentGrade.grades).forEach(([subject, gradeValue]) => {
      const grade = parseFloat(gradeValue);
      if (!isNaN(grade) && grade >= 0 && grade <= 10) {
        addGrade({
          studentId: selectedStudent,
          classId: selectedClass,
          subject: subject,
          quarter: selectedQuarter,
          grade: grade,
        });
        savedCount++;
        if (grade < 6) lowGradesCount++;
        
        // Contar por área
        const area = SUBJECT_AREAS.find(a => a.subjects.includes(subject));
        const areaName = area ? area.name : 'Base Profissional';
        savedByArea[areaName] = (savedByArea[areaName] || 0) + 1;
      }
    });

    if (savedCount === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma nota válida (0-10).',
        variant: 'destructive',
      });
      return;
    }

    const student = students.find(s => s.id === selectedStudent);
    const areasSummary = Object.entries(savedByArea)
      .map(([area, count]) => `${area}: ${count}`)
      .join(', ');
    
    if (lowGradesCount > 0) {
      toast({
        title: 'Notas Lançadas',
        description: `✓ ${savedCount} nota(s) de ${student?.name} salva(s) (${areasSummary}). ⚠️ ${lowGradesCount} nota(s) abaixo da média.`,
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `${savedCount} nota(s) de ${student?.name} lançada(s) com sucesso (${areasSummary}).`,
      });
    }

    setSelectedStudent(null);
  };

  // Calcular progresso por área para um aluno
  const getAreaProgress = (studentId: string, area: typeof SUBJECT_AREAS[0]) => {
    const studentGrade = studentGrades.find(sg => sg.studentId === studentId);
    if (!studentGrade) return { filled: 0, total: area.subjects.length };
    
    const filled = area.subjects.filter(subject => {
      const gradeValue = studentGrade.grades[subject];
      return gradeValue && gradeValue !== '';
    }).length;
    
    return { filled, total: area.subjects.length };
  };

  // Calcular progresso da base profissional
  const getProfessionalProgress = (studentId: string) => {
    const studentGrade = studentGrades.find(sg => sg.studentId === studentId);
    if (!studentGrade || professionalSubjects.length === 0) return { filled: 0, total: 0 };
    
    const filled = professionalSubjects.filter(subject => {
      const gradeValue = studentGrade.grades[subject];
      return gradeValue && gradeValue !== '';
    }).length;
    
    return { filled, total: professionalSubjects.length };
  };

  const getSubjectArea = (subject: string) => {
    return SUBJECT_AREAS.find(area => area.subjects.includes(subject));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma turma cadastrada
                    </div>
                  ) : (
                    classes
                      .filter(cls => !cls.archived)
                      .map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bimestre *</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bimestre" />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map(quarter => (
                    <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isClassArchived && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta turma está arquivada. Não é possível lançar notas para turmas arquivadas.
              </AlertDescription>
            </Alert>
          )}

          {selectedClass && selectedQuarter && !isClassArchived && (
            <Alert className="mt-4">
              <AlertDescription>
                Lançando notas do <strong>{selectedQuarter}</strong> para a turma{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong> ({classStudents.length} alunos)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Add Professional Subject Button */}
      {selectedClass && classStudents.length > 0 && (
        <div className="flex justify-end">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Disciplina Profissional
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Disciplina da Base Profissional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Disciplina</Label>
                  <Input
                    placeholder="Ex: Gestão de Processos"
                    value={newProfessionalSubject}
                    onChange={(e) => setNewProfessionalSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProfessionalSubject()}
                  />
                </div>
                <Button onClick={handleAddProfessionalSubject} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Students List */}
      {selectedClass && classStudents.length > 0 && !isClassArchived && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos - Clique para Lançar Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classStudents.map((student) => {
                const studentGrade = studentGrades.find(sg => sg.studentId === student.id);
                const filledGrades = studentGrade 
                  ? Object.values(studentGrade.grades).filter(g => g !== '').length 
                  : 0;
                const totalSubjects = allSubjects.length;
                
                // Calcular progresso por área
                const areaProgresses = SUBJECT_AREAS.map(area => ({
                  area: area.name,
                  ...getAreaProgress(student.id, area),
                }));
                const professionalProgress = getProfessionalProgress(student.id);

                return (
                  <Card 
                    key={student.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {student.photoUrl ? (
                            <AvatarImage src={student.photoUrl} alt={student.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.enrollment || 'S/N'}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {areaProgresses.map(({ area, filled, total }) => (
                              <Badge 
                                key={area} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {filled}/{total}
                              </Badge>
                            ))}
                            {professionalProgress.total > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Prof: {professionalProgress.filled}/{professionalProgress.total}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {filledGrades}/{totalSubjects} notas lançadas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Grades Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Lançar Notas - {students.find(s => s.id === selectedStudent)?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <Accordion type="multiple" defaultValue={SUBJECT_AREAS.map((_, i) => `area-${i}`)} className="w-full">
                {/* Subject Areas */}
                {SUBJECT_AREAS.map((area, index) => {
                  const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
                  const progress = getAreaProgress(selectedStudent, area);
                  const isComplete = progress.filled === progress.total && progress.total > 0;
                  
                  return (
                    <AccordionItem key={area.name} value={`area-${index}`} className="border rounded-lg px-4 mb-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={area.color}>
                              {area.name}
                            </Badge>
                            {isComplete && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {progress.filled}/{progress.total} lançadas
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                          {area.subjects.map(subject => {
                            const gradeValue = studentGrade?.grades[subject] || '';
                            const grade = parseFloat(gradeValue);
                            const isLowGrade = !isNaN(grade) && grade < 6;
                            const hasGrade = gradeValue !== '';

                            return (
                              <div key={subject} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">{subject}</Label>
                                  {hasGrade && (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="0.0 a 10.0"
                                  value={gradeValue}
                                  onChange={(e) => handleGradeChange(selectedStudent, subject, e.target.value)}
                                  className={isLowGrade ? 'border-severity-critical bg-severity-critical/5 font-bold' : ''}
                                />
                                {isLowGrade && (
                                  <p className="text-xs text-severity-critical flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Abaixo da média
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}

                {/* Professional Subjects */}
                {professionalSubjects.length > 0 && (() => {
                  const professionalProgress = getProfessionalProgress(selectedStudent);
                  return (
                    <AccordionItem value="professional" className="border rounded-lg px-4 mb-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                              Base Profissional
                              {selectedClassData?.course && ` - ${selectedClassData.course}`}
                            </Badge>
                            {professionalProgress.filled === professionalProgress.total && professionalProgress.total > 0 && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {professionalProgress.filled}/{professionalProgress.total} lançadas
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                          {professionalSubjects.map(subject => {
                            const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
                            const gradeValue = studentGrade?.grades[subject] || '';
                            const grade = parseFloat(gradeValue);
                            const isLowGrade = !isNaN(grade) && grade < 6;
                            const hasGrade = gradeValue !== '';

                            return (
                              <div key={subject} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-sm">{subject}</Label>
                                    {hasGrade && (
                                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleRemoveProfessionalSubject(subject)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="0.0 a 10.0"
                                  value={gradeValue}
                                  onChange={(e) => handleGradeChange(selectedStudent, subject, e.target.value)}
                                  className={isLowGrade ? 'border-severity-critical bg-severity-critical/5 font-bold' : ''}
                                />
                                {isLowGrade && (
                                  <p className="text-xs text-severity-critical flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Abaixo da média
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })()}
              </Accordion>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveStudentGrades} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Todas as Notas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStudent(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedClass && classStudents.length === 0 && !isClassArchived && (
        <Alert>
          <AlertDescription>
            Nenhum aluno cadastrado nesta turma. Cadastre alunos para lançar notas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
