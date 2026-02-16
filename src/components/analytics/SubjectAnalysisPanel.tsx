/**
 * Painel de Análise de Disciplinas
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useRef } from 'react';
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

interface SubjectAnalysisPanelProps {
  allSubjects: SubjectAnalytics[];
  areaAnalytics: AreaAnalytics[];
}

export function SubjectAnalysisPanel({
  allSubjects,
  areaAnalytics
}: SubjectAnalysisPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'best' | 'worst'>('best');

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

  // Preview de 5 para as abas iniciais
  const previewBest = sortedByBest.slice(0, 5);
  const previewWorst = sortedByWorst.slice(0, 5);

  // DEBUG: log counts para investigação do diálogo completo
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.info('[DEBUG] SubjectAnalysisPanel sortedByBest=', sortedByBest.length, 'sortedByWorst=', sortedByWorst.length);
      const currentList = filterSubjects(sortOrder === 'best' ? sortedByBest : sortedByWorst);
      // eslint-disable-next-line no-console
      console.info('[DEBUG] SubjectAnalysisPanel filtered length=', currentList.length, 'sortOrder=', sortOrder, 'areaFilter=', areaFilter, 'search=', search);
    } catch (e) {
      // ignore
    }
  }, [sortedByBest.length, sortedByWorst.length, sortOrder, areaFilter, search]);

  const dialogBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDialogOpen) return;
    // pequeno timeout para aguardar o DOM renderizar linhas
    const t = setTimeout(() => {
      try {
        const count = dialogBodyRef.current?.querySelectorAll('tbody tr').length ?? 0;
        // eslint-disable-next-line no-console
        console.info('[DEBUG] DOM rendered table rows in dialog =', count);
      } catch (e) {
        // ignore
      }
    }, 50);
    return () => clearTimeout(t);
  }, [isDialogOpen, sortedByBest.length, sortedByWorst.length, search, areaFilter, sortOrder]);



  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="best" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="best" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Melhores
            </TabsTrigger>
            <TabsTrigger value="worst" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Críticas
            </TabsTrigger>
          </TabsList>

          {/* ABA: MELHORES */}
          <TabsContent value="best" className="mt-4">
            {previewBest.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma disciplina encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-border/50 dark:border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead className="text-right">Média</TableHead>
                        <TableHead className="text-right">% Abaixo de 6.0</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewBest.map((subject, index) => (
                        <TableRow key={subject.subject}>
                          <TableCell className="font-medium text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${index === 0 ? 'bg-warning/100' :
                              index === 1 ? 'bg-muted' :
                                index === 2 ? 'bg-warning' :
                                  'bg-muted'
                              }`}>
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{subject.subject}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs">
                              {subject.area}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-success dark:text-success">
                              {formatNumber(subject.average)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-success dark:text-success">
                              {formatNumber(subject.studentsBelow6Percent, 0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSortOrder('best');
                      setIsDialogOpen(true);
                    }}
                  >
                    Ver ranking completo ({sortedByBest.length} disciplinas)
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA: CRÍTICAS */}
          <TabsContent value="worst" className="mt-4">
            {previewWorst.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma disciplina crítica encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-border/50 dark:border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead className="text-right">Média</TableHead>
                        <TableHead className="text-right">% Abaixo de 6.0</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewWorst.map((subject, index) => (
                        <TableRow key={subject.subject}>
                          <TableCell className="font-medium text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${index === 0 ? 'bg-destructive/100' :
                              index === 1 ? 'bg-destructive/20' :
                                index === 2 ? 'bg-warning/100' :
                                  'bg-muted'
                              }`}>
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{subject.subject}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs">
                              {subject.area}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-destructive dark:text-destructive">
                              {formatNumber(subject.average)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-destructive dark:text-destructive">
                              {formatNumber(subject.studentsBelow6Percent, 0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSortOrder('worst');
                      setIsDialogOpen(true);
                    }}
                  >
                    Ver ranking completo ({sortedByWorst.length} disciplinas)
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-primary/10">
                <List className="h-5 w-5 text-primary" />
              </div>
              Ranking Completo de Disciplinas
            </DialogTitle>
            <DialogDescription>
              {sortOrder === 'best'
                ? 'Lista ordenada pelas maiores médias'
                : 'Lista ordenada pelas menores médias (atenção prioritária)'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 shrink-0">
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
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'best' | 'worst')}>
              <SelectTrigger className="h-9 w-full md:w-56">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Melhor primeiro</SelectItem>
                <SelectItem value="worst">Pior primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 my-4 border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Média</TableHead>
                    <TableHead className="text-right">% Abaixo de 6.0</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterSubjects(sortOrder === 'best' ? sortedByBest : sortedByWorst).map((subject, idx) => (
                    <TableRow key={subject.subject}>
                      <TableCell className="font-medium text-center w-12">{idx + 1}º</TableCell>
                      <TableCell>{subject.subject}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-xs">
                          {subject.area}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${sortOrder === 'best' ? 'text-success dark:text-success' : 'text-destructive dark:text-destructive'}`}>
                        {formatNumber(subject.average)}
                      </TableCell>
                      <TableCell className={`text-right ${sortOrder === 'best' ? 'text-success dark:text-success' : 'text-destructive dark:text-destructive'}`}>
                        {formatNumber(subject.studentsBelow6Percent, 0)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pt-2 border-t">
            <span>
              {filterSubjects(sortOrder === 'best' ? sortedByBest : sortedByWorst).length} disciplinas encontradas
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
