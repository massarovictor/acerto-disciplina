import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStudents, useClasses, useIncidents, useGradesAnalytics } from '@/hooks/useData';
import { getSeverityColor, getSeverityLabel, getStatusColor, getStatusLabel } from '@/lib/incidentUtils';
import { useToast } from '@/hooks/use-toast';
import { exportStudentsList } from '@/lib/excelExport';
import { Search, Edit, Download, Eye, Trash2, Camera, X, CheckCircle2, XCircle, AlertTriangle, ArrowRightLeft, Clock } from 'lucide-react';
import { Student, StudentStatus } from '@/types';
import { calculateStudentStatus } from '@/lib/approvalCalculator';
import { getAcademicYear } from '@/lib/classYearCalculator';

// Função auxiliar para calcular idade
const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

interface StudentsManageProps {
  highlightId?: string | null;
}

export const StudentsManage = ({ highlightId }: StudentsManageProps) => {
  const { students, updateStudent, deleteStudent } = useStudents();
  const { classes } = useClasses();
  const { incidents } = useIncidents();
  // DISABLED: Attendance feature temporarily removed
  // const { attendance } = useAttendance();
  const attendance: any[] = []; // Empty array placeholder
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    classId: '',
    birthDate: '',
    gender: '',
    enrollment: '',
    censusId: '',
    cpf: '',
    rg: '',
    photoUrl: '',
    status: 'active' as StudentStatus,
  });
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [transferTargetClassId, setTransferTargetClassId] = useState<string>('');
  const classIdsForGrades = useMemo(() => {
    if (classFilter === 'all') {
      return classes.map((cls) => cls.id);
    }
    return classFilter ? [classFilter] : [];
  }, [classFilter, classes]);
  const { grades } = useGradesAnalytics({
    classIds: classIdsForGrades,
  });

  const getClassName = (classId: string) => {
    const classData = classes.find(c => c.id === classId);
    if (!classData) return 'Turma não encontrada';
    const archived = classData.archived ? ' (Arquivada)' : '';
    return `${classData.name}${archived}`;
  };

  const filteredStudents = useMemo(() => students.filter(student => {
    // Se não há termo de busca (ou apenas espaços), mostrar todos (respeitando apenas filtro de turma)
    const trimmedSearch = searchTerm.trim();
    const classData = classes.find(c => c.id === student.classId);
    const className = classData ? classData.name : '';
    const archived = classData?.archived ? ' (Arquivada)' : '';
    const fullClassName = `${className}${archived}`;

    const matchesSearch = !trimmedSearch ||
      student.name.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
      student.enrollment?.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
      student.cpf?.includes(trimmedSearch) ||
      fullClassName.toLowerCase().includes(trimmedSearch.toLowerCase());

    const matchesClass = classFilter === 'all' || student.classId === classFilter;

    return matchesSearch && matchesClass;
  }), [students, searchTerm, classFilter, classes]);

  const getAcademicStatusBadge = (student: Student) => {
    try {
      const classData = classes.find(c => c.id === student.classId);
      const startYearDate =
        classData?.startYearDate ||
        (classData?.startCalendarYear ? `${classData.startCalendarYear}-02-01` : undefined);

      if (!classData || !startYearDate || !classData.currentYear) {
        return null;
      }

      const academicYear = getAcademicYear(startYearDate, classData.currentYear);
      const status = calculateStudentStatus(
        grades,
        student.id,
        student.classId,
        academicYear,
        classData.currentYear,
      );

      if (status.isPending) {
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      }

      switch (status.status) {
        case 'approved':
          return (
            <Badge className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aprovado
            </Badge>
          );
        case 'recovery':
          return (
            <Badge className="bg-warning/10 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Recuperação
            </Badge>
          );
        case 'failed':
          return (
            <Badge className="bg-destructive/10 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3 mr-1" />
              Reprovado
            </Badge>
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Erro ao calcular status acadêmico:', error);
      return null;
    }
  };

  // Máscaras de input
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatRG = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 9) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
    }
    return value;
  };

  // Handlers de edição
  const handleEditClick = (student: Student) => {
    setEditFormData({
      name: student.name,
      classId: student.classId,
      birthDate: student.birthDate,
      gender: student.gender,
      enrollment: student.enrollment || '',
      censusId: student.censusId || '',
      cpf: student.cpf || '',
      rg: student.rg || '',
      photoUrl: student.photoUrl || '',
      status: student.status,
    });
    setPhotoPreview(student.photoUrl || '');
    setEditingStudent(student);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    if (!editFormData.name || !editFormData.classId || !editFormData.birthDate || !editFormData.gender) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const targetClass = classes.find(c => c.id === editFormData.classId);
    if (!targetClass || !targetClass.active || targetClass.archived) {
      toast({
        title: 'Turma bloqueada',
        description: 'A turma selecionada está inativa ou arquivada.',
        variant: 'destructive',
      });
      return;
    }

    // Validar CPF duplicado (exceto o próprio aluno)
    if (editFormData.cpf) {
      const cleanedCPF = editFormData.cpf.replace(/\D/g, '');
      const duplicate = students.find(s =>
        s.id !== editingStudent.id && s.cpf && s.cpf.replace(/\D/g, '') === cleanedCPF
      );
      if (duplicate) {
        toast({
          title: 'Erro',
          description: 'Já existe outro aluno cadastrado com este CPF.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      await updateStudent(editingStudent.id, {
        name: editFormData.name,
        classId: editFormData.classId,
        birthDate: editFormData.birthDate,
        gender: editFormData.gender,
        enrollment: editFormData.enrollment || undefined,
        censusId: editFormData.censusId || undefined,
        cpf: editFormData.cpf ? editFormData.cpf.replace(/\D/g, '') : undefined,
        rg: editFormData.rg || undefined,
        photoUrl: editFormData.photoUrl || undefined,
        status: editFormData.status,
      });

      toast({
        title: 'Sucesso',
        description: 'Aluno atualizado com sucesso.',
      });

      setEditingStudent(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o aluno.',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 2MB.',
          variant: 'destructive',
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma imagem válida.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditFormData({ ...editFormData, photoUrl: base64String });
        setPhotoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handlers de exclusão
  const checkStudentLinks = (studentId: string) => {
    const linkedIncidents = incidents.filter(i => i.studentIds.includes(studentId));
    const linkedGrades = grades.filter(g => g.studentId === studentId);
    const linkedAttendance = attendance.filter(a => a.studentId === studentId);

    return {
      hasIncidents: linkedIncidents.length > 0,
      hasGrades: linkedGrades.length > 0,
      hasAttendance: linkedAttendance.length > 0,
      incidentsCount: linkedIncidents.length,
      gradesCount: linkedGrades.length,
      attendanceCount: linkedAttendance.length,
    };
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    const links = checkStudentLinks(deletingStudent.id);

    if (links.hasIncidents || links.hasGrades) {
      const messages = [];
      if (links.hasIncidents) messages.push(`${links.incidentsCount} ocorrência(s)`);
      if (links.hasGrades) messages.push(`${links.gradesCount} nota(s)`);
      // DISABLED: Frequência removida temporariamente
      // if (links.hasAttendance) messages.push(`${links.attendanceCount} registro(s) de frequência`);

      toast({
        title: 'Erro',
        description: `Não é possível excluir o aluno pois ele possui vínculos: ${messages.join(', ')}.`,
        variant: 'destructive',
      });
      setDeletingStudent(null);
      return;
    }

    try {
      await deleteStudent(deletingStudent.id);
      toast({
        title: 'Sucesso',
        description: 'Aluno excluído com sucesso.',
      });
      toast({
        title: 'Sucesso',
        description: 'Aluno excluído com sucesso.',
      });
      setDeletingStudent(null);
      setDeleteConfirmationText('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o aluno.',
        variant: 'destructive',
      });
    }
  };

  // Handler de exportação
  const handleExport = () => {
    exportStudentsList(filteredStudents, classes);
    toast({
      title: 'Exportação concluída',
      description: 'Lista de alunos exportada com sucesso.',
    });
  };

  // Handler de transferência
  const handleTransfer = async () => {
    if (!transferringStudent || !transferTargetClassId) return;

    const targetClass = classes.find(c => c.id === transferTargetClassId);
    if (!targetClass) {
      toast({
        title: 'Erro',
        description: 'Turma de destino não encontrada.',
        variant: 'destructive',
      });
      return;
    }
    if (!targetClass.active || targetClass.archived) {
      toast({
        title: 'Turma bloqueada',
        description: 'A turma de destino está inativa ou arquivada.',
        variant: 'destructive',
      });
      return;
    }

    const originClass = classes.find(c => c.id === transferringStudent.classId);

    try {
      await updateStudent(transferringStudent.id, {
        classId: transferTargetClassId,
        status: 'active',
      });

      toast({
        title: 'Transferência concluída',
        description: `${transferringStudent.name} foi transferido de "${originClass?.name || 'N/A'}" para "${targetClass.name}".`,
      });

      setTransferringStudent(null);
      setTransferTargetClassId('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível transferir o aluno.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtrar e Buscar
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, turma, matrícula ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classes.filter(c => !c.archived).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Lista
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Alunos Cadastrados
            </CardTitle>
            <Badge variant="secondary" className="font-normal">
              {filteredStudents.length} alunos encontrados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum aluno encontrado</h3>
              <p className="text-muted-foreground">
                {students.length === 0
                  ? 'Cadastre o primeiro aluno para começar.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px]">Aluno</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Status Acadêmico</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const isHighlighted = highlightId === student.id;
                    return (
                      <TableRow
                        key={student.id}
                        className={`group transition-colors hover:bg-muted/40 ${isHighlighted ? "bg-primary/5 shadow-[inset_4px_0_0_0_theme(colors.primary.DEFAULT)]" : ""}`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              {student.photoUrl ? (
                                <AvatarImage src={student.photoUrl} alt={student.name} />
                              ) : (
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{student.name}</span>
                              <span className="text-xs text-muted-foreground">{student.censusId || 'Sem ID Censo'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.enrollment || '-'}</TableCell>
                        <TableCell>{getClassName(student.classId)}</TableCell>
                        <TableCell>
                          {calculateAge(student.birthDate)} anos
                          <span className="text-xs text-muted-foreground ml-1">
                            ({student.gender === 'M' ? 'M' : student.gender === 'F' ? 'F' : 'Outro'})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            student.status === 'active'
                              ? 'bg-success/10 text-success border-success/30 dark:bg-success/20 dark:text-success dark:border-success/40'
                              : 'bg-muted text-muted-foreground border-border'
                          }>
                            {student.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getAcademicStatusBadge(student) || (
                            <span className="text-muted-foreground text-sm">Não calculado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setViewingStudent(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-info hover:bg-info/10 dark:hover:bg-info"
                              onClick={() => handleEditClick(student)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-info hover:bg-info/10 dark:hover:bg-info"
                              onClick={() => {
                                setTransferringStudent(student);
                                setTransferTargetClassId('');
                              }}
                              title="Transferir aluno"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive"
                              onClick={() => setDeletingStudent(student)}
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

      {/* View Dialog */}
      {viewingStudent && (
        <Dialog open={!!viewingStudent} onOpenChange={(open) => !open && setViewingStudent(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {viewingStudent.photoUrl ? (
                    <AvatarImage src={viewingStudent.photoUrl} alt={viewingStudent.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {viewingStudent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                {viewingStudent.name}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="incidents">
                  Ocorrências ({incidents.filter(i => i.studentIds.includes(viewingStudent.id)).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {/* Foto */}
                    <div className="flex justify-center">
                      <Avatar className="h-32 w-32">
                        {viewingStudent.photoUrl ? (
                          <AvatarImage src={viewingStudent.photoUrl} alt={viewingStudent.name} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                            {viewingStudent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>

                    {/* Informações */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Nome Completo</Label>
                        <p className="font-medium">{viewingStudent.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Turma</Label>
                        <p className="font-medium">{getClassName(viewingStudent.classId)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Data de Nascimento</Label>
                        <p className="font-medium">
                          {new Date(viewingStudent.birthDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Idade</Label>
                        <p className="font-medium">{calculateAge(viewingStudent.birthDate)} anos</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Sexo</Label>
                        <p className="font-medium">
                          {viewingStudent.gender === 'M' ? 'Masculino' :
                            viewingStudent.gender === 'F' ? 'Feminino' :
                              viewingStudent.gender === 'O' ? 'Outro' : 'Prefiro não informar'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge variant="outline" className={
                          viewingStudent.status === 'active'
                            ? 'bg-severity-light-bg text-severity-light border-severity-light'
                            : 'bg-muted text-muted-foreground border-muted'
                        }>
                          {viewingStudent.status === 'active' ? 'Ativo' :
                            viewingStudent.status === 'inactive' ? 'Inativo' : 'Transferido'}
                        </Badge>
                      </div>
                      {viewingStudent.enrollment && (
                        <div>
                          <Label className="text-muted-foreground">Matrícula SIGE</Label>
                          <p className="font-medium">{viewingStudent.enrollment}</p>
                        </div>
                      )}
                      {viewingStudent.censusId && (
                        <div>
                          <Label className="text-muted-foreground">ID Censo</Label>
                          <p className="font-medium">{viewingStudent.censusId}</p>
                        </div>
                      )}
                      {viewingStudent.cpf && (
                        <div>
                          <Label className="text-muted-foreground">CPF</Label>
                          <p className="font-medium">{formatCPF(viewingStudent.cpf)}</p>
                        </div>
                      )}
                      {viewingStudent.rg && (
                        <div>
                          <Label className="text-muted-foreground">RG</Label>
                          <p className="font-medium">{viewingStudent.rg}</p>
                        </div>
                      )}
                    </div>

                    {/* Estatísticas */}
                    {(() => {
                      const links = checkStudentLinks(viewingStudent.id);
                      return (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Estatísticas</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Ocorrências</p>
                              <p className="text-2xl font-bold">{links.incidentsCount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Notas</p>
                              <p className="text-2xl font-bold">{links.gradesCount}</p>
                            </div>
                            {/* DISABLED: Frequência removida temporariamente
                            <div>
                              <p className="text-sm text-muted-foreground">Frequência</p>
                              <p className="text-2xl font-bold">{links.attendanceCount}</p>
                            </div>
                            */}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="incidents" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {(() => {
                    const studentIncidents = incidents.filter(i => i.studentIds.includes(viewingStudent.id));

                    if (studentIncidents.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <CheckCircle2 className="h-12 w-12 text-severity-light mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Nenhuma ocorrência</h3>
                          <p className="text-muted-foreground">
                            Este aluno não possui ocorrências registradas.
                          </p>
                        </div>
                      );
                    }

                    // Helper functions removed in favor of imports

                    return (
                      <div className="space-y-3">
                        {studentIncidents.map(incident => {
                          const incidentClass = classes.find(c => c.id === incident.classId);

                          return (
                            <div
                              key={incident.id}
                              className="border rounded-lg p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={getSeverityColor(incident.finalSeverity)}>
                                    {getSeverityLabel(incident.finalSeverity)}
                                  </Badge>
                                  <Badge variant="outline" className={getStatusColor(incident.status)}>
                                    {incident.status === 'aberta' ? 'Aberta' :
                                      incident.status === 'acompanhamento' ? 'Em Acompanhamento' : 'Resolvida'}
                                  </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(incident.date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>

                              <p className="text-sm font-medium">{incidentClass?.name || 'Turma não encontrada'}</p>

                              {incident.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {incident.description}
                                </p>
                              )}

                              <p className="text-xs text-muted-foreground">
                                {incident.episodes.length} episódio(s) • {incident.followUps?.length || 0} acompanhamento(s)
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Aluno</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Foto */}
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    {photoPreview ? (
                      <AvatarImage src={photoPreview} alt="Preview" />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <Camera className="h-12 w-12 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                      onClick={() => {
                        setEditFormData({ ...editFormData, photoUrl: '' });
                        setPhotoPreview('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Label
                    htmlFor="edit-photo"
                    className="absolute bottom-0 right-0 cursor-pointer"
                  >
                    <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors">
                      <Camera className="h-4 w-4" />
                    </div>
                    <Input
                      id="edit-photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </Label>
                </div>
              </div>

              {/* Formulário */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-name">Nome Completo *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-class">Turma *</Label>
                  <Select
                    value={editFormData.classId}
                    onValueChange={(value) => setEditFormData({ ...editFormData, classId: value })}
                  >
                    <SelectTrigger id="edit-class">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.filter(c => c.active && !c.archived).map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-birthDate">Data de Nascimento *</Label>
                  <Input
                    id="edit-birthDate"
                    type="date"
                    value={editFormData.birthDate}
                    onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Sexo *</Label>
                  <Select
                    value={editFormData.gender}
                    onValueChange={(value) => setEditFormData({ ...editFormData, gender: value })}
                  >
                    <SelectTrigger id="edit-gender">
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                      <SelectItem value="N">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-enrollment">Matrícula SIGE</Label>
                  <Input
                    id="edit-enrollment"
                    value={editFormData.enrollment}
                    onChange={(e) => setEditFormData({ ...editFormData, enrollment: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-censusId">ID Censo</Label>
                  <Input
                    id="edit-censusId"
                    value={editFormData.censusId}
                    onChange={(e) => setEditFormData({ ...editFormData, censusId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-cpf">CPF</Label>
                  <Input
                    id="edit-cpf"
                    placeholder="000.000.000-00"
                    value={editFormData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setEditFormData({ ...editFormData, cpf: formatted });
                    }}
                    maxLength={14}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-rg">RG</Label>
                  <Input
                    id="edit-rg"
                    placeholder="00.000.000-0"
                    value={editFormData.rg}
                    onChange={(e) => {
                      const formatted = formatRG(e.target.value);
                      setEditFormData({ ...editFormData, rg: formatted });
                    }}
                    maxLength={12}
                  />
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="edit-status"
                    checked={editFormData.status === 'active'}
                    onCheckedChange={(checked) =>
                      setEditFormData({ ...editFormData, status: checked ? 'active' : 'inactive' })
                    }
                  />
                  <Label htmlFor="edit-status">Aluno ativo</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStudent(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingStudent && (() => {
                const links = checkStudentLinks(deletingStudent.id);
                if (links.hasIncidents || links.hasGrades || links.hasAttendance) {
                  const messages = [];
                  if (links.hasIncidents) messages.push(`${links.incidentsCount} ocorrência(s)`);
                  if (links.hasGrades) messages.push(`${links.gradesCount} nota(s)`);
                  if (links.hasAttendance) messages.push(`${links.attendanceCount} registro(s) de frequência`);

                  return (
                    <>
                      Não é possível excluir o aluno <strong>{deletingStudent.name}</strong> pois ele possui vínculos: {messages.join(', ')}.
                      <br /><br />
                      Primeiro, remova ou transfira esses vínculos antes de excluir o aluno.
                    </>
                  );
                }
                return (
                  <>
                    Tem certeza que deseja excluir o aluno <strong>{deletingStudent.name}</strong>? Esta ação não pode ser desfeita.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deletingStudent && !checkStudentLinks(deletingStudent.id).hasIncidents &&
              !checkStudentLinks(deletingStudent.id).hasGrades &&
              !checkStudentLinks(deletingStudent.id).hasAttendance && (
                <AlertDialogAction onClick={handleDelete} className="bg-severity-critical hover:bg-severity-critical/90">
                  Excluir
                </AlertDialogAction>
              )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Dialog */}
      <Dialog
        open={!!transferringStudent}
        onOpenChange={(open) => !open && setTransferringStudent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-info" />
              Transferir Aluno
            </DialogTitle>
            <DialogDescription>
              Selecione a turma de destino para {transferringStudent?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Turma atual</Label>
              <p className="text-sm text-muted-foreground">
                {transferringStudent && getClassName(transferringStudent.classId)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-class">Turma destino *</Label>
              <Select
                value={transferTargetClassId}
                onValueChange={setTransferTargetClassId}
              >
                <SelectTrigger id="transfer-class">
                  <SelectValue placeholder="Selecione a turma de destino" />
                </SelectTrigger>
                <SelectContent>
                  {classes
                    .filter(c => c.active && !c.archived && c.id !== transferringStudent?.classId)
                    .map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferringStudent(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferTargetClassId}
              className="bg-info hover:bg-info"
            >
              Confirmar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2">
                <p>
                  Tem certeza que deseja excluir o aluno <strong>{deletingStudent?.name}</strong>?
                </p>
                <div className="bg-destructive/10 dark:bg-destructive/20 p-3 rounded-md text-sm text-destructive dark:text-destructive border border-destructive/30 dark:border-destructive/40">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Atenção:
                  </p>
                  <p>
                    Esta ação removerá permanentemente o aluno do sistema, incluindo histórico escolar e dados pessoais.
                  </p>
                </div>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmationText.toLowerCase() !== 'excluir'}
              className="bg-destructive hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Excluir Aluno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};
