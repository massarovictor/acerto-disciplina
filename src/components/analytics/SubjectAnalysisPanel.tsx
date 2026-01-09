/**
 * Painel de Análise de Disciplinas
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  BookOpen,
  Layers
} from 'lucide-react';
import { 
  SubjectAnalytics, 
  AreaAnalytics,
  formatNumber 
} from '@/hooks/useSchoolAnalytics';

interface SubjectAnalysisPanelProps {
  bestSubjects: SubjectAnalytics[];
  worstSubjects: SubjectAnalytics[];
  areaAnalytics: AreaAnalytics[];
}

export function SubjectAnalysisPanel({ 
  bestSubjects, 
  worstSubjects, 
  areaAnalytics 
}: SubjectAnalysisPanelProps) {
  
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
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBest ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Disciplinas</CardTitle>
        <CardDescription>
          Desempenho por disciplina e área do conhecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="best" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="best" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Melhores
            </TabsTrigger>
            <TabsTrigger value="worst" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Críticas
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-2">
              <Layers className="h-4 w-4" />
              Por Área
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="best" className="mt-4">
            {bestSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma disciplina encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
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
          
          <TabsContent value="worst" className="mt-4">
            {worstSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma disciplina encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {worstSubjects.map((subject, index) => (
                  <SubjectCard 
                    key={subject.subject} 
                    subject={subject} 
                    rank={index + 1}
                    isBest={false}
                  />
                ))}
                
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Disciplinas com alta taxa de reprovação podem indicar 
                    necessidade de reforço pedagógico ou revisão metodológica.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
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
    </Card>
  );
}
