// Slide for Risk Analysis and Performance Prediction

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { Grade, Student } from '@/types';
import { analyzeStudentPerformance } from '@/lib/performancePrediction';
import { QUARTERS } from '@/lib/subjects';

interface RiskAnalysisSlideProps {
  grades: Grade[];
  students: Student[];
  classData: { name: string };
}

export const RiskAnalysisSlide = ({ grades, students, classData }: RiskAnalysisSlideProps) => {
  // Determinar bimestre atual (último com dados)
  const currentQuarter = QUARTERS.find(q => grades.some(g => g.quarter === q)) || QUARTERS[0];

  // Analisar cada aluno
  const studentAnalyses = students.map(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const analysis = analyzeStudentPerformance(studentGrades, currentQuarter);
    
    return {
      student,
      risk: analysis.risk,
      trend: analysis.trend.trend,
      prediction: analysis.prediction.predicted,
      recovery: analysis.recovery.potential,
    };
  }).sort((a, b) => b.risk - a.risk);

  // Categorizar por risco
  const highRisk = studentAnalyses.filter(s => s.risk > 70);
  const mediumRisk = studentAnalyses.filter(s => s.risk >= 40 && s.risk <= 70);
  const lowRisk = studentAnalyses.filter(s => s.risk < 40);

  // Estatísticas gerais
  const totalStudents = students.length;
  const avgRisk = totalStudents > 0 ? studentAnalyses.reduce((sum, s) => sum + s.risk, 0) / totalStudents : 0;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-destructive/5 to-background flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h1 className="text-3xl font-bold">{classData.name} - Análise de Risco</h1>
              <p className="text-sm text-muted-foreground">
                Predição de Desempenho e Probabilidade de Reprovação
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Risco Médio</p>
            <Badge
              variant={avgRisk > 70 ? 'destructive' : avgRisk > 40 ? 'secondary' : 'default'}
              className="text-xl px-3"
            >
              {avgRisk.toFixed(0)}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Grid de 3 Colunas */}
      <div className="flex-1 grid grid-cols-3 gap-4">
        {/* Coluna 1: Alto Risco */}
        <Card className="bg-destructive/10 backdrop-blur border-destructive/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alto Risco
              </h3>
              <Badge variant="destructive">{highRisk.length}</Badge>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {highRisk.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum aluno em alto risco
                </p>
              ) : (
                highRisk.map(analysis => (
                  <div key={analysis.student.id} className="p-2 bg-background/50 rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium flex-1 truncate">{analysis.student.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {analysis.risk.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-muted-foreground">
                      <p>Predição: {analysis.prediction.toFixed(1)}</p>
                      <p className="flex items-center gap-1">
                        Tendência:
                        {analysis.trend === 'Declínio' && <TrendingDown className="h-3 w-3 text-destructive" />}
                        {analysis.trend === 'Melhoria Constante' && <TrendingUp className="h-3 w-3 text-success" />}
                        <span className="text-xs">{analysis.trend}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {highRisk.length > 0 && (
              <div className="mt-3 p-2 bg-destructive/20 rounded text-xs">
                <p className="font-semibold">Ação Requerida:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Reunião urgente com responsáveis</li>
                  <li>Plano de recuperação imediato</li>
                  <li>Acompanhamento semanal</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2: Médio Risco */}
        <Card className="bg-warning/10 backdrop-blur border-warning/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-warning flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Médio Risco
              </h3>
              <Badge className="bg-warning">{mediumRisk.length}</Badge>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {mediumRisk.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum aluno em médio risco
                </p>
              ) : (
                mediumRisk.map(analysis => (
                  <div key={analysis.student.id} className="p-2 bg-background/50 rounded text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium flex-1 truncate">{analysis.student.name}</span>
                      <Badge className="bg-warning text-xs">
                        {analysis.risk.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-muted-foreground">
                      <p>Predição: {analysis.prediction.toFixed(1)}</p>
                      <p className="flex items-center gap-1">
                        <span className="text-xs">{analysis.trend}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {mediumRisk.length > 0 && (
              <div className="mt-3 p-2 bg-warning/20 rounded text-xs">
                <p className="font-semibold">Ação Preventiva:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Monitoramento quinzenal</li>
                  <li>Atividades de reforço</li>
                  <li>Contato com responsáveis</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 3: Baixo Risco */}
        <Card className="bg-success/10 backdrop-blur border-success/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-success flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Baixo Risco
              </h3>
              <Badge className="bg-success">{lowRisk.length}</Badge>
            </div>
            
            <div className="space-y-2 max-h-[230px] overflow-y-auto">
              {lowRisk.slice(0, 10).map(analysis => (
                <div key={analysis.student.id} className="p-2 bg-background/50 rounded text-xs">
                  <div className="flex items-start justify-between">
                    <span className="font-medium flex-1 truncate">{analysis.student.name}</span>
                    <Badge className="bg-success text-xs">
                      {analysis.risk.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
              {lowRisk.length > 10 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{lowRisk.length - 10} alunos...
                </p>
              )}
            </div>

            <div className="mt-3 p-2 bg-success/20 rounded text-xs">
              <p className="font-semibold mb-1">Estatísticas:</p>
              <div className="space-y-1">
                <p>{lowRisk.length} alunos ({((lowRisk.length / totalStudents) * 100).toFixed(0)}%)</p>
                <p>Desempenho estável e satisfatório</p>
                <p>Manter acompanhamento padrão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rodapé - Distribuição de Risco */}
      <div className="mt-4 p-4 bg-primary/5 rounded-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Distribuição de Risco:</p>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              Alto: {highRisk.length} ({((highRisk.length / totalStudents) * 100).toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-warning" />
              Médio: {mediumRisk.length} ({((mediumRisk.length / totalStudents) * 100).toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success" />
              Baixo: {lowRisk.length} ({((lowRisk.length / totalStudents) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};







