import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useArchivedClasses, useStudents } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Archive, Search, Eye, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useClasses } from '@/hooks/useData';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

const ArchivedClasses = () => {
  const { archivedClasses } = useArchivedClasses();
  const { unarchiveClass } = useClasses();
  const { students, updateStudent } = useStudents();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewingClass, setViewingClass] = useState<string | null>(null);
  const [unarchivingClass, setUnarchivingClass] = useState<string | null>(null);

  const filteredClasses = archivedClasses.filter((cls) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      cls.name.toLowerCase().includes(searchLower) ||
      cls.course?.toLowerCase().includes(searchLower) ||
      cls.archivedReason?.toLowerCase().includes(searchLower)
    );
  });

  const handleUnarchive = async () => {
    if (!unarchivingClass) return;

    try {
      await unarchiveClass(unarchivingClass);

      const classStudents = students.filter((s) => s.classId === unarchivingClass);
      await Promise.all(
        classStudents.map((student) => updateStudent(student.id, { status: 'active' })),
      );

      toast({
        title: 'Turma desarquivada',
        description: `Turma desarquivada com sucesso. ${classStudents.length} aluno(s) reativado(s).`,
      });
      setUnarchivingClass(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível desarquivar a turma.',
        variant: 'destructive',
      });
    }
  };

  const getClassStudentsCount = (classId: string) => {
    return students.filter((s) => s.classId === classId).length;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Turmas Arquivadas"
        description="Visualize e gerencie turmas que foram arquivadas"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/turmas')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Turmas
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Histórico de Arquivamento
            </CardTitle>
            <Badge variant="secondary" className="font-normal">
              {filteredClasses.length} turmas arquivadas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, curso ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/30 mb-4">
                <Archive className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma turma arquivada</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchTerm
                  ? 'Não encontramos turmas com os filtros atuais.'
                  : 'Turmas antigas aparecerão aqui quando forem arquivadas.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nome</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Arquivado em</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => (
                    <TableRow key={cls.id} className="group transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <span className="text-foreground">{cls.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{cls.course || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{getClassStudentsCount(cls.id)}</span>
                          <span className="text-xs text-muted-foreground">alunos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cls.archivedAt ? (
                          <Badge variant="outline" className="font-normal">
                            {new Date(cls.archivedAt).toLocaleDateString('pt-BR')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 font-normal">
                          {cls.archivedReason || 'Motivo não informado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setViewingClass(cls.id)}
                            title="Visualizar Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setUnarchivingClass(cls.id)}
                            title="Desarquivar (Restaurar)"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Class Dialog */}
      {viewingClass && (
        <Dialog open={!!viewingClass} onOpenChange={(open) => !open && setViewingClass(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Turma Arquivada</DialogTitle>
            </DialogHeader>
            {(() => {
              const cls = archivedClasses.find((c) => c.id === viewingClass);
              if (!cls) return null;

              const classStudents = students.filter((s) => s.classId === cls.id);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/10">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</p>
                      <p className="text-base font-semibold">{cls.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Curso</p>
                      <p className="text-base">{cls.course || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Série</p>
                      <p className="text-base">{cls.series}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Arquivado Em
                      </p>
                      <p className="text-base">
                        {cls.archivedAt
                          ? new Date(cls.archivedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Motivo do Arquivamento</p>
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-md text-amber-800 text-sm">
                        {cls.archivedReason || 'Não informado'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Alunos ({classStudents.length})</p>
                    </div>
                    <div className="border rounded-md p-0 max-h-[300px] overflow-y-auto bg-card">
                      {classStudents.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">Nenhum aluno cadastrado nesta turma</div>
                      ) : (
                        <div className="divide-y">
                          {classStudents.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                              <span className="text-sm font-medium">{student.name}</span>
                              <Badge variant="outline" className="text-xs font-normal opacity-70">{student.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog
        open={!!unarchivingClass}
        onOpenChange={(open) => !open && setUnarchivingClass(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desarquivamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desarquivar esta turma?
              <br /><br />
              Ela voltará a aparecer na lista de <strong>turmas ativas</strong> e os alunos vinculados serão reativados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive} className="bg-blue-600 hover:bg-blue-700">
              Desarquivar Turma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default ArchivedClasses;
