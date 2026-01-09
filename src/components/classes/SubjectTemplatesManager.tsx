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
      setDeletingTemplate(null);
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Templates de Disciplinas Profissionais</CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Template de Disciplinas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nome do Template *</Label>
                    <Input
                      id="template-name"
                      placeholder="Ex: Técnico em Informática - Padrão"
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-course">Curso *</Label>
                    <Input
                      id="template-course"
                      placeholder="Ex: Técnico em Informática"
                      value={createFormData.course}
                      onChange={(e) => setCreateFormData({ ...createFormData, course: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year1">Disciplinas do 1º Ano</Label>
                    <Input
                      id="year1"
                      placeholder="Separadas por vírgula (ex: Algoritmos, Lógica de Programação)"
                      value={createFormData.year1Subjects}
                      onChange={(e) => setCreateFormData({ ...createFormData, year1Subjects: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year2">Disciplinas do 2º Ano</Label>
                    <Input
                      id="year2"
                      placeholder="Separadas por vírgula"
                      value={createFormData.year2Subjects}
                      onChange={(e) => setCreateFormData({ ...createFormData, year2Subjects: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year3">Disciplinas do 3º Ano</Label>
                    <Input
                      id="year3"
                      placeholder="Separadas por vírgula"
                      value={createFormData.year3Subjects}
                      onChange={(e) => setCreateFormData({ ...createFormData, year3Subjects: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleCreate} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Criar Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
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
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Save className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum template criado</h3>
              <p className="text-muted-foreground">
                Crie templates para reutilizar configurações de disciplinas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Total de Disciplinas</TableHead>
                  <TableHead>Anos Configurados</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const totalSubjects = template.subjectsByYear.reduce(
                    (sum, year) => sum + year.subjects.length,
                    0
                  );
                  const usageCount = getTemplateUsageCount(template.id);

                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {template.name}
                          {usageCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {usageCount} turma(s)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{template.course}</TableCell>
                      <TableCell>{totalSubjects} disciplina(s)</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {template.subjectsByYear.map((yearData) => (
                            <Badge key={yearData.year} variant="outline">
                              {yearData.year}º ano ({yearData.subjects.length})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setViewingTemplate(template)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingTemplate(template)}>
                            <Trash2 className="h-4 w-4 text-severity-critical" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                      <Badge key={`${yearData.year}-${subject}-${index}`} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
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
            <DialogHeader>
              <DialogTitle>Editar Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-template-name">Nome do Template *</Label>
                <Input
                  id="edit-template-name"
                  placeholder="Ex: Técnico em Informática - Padrão"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-template-course">Curso *</Label>
                <Input
                  id="edit-template-course"
                  placeholder="Ex: Técnico em Informática"
                  value={editFormData.course}
                  onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-year1">Disciplinas do 1º Ano</Label>
                <Input
                  id="edit-year1"
                  placeholder="Separadas por vírgula (ex: Algoritmos, Lógica de Programação)"
                  value={editFormData.year1Subjects}
                  onChange={(e) => setEditFormData({ ...editFormData, year1Subjects: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-year2">Disciplinas do 2º Ano</Label>
                <Input
                  id="edit-year2"
                  placeholder="Separadas por vírgula"
                  value={editFormData.year2Subjects}
                  onChange={(e) => setEditFormData({ ...editFormData, year2Subjects: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-year3">Disciplinas do 3º Ano</Label>
                <Input
                  id="edit-year3"
                  placeholder="Separadas por vírgula"
                  value={editFormData.year3Subjects}
                  onChange={(e) => setEditFormData({ ...editFormData, year3Subjects: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleEdit} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
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
            <AlertDialogDescription>
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
                <>
                  Tem certeza que deseja excluir o template "{deletingTemplate?.name}"? Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deletingTemplate && getTemplateUsageCount(deletingTemplate.id) === 0 && (
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
