/**
 * Painel de Insights Automáticos
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import { Insight } from '@/hooks/useSchoolAnalytics';

interface InsightsPanelProps {
  insights: Insight[];
}

const InsightIcon = ({ type }: { type: Insight['type'] }) => {
  const iconClass = 'h-5 w-5';
  switch (type) {
    case 'alert':
      return <AlertTriangle className={`${iconClass} text-destructive`} />;
    case 'warning':
      return <AlertCircle className={`${iconClass} text-warning`} />;
    case 'success':
      return <CheckCircle2 className={`${iconClass} text-success`} />;
    case 'info':
    default:
      return <Info className={`${iconClass} text-info`} />;
  }
};

const getInsightStyles = (type: Insight['type']) => {
  switch (type) {
    case 'alert':
      return 'border-l-red-500 bg-destructive/10';
    case 'warning':
      return 'border-l-amber-500 bg-warning/10';
    case 'success':
      return 'border-l-emerald-500 bg-success/10';
    case 'info':
    default:
      return 'border-l-blue-500 bg-info/10';
  }
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  // Ordenar por prioridade: alert > warning > info > success
  const sortedInsights = [...insights].sort((a, b) => {
    const priority = { alert: 0, warning: 1, info: 2, success: 3 };
    return priority[a.type] - priority[b.type];
  });

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-warning" />
          <CardTitle>Insights</CardTitle>
        </div>
        <CardDescription>
          Análises automáticas e recomendações
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedInsights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum insight disponível</p>
            <p className="text-xs mt-1">
              Adicione mais dados para gerar análises
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedInsights.map(insight => (
              <div 
                key={insight.id}
                className={`p-3 rounded-lg border-l-4 ${getInsightStyles(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <InsightIcon type={insight.type} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                    {insight.actionLabel && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 mt-2 text-xs"
                      >
                        {insight.actionLabel}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Resumo de Ações */}
        {sortedInsights.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-sm mb-2">Resumo de Ações</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {sortedInsights.filter(i => i.type === 'alert').length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive/100" />
                  <span>
                    {sortedInsights.filter(i => i.type === 'alert').length} alerta(s) crítico(s)
                  </span>
                </div>
              )}
              {sortedInsights.filter(i => i.type === 'warning').length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning/100" />
                  <span>
                    {sortedInsights.filter(i => i.type === 'warning').length} ponto(s) de atenção
                  </span>
                </div>
              )}
              {sortedInsights.filter(i => i.type === 'success').length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success/100" />
                  <span>
                    {sortedInsights.filter(i => i.type === 'success').length} destaque(s) positivo(s)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Dicas de Uso */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Use os filtros para analisar séries ou turmas específicas 
            e obter insights mais direcionados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
