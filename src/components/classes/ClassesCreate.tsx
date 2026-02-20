import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useClasses, useProfessionalSubjects, useProfessionalSubjectTemplates, useAuthorizedEmails } from '@/hooks/useData';
import { calculateCurrentYearFromCalendar } from "@/lib/classYearCalculator";
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
  const { user } = useAuth();
  const { authorizedEmails } = useAuthorizedEmails();
  const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

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
        const series = calculateCurrentYearFromCalendar(formData.startCalendarYear);
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
    const normalized = normalizeEmail(directorEmail);
    return classes.filter(
      (c) => normalizeEmail(c.directorEmail) === normalized && !c.archived,
    ).length;
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

    // Validar email do diretor de turma (obrigatório para notificações)
    const normalizedDirectorEmail = normalizeEmail(formData.directorEmail);
    if (!normalizedDirectorEmail) {
      toast({
        title: 'Erro',
        description: 'O email do diretor de turma é obrigatório para receber notificações de acompanhamentos.',
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
        directorId:
          normalizedDirectorEmail === normalizeEmail(user?.email)
            ? user?.id
            : undefined,
        directorEmail: normalizedDirectorEmail || undefined,
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

  const directors = authorizedEmails?.filter(director => director.role === 'diretor') || [];
  return (
    <Card>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Configurar Nova Turma
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview do nome */}
          {generatedName && (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/40 border-l-4 border-l-primary/60">
              <div className="p-2 rounded-full bg-background border shadow-sm">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nome Gerado (Preview)</Label>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {generatedName}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Seção 1: Configuração Base */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Badge variant="outline" className="bg-info/10 text-info border-info/30 dark:bg-info/20 dark:text-info">
                  Passo 1
                </Badge>
                <h3 className="text-sm font-medium text-muted-foreground">Configuração Base</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                      <SelectItem value="none">Sem template (Personalizado)</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} - {t.course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Templates preenchem automaticamente o curso e grade curricular.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 2: Período e Cronograma */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b mt-2">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 dark:bg-warning/20 dark:text-warning">
                  Passo 2
                </Badge>
                <h3 className="text-sm font-medium text-muted-foreground">Período e Cronograma</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                </div>

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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startYearDate">Data de Início do 1º Ano</Label>
                  <Input
                    id="startYearDate"
                    type="date"
                    value={formData.startYearDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startYearDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Série Atual</Label>
                  <div className="flex items-center h-10 px-3 border rounded-md bg-muted/30 text-sm gap-2">
                    <Badge variant="secondary" className="bg-success/15 text-success dark:bg-success/20 dark:text-success">
                      {formData.currentSeries}º ano
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      (calculado automaticamente)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 3: Detalhes da Turma */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b mt-2">
                <Badge variant="outline" className="bg-info/10 text-info border-info/30 dark:bg-info/20 dark:text-info">
                  Passo 3
                </Badge>
                <h3 className="text-sm font-medium text-muted-foreground">Detalhes da Turma</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="letter">Letra da Turma *</Label>
                  <Input
                    id="letter"
                    placeholder="Ex: A, B, C"
                    value={formData.letter}
                    onChange={(e) => setFormData({ ...formData, letter: e.target.value.toUpperCase() })}
                    maxLength={1}
                    className="font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course">Curso *</Label>
                  <Input
                    id="course"
                    placeholder={hasTemplate ? "Preenchido automaticamente" : "Ex: Informática"}
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    disabled={hasTemplate}
                    className={hasTemplate ? "bg-muted text-muted-foreground" : ""}
                  />
                </div>

                {hasTemplate && templateSubjectsByYear.length > 0 && (
                  <div className="space-y-3 md:col-span-2 pt-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Preview da Grade Curricular do Template</Label>
                    <div className="grid gap-3 md:grid-cols-3">
                      {templateSubjectsByYear.map((yearData) => (
                        <div key={yearData.year} className="p-3 border rounded-md bg-muted/10 text-sm">
                          <p className="font-semibold mb-2 flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-xs">{yearData.year}º</span>
                            Ano
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {yearData.subjects.map((subject, index) => (
                              <Badge key={`${yearData.year}-${index}`} variant="outline" className="text-[10px] font-normal">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2 pt-2">
                  <Label htmlFor="directorEmail" className="flex items-center gap-1">
                    Diretor de Turma <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.directorEmail || 'none'}
                    onValueChange={(value) => {
                      const newEmail = value === 'none' ? '' : normalizeEmail(value);
                      setFormData({ ...formData, directorEmail: newEmail });

                      // Verificar warning imediatamente ao trocar
                      if (newEmail) {
                        const load = getDirectorLoad(newEmail);
                        if (load >= 5) {
                          toast({
                            title: "Atenção: Alta Carga",
                            description: `Este diretor já possui ${load} turmas.`,
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger id="directorEmail">
                      <SelectValue placeholder="Selecione um diretor de turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {directors.length === 0 ? (
                        <SelectItem value="none" disabled>Nenhum diretor cadastrado</SelectItem>
                      ) : (
                        directors.map((d) => (
                          <SelectItem key={d.email} value={d.email}>
                            {d.email} ({getDirectorLoad(d.email)} turmas)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {showOverloadWarning && (
                    <div className="flex items-center gap-2 p-3 mt-2 rounded-md bg-destructive/10 text-destructive border border-destructive/30 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p className="text-xs">
                        <strong>Atenção:</strong> Diretor com {selectedDirectorLoad} turmas. Considere redistribuir.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active" className="cursor-pointer">Turma Ativa</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button type="submit" size="lg" className="min-w-[200px] shadow-sm">
              Criar Turma
            </Button>
          </div>
        </form>
      </CardContent>
    </Card >
  );
};
