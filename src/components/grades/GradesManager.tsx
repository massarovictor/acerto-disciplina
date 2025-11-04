import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useClasses, useStudents, useGrades } from '@/hooks/useLocalStorage';
import { AlertTriangle, Save, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUBJECT_AREAS, QUARTERS, SubjectArea } from '@/lib/subjects';

interface GradeInput {
  subject: string;
  grade: string;
}

export const GradesManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { grades, addGrade } = useGrades();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [gradeInputs, setGradeInputs] = useState<GradeInput[]>([]);
  const [professionalSubjects, setProfessionalSubjects] = useState<string[]>([]);
  const [newProfessionalSubject, setNewProfessionalSubject] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const classStudents = students.filter(s => s.classId === selectedClass);

  // Initialize grade inputs when student or quarter changes
  useEffect(() => {
    if (selectedStudent && selectedQuarter) {
      const allSubjects = [
        ...SUBJECT_AREAS.flatMap(area => area.subjects),
        ...professionalSubjects,
      ];

      const inputs = allSubjects.map(subject => {
        const existingGrade = grades.find(
          g => g.studentId === selectedStudent && 
               g.subject === subject && 
               g.quarter === selectedQuarter
        );
        return {
          subject,
          grade: existingGrade ? String(existingGrade.grade) : '',
        };
      });
      setGradeInputs(inputs);
    }
  }, [selectedStudent, selectedQuarter, professionalSubjects, grades]);

  const handleGradeChange = (subject: string, value: string) => {
    setGradeInputs(prev =>
      prev.map(input =>
        input.subject === subject ? { ...input, grade: value } : input
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
    if (!selectedClass || !selectedQuarter || !selectedStudent) {
      toast({
        title: 'Erro',
        description: 'Selecione turma, bimestre e aluno.',
        variant: 'destructive',
      });
      return;
    }

    const validGrades = gradeInputs.filter(input => {
      const gradeValue = parseFloat(input.grade);
      return !isNaN(gradeValue) && gradeValue >= 0 && gradeValue <= 10;
    });

    if (validGrades.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma nota válida (0-10).',
        variant: 'destructive',
      });
      return;
    }

    validGrades.forEach(input => {
      addGrade({
        studentId: selectedStudent,
        classId: selectedClass,
        subject: input.subject,
        quarter: selectedQuarter,
        grade: parseFloat(input.grade),
      });
    });

    const lowGrades = validGrades.filter(input => parseFloat(input.grade) < 6);
    
    if (lowGrades.length > 0) {
      toast({
        title: 'Notas Lançadas',
        description: `⚠️ ${lowGrades.length} nota(s) abaixo da média.`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `${validGrades.length} nota(s) lançada(s) com sucesso.`,
      });
    }
  };

  const renderSubjectArea = (area: SubjectArea) => (
    <div key={area.name} className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={area.color}>
          {area.name}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {area.subjects.map(subject => {
          const input = gradeInputs.find(i => i.subject === subject);
          const gradeValue = input ? parseFloat(input.grade) : NaN;
          const isLowGrade = !isNaN(gradeValue) && gradeValue < 6;

          return (
            <div key={subject} className="space-y-1">
              <Label className="text-xs">{subject}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="0-10"
                  value={input?.grade || ''}
                  onChange={(e) => handleGradeChange(subject, e.target.value)}
                  disabled={!selectedStudent}
                  className={isLowGrade ? 'border-severity-critical' : ''}
                />
                {isLowGrade && (
                  <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-severity-critical" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderProfessionalSubjects = () => {
    if (professionalSubjects.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
            Base Profissional
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {professionalSubjects.map(subject => {
            const input = gradeInputs.find(i => i.subject === subject);
            const gradeValue = input ? parseFloat(input.grade) : NaN;
            const isLowGrade = !isNaN(gradeValue) && gradeValue < 6;

            return (
              <div key={subject} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{subject}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleRemoveProfessionalSubject(subject)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="0-10"
                    value={input?.grade || ''}
                    onChange={(e) => handleGradeChange(subject, e.target.value)}
                    disabled={!selectedStudent}
                    className={isLowGrade ? 'border-severity-critical' : ''}
                  />
                  {isLowGrade && (
                    <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-severity-critical" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.active).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
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

            <div className="space-y-2">
              <Label>Aluno *</Label>
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedClass ? "Selecione o aluno" : "Selecione uma turma primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {classStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClass && selectedQuarter && selectedStudent && (
            <Alert className="mt-4">
              <AlertDescription>
                Lançando notas do <strong>{selectedQuarter}</strong> para{' '}
                <strong>{students.find(s => s.id === selectedStudent)?.name}</strong> da turma{' '}
                <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Grades Grid */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lançamento de Notas por Disciplina</CardTitle>
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
          <CardContent className="space-y-6">
            {SUBJECT_AREAS.map(area => (
              <div key={area.name}>
                {renderSubjectArea(area)}
                <Separator className="mt-6" />
              </div>
            ))}
            
            {renderProfessionalSubjects()}

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSaveAll}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Todas as Notas
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGradeInputs(prev => prev.map(input => ({ ...input, grade: '' })));
                }}
              >
                Limpar Formulário
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
