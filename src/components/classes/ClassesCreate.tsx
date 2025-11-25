import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useClasses, useProfessionalSubjects, useProfessionalSubjectTemplates } from '@/hooks/useLocalStorage';
import { MOCK_USERS } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ClassesCreateProps {
  onSuccess?: () => void;
}

export const ClassesCreate = ({ onSuccess }: ClassesCreateProps) => {
  const { classes, addClass } = useClasses();
  const { setProfessionalSubjectsForClass } = useProfessionalSubjects();
  const { templates, getTemplate } = useProfessionalSubjectTemplates();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    templateId: '',
    series: '',
    letter: '',
    course: '',
    startYear: undefined as 1 | 2 | 3 | undefined,
    startYearDate: '',
    directorId: '',
    active: true,
  });

  const [templateSubjects, setTemplateSubjects] = useState<string[]>([]);

  const directors = MOCK_USERS.filter(u => u.role === 'diretor');
  
  // Carregar disciplinas do template selecionado
  useEffect(() => {
    if (formData.templateId && formData.templateId !== 'none') {
      const template = getTemplate(formData.templateId);
      if (template) {
        // Preencher curso automaticamente
        setFormData(prev => ({
          ...prev,
          course: template.course,
        }));

        // Se não há startYear selecionado, usar o primeiro ano disponível do template
        if (!formData.startYear) {
          const firstYear = template.subjectsByYear[0]?.year;
          if (firstYear) {
            setFormData(prev => ({ ...prev, startYear: firstYear }));
            setTemplateSubjects(template.subjectsByYear[0].subjects);
          }
        } else {
          // Carregar disciplinas do ano selecionado
          const yearData = template.subjectsByYear.find(y => y.year === formData.startYear);
          if (yearData) {
            setTemplateSubjects(yearData.subjects);
          } else {
            // Se o ano selecionado não existe no template, usar o primeiro disponível
            const firstYear = template.subjectsByYear[0]?.year;
            if (firstYear) {
              setFormData(prev => ({ ...prev, startYear: firstYear }));
              setTemplateSubjects(template.subjectsByYear[0].subjects);
            } else {
              setTemplateSubjects([]);
            }
          }
        }
      }
    } else {
      // Limpar quando não há template
      setTemplateSubjects([]);
      setFormData(prev => ({
        ...prev,
        course: '',
        startYear: undefined,
        startYearDate: '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.templateId, getTemplate]);

  // Atualizar disciplinas quando startYear muda (mas só se já tiver template)
  useEffect(() => {
    if (formData.templateId && formData.templateId !== 'none' && formData.startYear) {
      const template = getTemplate(formData.templateId);
      if (template) {
        const yearData = template.subjectsByYear.find(y => y.year === formData.startYear);
        if (yearData) {
          setTemplateSubjects(yearData.subjects);
        } else {
          setTemplateSubjects([]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startYear]);

  const getDirectorLoad = (directorId: string) => {
    return classes.filter(c => c.directorId === directorId && !c.archived).length;
  };

  const selectedDirectorLoad = formData.directorId ? getDirectorLoad(formData.directorId) : 0;
  const showOverloadWarning = selectedDirectorLoad >= 5;
  const hasCourse = !!formData.course.trim();
  const hasTemplate = !!formData.templateId && formData.templateId !== 'none';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.series || !formData.letter) {
      toast({
        title: 'Erro',
        description: 'Preencha série e letra (campos obrigatórios).',
        variant: 'destructive',
      });
      return;
    }

    // Se tem curso técnico, template é obrigatório
    if (hasCourse && !hasTemplate) {
      toast({
        title: 'Erro',
        description: 'Para turmas com curso técnico, você deve selecionar um template de disciplinas.',
        variant: 'destructive',
      });
      return;
    }

    // Se tem template/curso, ano de início é obrigatório
    if (hasTemplate && !formData.startYear) {
      toast({
        title: 'Erro',
        description: 'Selecione o ano de início da turma.',
        variant: 'destructive',
      });
      return;
    }

    // Validar que o template tem disciplinas para o ano selecionado
    if (hasTemplate && formData.startYear) {
      const template = getTemplate(formData.templateId);
      if (template) {
        const yearData = template.subjectsByYear.find(y => y.year === formData.startYear);
        if (!yearData || yearData.subjects.length === 0) {
          toast({
            title: 'Erro',
            description: `O template selecionado não possui disciplinas para o ${formData.startYear}º ano.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Se tem ano de início, data de início é obrigatória
    if (formData.startYear && !formData.startYearDate) {
      toast({
        title: 'Erro',
        description: 'Informe a data de início do 1º ano letivo.',
        variant: 'destructive',
      });
      return;
    }

    // Gerar nome
    const name = formData.course.trim()
      ? `${formData.series} ${formData.letter} - ${formData.course.trim()}`
      : `${formData.series} ${formData.letter}`;

    // Verificar duplicatas
    const duplicate = classes.find(c => c.name === name && !c.archived);
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
    const newClass = addClass({
      name,
      series: formData.series,
      course: formData.course.trim() || undefined,
      directorId: formData.directorId || undefined,
      active: formData.active,
      startYear: formData.startYear,
      startYearDate: formData.startYearDate || undefined,
      archived: false,
      templateId: formData.templateId || undefined,
    });

    // Cadastrar disciplinas profissionais do template
    if (newClass.id && templateSubjects.length > 0) {
      setProfessionalSubjectsForClass(newClass.id, templateSubjects);
    }

    toast({
      title: 'Sucesso',
      description: `Turma criada com sucesso${templateSubjects.length > 0 ? ` com ${templateSubjects.length} disciplina(s) profissional(is)` : ''}.`,
    });

    // Reset form
    setFormData({
      templateId: '',
      series: '',
      letter: '',
      course: '',
      startYear: undefined,
      startYearDate: '',
      directorId: '',
      active: true,
    });
    setTemplateSubjects([]);

    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Turma</CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Nenhum template criado</AlertTitle>
            <AlertDescription>
              Para criar turmas com curso técnico, você precisa primeiro criar templates de disciplinas na aba "Templates".
              Turmas sem curso técnico podem ser criadas normalmente.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Template Selection */}
            {templates.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="template">Template de Disciplinas (Opcional para Ensino Médio Regular)</Label>
                <Select 
                  value={formData.templateId || 'none'} 
                  onValueChange={(value) => setFormData({ ...formData, templateId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Selecione um template ou deixe em branco" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem template (Ensino Médio Regular)</SelectItem>
                  {templates.map(template => {
                    const totalSubjects = template.subjectsByYear.reduce((sum, y) => sum + y.subjects.length, 0);
                    return (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.course} ({totalSubjects} disciplinas)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selecione um template para turmas de curso técnico. O curso será preenchido automaticamente.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="series">Série *</Label>
              <Select value={formData.series} onValueChange={(value) => setFormData({ ...formData, series: value })}>
                <SelectTrigger id="series">
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1º">1º ano</SelectItem>
                  <SelectItem value="2º">2º ano</SelectItem>
                  <SelectItem value="3º">3º ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="letter">Letra *</Label>
              <Input
                id="letter"
                placeholder="Ex: A, B, C"
                value={formData.letter}
                onChange={(e) => setFormData({ ...formData, letter: e.target.value.toUpperCase() })}
                maxLength={1}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course">Curso</Label>
              <Input
                id="course"
                placeholder={hasTemplate ? "Preenchido automaticamente pelo template" : "Ex: Ensino Médio Regular"}
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                disabled={hasTemplate}
              />
              {hasTemplate && (
                <p className="text-sm text-muted-foreground">
                  O curso é definido pelo template selecionado. Você pode editar após desmarcar o template.
                </p>
              )}
            </div>

                {hasTemplate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startYear">Ano de Início *</Label>
                  <Select 
                    value={formData.startYear?.toString() || ''} 
                    onValueChange={(value) => setFormData({ ...formData, startYear: parseInt(value) as 1 | 2 | 3 })}
                  >
                    <SelectTrigger id="startYear">
                      <SelectValue placeholder="Selecione o ano de início" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTemplate(formData.templateId)?.subjectsByYear
                        .sort((a, b) => a.year - b.year)
                        .map(yearData => (
                          <SelectItem key={yearData.year} value={yearData.year.toString()}>
                            {yearData.year}º ano ({yearData.subjects.length} disciplina{yearData.subjects.length !== 1 ? 's' : ''})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.startYear && templateSubjects.length === 0 && (
                    <p className="text-sm text-destructive">
                      O template selecionado não possui disciplinas para este ano.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startYearDate">
                    Data de Início do {formData.startYear}º Ano * 
                    {formData.startYear && formData.startYear > 1 && (
                      <span className="text-muted-foreground text-xs font-normal ml-2">
                        (pode ser uma data futura)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="startYearDate"
                    type="date"
                    value={formData.startYearDate}
                    onChange={(e) => setFormData({ ...formData, startYearDate: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.startYear === 1 
                      ? 'Data de início do primeiro ano letivo (geralmente fevereiro).'
                      : `Data de início do ${formData.startYear}º ano letivo. Pode ser uma data futura se a turma ainda não começou.`}
                  </p>
                </div>

                {templateSubjects.length > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Disciplinas Profissionais do {formData.startYear}º Ano</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                      {templateSubjects.map((subject, index) => (
                        <Badge key={`${subject}-${index}`} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Estas disciplinas serão cadastradas automaticamente ao criar a turma.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="director">Diretor</Label>
              <Select 
                value={formData.directorId || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, directorId: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="director">
                  <SelectValue placeholder="Selecione um diretor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum diretor</SelectItem>
                  {directors.map(director => {
                    const load = getDirectorLoad(director.id);
                    return (
                      <SelectItem key={director.id} value={director.id}>
                        {director.name} - {load} turmas {load >= 5 && '⚠️'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formData.directorId && (
                <p className="text-sm text-muted-foreground">
                  Carga atual: {selectedDirectorLoad} turmas
                </p>
              )}
              {showOverloadWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este diretor já possui {selectedDirectorLoad} turmas. Considere distribuir a carga.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Turma ativa</Label>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  templateId: '',
                  series: '',
                  letter: '',
                  course: '',
                  startYear: undefined,
                  startYearDate: '',
                  directorId: '',
                  active: true,
                });
                setTemplateSubjects([]);
              }}
            >
              Limpar
            </Button>
            <Button type="submit">Criar Turma</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
