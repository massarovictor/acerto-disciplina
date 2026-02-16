/**
 * Dialog de predições acadêmicas
 */

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { PredictionSummary, StudentPrediction } from '@/hooks/useSchoolAnalytics';

interface PredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  predictions: StudentPrediction[];
  summary: PredictionSummary;
  schoolYearLabel: string;
}

type PredictionFilter = 'all' | 'high' | 'medium' | 'low' | 'insufficient';

export function PredictionDialog({
  open,
  onOpenChange,
  predictions,
  summary,
  schoolYearLabel,
}: PredictionDialogProps) {
  const [filter, setFilter] = useState<PredictionFilter>('all');

  const filteredPredictions = useMemo(() => {
    const list = predictions.slice();
    if (filter === 'insufficient') {
      return list.filter((p) => !p.hasSufficientData);
    }
    if (filter === 'high') {
      return list.filter((p) => p.hasSufficientData && p.risk >= 70);
    }
    if (filter === 'medium') {
      return list.filter((p) => p.hasSufficientData && p.risk >= 40 && p.risk < 70);
    }
    if (filter === 'low') {
      return list.filter((p) => p.hasSufficientData && p.risk < 40);
    }
    return list;
  }, [predictions, filter]);

  const sortedPredictions = useMemo(
    () =>
      filteredPredictions.sort((a, b) => {
        if (!a.hasSufficientData && b.hasSufficientData) return 1;
        if (a.hasSufficientData && !b.hasSufficientData) return -1;
        return b.risk - a.risk;
      }),
    [filteredPredictions],
  );

  const getRiskBadge = (risk: number) => {
    if (risk >= 70) {
      return <Badge variant="destructive">Alto</Badge>;
    }
    if (risk >= 40) {
      return <Badge className="bg-warning/100">Médio</Badge>;
    }
    return <Badge className="bg-success/100">Baixo</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes('Melhoria')) return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend.includes('Declínio')) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Predições de Desempenho ({schoolYearLabel})</DialogTitle>
          <DialogDescription>
            Projeções baseadas em notas atuais e histórico disponível. Alunos sem dados suficientes são listados
            separadamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm">Alto risco</span>
            <Badge variant="destructive">{summary.highRisk}</Badge>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm">Médio risco</span>
            <Badge className="bg-warning/100">{summary.mediumRisk}</Badge>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm">Baixo risco</span>
            <Badge className="bg-success/100">{summary.lowRisk}</Badge>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Dados insuficientes</span>
            <Badge variant="outline">{summary.insufficient}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Total analisado: {summary.total} aluno(s)
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as PredictionFilter)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="high">Alto risco</SelectItem>
              <SelectItem value="medium">Médio risco</SelectItem>
              <SelectItem value="low">Baixo risco</SelectItem>
              <SelectItem value="insufficient">Dados insuficientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[420px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead className="text-center">Risco</TableHead>
                <TableHead className="text-center">Predição</TableHead>
                <TableHead className="text-center">Confiança</TableHead>
                <TableHead className="text-center">Tendência</TableHead>
                <TableHead className="text-center">Média atual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPredictions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Nenhum aluno para o filtro selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedPredictions.map((prediction) => (
                  <TableRow key={prediction.student.id}>
                    <TableCell className="font-medium">{prediction.student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{prediction.className}</TableCell>
                    <TableCell className="text-center">
                      {prediction.hasSufficientData ? getRiskBadge(prediction.risk) : (
                        <Badge variant="outline">--</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {prediction.hasSufficientData ? (
                        <span className="font-medium">{prediction.predicted.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground">Dados insuficientes</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {prediction.hasSufficientData ? `${prediction.confidence}%` : '--'}
                    </TableCell>
                    <TableCell className="text-center">
                      {prediction.hasSufficientData ? (
                        <span className="inline-flex items-center justify-center gap-1">
                          {getTrendIcon(prediction.trend)}
                          <span className="text-xs">{prediction.trend}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {prediction.currentAverage > 0 ? prediction.currentAverage.toFixed(1) : '--'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
