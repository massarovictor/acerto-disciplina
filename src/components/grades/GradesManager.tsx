import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useClasses, useStudents, useGradesScoped, useProfessionalSubjects, useProfessionalSubjectTemplates } from '@/hooks/useData';
import { AlertTriangle, Save, CheckCircle2, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  SUBJECT_AREAS,
  FUNDAMENTAL_SUBJECT_AREAS,
  QUARTERS
} from '@/lib/subjects';
import { SigeImportDialog } from './SigeImportDialog';
import { useUIStore } from '@/stores/useUIStore';
import { calculateCurrentYearFromCalendar } from '@/lib/classYearCalculator';

// Normaliza nome de disciplina para comparação (case-insensitive, sem acentos)
const normalizeForMatch = (subject: string): string => {
  return subject
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

interface StudentGrades {
  studentId: string;
  grades: Record<string, string>; // subject -> grade
}

export const GradesManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { toast } = useToast();
  const { templates } = useProfessionalSubjectTemplates();
  const {
    getProfessionalSubjects
  } = useProfessionalSubjects();

  // ✅ Usando Zustand store para persistir seleções entre navegações
  const { gradesUI, setGradesUI } = useUIStore();
  const selectedClass = gradesUI.selectedClassId;
  const selectedQuarter = gradesUI.selectedQuarter;
  const selectedSchoolYear = gradesUI.selectedSchoolYear as 1 | 2 | 3;

  const { grades, addGrade } = useGradesScoped({
    classId: selectedClass || undefined,
    quarter: selectedQuarter || undefined,
    schoolYear: selectedSchoolYear,
  });

  const setSelectedClass = (value: string) => setGradesUI({ selectedClassId: value });
  const setSelectedQuarter = (value: string) => setGradesUI({ selectedQuarter: value });
  const setSelectedSchoolYear = (value: 1 | 2 | 3) => setGradesUI({ selectedSchoolYear: value });

  const [studentGrades, setStudentGrades] = useState<StudentGrades[]>([]);
  const [showSigeImport, setShowSigeImport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [lastInitialized, setLastInitialized] = useState<{ class: string; quarter: string; year: number; gradesKey: string } | null>(null);

  const classStudents = useMemo(() =>
    students
      .filter(s => s.classId === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [students, selectedClass]
  );
  const selectedClassData = classes.find(c => c.id === selectedClass);

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSchoolYear(1);
      return;
    }
    // Calcular dinamicamente o ano atual da turma baseado no ano calendário de início
    const classInfo = classes.find(c => c.id === selectedClass);
    if (!classInfo) {
      setSelectedSchoolYear(1);
      return;
    }

    // Usar startCalendarYear para cálculo simples: anoAtual - anoInício + 1
    if (classInfo.startCalendarYear) {
      const calculatedYear = calculateCurrentYearFromCalendar(classInfo.startCalendarYear);
      setSelectedSchoolYear(calculatedYear);
    } else {
      // Fallback para currentYear armazenado
      const defaultYear = classInfo.currentYear ?? 1;
      const normalizedYear = [1, 2, 3].includes(defaultYear as number) ? (defaultYear as 1 | 2 | 3) : 1;
      setSelectedSchoolYear(normalizedYear);
    }
  }, [selectedClass, classes]);

  // Verificar se a turma está arquivada
  const isClassArchived = selectedClassData?.archived === true;
  const isClassInactive = selectedClassData?.active === false;
  const isClassLocked = isClassArchived || isClassInactive;

  // Obter disciplinas profissionais da turma (template por ano + lista manual)
  // IMPORTANTE: Usamos disciplinas do ano selecionado para exibição
  const templateSubjectsForYear = useMemo(() => {
    if (!selectedClassData?.templateId) return [];
    const template = templates.find((t) => t.id === selectedClassData.templateId);
    if (!template) return [];
    const yearData = template.subjectsByYear.find((y) => y.year === selectedSchoolYear);
    return yearData?.subjects ?? [];
  }, [templates, selectedClassData?.templateId, selectedSchoolYear]);

  // NOVA: Todas as disciplinas do template (todos os anos) - usado para buscar QUALQUER nota existente
  const allTemplateSubjects = useMemo(() => {
    if (!selectedClassData?.templateId) return [];
    const template = templates.find((t) => t.id === selectedClassData.templateId);
    if (!template) return [];

    const allSubjects = new Set<string>();
    for (const yearData of template.subjectsByYear) {
      for (const subject of yearData.subjects) {
        allSubjects.add(subject);
      }
    }
    return Array.from(allSubjects);
  }, [templates, selectedClassData?.templateId]);

  const manualSubjects = useMemo(
    () => (selectedClass ? getProfessionalSubjects(selectedClass) : []),
    [selectedClass, getProfessionalSubjects],
  );

  // Disciplinas profissionais visíveis: do ano selecionado
  // IMPORTANTE: Se turma tem template, usa APENAS disciplinas do template por ano
  // Se turma NÃO tem template, usa disciplinas manuais
  const professionalSubjects = useMemo(() => {
    const unique = new Set<string>();

    // Se a turma tem template, usar apenas disciplinas do ano selecionado do template
    // Isso ignora manualSubjects que foi criado erroneamente ao criar turma
    const subjectsToUse = selectedClassData?.templateId
      ? templateSubjectsForYear  // Apenas do template por ano
      : manualSubjects;          // Fallback para manuais se não tem template

    subjectsToUse.forEach((subject) => {
      if (subject?.trim()) {
        unique.add(subject.trim());
      }
    });
    return Array.from(unique);
  }, [templateSubjectsForYear, manualSubjects, selectedClassData?.templateId]);

  // TODAS as disciplinas profissionais (para buscar notas de cualquier año)
  const allProfessionalSubjects = useMemo(() => {
    const unique = new Set<string>();
    [...allTemplateSubjects, ...manualSubjects].forEach((subject) => {
      if (subject?.trim()) {
        unique.add(subject.trim());
      }
    });
    return Array.from(unique);
  }, [allTemplateSubjects, manualSubjects]);

  // Usar uma string para rastrear mudanças nas disciplinas profissionais
  const professionalSubjectsStr = `${selectedSchoolYear}:${allProfessionalSubjects.join(',')}`;

  // Determinar se é Ensino Fundamental
  const isFundamental = useMemo(() => {
    if (!selectedClassData) return false;
    const series = selectedClassData.series || '';
    return ['6', '7', '8', '9'].some(s => series.includes(s));
  }, [selectedClassData]);

  // Escolher as áreas de disciplinas comuns baseadas no nível
  const baseAreas = isFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS;

  // Calcular allSubjects - disciplinas base + profissionais do ANO SELECIONADO
  const allSubjects = [
    ...baseAreas.flatMap(area => area.subjects),
    ...professionalSubjects,  // Agora usa apenas disciplinas do ano selecionado
  ];

  const gradesKey = useMemo(() => {
    if (!selectedClass || !selectedQuarter) return '';
    let count = 0;
    let latestRecordedAt = '';
    for (const grade of grades) {
      if (
        grade.classId === selectedClass &&
        grade.quarter === selectedQuarter &&
        (grade.schoolYear ?? 1) === selectedSchoolYear
      ) {
        count++;
        const recordedAt = grade.recordedAt ?? '';
        if (recordedAt > latestRecordedAt) {
          latestRecordedAt = recordedAt;
        }
      }
    }
    return `${count}:${latestRecordedAt}`;
  }, [grades, selectedClass, selectedQuarter, selectedSchoolYear]);

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
      lastInitialized.quarter !== selectedQuarter ||
      lastInitialized.year !== selectedSchoolYear ||
      lastInitialized.gradesKey !== gradesKey;

    if (needsReinit) {
      const subjectsToUse = isFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS;
      const currentAllSubjects = [
        ...subjectsToUse.flatMap(area => area.subjects),
        ...allProfessionalSubjects,
      ];



      const initialGrades = classStudents.map(student => {
        const studentGradeData: Record<string, string> = {};

        currentAllSubjects.forEach(subject => {
          // Buscar nota usando comparação normalizada (case-insensitive)
          const normalizedSubject = normalizeForMatch(subject);
          const existingGrade = grades.find(
            g => g.studentId === student.id &&
              normalizeForMatch(g.subject) === normalizedSubject &&
              g.quarter === selectedQuarter &&
              (g.schoolYear ?? 1) === selectedSchoolYear
          );
          studentGradeData[subject] = existingGrade ? String(existingGrade.grade) : '';
        });

        return {
          studentId: student.id,
          grades: studentGradeData,
        };
      });

      setStudentGrades(initialGrades);
      setLastInitialized({
        class: selectedClass,
        quarter: selectedQuarter,
        year: selectedSchoolYear,
        gradesKey,
      });
    } else {
      // Se apenas adicionou novas disciplinas profissionais, adicionar campos vazios sem resetar
      const subjectsToUse = isFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS;
      const currentAllSubjects = [
        ...subjectsToUse.flatMap(area => area.subjects),
        ...allProfessionalSubjects,
      ];

      setStudentGrades(prev => {
        return prev.map(sg => {
          const updatedGrades = { ...sg.grades };
          currentAllSubjects.forEach(subject => {
            if (!(subject in updatedGrades)) {
              // Buscar nota usando comparação normalizada (case-insensitive)
              const normalizedSubject = normalizeForMatch(subject);
              const existingGrade = grades.find(
                g => g.studentId === sg.studentId &&
                  normalizeForMatch(g.subject) === normalizedSubject &&
                  g.quarter === selectedQuarter &&
                  (g.schoolYear ?? 1) === selectedSchoolYear
              );
              updatedGrades[subject] = existingGrade ? String(existingGrade.grade) : '';
            }
          });
          return { ...sg, grades: updatedGrades };
        });
      });
    }
  }, [selectedClass, selectedQuarter, selectedSchoolYear, professionalSubjectsStr, classStudents.length, grades]);

  const handleGradeChange = (studentId: string, subject: string, value: string) => {
    setStudentGrades(prev =>
      prev.map(sg =>
        sg.studentId === studentId
          ? { ...sg, grades: { ...sg.grades, [subject]: value } }
          : sg
      )
    );
  };

  const handleSaveStudentGrades = async () => {
    if (!selectedStudent || !selectedClass || !selectedQuarter) return;
    if (isClassLocked) {
      toast({
        title: 'Turma bloqueada',
        description: isClassArchived
          ? 'Esta turma está arquivada e não aceita lançamento de notas.'
          : 'Esta turma está inativa e não aceita lançamento de notas.',
        variant: 'destructive',
      });
      return;
    }

    const studentGrade = studentGrades.find(sg => sg.studentId === selectedStudent);
    if (!studentGrade) return;

    let savedCount = 0;
    let lowGradesCount = 0;
    const savedByArea: Record<string, number> = {};

    const gradePromises: Promise<void>[] = [];
    Object.entries(studentGrade.grades).forEach(([subject, gradeValue]) => {
      const grade = parseFloat(gradeValue);
      if (!isNaN(grade) && grade >= 0 && grade <= 10) {
        gradePromises.push(
          addGrade({
            studentId: selectedStudent,
            classId: selectedClass,
            subject: subject,
            quarter: selectedQuarter,
            schoolYear: selectedSchoolYear,
            grade: grade,
          }),
        );
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

    try {
      await Promise.all(gradePromises);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as notas.',
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

  // Calcular progresso da base profissional (usa disciplinas do ANO SELECIONADO)
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

  // Opções de ano (simplificado)
  const schoolYearOptions: Array<{ value: 1 | 2 | 3; label: string }> = [
    { value: 1, label: '1º ano' },
    { value: 2, label: '2º ano' },
    { value: 3, label: '3º ano' },
  ];

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
                  {classes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma turma cadastrada
                    </div>
                  ) : (
                    classes
                      .filter(cls => cls.active && !cls.archived)
                      .map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano da turma *</Label>
              <Select
                value={String(selectedSchoolYear)}
                onValueChange={(value) => setSelectedSchoolYear(Number(value) as 1 | 2 | 3)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYearOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
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
          </div>

          {isClassLocked && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isClassArchived
                  ? 'Esta turma está arquivada. Não é possível lançar notas para turmas arquivadas.'
                  : 'Esta turma está inativa. Não é possível lançar notas para turmas inativas.'}
              </AlertDescription>
            </Alert>
          )}

          {selectedClass && selectedQuarter && !isClassLocked && (
            <Alert className="mt-4">
              <AlertDescription>
                Lançando notas do <strong>{selectedQuarter}</strong> para o <strong>{selectedSchoolYear}º ano</strong>{' '}
                da turma <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>{' '}
                ({classStudents.length} alunos)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Add Professional Subject Button and SIGE Import */}
      {selectedClass && classStudents.length > 0 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setShowSigeImport(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Importar Notas do SIGE
          </Button>
        </div>
      )}

      {/* Students List */}
      {selectedClass && classStudents.length > 0 && !isClassLocked && (
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

                {/* Professional Subjects - mostra apenas disciplinas do ano selecionado */}
                {professionalSubjects.length > 0 && (() => {
                  const professionalProgress = getProfessionalProgress(selectedStudent);
                  return (
                    <AccordionItem value="professional" className="border rounded-lg px-4 mb-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                              Base Profissional - {selectedSchoolYear}º ano
                              {selectedClassData?.course && ` (${selectedClassData.course})`}
                              <span className="ml-1 font-normal opacity-75">
                                • {professionalSubjects.length} disciplinas
                              </span>
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
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-sm">{subject}</Label>
                                    {hasGrade && (
                                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
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

      {selectedClass && classStudents.length === 0 && !isClassLocked && (
        <Alert>
          <AlertDescription>
            Nenhum aluno cadastrado nesta turma. Cadastre alunos para lançar notas.
          </AlertDescription>
        </Alert>
      )}

      {/* SIGE Import Dialog */}
      {showSigeImport && (
        <SigeImportDialog
          open={showSigeImport}
          onOpenChange={setShowSigeImport}
          defaultClassId={selectedClass}
          defaultQuarter={selectedQuarter}
          defaultSchoolYear={selectedSchoolYear}
        />
      )}
    </div>
  );
};
