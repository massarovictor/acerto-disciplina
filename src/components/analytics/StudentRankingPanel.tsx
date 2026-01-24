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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  StudentAnalytics,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_BG_COLORS,
  getTrendColor,
  formatNumber
} from '@/hooks/useSchoolAnalytics';
import { useUIStore } from '@/stores/useUIStore';

interface StudentRankingPanelProps {
  topStudents: StudentAnalytics[];
  criticalStudents: StudentAnalytics[];
  allStudentsRanking: StudentAnalytics[];
  allCriticalStudents: StudentAnalytics[];
  focusTab?: 'top' | 'critical' | null;
  subjectMode?: boolean;
  activeSubjects?: string[];
}

export function StudentRankingPanel({
  topStudents,
  criticalStudents,
  allStudentsRanking,
  allCriticalStudents,
  focusTab,
  subjectMode = false,
  activeSubjects = [],
}: StudentRankingPanelProps) {
  const navigate = useNavigate();
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
  const [criticalSort, setCriticalSort] = useState<'risk' | 'average-asc' | 'average-desc' | 'name-asc'>('risk');
  const [criticalPage, setCriticalPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (focusTab) {
      setTabValue(focusTab);
    }
  }, [focusTab]);

  const handleOpenStudent = useCallback(
    (student: StudentAnalytics) => {
      const normalizedSubjects = (activeSubjects || []).filter(Boolean);
      const resolvedSubject =
        normalizedSubjects.length === 1
          ? normalizedSubjects[0]
          : normalizedSubjects.length > 1
            ? 'all'
            : '';
      setTrajectoryUI({
        viewMode: 'individual',
        selectedClassId: student.student.classId,
        selectedStudentId: student.student.id,
        selectedSubject: resolvedSubject,
        activeTab: 'summary',
        source: 'analytics',
      });
      navigate('/trajetoria');
    },
    [activeSubjects, navigate, setTrajectoryUI],
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
      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
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
        className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/40"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Alunos</CardTitle>
        <CardDescription>
          {subjectMode
            ? 'Desempenho por média nas disciplinas selecionadas'
            : 'Destaques e alunos que precisam de atenção'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tabValue} onValueChange={(value) => setTabValue(value as 'top' | 'critical')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="top" className="gap-2">
              <Trophy className="h-4 w-4" />
              {subjectMode ? 'Maiores médias' : 'Top 10 Destaques'}
            </TabsTrigger>
            <TabsTrigger value="critical" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              {subjectMode ? `Médias baixas (${criticalTotal})` : `Precisam de Atenção (${criticalTotal})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top" className="mt-4">
            {topStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum aluno encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{topTotal} alunos no ranking</span>
                  {topTotal > topStudents.length && (
                    <Button variant="ghost" size="sm" onClick={() => setOpenTopRanking(true)}>
                      Ver ranking completo
                    </Button>
                  )}
                </div>
                {topStudents.map((student, index) => (
                  <StudentCard
                    key={student.student.id}
                    student={student}
                    rank={index + 1}
                    onSelect={handleOpenStudent}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="critical" className="mt-4">
            {criticalStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  {subjectMode
                    ? 'Nenhum aluno abaixo do esperado nas disciplinas selecionadas'
                    : 'Nenhum aluno em situação crítica ou de atenção'}
                </p>
                <p className="text-sm">
                  🎉 Excelente! Todos os alunos estão com bom desempenho.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {subjectMode ? `${criticalTotal} alunos abaixo da média` : `${criticalTotal} alunos em risco`}
                  </span>
                  {criticalTotal > criticalStudents.length && (
                    <Button variant="ghost" size="sm" onClick={() => setOpenCriticalRanking(true)}>
                      Ver todos
                    </Button>
                  )}
                </div>
                {criticalStudents.map(student => (
                  <CriticalStudentCard
                    key={student.student.id}
                    student={student}
                    onSelect={handleOpenStudent}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={openTopRanking} onOpenChange={setOpenTopRanking}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ranking completo</DialogTitle>
            <DialogDescription>
              {subjectMode
                ? 'Lista completa de alunos ordenados pela média nas disciplinas selecionadas.'
                : 'Lista completa de alunos ordenados por média no recorte atual.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Input
              value={topSearch}
              onChange={(event) => {
                setTopSearch(event.target.value);
                setTopPage(1);
              }}
              placeholder="Buscar aluno..."
              className="h-9 w-full md:w-56"
            />
            <Select
              value={topClassFilter}
              onValueChange={(value) => {
                setTopClassFilter(value);
                setTopPage(1);
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
                setTopPage(1);
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
            <Button variant="ghost" size="sm" onClick={resetTopFilters}>
              Limpar
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredTopRanking.length} alunos</span>
            <span>
              Página {topPage} de {topPageCount}
            </span>
          </div>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-2">
              {pagedTopRanking.map((student, index) => (
                <StudentCard
                  key={student.student.id}
                  student={student}
                  rank={(topPage - 1) * pageSize + index + 1}
                  onSelect={handleOpenStudent}
                />
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={topPage <= 1}
              onClick={() => setTopPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={topPage >= topPageCount}
              onClick={() => setTopPage((prev) => Math.min(topPageCount, prev + 1))}
            >
              Próxima
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCriticalRanking} onOpenChange={setOpenCriticalRanking}>
        <DialogContent className="max-w-2xl">
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
          <div className="flex flex-wrap gap-2">
            <Input
              value={criticalSearch}
              onChange={(event) => {
                setCriticalSearch(event.target.value);
                setCriticalPage(1);
              }}
              placeholder="Buscar aluno..."
              className="h-9 w-full md:w-56"
            />
            <Select
              value={criticalClassFilter}
              onValueChange={(value) => {
                setCriticalClassFilter(value);
                setCriticalPage(1);
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
                setCriticalPage(1);
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
            <Button variant="ghost" size="sm" onClick={resetCriticalFilters}>
              Limpar
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredCriticalRanking.length} alunos</span>
            <span>
              Página {criticalPage} de {criticalPageCount}
            </span>
          </div>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {pagedCriticalRanking.map((student) => (
                <CriticalStudentCard
                  key={student.student.id}
                  student={student}
                  onSelect={handleOpenStudent}
                />
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={criticalPage <= 1}
              onClick={() => setCriticalPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={criticalPage >= criticalPageCount}
              onClick={() => setCriticalPage((prev) => Math.min(criticalPageCount, prev + 1))}
            >
              Próxima
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
