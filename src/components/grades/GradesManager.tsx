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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClasses, useStudents, useGrades } from '@/hooks/useLocalStorage';
import { AlertTriangle, Save, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUBJECT_AREAS, QUARTERS } from '@/lib/subjects';

interface StudentGrades {
  studentId: string;
  grades: Record<string, string>; // subject -> grade
}

export const GradesManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { grades, addGrade } = useGrades();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [studentGrades, setStudentGrades] = useState<StudentGrades[]>([]);
  const [professionalSubjects, setProfessionalSubjects] = useState<string[]>([]);
  const [newProfessionalSubject, setNewProfessionalSubject] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const classStudents = students.filter(s => s.classId === selectedClass);

  const allSubjects = [
    ...SUBJECT_AREAS.flatMap(area => area.subjects),
    ...professionalSubjects,
  ];

  // Initialize grades when class or quarter changes
  useEffect(() => {
    if (selectedClass && selectedQuarter) {
      const initialGrades = classStudents.map(student => {
        const studentGradeData: Record<string, string> = {};
        
        allSubjects.forEach(subject => {
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
    }
  }, [selectedClass, selectedQuarter, professionalSubjects, classStudents, grades]);

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
    if (newProfessionalSubject.trim()) {
      setProfessionalSubjects(prev => [...prev, newProfessionalSubject.trim()]);
      setNewProfessionalSubject('');
      setShowAddDialog(false);
      toast({
        title: 'Disciplina adicionada',
        description: 'A disciplina foi adicionada com sucesso.',
      });
    }
  };

  const handleRemoveProfessionalSubject = (subject: string) => {
    setProfessionalSubjects(prev => prev.filter(s => s !== subject));
  };

  const handleSaveStudentGrades = () => {
    if (!selectedStudent || !selectedClass || !selectedQuarter) return;

    const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
    if (!studentGrade) return;

    let savedCount = 0;
    let lowGradesCount = 0;

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
    if (lowGradesCount > 0) {
      toast({
        title: 'Notas Lançadas',
        description: `✓ ${savedCount} nota(s) de ${student?.name} salva(s). ⚠️ ${lowGradesCount} nota(s) abaixo da média.`,
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `${savedCount} nota(s) de ${student?.name} lançada(s) com sucesso.`,
      });
    }

    setSelectedStudent(null);
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
                    classes.map(cls => (
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

          {selectedClass && selectedQuarter && (
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
      {selectedClass && classStudents.length > 0 && (
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Lançar Notas - {students.find(s => s.id === selectedStudent)?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              {/* Subject Areas */}
              {SUBJECT_AREAS.map(area => {
                const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
                
                return (
                  <div key={area.name} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={area.color}>
                        {area.name}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {area.subjects.map(subject => {
                        const gradeValue = studentGrade?.grades[subject] || '';
                        const grade = parseFloat(gradeValue);
                        const isLowGrade = !isNaN(grade) && grade < 6;

                        return (
                          <div key={subject} className="space-y-1">
                            <Label className="text-sm">{subject}</Label>
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
                  </div>
                );
              })}

              {/* Professional Subjects */}
              {professionalSubjects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Base Profissional</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {professionalSubjects.map(subject => {
                      const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
                      const gradeValue = studentGrade?.grades[subject] || '';
                      const grade = parseFloat(gradeValue);
                      const isLowGrade = !isNaN(grade) && grade < 6;

                      return (
                        <div key={subject} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">{subject}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
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
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveStudentGrades} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Notas
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

      {selectedClass && classStudents.length === 0 && (
        <Alert>
          <AlertDescription>
            Nenhum aluno cadastrado nesta turma. Cadastre alunos para lançar notas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
