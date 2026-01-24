/**
 * Painel de Análise de Disciplinas
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BookOpen,
  Layers,
  List,
  Search
} from 'lucide-react';
import {
  SubjectAnalytics,
  AreaAnalytics,
  formatNumber
} from '@/hooks/useSchoolAnalytics';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubjectAnalysisPanelProps {
  bestSubjects: SubjectAnalytics[];
  worstSubjects: SubjectAnalytics[];
  allSubjects: SubjectAnalytics[];
  areaAnalytics: AreaAnalytics[];
}

export function SubjectAnalysisPanel({
  bestSubjects,
  worstSubjects,
  allSubjects,
  areaAnalytics
}: SubjectAnalysisPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [defaultDialogTab, setDefaultDialogTab] = useState<'best' | 'worst' | 'areas'>('worst');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  // Filter Logic
  const filterSubjects = (list: SubjectAnalytics[]) => {
    return list.filter(item => {
      const matchesSearch = item.subject.toLowerCase().includes(search.toLowerCase());
      const matchesArea = areaFilter === 'all' || item.area === areaFilter;
      return matchesSearch && matchesArea;
    });
  };

  const availableAreas = Array.from(new Set(allSubjects.map(s => s.area))).sort();

  // Sort helpers
  const sortedByBest = [...allSubjects].sort((a, b) => b.average - a.average);
  const sortedByWorst = [...allSubjects].sort((a, b) => a.average - b.average);
  const sortedByArea = [...areaAnalytics].sort((a, b) => b.average - a.average);

  const SubjectCard = ({
    subject,
    rank,
    isBest
  }: {
    subject: SubjectAnalytics;
    rank: number;
    isBest: boolean;
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBest ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}
      >
        <span className="text-sm font-bold">{rank}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{subject.subject}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {subject.area}
          </Badge>
          <span>•</span>
          <span>{subject.totalStudents} alunos</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-lg font-bold ${isBest ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatNumber(subject.average)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatNumber(subject.studentsBelow6Percent, 0)}% &lt; 6
        </p>
      </div>
    </div>
  );

  const AreaCard = ({ area }: { area: AreaAnalytics }) => {
    const avgColor = area.average >= 7
      ? 'text-emerald-600'
      : area.average >= 6
        ? 'text-amber-600'
        : 'text-red-600';

    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">{area.area}</h4>
          <Badge
            variant="outline"
            className={`${avgColor} border-current`}
          >
            Média: {formatNumber(area.average)}
          </Badge>
        </div>

        <div className="space-y-2">
          {area.subjects.slice(0, 5).map(subject => {
            const barWidth = Math.min(100, (subject.average / 10) * 100);
            const barColor = subject.average >= 7
              ? 'bg-emerald-500'
              : subject.average >= 6
                ? 'bg-amber-500'
                : 'bg-red-500';

            return (
              <div key={subject.subject} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2" title={subject.subject}>
                    {subject.subject.length > 25
                      ? subject.subject.substring(0, 22) + '...'
                      : subject.subject
                    }
                  </span>
                  <span className="font-medium">{formatNumber(subject.average)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-300`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}

          {area.subjects.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{area.subjects.length - 5} disciplinas
            </p>
          )}
        </div>
      </div>
    );
  };

  const FullRankingTable = ({ data, colorScheme }: { data: SubjectAnalytics[], colorScheme: 'best' | 'worst' }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Disciplina</TableHead>
          <TableHead>Área</TableHead>
          <TableHead className="text-right">Média</TableHead>
          <TableHead className="text-right">% Abaixo de 6.0</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((subject, idx) => (
          <TableRow key={subject.subject}>
            <TableCell className="font-medium">{idx + 1}º</TableCell>
            <TableCell>{subject.subject}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal text-xs">
                {subject.area}
              </Badge>
            </TableCell>
            <TableCell className={`text-right font-bold ${colorScheme === 'best'
              ? (subject.average >= 8 ? 'text-emerald-600' : '')
              : (subject.average < 6 ? 'text-red-600' : '')
              }`}>
              {formatNumber(subject.average)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatNumber(subject.studentsBelow6Percent, 0)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const openRanking = (tab: 'best' | 'worst') => {
    setDefaultDialogTab(tab);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Disciplinas</CardTitle>
        <CardDescription>
          Desempenho por disciplina e área do conhecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="worst" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="worst" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Críticas
            </TabsTrigger>
            <TabsTrigger value="best" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Melhores
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-2">
              <Layers className="h-4 w-4" />
              Por Área
            </TabsTrigger>
          </TabsList>

          {/* ABA: CRÍTICAS */}
          <TabsContent value="worst" className="mt-4">
            {worstSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma disciplina crítica encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{worstSubjects.length} disciplinas listadas</span>
                  <Button variant="ghost" size="sm" onClick={() => openRanking('worst')}>
                    Ver ranking completo
                  </Button>
                </div>

                {worstSubjects.map((subject, index) => (
                  <SubjectCard
                    key={subject.subject}
                    subject={subject}
                    rank={index + 1}
                    isBest={false}
                  />
                ))}

                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    <strong>Atenção:</strong> Disciplinas com alta taxa de reprovação podem indicar
                    necessidade de reforço pedagógico ou revisão metodológica.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA: MELHORES */}
          <TabsContent value="best" className="mt-4">
            {bestSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma disciplina encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{bestSubjects.length} disciplinas listadas</span>
                  <Button variant="ghost" size="sm" onClick={() => openRanking('best')}>
                    Ver ranking completo
                  </Button>
                </div>

                {bestSubjects.map((subject, index) => (
                  <SubjectCard
                    key={subject.subject}
                    subject={subject}
                    rank={index + 1}
                    isBest={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ABA: ÁREAS */}
          <TabsContent value="areas" className="mt-4">
            {areaAnalytics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma área encontrada</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {areaAnalytics
                  .sort((a, b) => b.average - a.average)
                  .map(area => (
                    <AreaCard key={area.area} area={area} />
                  ))
                }
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ranking Completo de Disciplinas</DialogTitle>
            <DialogDescription>
              {defaultDialogTab === 'best'
                ? 'Lista ordenada pelas maiores médias.'
                : defaultDialogTab === 'worst'
                  ? 'Lista ordenada pelas menores médias (atenção prioritária).'
                  : 'Visão agrupada por área do conhecimento.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 my-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar disciplina..."
              className="h-9 w-full md:w-56"
            />
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-9 w-full md:w-56">
                <SelectValue placeholder="Filtrar por Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {availableAreas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setAreaFilter('all'); }}>
              Limpar
            </Button>
          </div>

          <Tabs
            value={defaultDialogTab}
            onValueChange={(v) => setDefaultDialogTab(v as any)}
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="worst" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Críticas
              </TabsTrigger>
              <TabsTrigger value="best" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Melhores
              </TabsTrigger>
              <TabsTrigger value="areas" className="gap-2">
                <Layers className="h-4 w-4" />
                Por Área
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-4 overflow-hidden">
              <TabsContent value="best" className="h-full m-0">
                <ScrollArea className="h-full pr-4">
                  <FullRankingTable data={filterSubjects(sortedByBest)} colorScheme="best" />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="worst" className="h-full m-0">
                <ScrollArea className="h-full pr-4">
                  <FullRankingTable data={filterSubjects(sortedByWorst)} colorScheme="worst" />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="areas" className="h-full m-0">
                <ScrollArea className="h-full pr-4 show-scrollbar">
                  <div className="space-y-4 pb-4">
                    {sortedByArea
                      .filter(a => areaFilter === 'all' || a.area === areaFilter)
                      .map(area => {
                        const areaSubjects = filterSubjects([...area.subjects]);
                        if (areaSubjects.length === 0) return null;

                        return (
                          <div key={area.area} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-lg">{area.area}</h4>
                              <Badge variant="outline" className="text-base">
                                Média: {formatNumber(area.average)}
                              </Badge>
                            </div>
                            <FullRankingTable
                              data={areaSubjects.sort((a, b) => b.average - a.average)}
                              colorScheme="best"
                            />
                          </div>
                        );
                      })
                    }
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t shrink-0">
            <span>
              {defaultDialogTab === 'areas'
                ? `${availableAreas.length} áreas listadas`
                : `${filterSubjects(allSubjects).length} disciplinas encontradas`
              }
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
