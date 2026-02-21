/**
 * Tabela de Ranking de Turmas
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, GitCompare, ArrowUpRight } from 'lucide-react';
import {
  ClassAnalytics,
  CLASSIFICATION_COLORS,
  getTrendColor,
  formatNumber,
  AnalyticsFilters
} from '@/hooks/useSchoolAnalytics';

interface ClassRankingTableProps {
  classRanking: ClassAnalytics[];
  onSelectForComparison: (classIds: string[]) => void;
  subjectMode?: boolean;
  filters?: AnalyticsFilters;
}

type SortKey = 'rank' | 'average' | 'frequency' | 'excelencia' | 'critico' | 'growth';

export function ClassRankingTable({
  classRanking,
  onSelectForComparison,
  subjectMode = false,
  filters,
}: ClassRankingTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const validIds = new Set(classRanking.map((cls) => cls.classData.id));
    setSelectedClasses((prev) => prev.filter((id) => validIds.has(id)));
  }, [classRanking]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'critico'); // Crescente para críticos (menor é melhor)
    }
  };

  const handleClassClick = (cls: ClassAnalytics) => {
    const params = new URLSearchParams();
    params.set('classId', cls.classData.id);

    if (filters) {
      let targetSchoolYear = filters.schoolYear !== 'all' ? filters.schoolYear : undefined;

      // Se não temos a série explícita, mas temos o ano calendário, calculamos a série da turma naquele ano
      if (!targetSchoolYear && filters.calendarYear !== 'all') {
        const calYear = Number(filters.calendarYear);
        // Tentar obter o ano de início da turma
        // A lógica é: schoolYear = (calendarYear - startCalendarYear) + 1
        let startYear: number | undefined;

        if (cls.classData.startCalendarYear) {
          startYear = cls.classData.startCalendarYear;
        } else if (cls.classData.startYearDate) {
          const date = new Date(cls.classData.startYearDate);
          if (!isNaN(date.getTime())) startYear = date.getFullYear();
        }

        if (startYear) {
          const calculatedYear = calYear - startYear + 1;
          if (calculatedYear >= 1 && calculatedYear <= 3) {
            targetSchoolYear = calculatedYear as 1 | 2 | 3;
          }
        }
      }

      if (targetSchoolYear) {
        params.set('year', targetSchoolYear.toString());
      }

      if (filters.quarter && filters.quarter !== 'all') {
        params.set('period', filters.quarter);
      }
    }

    window.open(`/slides?${params.toString()}`, '_blank');
  };

  const sortedData = [...classRanking].sort((a, b) => {
    let comparison = 0;
    switch (sortKey) {
      case 'average':
        comparison = b.average - a.average;
        break;
      case 'frequency':
        comparison = b.frequency - a.frequency;
        break;
      case 'excelencia':
        comparison = b.classifications.excelencia - a.classifications.excelencia;
        break;
      case 'critico':
        comparison = a.classifications.critico - b.classifications.critico;
        break;
      case 'growth':
        comparison = (b.growth ?? 0) - (a.growth ?? 0);
        break;
      default:
        comparison = b.average - a.average;
    }
    return sortAsc ? -comparison : comparison;
  });

  const toggleClassSelection = (classId: string) => {
    setSelectedClasses(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, classId];
    });
  };

  const handleCompare = () => {
    if (selectedClasses.length >= 2) {
      onSelectForComparison(selectedClasses);
    }
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    const className = `h-4 w-4 ${getTrendColor(trend)}`;
    if (trend === 'up') return <TrendingUp className={className} />;
    if (trend === 'down') return <TrendingDown className={className} />;
    return <Minus className={className} />;
  };

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const GrowthIndicator = ({ value }: { value: number | null }) => {
    if (value === null) {
      return <span className="text-muted-foreground">--</span>;
    }
    const formatted = formatNumber(Math.abs(value));
    if (value > 0.2) {
      return (
        <span className="flex items-center justify-center gap-1 text-success">
          <TrendingUp className="h-4 w-4" />
          +{formatted}
        </span>
      );
    }
    if (value < -0.2) {
      return (
        <span className="flex items-center justify-center gap-1 text-destructive">
          <TrendingDown className="h-4 w-4" />
          -{formatted}
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        {formatted}
      </span>
    );
  };

  const visibleRows = showAll ? sortedData : sortedData.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-end gap-2">
          {sortedData.length > 8 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? 'Mostrar menos' : `Ver todas (${sortedData.length})`}
            </Button>
          )}
          {selectedClasses.length >= 2 && (
            <Button size="sm" onClick={handleCompare} className="gap-2">
              <GitCompare className="h-4 w-4" />
              Comparar ({selectedClasses.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead className="text-center">
                  <SortButton column="average" label="Média" />
                </TableHead>
                {!subjectMode && (
                  <TableHead className="text-center">
                    <SortButton column="frequency" label="Freq." />
                  </TableHead>
                )}
                <TableHead className="text-center">
                  <SortButton column="excelencia" label={subjectMode ? '≥ 8' : 'Excelência'} />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="critico" label={subjectMode ? '< 6' : 'Críticos'} />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="growth" label="Crescimento" />
                </TableHead>
                <TableHead className="text-center">Tendência</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={subjectMode ? 8 : 9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhuma turma encontrada com os filtros atuais
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((cls, index) => {
                  const isSelected = selectedClasses.includes(cls.classData.id);
                  const rank = sortedData.findIndex((item) => item.classData.id === cls.classData.id) + 1;

                  return (
                    <TableRow
                      key={cls.classData.id}
                      className={isSelected ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-medium">
                        <Badge
                          variant={rank <= 3 ? 'secondary' : 'outline'}
                          className={
                            rank === 1
                              ? 'bg-warning/20 text-warning-foreground border-warning/50 dark:bg-warning/20 dark:text-warning'
                              : rank === 2
                                ? 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground'
                                : rank === 3
                                  ? 'bg-status-analysis/20 text-status-analysis border-status-analysis/50 dark:bg-status-analysis/20 dark:text-status-analysis'
                                  : ''
                          }
                        >
                          {rank}º
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="cursor-pointer hover:underline"
                            onClick={() => handleClassClick(cls)}
                            title="Abrir relatório de slides em nova aba"
                          >
                            <p className="font-medium text-primary">{cls.classData.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cls.studentCount} alunos
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate('/turmas')}
                            title="Abrir turmas"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cls.average >= 6 ? 'text-success' : 'text-destructive'}>
                          {formatNumber(cls.average)}
                        </span>
                      </TableCell>
                      {!subjectMode && (
                        <TableCell className="text-center">
                          <span className={cls.frequency >= 75 ? 'text-success' : 'text-warning'}>
                            {formatNumber(cls.frequency, 0)}%
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: CLASSIFICATION_COLORS.excelencia,
                            color: CLASSIFICATION_COLORS.excelencia,
                          }}
                        >
                          {cls.classifications.excelencia}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: CLASSIFICATION_COLORS.critico,
                            color: CLASSIFICATION_COLORS.critico,
                          }}
                        >
                          {cls.classifications.critico}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <GrowthIndicator value={cls.growth} />
                      </TableCell>
                      <TableCell className="text-center">
                        <TrendIcon trend={cls.trend} />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClassSelection(cls.classData.id)}
                          disabled={!isSelected && selectedClasses.length >= 4}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {selectedClasses.length > 0 && selectedClasses.length < 2 && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Selecione pelo menos 2 turmas para comparar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
