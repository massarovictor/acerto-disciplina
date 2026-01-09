/**
 * Gráfico de Distribuição por Classificação
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '@/hooks/useSchoolAnalytics';
import { StudentClassification } from '@/lib/advancedAnalytics';

interface ClassificationChartProps {
  classifications: {
    critico: number;
    atencao: number;
    aprovado: number;
    excelencia: number;
  };
  totalStudents: number;
}

export function ClassificationChart({ classifications, totalStudents }: ClassificationChartProps) {
  const data = [
    { key: 'excelencia' as StudentClassification, count: classifications.excelencia },
    { key: 'aprovado' as StudentClassification, count: classifications.aprovado },
    { key: 'atencao' as StudentClassification, count: classifications.atencao },
    { key: 'critico' as StudentClassification, count: classifications.critico },
  ];
  
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Classificação</CardTitle>
        <CardDescription>
          Quantidade de alunos em cada situação acadêmica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map(item => {
            const percent = totalStudents > 0 
              ? ((item.count / totalStudents) * 100).toFixed(1) 
              : '0';
            const barWidth = totalStudents > 0 
              ? (item.count / maxCount) * 100 
              : 0;
            
            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CLASSIFICATION_COLORS[item.key] }}
                    />
                    <span className="font-medium">{CLASSIFICATION_LABELS[item.key]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">{item.count}</span>
                    <span>({percent}%)</span>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${barWidth}%`,
                      backgroundColor: CLASSIFICATION_COLORS[item.key],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Crítico:</strong> 3+ disciplinas abaixo de 6,0 |{' '}
            <strong>Atenção:</strong> 1-2 disciplinas abaixo de 6,0 |{' '}
            <strong>Aprovado:</strong> Todas &ge; 6,0 |{' '}
            <strong>Excelência:</strong> Todas &ge; 6,0 e média &ge; 8,0
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
