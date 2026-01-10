/**
 * Tabela de comparação por coorte (ano calendário)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface CohortComparisonTableProps {
  cohorts: {
    calendarYear: number;
    classCount: number;
    studentCount: number;
    average: number;
    frequency: number;
    incidentCount: number;
    growthAverage: number | null;
  }[];
  schoolYear: number;
}

export function CohortComparisonTable({ cohorts, schoolYear }: CohortComparisonTableProps) {
  const GrowthIndicator = ({ value }: { value: number | null }) => {
    if (value === null) {
      return <span className="text-muted-foreground">--</span>;
    }
    if (value > 0.2) {
      return (
        <span className="flex items-center justify-center gap-1 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          +{value.toFixed(1)}
        </span>
      );
    }
    if (value < -0.2) {
      return (
        <span className="flex items-center justify-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          -{Math.abs(value).toFixed(1)}
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        {value.toFixed(1)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação por Ano Calendário ({schoolYear}º ano)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead className="text-center">Turmas</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
                <TableHead className="text-center">Média</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
                <TableHead className="text-center">Ocorrências</TableHead>
                <TableHead className="text-center">Crescimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum dado suficiente para comparação por ano calendário.
                  </TableCell>
                </TableRow>
              ) : (
                cohorts.map((cohort) => (
                  <TableRow key={cohort.calendarYear}>
                    <TableCell className="font-medium">{cohort.calendarYear}</TableCell>
                    <TableCell className="text-center">{cohort.classCount}</TableCell>
                    <TableCell className="text-center">{cohort.studentCount}</TableCell>
                    <TableCell className="text-center">
                      <span className={cohort.average >= 6 ? 'text-emerald-600' : 'text-red-600'}>
                        {cohort.average.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cohort.frequency >= 75 ? 'text-emerald-600' : 'text-amber-600'}>
                        {cohort.frequency.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{cohort.incidentCount}</TableCell>
                    <TableCell className="text-center">
                      <GrowthIndicator value={cohort.growthAverage} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
