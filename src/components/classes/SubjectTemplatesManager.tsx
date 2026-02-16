import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProfessionalSubjectTemplates, useClasses } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, Save, X, AlertTriangle } from 'lucide-react';
import { ProfessionalSubjectTemplate } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const SubjectTemplatesManager = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useProfessionalSubjectTemplates();
  const { classes } = useClasses();
  const { toast } = useToast();

  const [viewingTemplate, setViewingTemplate] = useState<ProfessionalSubjectTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ProfessionalSubjectTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ProfessionalSubjectTemplate | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [createFormData, setCreateFormData] = useState({
    name: '',
    course: '',
    year1Subjects: '',
    year2Subjects: '',
    year3Subjects: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    course: '',
    year1Subjects: '',
    year2Subjects: '',
    year3Subjects: '',
  });

  const handleCreate = async () => {
    if (!createFormData.name.trim() || !createFormData.course.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e curso do template.',
        variant: 'destructive',
      });
      return;
    }


    // Validar duplicatas
    const duplicateName = templates.some(t => t.name.toLowerCase() === createFormData.name.trim().toLowerCase());
    if (duplicateName) {
      toast({
        title: 'Erro',
        description: 'Já existe um template com este nome.',
        variant: 'destructive',
      });
      return;
    }

    const subjectsByYear: { year: 1 | 2 | 3; subjects: string[] }[] = [];

    if (createFormData.year1Subjects.trim()) {
      const subjects = createFormData.year1Subjects.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjects.length > 0) {
        subjectsByYear.push({
          year: 1,
          subjects,
        });
      }
    }

    if (createFormData.year2Subjects.trim()) {
      const subjects = createFormData.year2Subjects.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjects.length > 0) {
        subjectsByYear.push({
          year: 2,
          subjects,
        });
      }
    }

    if (createFormData.year3Subjects.trim()) {
      const subjects = createFormData.year3Subjects.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjects.length > 0) {
        subjectsByYear.push({
          year: 3,
          subjects,
        });
      }
    }

    // Validar que pelo menos um ano tenha disciplinas
    if (subjectsByYear.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma disciplina em pelo menos um ano.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addTemplate({
        name: createFormData.name.trim(),
        course: createFormData.course.trim(),
        subjectsByYear,
      });

      toast({
        title: 'Template criado',
        description: `Template "${createFormData.name.trim()}" criado com sucesso com ${subjectsByYear.reduce((sum, y) => sum + y.subjects.length, 0)} disciplina(s).`,
      });

      setCreateFormData({
        name: '',
        course: '',
        year1Subjects: '',
        year2Subjects: '',
        year3Subjects: '',
      });
      setShowCreateDialog(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o template.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    // Verificar se há turmas usando este template
    const classesUsingTemplate = classes.filter(c => c.templateId === deletingTemplate.id);

    if (classesUsingTemplate.length > 0) {
      toast({
        title: 'Aviso',
        description: `Não é possível excluir este template pois ${classesUsingTemplate.length} turma(s) está(ão) usando-o.`,
        variant: 'destructive',
      });
      setDeletingTemplate(null);
      return;
    }

    try {
      await deleteTemplate(deletingTemplate.id);
      toast({
        title: 'Template excluído',
        description: 'O template foi excluído com sucesso.',
      });
      toast({
        title: 'Template excluído',
        description: 'O template foi excluído com sucesso.',
      });
      setDeletingTemplate(null);
      setDeleteConfirmationText('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o template.',
        variant: 'destructive',
      });
    }
  };

  const getTemplateUsageCount = (templateId: string) => {
    return classes.filter(c => c.templateId === templateId).length;
  };

  // Abrir dialog de edição com dados do template
  const openEditDialog = (template: ProfessionalSubjectTemplate) => {
    const year1 = template.subjectsByYear.find(y => y.year === 1)?.subjects.join(', ') || '';
    const year2 = template.subjectsByYear.find(y => y.year === 2)?.subjects.join(', ') || '';
    const year3 = template.subjectsByYear.find(y => y.year === 3)?.subjects.join(', ') || '';

    setEditFormData({
      name: template.name,
      course: template.course,
      year1Subjects: year1,
      year2Subjects: year2,
      year3Subjects: year3,
    });
    setEditingTemplate(template);
  };

  // Salvar edição do template
  const handleEdit = async () => {
    if (!editingTemplate) return;

    if (!editFormData.name.trim() || !editFormData.course.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e curso do template.',
        variant: 'destructive',
      });
      return;
    }


    // Validar duplicatas (excluindo o próprio template)
    const duplicateName = templates.some(
      t => t.id !== editingTemplate.id && t.name.toLowerCase() === editFormData.name.trim().toLowerCase()
    );
    if (duplicateName) {
      toast({
        title: 'Erro',
        description: 'Já existe outro template com este nome.',
        variant: 'destructive',
      });
      return;
    }

    const subjectsByYear: { year: 1 | 2 | 3; subjects: string[] }[] = [];

    if (editFormData.year1Subjects.trim()) {
      const subjects = editFormData.year1Subjects.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjects.length > 0) {
        subjectsByYear.push({ year: 1, subjects });
      }
    }

    if (editFormData.year2Subjects.trim()) {
      const subjects = editFormData.year2Subjects.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjects.length > 0) {
        subjectsByYear.push({ year: 2, subjects });
      }
    }

    if (editFormData.year3Subjects.trim()) {
      const subjects = editFormData.year3Subjects.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjects.length > 0) {
        subjectsByYear.push({ year: 3, subjects });
      }
    }

    if (subjectsByYear.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma disciplina em pelo menos um ano.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateTemplate(editingTemplate.id, {
        name: editFormData.name.trim(),
        course: editFormData.course.trim(),
        subjectsByYear,
      });

      toast({
        title: 'Template atualizado',
        description: `Template "${editFormData.name.trim()}" atualizado com sucesso.`,
      });

      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o template.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Save className="h-4 w-4" />
                Templates de Disciplinas Profissionais
              </CardTitle>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader className="border-b pb-4 mb-4">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    Criar Template de Disciplinas
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <Label htmlFor="template-name" className="text-xs font-semibold uppercase text-muted-foreground">Nome do Template *</Label>
                      <Input
                        id="template-name"
                        placeholder="Ex: Técnico em Informática - Padrão"
                        value={createFormData.name}
                        onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                        className="font-medium"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <Label htmlFor="template-course" className="text-xs font-semibold uppercase text-muted-foreground">Curso *</Label>
                      <Input
                        id="template-course"
                        placeholder="Ex: Técnico em Informática"
                        value={createFormData.course}
                        onChange={(e) => setCreateFormData({ ...createFormData, course: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Grade Curricular */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Label className="text-sm font-semibold text-foreground">Grade Curricular Profissional</Label>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                        <Label htmlFor="year1" className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background">1º Ano</Badge>
                          <span className="text-xs text-muted-foreground font-normal">Disciplinas separadas por vírgula</span>
                        </Label>
                        <Input
                          id="year1"
                          placeholder="Ex: Algoritmos, Lógica de Programação, Fundamentos de TI"
                          value={createFormData.year1Subjects}
                          onChange={(e) => setCreateFormData({ ...createFormData, year1Subjects: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                        <Label htmlFor="year2" className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background">2º Ano</Badge>
                          <span className="text-xs text-muted-foreground font-normal">Disciplinas separadas por vírgula</span>
                        </Label>
                        <Input
                          id="year2"
                          placeholder="Ex: Banco de Dados, Programação Web, Redes"
                          value={createFormData.year2Subjects}
                          onChange={(e) => setCreateFormData({ ...createFormData, year2Subjects: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                        <Label htmlFor="year3" className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background">3º Ano</Badge>
                          <span className="text-xs text-muted-foreground font-normal">Disciplinas separadas por vírgula</span>
                        </Label>
                        <Input
                          id="year3"
                          placeholder="Ex: Projeto Integrador, Gestão de Projetos, Mobile"
                          value={createFormData.year3Subjects}
                          onChange={(e) => setCreateFormData({ ...createFormData, year3Subjects: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={handleCreate} className="flex-1 gap-2 shadow-sm" size="lg">
                      <Save className="h-4 w-4" />
                      Criar Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/30 mb-4">
                <Save className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Nenhum template criado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Crie templates para padronizar a grade curricular e reutilizar configurações em novas turmas.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px]">Nome</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Configuração</TableHead>
                    <TableHead>Grade Curricular</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => {
                    const totalSubjects = template.subjectsByYear.reduce(
                      (sum, year) => sum + year.subjects.length,
                      0
                    );
                    const usageCount = getTemplateUsageCount(template.id);
                    const yearsConfigured = template.subjectsByYear.map(y => y.year).sort().join(', ');

                    return (
                      <TableRow key={template.id} className="group transition-colors hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">{template.name}</span>
                            {usageCount > 0 && (
                              <Badge variant="secondary" className="w-fit text-[10px] px-1.5 h-5 bg-info/15 text-info dark:bg-info/20 dark:text-info">
                                {usageCount} turma(s) em uso
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{template.course}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="font-normal">
                              {totalSubjects} disc.
                            </Badge>
                            {yearsConfigured && (
                              <span className="text-xs">
                                Anos: {yearsConfigured}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-[300px]">
                            {template.subjectsByYear.map((yearData) => (
                              <Badge
                                key={yearData.year}
                                variant="outline"
                                className="bg-muted/50 text-muted-foreground border-border text-[10px]"
                              >
                                {yearData.year}º ano ({yearData.subjects.length})
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setViewingTemplate(template)}
                              title="Visualizar Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-info hover:bg-info/10 dark:hover:bg-info"
                              onClick={() => openEditDialog(template)}
                              title="Editar Template"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive"
                              onClick={() => setDeletingTemplate(template)}
                              title="Excluir Template"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Template Dialog */}
      {viewingTemplate && (
        <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{viewingTemplate.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Curso</Label>
                <p className="font-medium">{viewingTemplate.course}</p>
              </div>

              {viewingTemplate.subjectsByYear.map((yearData) => (
                <div key={yearData.year}>
                  <Label className="text-muted-foreground">{yearData.year}º Ano</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {yearData.subjects.map((subject, index) => (
                      <Badge key={`${yearData.year}-${subject}-${index}`} variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}

              <div className="text-sm text-muted-foreground">
                <p>Criado em: {new Date(viewingTemplate.createdAt).toLocaleString('pt-BR')}</p>
                <p>Atualizado em: {new Date(viewingTemplate.updatedAt).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-full bg-info/15 dark:bg-info/20">
                  <Edit className="h-5 w-5 text-info dark:text-info" />
                </div>
                Editar Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <Label htmlFor="edit-template-name" className="text-xs font-semibold uppercase text-muted-foreground">Nome do Template *</Label>
                  <Input
                    id="edit-template-name"
                    placeholder="Ex: Técnico em Informática - Padrão"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="font-medium"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <Label htmlFor="edit-template-course" className="text-xs font-semibold uppercase text-muted-foreground">Curso *</Label>
                  <Input
                    id="edit-template-course"
                    placeholder="Ex: Técnico em Informática"
                    value={editFormData.course}
                    onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                  />
                </div>
              </div>

              {/* Grade Curricular */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Label className="text-sm font-semibold text-foreground">Grade Curricular Profissional</Label>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <Label htmlFor="edit-year1" className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background">1º Ano</Badge>
                      <span className="text-xs text-muted-foreground font-normal">Disciplinas separadas por vírgula</span>
                    </Label>
                    <Input
                      id="edit-year1"
                      placeholder="Ex: Algoritmos, Lógica de Programação"
                      value={editFormData.year1Subjects}
                      onChange={(e) => setEditFormData({ ...editFormData, year1Subjects: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <Label htmlFor="edit-year2" className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background">2º Ano</Badge>
                      <span className="text-xs text-muted-foreground font-normal">Disciplinas separadas por vírgula</span>
                    </Label>
                    <Input
                      id="edit-year2"
                      placeholder="Ex: Banco de Dados, Programação Web"
                      value={editFormData.year2Subjects}
                      onChange={(e) => setEditFormData({ ...editFormData, year2Subjects: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <Label htmlFor="edit-year3" className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background">3º Ano</Badge>
                      <span className="text-xs text-muted-foreground font-normal">Disciplinas separadas por vírgula</span>
                    </Label>
                    <Input
                      id="edit-year3"
                      placeholder="Ex: Projeto Integrador, Mobile"
                      value={editFormData.year3Subjects}
                      onChange={(e) => setEditFormData({ ...editFormData, year3Subjects: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleEdit} className="flex-1 gap-2 shadow-sm" size="lg">
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setEditingTemplate(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Template Dialog */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {deletingTemplate && getTemplateUsageCount(deletingTemplate.id) > 0 ? (
                <div className="space-y-2">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Este template está sendo usado por {getTemplateUsageCount(deletingTemplate.id)} turma(s).
                      Não é possível excluí-lo enquanto houver turmas associadas.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    Tem certeza que deseja excluir o template "<strong>{deletingTemplate?.name}</strong>"?
                  </p>
                  <p className="text-sm font-medium pt-2">
                    Digite <span className="font-bold text-destructive">excluir</span> para confirmar:
                  </p>
                  <Input
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="excluir"
                    className="border-destructive/30 focus-visible:ring-destructive"
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
            {deletingTemplate && getTemplateUsageCount(deletingTemplate.id) === 0 && (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteConfirmationText.toLowerCase() !== 'excluir'}
                className="bg-destructive hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
