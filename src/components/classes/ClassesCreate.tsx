import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useClasses, useProfessionalSubjects, useProfessionalSubjectTemplates, useAuthorizedEmails } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Info, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useFormStore } from '@/stores/useFormStore';

interface ClassesCreateProps {
  onSuccess?: () => void;
}

export const ClassesCreate = ({ onSuccess }: ClassesCreateProps) => {
  const { classes, addClass } = useClasses();
  const { setProfessionalSubjectsForClass } = useProfessionalSubjects();
  const { templates } = useProfessionalSubjectTemplates();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { authorizedEmails } = useAuthorizedEmails();

  const currentCalendarYear = new Date().getFullYear();

  // ✅ Usando Zustand store para persistir formulário entre navegações
  const { classForm: formData, setClassForm, resetClassForm } = useFormStore();

  // Helper para atualizar campos do formulário
  const setFormData = (updates: Partial<typeof formData>) => setClassForm(updates);

  const [templateSubjects, setTemplateSubjects] = useState<string[]>([]);
  const [templateSubjectsByYear, setTemplateSubjectsByYear] = useState<
    { year: number; subjects: string[] }[]
  >([]);

  // Gerar nome da turma automaticamente
  const generatedName = useMemo(() => {
    const parts = [];
    if (formData.startCalendarYear && formData.endCalendarYear) {
      parts.push(`${formData.startCalendarYear}-${formData.endCalendarYear}`);
    }
    if (formData.course.trim()) {
      parts.push(formData.course.trim());
    }
    if (formData.letter.trim()) {
      parts.push(formData.letter.trim().toUpperCase());
    }
    return parts.join(' ');
  }, [formData.startCalendarYear, formData.endCalendarYear, formData.course, formData.letter]);

  // Calcular série atual com base nos anos
  useEffect(() => {
    if (formData.startCalendarYear && formData.endCalendarYear) {
      const duration = formData.endCalendarYear - formData.startCalendarYear + 1;
      const currentYear = new Date().getFullYear();

      if (currentYear < formData.startCalendarYear) {
        // Turma ainda não começou
        setFormData({ currentSeries: 1 });
      } else if (currentYear > formData.endCalendarYear) {
        // Turma já terminou
        setFormData({ currentSeries: 3 });
      } else {
        // Turma em andamento - calcular série atual
        const yearsElapsed = currentYear - formData.startCalendarYear + 1;
        const series = Math.min(yearsElapsed, 3) as 1 | 2 | 3;
        setFormData({ currentSeries: series });
      }
    }
  }, [formData.startCalendarYear, formData.endCalendarYear]);

  // Carregar disciplinas do template selecionado
  useEffect(() => {
    if (formData.templateId && formData.templateId !== 'none') {
      const template = templates.find((t) => t.id === formData.templateId);
      if (template) {
        // Preencher curso automaticamente
        setFormData({ course: template.course });

        setTemplateSubjectsByYear(template.subjectsByYear);

        // Carregar disciplinas da série atual
        const yearData = template.subjectsByYear.find(y => y.year === formData.currentSeries);
        setTemplateSubjects(yearData?.subjects || template.subjectsByYear[0]?.subjects || []);
      }
    } else {
      setTemplateSubjects([]);
      setTemplateSubjectsByYear([]);
      setFormData({ course: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.templateId, formData.currentSeries, templates]);

  const getDirectorLoad = (directorEmail: string) => {
    return classes.filter(c => c.directorEmail === directorEmail && !c.archived).length;
  };

  const selectedDirectorLoad = formData.directorEmail ? getDirectorLoad(formData.directorEmail) : 0;
  const showOverloadWarning = selectedDirectorLoad >= 5;
  const hasTemplate = !!formData.templateId && formData.templateId !== 'none';
  const normalizeName = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.letter) {
      toast({
        title: 'Erro',
        description: 'Informe a letra da turma.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.course.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o curso da turma.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.startCalendarYear || !formData.endCalendarYear) {
      toast({
        title: 'Erro',
        description: 'Informe o ano de início e fim da turma.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.endCalendarYear < formData.startCalendarYear) {
      toast({
        title: 'Erro',
        description: 'O ano de fim deve ser maior ou igual ao ano de início.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar duplicatas
    const normalizedName = normalizeName(generatedName);
    const duplicate = classes.find(
      (c) => !c.archived && normalizeName(c.name) === normalizedName,
    );
    if (duplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe uma turma ativa com este nome.',
        variant: 'destructive',
      });
      return;
    }

    // Aviso de sobrecarga de diretor
    if (showOverloadWarning) {
      const confirmed = window.confirm(
        '⚠️ Este diretor já possui 5 ou mais turmas. Deseja realmente atribuir mais uma?'
      );
      if (!confirmed) return;
    }

    // Criar turma
    try {
      const newClass = await addClass({
        name: generatedName,
        series: `${formData.currentSeries}º ano`,
        letter: formData.letter.toUpperCase(),
        course: formData.course.trim(),
        directorEmail: formData.directorEmail || undefined,
        active: formData.active,
        startYear: 1,
        currentYear: formData.currentSeries,
        startCalendarYear: formData.startCalendarYear,
        endCalendarYear: formData.endCalendarYear,
        startYearDate: formData.startYearDate || undefined,
        archived: false,
        templateId: formData.templateId || undefined,
      });

      if (newClass?.id && templateSubjects.length > 0) {
        await setProfessionalSubjectsForClass(newClass.id, templateSubjects);
      }

      toast({
        title: 'Sucesso',
        description: `Turma "${generatedName}" criada com sucesso.`,
      });

      // Reset form
      resetClassForm();
      setTemplateSubjects([]);

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a turma.',
        variant: 'destructive',
      });
    }
  };

  // Gerar opções de anos (últimos 5 anos até próximos 5 anos)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = currentCalendarYear - 5; i <= currentCalendarYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, [currentCalendarYear]);

  const directors = authorizedEmails?.filter(director => director.role === 'professor' || director.role === 'diretor') || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Criar Nova Turma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview do nome */}
          {generatedName && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Nome da turma</AlertTitle>
              <AlertDescription className="font-medium text-lg">
                {generatedName}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Template */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="templateId">Template de Disciplinas</Label>
              <Select
                value={formData.templateId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, templateId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger id="templateId">
                  <SelectValue placeholder="Selecione um template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} - {t.course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ano de Início */}
            <div className="space-y-2">
              <Label htmlFor="startCalendarYear">Ano de Início *</Label>
              <Select
                value={formData.startCalendarYear?.toString() || ''}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    startCalendarYear: parseInt(value),
                    endCalendarYear: parseInt(value) + 2,
                    startYearDate: formData.startYearDate || `${parseInt(value)}-02-01`,
                  })
                }
              >
                <SelectTrigger id="startCalendarYear">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Ano em que a turma iniciou o 1º ano.
              </p>
            </div>

            {/* Ano de Fim */}
            <div className="space-y-2">
              <Label htmlFor="endCalendarYear">Ano de Término *</Label>
              <Select
                value={formData.endCalendarYear?.toString() || ''}
                onValueChange={(value) => {
                  const nextEnd = parseInt(value);
                  if (formData.startCalendarYear && nextEnd < formData.startCalendarYear) {
                    setFormData({ endCalendarYear: formData.startCalendarYear + 2 });
                  } else {
                    setFormData({ endCalendarYear: nextEnd });
                  }
                }}
              >
                <SelectTrigger id="endCalendarYear">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Ano em que a turma termina o 3º ano.
              </p>
            </div>

            {/* Data de Início do 1º Ano */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="startYearDate">Data de Início do 1º Ano</Label>
              <Input
                id="startYearDate"
                type="date"
                value={formData.startYearDate}
                onChange={(e) =>
                  setFormData({ ...formData, startYearDate: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">
                Usada para organizar bimestres e relatórios por ano letivo.
              </p>
            </div>

            {/* Série Atual (calculada automaticamente) */}
            <div className="space-y-2">
              <Label>Série Atual</Label>
              <div className="flex items-center gap-2 h-10">
                <Badge variant="secondary" className="text-base">
                  {formData.currentSeries}º ano
                </Badge>
                <span className="text-sm text-muted-foreground">
                  (calculado automaticamente)
                </span>
              </div>
            </div>

            {/* Letra */}
            <div className="space-y-2">
              <Label htmlFor="letter">Letra da Turma *</Label>
              <Input
                id="letter"
                placeholder="Ex: A, B, C"
                value={formData.letter}
                onChange={(e) => setFormData({ ...formData, letter: e.target.value.toUpperCase() })}
                maxLength={1}
              />
            </div>

            {/* Curso */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course">Curso *</Label>
              <Input
                id="course"
                placeholder={hasTemplate ? "Preenchido automaticamente pelo template" : "Ex: Informática, Redes de Computadores"}
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                disabled={hasTemplate}
              />
              {hasTemplate && (
                <p className="text-sm text-muted-foreground">
                  O curso é definido pelo template selecionado.
                </p>
              )}
            </div>

            {/* Disciplinas do Template */}
            {hasTemplate && templateSubjectsByYear.length > 0 && (
              <div className="space-y-3 md:col-span-2">
                <Label>Disciplinas Profissionais por Ano</Label>
                {templateSubjectsByYear.map((yearData) => (
                  <div key={yearData.year} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {yearData.year}º Ano
                    </p>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                      {yearData.subjects.map((subject, index) => (
                        <Badge key={`${yearData.year}-${index}`} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Diretor de Turma */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="directorEmail">Diretor de Turma</Label>
              <Select
                value={formData.directorEmail || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, directorEmail: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger id="directorEmail">
                  <SelectValue placeholder="Selecione um diretor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem diretor atribuído</SelectItem>
                  {directors.map((d) => (
                    <SelectItem key={d.email} value={d.email}>
                      {d.email} ({getDirectorLoad(d.email)} turmas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showOverloadWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este diretor já possui {selectedDirectorLoad} turmas. Considere distribuir melhor a carga.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Turma Ativa */}
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Turma Ativa</Label>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Criar Turma
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
