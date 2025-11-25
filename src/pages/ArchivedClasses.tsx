import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useArchivedClasses, useStudents } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { Archive, Search, Eye, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useClasses } from '@/hooks/useLocalStorage';

const ArchivedClasses = () => {
  const { archivedClasses } = useArchivedClasses();
  const { unarchiveClass } = useClasses();
  const { students } = useStudents();
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
      cls.classNumber.toLowerCase().includes(searchLower) ||
      cls.course?.toLowerCase().includes(searchLower) ||
      cls.archivedReason?.toLowerCase().includes(searchLower)
    );
  });

  const handleUnarchive = () => {
    if (!unarchivingClass) return;

    unarchiveClass(unarchivingClass);
    toast({
      title: 'Turma desarquivada',
      description: 'A turma foi desarquivada com sucesso.',
    });
    setUnarchivingClass(null);
  };

  const getClassStudentsCount = (classId: string) => {
    return students.filter((s) => s.classId === classId).length;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/turmas')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Turmas
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Turmas Arquivadas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie turmas que foram arquivadas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Turmas Arquivadas ({archivedClasses.length})</CardTitle>
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, número ou curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma turma arquivada</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Não há turmas arquivadas no momento.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead>Data de Arquivamento</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.classNumber}</TableCell>
                    <TableCell>{cls.name}</TableCell>
                    <TableCell>{cls.course || '-'}</TableCell>
                    <TableCell>{getClassStudentsCount(cls.id)}</TableCell>
                    <TableCell>
                      {cls.archivedAt
                        ? new Date(cls.archivedAt).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.archivedReason || 'Não informado'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingClass(cls.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnarchivingClass(cls.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Desarquivar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Número</p>
                      <p className="text-lg">{cls.classNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome</p>
                      <p className="text-lg">{cls.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Curso</p>
                      <p className="text-lg">{cls.course || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Série</p>
                      <p className="text-lg">{cls.series}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Data de Arquivamento
                      </p>
                      <p className="text-lg">
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
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Motivo</p>
                      <p className="text-lg">{cls.archivedReason || 'Não informado'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Alunos</p>
                    <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                      {classStudents.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum aluno cadastrado</p>
                      ) : (
                        <div className="space-y-2">
                          {classStudents.map((student) => (
                            <div key={student.id} className="flex items-center justify-between">
                              <span>{student.name}</span>
                              <Badge variant="outline">{student.status}</Badge>
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
              Tem certeza que deseja desarquivar esta turma? Ela voltará a aparecer na lista de
              turmas ativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>Desarquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivedClasses;

