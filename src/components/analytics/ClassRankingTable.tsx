/**
 * Tabela de Ranking de Turmas
 */

import { useState } from 'react';
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
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, GitCompare } from 'lucide-react';
import { 
  ClassAnalytics, 
  CLASSIFICATION_COLORS, 
  getTrendColor,
  formatNumber 
} from '@/hooks/useSchoolAnalytics';

interface ClassRankingTableProps {
  classRanking: ClassAnalytics[];
  onSelectForComparison: (classIds: string[]) => void;
}

type SortKey = 'rank' | 'average' | 'frequency' | 'excelencia' | 'critico' | 'growth';

export function ClassRankingTable({ classRanking, onSelectForComparison }: ClassRankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'critico'); // Crescente para críticos (menor é melhor)
    }
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
        <span className="flex items-center justify-center gap-1 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          +{formatted}
        </span>
      );
    }
    if (value < -0.2) {
      return (
        <span className="flex items-center justify-center gap-1 text-red-600">
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ranking de Turmas</CardTitle>
            <CardDescription>
              Ordenado por desempenho geral • Clique nas colunas para reordenar
            </CardDescription>
          </div>
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
                <TableHead className="text-center">
                  <SortButton column="frequency" label="Freq." />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="excelencia" label="Excelência" />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="critico" label="Críticos" />
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhuma turma encontrada com os filtros atuais
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((cls, index) => {
                  const isSelected = selectedClasses.includes(cls.classData.id);
                  const rank = index + 1;
                  
                  return (
                    <TableRow 
                      key={cls.classData.id}
                      className={isSelected ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-medium">
                        <Badge 
                          variant={rank <= 3 ? 'default' : 'outline'}
                          className={rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-slate-400' : rank === 3 ? 'bg-amber-700' : ''}
                        >
                          {rank}º
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cls.classData.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cls.studentCount} alunos
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cls.average >= 6 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatNumber(cls.average)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cls.frequency >= 75 ? 'text-emerald-600' : 'text-amber-600'}>
                          {formatNumber(cls.frequency, 0)}%
                        </span>
                      </TableCell>
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
