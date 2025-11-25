import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useClasses, useStudents, useGrades, useAttendance, useProfessionalSubjects } from '@/hooks/useLocalStorage';
import { MOCK_USERS, MOCK_COURSES } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Search, Edit, Trash2, Eye, School, Calendar, AlertTriangle } from 'lucide-react';
import { Class } from '@/types';
import { getAcademicYear } from '@/lib/classYearCalculator';

export const ClassesManage = () => {
  const { classes, updateClass, deleteClass } = useClasses();
  const { students, updateStudent } = useStudents();
  const { grades, deleteGrade } = useGrades();
  const { attendance, deleteAttendance } = useAttendance();
  const { getProfessionalSubjects, setProfessionalSubjectsForClass } = useProfessionalSubjects();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-director' | 'without-director'>('all');
  const [viewingClass, setViewingClass] = useState<Class | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    classData: Class;
    studentCount: number;
    gradeCount: number;
    attendanceCount: number;
  } | null>(null);
  const [editFormData, setEditFormData] = useState({
    series: '',
    letter: '',
    course: '',
    directorId: '',
    active: true,
  });

  const filteredClasses = classes.filter(cls => {
    // Filtrar apenas turmas não arquivadas
    if (cls.archived) return false;
    
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.classNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'with-director') return matchesSearch && cls.directorId;
    if (filterStatus === 'without-director') return matchesSearch && !cls.directorId;
    return matchesSearch;
  });

  const getDirectorName = (directorId?: string) => {
    if (!directorId) return null;
    const director = MOCK_USERS.find(u => u.id === directorId);
    return director?.name || 'Não encontrado';
  };

  const getStudentCount = (classId: string) => {
    return students.filter(s => s.classId === classId).length;
  };

  const handleEditClick = (cls: Class) => {
    const parts = cls.name.split(' - ');
    const seriesLetter = parts[0].split(' ');
    setEditFormData({
      series: seriesLetter[0] || '',
      letter: seriesLetter[1] || '',
      course: cls.course || '',
      directorId: cls.directorId || '',
      active: cls.active,
    });
    setEditingClass(cls);
  };

  const handleSaveEdit = () => {
    if (!editingClass) return;

    // Validação - apenas série e letra são obrigatórios
    if (!editFormData.series || !editFormData.letter) {
      toast({
        title: 'Erro',
        description: 'Preencha série e letra (campos obrigatórios).',
        variant: 'destructive',
      });
      return;
    }

    // Gerar nome: se houver curso, incluir; senão, apenas série e letra
    const newName = editFormData.course.trim()
      ? `${editFormData.series} ${editFormData.letter} - ${editFormData.course.trim()}`
      : `${editFormData.series} ${editFormData.letter}`;

    const duplicate = classes.find(c => c.name === newName && c.id !== editingClass.id);
    if (duplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe uma turma com este nome.',
        variant: 'destructive',
      });
      return;
    }

    updateClass(editingClass.id, {
      name: newName,
      series: editFormData.series,
      course: editFormData.course.trim() || undefined,
      directorId: editFormData.directorId || undefined,
      active: editFormData.active,
    });

    toast({
      title: 'Sucesso',
      description: 'Turma atualizada com sucesso.',
    });

    setEditingClass(null);
  };

  const handleDeleteClick = (cls: Class) => {
    // Coletar informações sobre dados vinculados
    const studentCount = students.filter(s => s.classId === cls.id).length;
    const gradeCount = grades.filter(g => g.classId === cls.id).length;
    const attendanceCount = attendance.filter(a => a.classId === cls.id).length;

    setDeleteConfirmData({
      classData: cls,
      studentCount,
      gradeCount,
      attendanceCount,
    });
  };

  const handleCascadeDelete = () => {
    if (!deleteConfirmData) return;

    const { classData, studentCount, gradeCount, attendanceCount } = deleteConfirmData;

    // 1. Deletar todas as notas da turma
    grades
      .filter(g => g.classId === classData.id)
      .forEach(grade => deleteGrade(grade.id));

    // 2. Deletar todas as frequências da turma
    attendance
      .filter(a => a.classId === classData.id)
      .forEach(att => deleteAttendance(att.id));

    // 3. Atualizar status dos alunos para 'transferred'
    students
      .filter(s => s.classId === classData.id)
      .forEach(student => updateStudent(student.id, { status: 'transferred' }));

    // 4. Remover disciplinas profissionais da turma
    setProfessionalSubjectsForClass(classData.id, []);

    // 5. Deletar a turma
    deleteClass(classData.id);

    toast({
      title: 'Turma excluída',
      description: `Turma excluída com sucesso. ${studentCount} aluno(s) transferido(s), ${gradeCount} nota(s) e ${attendanceCount} registro(s) de frequência removidos.`,
    });

    setDeleteConfirmData(null);
  };

  const directors = MOCK_USERS.filter(u => u.role === 'diretor');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, número, série ou curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todas
              </Button>
              <Button
                variant={filterStatus === 'without-director' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('without-director')}
              >
                Sem Diretor
              </Button>
              <Button
                variant={filterStatus === 'with-director' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('with-director')}
              >
                Com Diretor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Turmas ({filteredClasses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma turma encontrada</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca ou crie uma nova turma.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Ano Atual</TableHead>
                    <TableHead>Diretor</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => {
                    const academicYear = cls.startYearDate && cls.currentYear
                      ? getAcademicYear(cls.startYearDate, cls.currentYear)
                      : null;
                    
                    return (
                    <TableRow key={cls.id}>
                      <TableCell className="font-mono font-medium">{cls.classNumber}</TableCell>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.course || '-'}</TableCell>
                      <TableCell>
                        {cls.currentYear ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                            <Calendar className="h-3 w-3 mr-1" />
                            {cls.currentYear}º ano
                            {academicYear && ` (${academicYear})`}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cls.directorId ? (
                          <div>
                            <p className="font-medium">{getDirectorName(cls.directorId)}</p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-severity-critical-bg text-severity-critical border-severity-critical">
                            Sem diretor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStudentCount(cls.id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cls.active ? 'bg-severity-light-bg text-severity-light border-severity-light' : 'bg-muted text-muted-foreground border-muted'}>
                          {cls.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setViewingClass(cls)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditClick(cls)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(cls)}
                          >
                            <Trash2 className="h-4 w-4 text-severity-critical" />
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

      {/* View Dialog */}
      {viewingClass && (
        <Dialog open={!!viewingClass} onOpenChange={(open) => !open && setViewingClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Turma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Número da Turma</Label>
                <p className="font-medium font-mono">{viewingClass.classNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{viewingClass.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Série</Label>
                <p className="font-medium">{viewingClass.series}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Curso</Label>
                <p className="font-medium">{viewingClass.course || '-'}</p>
              </div>
              {viewingClass.startYear && (
                <div>
                  <Label className="text-muted-foreground">Ano de Início</Label>
                  <p className="font-medium">{viewingClass.startYear}º ano</p>
                </div>
              )}
              {viewingClass.currentYear && (
                <div>
                  <Label className="text-muted-foreground">Ano Atual</Label>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                    {viewingClass.currentYear}º ano
                    {viewingClass.startYearDate && ` (${getAcademicYear(viewingClass.startYearDate, viewingClass.currentYear)})`}
                  </Badge>
                </div>
              )}
              {viewingClass.startYearDate && (
                <div>
                  <Label className="text-muted-foreground">Data de Início do 1º Ano</Label>
                  <p className="font-medium">
                    {new Date(viewingClass.startYearDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Diretor</Label>
                <p className="font-medium">
                  {viewingClass.directorId ? getDirectorName(viewingClass.directorId) : 'Não atribuído'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Alunos Matriculados</Label>
                <p className="font-medium">{getStudentCount(viewingClass.id)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant="outline" className={viewingClass.active ? 'bg-severity-light-bg text-severity-light border-severity-light' : 'bg-muted text-muted-foreground border-muted'}>
                  {viewingClass.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingClass && (
        <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Turma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Número da Turma (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="edit-classNumber">Número da Turma</Label>
                <Input
                  id="edit-classNumber"
                  value={editingClass.classNumber}
                  disabled
                  className="font-mono bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  O número da turma não pode ser alterado.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-series">Série *</Label>
                  <Select value={editFormData.series} onValueChange={(value) => setEditFormData({ ...editFormData, series: value })}>
                    <SelectTrigger id="edit-series">
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
                  <Label htmlFor="edit-letter">Letra *</Label>
                  <Input
                    id="edit-letter"
                    placeholder="Ex: A, B, C"
                    value={editFormData.letter}
                    onChange={(e) => setEditFormData({ ...editFormData, letter: e.target.value.toUpperCase() })}
                    maxLength={1}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-course">Curso Técnico (Opcional)</Label>
                  <Input
                    id="edit-course"
                    placeholder="Digite o curso técnico ou deixe em branco"
                    value={editFormData.course}
                    onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Exemplos: Técnico em Informática, Ensino Médio Regular, etc.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-director">Diretor</Label>
                  <Select value={editFormData.directorId || undefined} onValueChange={(value) => setEditFormData({ ...editFormData, directorId: value })}>
                    <SelectTrigger id="edit-director">
                      <SelectValue placeholder="Selecione um diretor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {directors.map(director => (
                        <SelectItem key={director.id} value={director.id}>
                          {director.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="edit-active"
                    checked={editFormData.active}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, active: checked })}
                  />
                  <Label htmlFor="edit-active">Turma ativa</Label>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setEditingClass(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmData} onOpenChange={(open) => !open && setDeleteConfirmData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-severity-critical" />
              Confirmar Exclusão em Cascata
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a excluir a turma <strong>{deleteConfirmData?.classData.name}</strong>.
              </p>
              
              {deleteConfirmData && (deleteConfirmData.studentCount > 0 || deleteConfirmData.gradeCount > 0 || deleteConfirmData.attendanceCount > 0) && (
                <div className="bg-severity-critical-bg p-4 rounded-md space-y-2">
                  <p className="font-semibold text-severity-critical">Esta turma possui dados vinculados:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {deleteConfirmData.studentCount > 0 && (
                      <li>{deleteConfirmData.studentCount} aluno(s) - serão marcados como 'Transferidos'</li>
                    )}
                    {deleteConfirmData.gradeCount > 0 && (
                      <li>{deleteConfirmData.gradeCount} nota(s) - serão permanentemente excluídas</li>
                    )}
                    {deleteConfirmData.attendanceCount > 0 && (
                      <li>{deleteConfirmData.attendanceCount} registro(s) de frequência - serão permanentemente excluídos</li>
                    )}
                  </ul>
                </div>
              )}
              
              <p className="font-semibold text-severity-critical">
                Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCascadeDelete} 
              className="bg-severity-critical hover:bg-severity-critical/90"
            >
              Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
