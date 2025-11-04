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

  const handleSaveAll = () => {
    if (!selectedClass || !selectedQuarter) {
      toast({
        title: 'Erro',
        description: 'Selecione turma e bimestre.',
        variant: 'destructive',
      });
      return;
    }

    let savedCount = 0;
    let lowGradesCount = 0;

    studentGrades.forEach(studentGrade => {
      Object.entries(studentGrade.grades).forEach(([subject, gradeValue]) => {
        const grade = parseFloat(gradeValue);
        if (!isNaN(grade) && grade >= 0 && grade <= 10) {
          addGrade({
            studentId: studentGrade.studentId,
            classId: selectedClass,
            subject: subject,
            quarter: selectedQuarter,
            grade: grade,
          });
          savedCount++;
          if (grade < 6) lowGradesCount++;
        }
      });
    });

    if (savedCount === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma nota válida (0-10).',
        variant: 'destructive',
      });
      return;
    }

    if (lowGradesCount > 0) {
      toast({
        title: 'Notas Lançadas',
        description: `✓ ${savedCount} nota(s) salva(s). ⚠️ ${lowGradesCount} nota(s) abaixo da média.`,
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `${savedCount} nota(s) lançada(s) com sucesso.`,
      });
    }
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

      {/* Grades Table */}
      {selectedClass && classStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lançamento de Notas</CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                      Aluno
                    </TableHead>
                    {SUBJECT_AREAS.map(area => (
                      area.subjects.map(subject => (
                        <TableHead key={subject} className="text-center min-w-[100px]">
                          <div className="space-y-1">
                            <div className="text-xs font-normal text-muted-foreground">
                              {area.name}
                            </div>
                            <div className="font-medium">{subject}</div>
                          </div>
                        </TableHead>
                      ))
                    ))}
                    {professionalSubjects.map(subject => (
                      <TableHead key={subject} className="text-center min-w-[100px]">
                        <div className="space-y-1">
                          <div className="text-xs font-normal text-muted-foreground">
                            Base Prof.
                          </div>
                          <div className="font-medium flex items-center justify-center gap-1">
                            {subject}
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
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => {
                    const studentGrade = studentGrades.find(sg => sg.studentId === student.id);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {student.photoUrl ? (
                                <AvatarImage src={student.photoUrl} alt={student.name} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-xs">
                                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.enrollment || 'S/N'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {allSubjects.map(subject => {
                          const gradeValue = studentGrade?.grades[subject] || '';
                          const grade = parseFloat(gradeValue);
                          const isLowGrade = !isNaN(grade) && grade < 6;
                          const area = getSubjectArea(subject);

                          return (
                            <TableCell key={subject} className="p-2">
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  value={gradeValue}
                                  onChange={(e) => handleGradeChange(student.id, subject, e.target.value)}
                                  className={`text-center ${isLowGrade ? 'border-severity-critical bg-severity-critical/5' : ''}`}
                                />
                                {isLowGrade && (
                                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <AlertTriangle className="h-3 w-3 text-severity-critical" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-severity-critical" />
                <span>Nota abaixo da média (menor que 6.0)</span>
              </div>
              {SUBJECT_AREAS.map(area => (
                <div key={area.name} className="flex items-center gap-2">
                  <Badge variant="outline" className={`${area.color} text-xs py-0`}>
                    {area.name}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex gap-4 pt-6 border-t mt-6">
              <Button onClick={handleSaveAll} size="lg">
                <Save className="h-4 w-4 mr-2" />
                Salvar Todas as Notas
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setStudentGrades(prev =>
                    prev.map(sg => ({
                      ...sg,
                      grades: Object.fromEntries(
                        Object.keys(sg.grades).map(subject => [subject, ''])
                      ),
                    }))
                  );
                }}
              >
                Limpar Formulário
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
