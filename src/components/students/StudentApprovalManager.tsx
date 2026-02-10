import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClasses, useStudents, useGradesScoped, useProfessionalSubjects, useProfessionalSubjectTemplates } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Clock, Users, BookOpen } from 'lucide-react';
import { calculateClassAcademicStatus, QuarterCheckResult } from '@/lib/approvalCalculator';
import { getAcademicYear, calculateCurrentYearFromCalendar } from '@/lib/classYearCalculator';
import { generateQuarterIncidents, checkLowPerformanceStudents } from '@/lib/autoIncidentGenerator';
import { useIncidents } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QUARTERS, SUBJECT_AREAS } from '@/lib/subjects';

export const StudentApprovalManager = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { getProfessionalSubjects } = useProfessionalSubjects();
  const { templates } = useProfessionalSubjectTemplates();
  const { incidents, addIncident } = useIncidents();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('quarter');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);
  const [academicStatuses, setAcademicStatuses] = useState<Record<string, any>>({});
  const [quarterResults, setQuarterResults] = useState<(QuarterCheckResult & { studentName: string })[]>([]);
  const [pendingQuarterResults, setPendingQuarterResults] = useState<
    { studentId: string; studentName: string; missingSubjects: string[] }[]
  >([]);
  const { grades } = useGradesScoped({
    classId: selectedClass || undefined,
    schoolYear: selectedSchoolYear,
  });
  const currentCalendarYear = new Date().getFullYear();

  const classStudents = students
    .filter((s) => s.classId === selectedClass)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const selectedClassData = classes.find((c) => c.id === selectedClass);
  const canGenerateConvocations =
    profile?.role === 'admin' || profile?.role === 'diretor';
  const selectedCalendarYear = useMemo(() => {
    if (!selectedClassData) return null;

    if (selectedClassData.startCalendarYear) {
      return selectedClassData.startCalendarYear + (selectedSchoolYear - 1);
    }

    if (selectedClassData.startYearDate) {
      const computed = Number(
        getAcademicYear(selectedClassData.startYearDate, selectedSchoolYear),
      );
      return Number.isFinite(computed) ? computed : null;
    }

    return null;
  }, [selectedClassData, selectedSchoolYear]);
  const isPastCalendarYearSelection =
    selectedCalendarYear !== null && selectedCalendarYear < currentCalendarYear;
  const handleSelectClass = (value: string) => {
    setSelectedClass(value);
    const nextClass = classes.find((cls) => cls.id === value);

    // Usar startCalendarYear para cálculo simples: anoAtual - anoInício + 1
    if (nextClass?.startCalendarYear) {
      const calculatedYear = calculateCurrentYearFromCalendar(nextClass.startCalendarYear);
      setSelectedSchoolYear(calculatedYear);
    } else {
      // Fallback para currentYear armazenado
      const defaultYear = nextClass?.currentYear ?? 1;
      const nextYear = [1, 2, 3].includes(defaultYear as number)
        ? (defaultYear as 1 | 2 | 3)
        : 1;
      setSelectedSchoolYear(nextYear);
    }
    setQuarterResults([]);
    setPendingQuarterResults([]);
    setAcademicStatuses({});
  };

  const templateSubjects = useMemo(() => {
    if (!selectedClassData?.templateId) return [];
    const template = templates.find((t) => t.id === selectedClassData.templateId);
    const yearData = template?.subjectsByYear.find((y) => y.year === selectedSchoolYear);
    return yearData?.subjects ?? [];
  }, [templates, selectedClassData?.templateId, selectedSchoolYear]);

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

  const expectedSubjects = useMemo(
    () =>
      Array.from(
        new Set([
          ...SUBJECT_AREAS.flatMap((area) => area.subjects),
          ...professionalSubjects,
        ]),
      ),
    [professionalSubjects],
  );

  // === HANDLERS POR BIMESTRE ===
  const handleCheckQuarter = () => {
    if (!selectedClass || !selectedClassData) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma primeiro.',
        variant: 'destructive',
      });
      return;
    }

    const results = checkLowPerformanceStudents(
      grades,
      classStudents,
      selectedClass,
      selectedQuarter,
      selectedSchoolYear
    );

    setQuarterResults(results);
    const pendingResults = classStudents
      .map((student) => {
        const subjectsWithGrades = new Set(
          grades
            .filter(
              (grade) =>
                grade.studentId === student.id &&
                grade.classId === selectedClass &&
                grade.quarter === selectedQuarter &&
                (grade.schoolYear ?? 1) === selectedSchoolYear
            )
            .map((grade) => grade.subject)
        );

        const missingSubjects = expectedSubjects.filter(
          (subject) => !subjectsWithGrades.has(subject)
        );

        return {
          studentId: student.id,
          studentName: student.name,
          missingSubjects,
        };
      })
      .filter((result) => result.missingSubjects.length > 0);

    setPendingQuarterResults(pendingResults);

    if (results.length === 0) {
      toast({
        title: 'Nenhum aluno com baixo rendimento',
        description: `Nenhum aluno da turma tem 3+ disciplinas abaixo de 6 no ${selectedQuarter}.`,
      });
    } else {
      toast({
        title: 'Verificação concluída',
        description: `${results.length} aluno(s) com baixo rendimento no ${selectedQuarter}.`,
      });
    }
  };

  const handleGenerateQuarterIncidents = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      return;
    }
    if (!canGenerateConvocations) {
      toast({
        title: 'Acesso negado',
        description: 'Somente admin e diretor podem gerar convocações.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedClassData) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma primeiro.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedCalendarYear === null) {
      toast({
        title: 'Ano calendário indisponível',
        description:
          'Não foi possível identificar o ano calendário da seleção. Configure o ano de início da turma.',
        variant: 'destructive',
      });
      return;
    }
    if (isPastCalendarYearSelection) {
      toast({
        title: 'Geração bloqueada',
        description: `Não é permitido gerar convocações para ano calendário passado (${selectedCalendarYear}).`,
        variant: 'destructive',
      });
      return;
    }

    const newIncidents = generateQuarterIncidents(
      grades,
      classStudents,
      selectedClassData,
      selectedQuarter,
      incidents,
      user.id,
      selectedSchoolYear
    );

    if (newIncidents.length === 0) {
      toast({
        title: 'Nenhuma ocorrência gerada',
        description: 'Todos os alunos já possuem convocação gerada para este bimestre.',
      });
      return;
    }

    try {
      await Promise.all(newIncidents.map((incident) => addIncident(incident)));
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar as convocações.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Convocações geradas',
      description: `${newIncidents.length} convocação(ões) de pais gerada(s) para o ${selectedQuarter}.`,
    });
  };

  // === HANDLERS FINAL DO ANO ===
  const handleCalculateStatuses = () => {
    if (!selectedClass || !selectedClassData) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma primeiro.',
        variant: 'destructive',
      });
      return;
    }

    const startYearDate =
      selectedClassData.startYearDate ||
      (selectedClassData.startCalendarYear ? `${selectedClassData.startCalendarYear}-02-01` : undefined);

    if (!startYearDate || !selectedClassData.currentYear) {
      toast({
        title: 'Erro',
        description: 'Esta turma não possui dados de ano letivo configurados.',
        variant: 'destructive',
      });
      return;
    }

    const academicYear = getAcademicYear(
      startYearDate,
      selectedSchoolYear
    );

    const studentIds = classStudents.map((s) => s.id);
    const statuses = calculateClassAcademicStatus(
      grades,
      studentIds,
      selectedClass,
      academicYear,
      selectedSchoolYear
    );

    const statusesMap: Record<string, any> = {};
    statuses.forEach((status) => {
      statusesMap[status.studentId] = status;
    });

    setAcademicStatuses(statusesMap);

    toast({
      title: 'Status calculado',
      description: `Status acadêmico calculado para ${statuses.length} aluno(s).`,
    });
  };

  const getStatusBadge = (status: 'approved' | 'recovery' | 'failed', isPending?: boolean) => {
    if (isPending) {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 border-gray-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    }

    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'recovery':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Recuperação
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Reprovado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Acompanhamento Acadêmico
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Seletor de Turma */}
          <div className="p-4 bg-muted/10 border rounded-lg space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-[300px]">
                <Select value={selectedClass} onValueChange={handleSelectClass}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter((c) => !c.archived && c.active)
                      .map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[200px]">
                <Select
                  value={selectedSchoolYear.toString()}
                  onValueChange={(value) => {
                    setSelectedSchoolYear(Number(value) as 1 | 2 | 3);
                    setQuarterResults([]);
                    setPendingQuarterResults([]);
                    setAcademicStatuses({});
                  }}
                  disabled={!selectedClass}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Ano da turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º Ano</SelectItem>
                    <SelectItem value="2">2º Ano</SelectItem>
                    <SelectItem value="3">3º Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {selectedClassData && (
            <Alert>
              <AlertDescription>
                <strong>Turma:</strong> {selectedClassData.name} |{' '}
                <strong>Ano Atual:</strong> {selectedClassData.currentYear || 'Não definido'} |{' '}
                <strong>Alunos:</strong> {classStudents.length} |{' '}
                <strong>Ano selecionado:</strong> {selectedSchoolYear}º |{' '}
                <strong>Ano calendário:</strong> {selectedCalendarYear ?? 'Não definido'}
              </AlertDescription>
            </Alert>
          )}

          {/* Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
              <TabsTrigger value="quarter" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Por Bimestre
              </TabsTrigger>
              <TabsTrigger value="final" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Users className="h-4 w-4 mr-2" />
                Final do Ano
              </TabsTrigger>
            </TabsList>

            {/* === ABA: POR BIMESTRE === */}
            <TabsContent value="quarter" className="space-y-4 mt-4">
              <div className="flex gap-4 items-center">
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o bimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedClass && (
                  <>
                    <Button onClick={handleCheckQuarter}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Verificar Bimestre
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateQuarterIncidents}
                      disabled={
                        quarterResults.length === 0 ||
                        isPastCalendarYearSelection ||
                        !canGenerateConvocations
                      }
                    >
                      Gerar Convocações
                    </Button>
                  </>
                )}
              </div>

              {isPastCalendarYearSelection && (
                <Alert variant="destructive">
                  <AlertDescription>
                    A geração de convocações está bloqueada para ano calendário passado ({selectedCalendarYear}).
                    Selecione um ano calendário de {currentCalendarYear} em diante.
                  </AlertDescription>
                </Alert>
              )}

              {quarterResults.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Alunos com Baixo Rendimento ({selectedQuarter})
                      </CardTitle>
                      <Badge variant="destructive">{quarterResults.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Aluno</TableHead>
                          <TableHead>Disciplinas Abaixo de 6</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quarterResults.map((result) => (
                          <TableRow key={result.studentId} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-medium pl-4">{result.studentName}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {result.subjectsBelowAverage.length} disciplina(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {result.subjectsBelowAverage.map((subject) => (
                                  <Badge
                                    key={subject}
                                    variant="outline"
                                    className="bg-red-500/10 text-red-700 border-red-500/30 text-xs"
                                  >
                                    {subject}: {result.subjectGrades[subject]?.toFixed(1)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {pendingQuarterResults.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        Pendências de Notas ({selectedQuarter})
                      </CardTitle>
                      <Badge variant="outline">{pendingQuarterResults.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Aluno</TableHead>
                          <TableHead>Disciplinas Pendentes</TableHead>
                          <TableHead>Lista</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingQuarterResults.map((result) => (
                          <TableRow key={result.studentId} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-medium pl-4">
                              {result.studentName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {result.missingSubjects.length} disciplina(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {result.missingSubjects.map((subject) => (
                                  <Badge
                                    key={subject}
                                    variant="outline"
                                    className="bg-gray-500/10 text-gray-700 border-gray-500/30 text-xs"
                                  >
                                    {subject}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* === ABA: FINAL DO ANO === */}
            <TabsContent value="final" className="space-y-4 mt-4">
              {selectedClass && (
                <Button onClick={handleCalculateStatuses}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Calcular Status Final
                </Button>
              )}

              {Object.keys(academicStatuses).length > 0 && (
                <Card>
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Status Final dos Alunos
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Aluno</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Disciplinas Abaixo da Média</TableHead>
                          <TableHead>Notas Pendentes</TableHead>
                          <TableHead>Média Geral</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map((student) => {
                          const status = academicStatuses[student.id];
                          if (!status) return null;

                          const averageGrades = Object.values(status.finalGrades) as number[];
                          const overallAverage =
                            averageGrades.length > 0
                              ? averageGrades.reduce((a, b) => a + b, 0) / averageGrades.length
                              : 0;

                          return (
                            <TableRow key={student.id} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="font-medium pl-4">{student.name}</TableCell>
                              <TableCell>{getStatusBadge(status.status, status.isPending)}</TableCell>
                              <TableCell>
                                {status.subjectsBelowAverage.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {status.subjectsBelowAverage.map((subject: string) => (
                                      <Badge
                                        key={subject}
                                        variant="outline"
                                        className="bg-red-500/10 text-red-700 border-red-500/30"
                                      >
                                        {subject}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Nenhuma</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {status.pendingSubjects ? (
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(status.pendingSubjects).map(([subject, quarters]) => (
                                      <Badge
                                        key={subject}
                                        variant="outline"
                                        className="bg-gray-500/10 text-gray-700 border-gray-500/30 text-xs"
                                      >
                                        {subject}: {(quarters as string[]).join(', ')}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Completo</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <strong>{overallAverage.toFixed(1)}</strong>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
