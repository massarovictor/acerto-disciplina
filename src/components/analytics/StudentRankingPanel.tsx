/**
 * Painel de Ranking de Alunos
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { 
  StudentAnalytics, 
  CLASSIFICATION_COLORS, 
  CLASSIFICATION_LABELS,
  CLASSIFICATION_BG_COLORS,
  getTrendColor,
  formatNumber 
} from '@/hooks/useSchoolAnalytics';
import { StudentClassification } from '@/lib/advancedAnalytics';

interface StudentRankingPanelProps {
  topStudents: StudentAnalytics[];
  criticalStudents: StudentAnalytics[];
}

export function StudentRankingPanel({ topStudents, criticalStudents }: StudentRankingPanelProps) {
  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    const className = `h-3 w-3 ${getTrendColor(trend)}`;
    if (trend === 'up') return <TrendingUp className={className} />;
    if (trend === 'down') return <TrendingDown className={className} />;
    return <Minus className={className} />;
  };

  const StudentCard = ({ student, rank }: { student: StudentAnalytics; rank?: number }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
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
    </div>
  );

  const CriticalStudentCard = ({ student }: { student: StudentAnalytics }) => {
    const isCritico = student.classification.classification === 'critico';
    
    return (
      <div 
        className="p-3 rounded-lg border transition-colors"
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
        
        {student.classification.subjectsBelow6.length > 0 && (
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
        
        {student.incidentCount > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ {student.incidentCount} ocorrência(s) registrada(s)
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Alunos</CardTitle>
        <CardDescription>
          Destaques e alunos que precisam de atenção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="top" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="top" className="gap-2">
              <Trophy className="h-4 w-4" />
              Top 10 Destaques
            </TabsTrigger>
            <TabsTrigger value="critical" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Precisam de Atenção ({criticalStudents.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="top" className="mt-4">
            {topStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum aluno encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topStudents.map((student, index) => (
                  <StudentCard 
                    key={student.student.id} 
                    student={student} 
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="critical" className="mt-4">
            {criticalStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum aluno em situação crítica ou de atenção</p>
                <p className="text-sm">🎉 Excelente! Todos os alunos estão com bom desempenho.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {criticalStudents.map(student => (
                  <CriticalStudentCard 
                    key={student.student.id} 
                    student={student}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
