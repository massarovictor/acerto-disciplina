/**
 * Painel de Ranking de Alunos
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';
import {
  AnalyticsFilters,
  StudentAnalytics,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_BG_COLORS,
  getTrendColor,
  formatNumber
} from '@/hooks/useSchoolAnalytics';
import { useUIStore } from '@/stores/useUIStore';
import { useToast } from '@/hooks/use-toast';

interface StudentRankingPanelProps {
  topStudents: StudentAnalytics[];
  criticalStudents: StudentAnalytics[];
  allStudentsRanking: StudentAnalytics[];
  allCriticalStudents: StudentAnalytics[];
  focusTab?: 'top' | 'critical' | null;
  subjectMode?: boolean;
  activeSubjects?: string[];
  filters?: AnalyticsFilters;
}

export function StudentRankingPanel({
  topStudents,
  criticalStudents,
  allStudentsRanking,
  allCriticalStudents,
  focusTab,
  subjectMode = false,
  activeSubjects = [],
  filters,
}: StudentRankingPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setTrajectoryUI } = useUIStore();
  const [openTopRanking, setOpenTopRanking] = useState(false);
  const [openCriticalRanking, setOpenCriticalRanking] = useState(false);
  const [tabValue, setTabValue] = useState<'top' | 'critical'>('top');
  const [topSearch, setTopSearch] = useState('');
  const [topClassFilter, setTopClassFilter] = useState('all');
  const [topSort, setTopSort] = useState<'average-desc' | 'average-asc' | 'name-asc' | 'name-desc'>('average-desc');
  const [topPage, setTopPage] = useState(1);
  const [criticalSearch, setCriticalSearch] = useState('');
  const [criticalClassFilter, setCriticalClassFilter] = useState('all');
  const [criticalSort, setCriticalSort] = useState<'risk' | 'average-asc' | 'average-desc' | 'name-asc' | 'name-desc'>('risk');
  const [criticalPage, setCriticalPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (focusTab) {
      setTabValue(focusTab);
    }
  }, [focusTab]);

  const handleOpenStudent = useCallback(
    (studentAnalytics: StudentAnalytics) => {
      const student = studentAnalytics.student;
      const params = new URLSearchParams();
      params.set('tab', 'slides');
      params.set('view', 'individual');
      params.set('classId', student.classId);
      params.set('studentId', student.id);

      if (filters) {
        if (filters.schoolYear && filters.schoolYear !== 'all') {
          params.set('year', filters.schoolYear.toString());
        }
        // Fallback ano calendario se schoolYear nao tiver setado
        else if (filters.calendarYear !== 'all') {
          // Tente estimar o ano escolar se possível, ou deixe o reports tentar
          // Mas aqui studentAnalytics não tem info da turma completa (calendarYearStart), só nome da turma
          // Vamos passar o calendarYear, mas o relatorio espera 'year' (serie).
          // O ideal seria tentar converter se tivessemos os dados da turma aqui.
          // Como fallback, não passamos nada e deixamos o relatário usar o atual da turma.
        }

        if (filters.quarter && filters.quarter !== 'all') {
          params.set('period', filters.quarter);
        }
      }

      window.open(`/relatorios?${params.toString()}`, '_blank');
    },
    [filters],
  );

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    const className = `h-3 w-3 ${getTrendColor(trend)}`;
    if (trend === 'up') return <TrendingUp className={className} />;
    if (trend === 'down') return <TrendingDown className={className} />;
    return <Minus className={className} />;
  };

  const StudentCard = ({
    student,
    rank,
    onSelect,
  }: {
    student: StudentAnalytics;
    rank?: number;
    onSelect?: (value: StudentAnalytics) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect?.(student)}
      className="group flex w-full items-center gap-3 rounded-md border border-border/50 bg-background p-3 text-left transition-colors hover:border-border hover:bg-accent/5"
    >
      {rank && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-bold">{rank}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{student.student.name}</p>
          <TrendIcon trend={student.trend} />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {student.className}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge
          variant="outline"
          className={CLASSIFICATION_BG_COLORS[student.classification.classification]}
        >
          {formatNumber(student.classification.average)}
        </Badge>
      </div>
    </button>
  );

  const CriticalStudentCard = ({
    student,
    onSelect,
  }: {
    student: StudentAnalytics;
    onSelect?: (value: StudentAnalytics) => void;
  }) => {
    const isCritico = student.classification.classification === 'critico';

    return (
      <button
        type="button"
        onClick={() => onSelect?.(student)}
        className="group w-full rounded-md border border-border/50 bg-background p-3 text-left transition-colors hover:border-border hover:bg-accent/5"
        style={{
          borderLeftWidth: 4,
          borderLeftColor: CLASSIFICATION_COLORS[student.classification.classification],
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{student.student.name}</p>
              <Badge
                variant="outline"
                className={CLASSIFICATION_BG_COLORS[student.classification.classification]}
              >
                {CLASSIFICATION_LABELS[student.classification.classification]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {student.className} • Média: {formatNumber(student.classification.average)}
            </p>
          </div>
        </div>

        {!subjectMode && student.classification.subjectsBelow6.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">
              Disciplinas em recuperação ({student.classification.subjectsBelow6Count}):
            </p>
            <div className="flex flex-wrap gap-1">
              {student.classification.subjectsBelow6.slice(0, 5).map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  {s.subject.length > 15 ? s.subject.substring(0, 12) + '...' : s.subject}: {formatNumber(s.average)}
                </Badge>
              ))}
              {student.classification.subjectsBelow6.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{student.classification.subjectsBelow6.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {!subjectMode && student.incidentCount > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {student.incidentCount} ocorrência(s) registrada(s)
          </p>
        )}
      </button>
    );
  };

  const criticalTotal = allCriticalStudents.length;
  const topTotal = allStudentsRanking.length;
  const classOptions = Array.from(
    new Set(allStudentsRanking.map((student) => student.className).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const normalizeSearch = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredTopRanking = allStudentsRanking
    .filter((student) => {
      if (topClassFilter !== 'all' && student.className !== topClassFilter) return false;
      if (!topSearch) return true;
      return normalizeSearch(student.student.name).includes(normalizeSearch(topSearch));
    })
    .sort((a, b) => {
      switch (topSort) {
        case 'average-asc':
          return a.classification.average - b.classification.average;
        case 'name-asc':
          return a.student.name.localeCompare(b.student.name, 'pt-BR');
        case 'name-desc':
          return b.student.name.localeCompare(a.student.name, 'pt-BR');
        default:
          return b.classification.average - a.classification.average;
      }
    });

  const filteredCriticalRanking = allCriticalStudents
    .filter((student) => {
      if (criticalClassFilter !== 'all' && student.className !== criticalClassFilter) return false;
      if (!criticalSearch) return true;
      return normalizeSearch(student.student.name).includes(normalizeSearch(criticalSearch));
    })
    .sort((a, b) => {
      if (criticalSort === 'risk') {
        if (a.classification.classification !== b.classification.classification) {
          return a.classification.classification === 'critico' ? -1 : 1;
        }
        return a.classification.average - b.classification.average;
      }
      if (criticalSort === 'average-asc') {
        return a.classification.average - b.classification.average;
      }
      if (criticalSort === 'average-desc') {
        return b.classification.average - a.classification.average;
      }
      return a.student.name.localeCompare(b.student.name, 'pt-BR');
    });

  const topPageCount = Math.max(1, Math.ceil(filteredTopRanking.length / pageSize));
  const criticalPageCount = Math.max(1, Math.ceil(filteredCriticalRanking.length / pageSize));

  const pagedTopRanking = filteredTopRanking.slice(
    (topPage - 1) * pageSize,
    topPage * pageSize,
  );
  const pagedCriticalRanking = filteredCriticalRanking.slice(
    (criticalPage - 1) * pageSize,
    criticalPage * pageSize,
  );

  const resetTopFilters = () => {
    setTopSearch('');
    setTopClassFilter('all');
    setTopSort('average-desc');
    setTopPage(1);
  };

  const resetCriticalFilters = () => {
    setCriticalSearch('');
    setCriticalClassFilter('all');
    setCriticalSort('risk');
    setCriticalPage(1);
  };

  const SortButton = ({ label, field, isActive }: { label: string; field: 'average' | 'name'; isActive: boolean }) => {
    const handleClick = () => {
      if (tabValue === 'top') {
        // Para top students: alterna entre asc e desc no campo selecionado
        if (topSort === `${field}-asc`) {
          setTopSort(`${field}-desc` as any);
        } else {
          setTopSort(`${field}-asc` as any);
        }
      } else {
        // Para critical students: 
        if (field === 'average') {
          // Cicla entre: risk -> average-asc -> average-desc -> risk
          if (criticalSort === 'risk') {
            setCriticalSort('average-asc');
          } else if (criticalSort === 'average-asc') {
            setCriticalSort('average-desc');
          } else {
            setCriticalSort('risk');
          }
        } else if (field === 'name') {
          // Para nome em críticos: alterna entre asc e desc
          if (criticalSort === 'name-asc') {
            setCriticalSort('name-desc');
          } else {
            setCriticalSort('name-asc');
          }
        }
      }
    };

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-medium hover:bg-transparent"
        onClick={handleClick}
      >
        {label}
        <ArrowUpDown className={`ml-1 h-3 w-3 ${isActive ? 'text-amber-600 dark:text-amber-400' : ''}`} />
      </Button>
    );
  };

  // Reordenar dados baseado em topSort
  const sortedTopStudents = [...topStudents].sort((a, b) => {
    switch (topSort) {
      case 'name-asc':
        return a.student.name.localeCompare(b.student.name, 'pt-BR');
      case 'name-desc':
        return b.student.name.localeCompare(a.student.name, 'pt-BR');
      case 'average-asc':
        return a.classification.average - b.classification.average;
      case 'average-desc':
        return b.classification.average - a.classification.average;
      default:
        return b.classification.average - a.classification.average;
    }
  });

  // Reordenar dados críticos baseado em criticalSort
  const sortedCriticalStudents = [...criticalStudents].sort((a, b) => {
    switch (criticalSort) {
      case 'risk':
        if (a.classification.classification !== b.classification.classification) {
          return a.classification.classification === 'critico' ? -1 : 1;
        }
        return a.classification.average - b.classification.average;
      case 'average-asc':
        return a.classification.average - b.classification.average;
      case 'average-desc':
        return b.classification.average - a.classification.average;
      case 'name-asc':
        return a.student.name.localeCompare(b.student.name, 'pt-BR');
      case 'name-desc':
        return b.student.name.localeCompare(a.student.name, 'pt-BR');
      default:
        return a.classification.classification === 'critico' ? -1 : 1;
    }
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={tabValue} onValueChange={(value) => setTabValue(value as 'top' | 'critical')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="top" className="gap-2">
              <Trophy className="h-4 w-4" />
              {subjectMode ? 'Maiores médias' : 'Destaques'}
            </TabsTrigger>
            <TabsTrigger value="critical" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              {subjectMode ? `Médias baixas (${criticalTotal})` : `Atenção (${criticalTotal})`}
            </TabsTrigger>
          </TabsList>

          {/* TAB: TOP ALUNOS */}
          <TabsContent value="top" className="mt-4">
            <div className="rounded-md border border-border/50 dark:border-border/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      <SortButton label="Aluno" field="name" isActive={topSort.includes('name')} />
                    </TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">
                      <SortButton label="Média" field="average" isActive={topSort.includes('average')} />
                    </TableHead>
                    <TableHead className="text-center">Tendência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTopStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum aluno encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTopStudents.map((student, index) => (
                      <TableRow
                        key={student.student.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenStudent(student)}
                      >
                        <TableCell className="font-medium">
                          <Badge
                            variant={index < 3 ? 'default' : 'outline'}
                            className={index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-700' : ''}
                          >
                            {index + 1}º
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.student.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.className}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={student.classification.average >= 6 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatNumber(student.classification.average)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <TrendIcon trend={student.trend} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {topTotal > topStudents.length && (
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setOpenTopRanking(true)}>
                  Ver ranking completo ({topTotal} alunos)
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB: ALUNOS CRÍTICOS */}
          <TabsContent value="critical" className="mt-4">
            <div className="rounded-md border border-border/50 dark:border-border/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Risco</TableHead>
                    <TableHead>
                      <SortButton label="Aluno" field="name" isActive={criticalSort.includes('name')} />
                    </TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">
                      <SortButton label="Média" field="average" isActive={criticalSort.includes('average')} />
                    </TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 opacity-50" />
                          <p>Nenhum aluno em risco ou atenção 🎉</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCriticalStudents.map((student) => {
                      const isCritico = student.classification.classification === 'critico';
                      return (
                        <TableRow
                          key={student.student.id}
                          className={`cursor-pointer ${isCritico ? 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20' : 'hover:bg-muted/50'}`}
                          onClick={() => handleOpenStudent(student)}
                        >
                          <TableCell>
                            {isCritico ? (
                              <Badge variant="destructive" className="w-full justify-center">
                                Crítico
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="w-full justify-center">
                                Atenção
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{student.student.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {student.className}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-600 font-semibold">
                              {formatNumber(student.classification.average)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {student.incidentCount > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {student.incidentCount} ocorrência(s)
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {criticalTotal > criticalStudents.length && (
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setOpenCriticalRanking(true)}>
                  Ver todos ({criticalTotal} alunos)
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={openTopRanking} onOpenChange={setOpenTopRanking}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ranking completo</DialogTitle>
            <DialogDescription>
              {subjectMode
                ? 'Lista completa de alunos ordenados pela média nas disciplinas selecionadas.'
                : 'Lista completa de alunos ordenados por média no recorte atual.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Input
              value={topSearch}
              onChange={(event) => {
                setTopSearch(event.target.value);
              }}
              placeholder="Buscar aluno..."
              className="h-9 w-full md:w-56"
            />
            <Select
              value={topClassFilter}
              onValueChange={(value) => {
                setTopClassFilter(value);
              }}
            >
              <SelectTrigger className="h-9 w-full md:w-56">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={topSort}
              onValueChange={(value) => {
                setTopSort(value as typeof topSort);
              }}
            >
              <SelectTrigger className="h-9 w-full md:w-52">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average-desc">Maior média</SelectItem>
                <SelectItem value="average-asc">Menor média</SelectItem>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>{filteredTopRanking.length} alunos</span>
          </div>
          <div className="flex-1 my-4 border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 p-2">
              <div className="space-y-2">
                {filteredTopRanking.map((student, index) => (
                  <StudentCard
                    key={student.student.id}
                    student={student}
                    rank={index + 1}
                    onSelect={handleOpenStudent}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCriticalRanking} onOpenChange={setOpenCriticalRanking}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {subjectMode ? 'Alunos com médias baixas' : 'Alunos em atenção ou críticos'}
            </DialogTitle>
            <DialogDescription>
              {subjectMode
                ? 'Lista completa de alunos com médias abaixo do esperado nas disciplinas selecionadas.'
                : 'Lista completa de alunos com desempenho abaixo do esperado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Input
              value={criticalSearch}
              onChange={(event) => {
                setCriticalSearch(event.target.value);
              }}
              placeholder="Buscar aluno..."
              className="h-9 w-full md:w-56"
            />
            <Select
              value={criticalClassFilter}
              onValueChange={(value) => {
                setCriticalClassFilter(value);
              }}
            >
              <SelectTrigger className="h-9 w-full md:w-56">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={criticalSort}
              onValueChange={(value) => {
                setCriticalSort(value as typeof criticalSort);
              }}
            >
              <SelectTrigger className="h-9 w-full md:w-52">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Risco (crítico primeiro)</SelectItem>
                <SelectItem value="average-asc">Menor média</SelectItem>
                <SelectItem value="average-desc">Maior média</SelectItem>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>{filteredCriticalRanking.length} alunos</span>
          </div>
          <div className="flex-1 my-4 border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 p-2">
              <div className="space-y-3">
                {filteredCriticalRanking.map((student) => (
                  <CriticalStudentCard
                    key={student.student.id}
                    student={student}
                    onSelect={handleOpenStudent}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
