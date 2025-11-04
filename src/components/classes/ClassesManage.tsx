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
import { useClasses, useStudents } from '@/hooks/useLocalStorage';
import { MOCK_USERS } from '@/data/mockData';
import { Search, Edit, Trash2, Eye, School } from 'lucide-react';

export const ClassesManage = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-director' | 'without-director'>('all');

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.course.toLowerCase().includes(searchTerm.toLowerCase());
    
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
                  placeholder="Buscar por nome, série ou curso..."
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Diretor</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.course}</TableCell>
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
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-severity-critical" />
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
    </div>
  );
};
