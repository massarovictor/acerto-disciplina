// Slide for Pedagogical Recommendations

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle, TrendingDown, Users } from 'lucide-react';
import { Grade, Student } from '@/types';
import { analyzeStudentPerformance } from '@/lib/performancePrediction';
import { calculateMean, calculateSummaryStatistics } from '@/lib/advancedCalculations';
import { getAllSubjects } from '@/lib/subjects';
import { QUARTERS } from '@/lib/subjects';

interface RecommendationsSlideProps {
  grades: Grade[];
  students: Student[];
  classData: { name: string };
  professionalSubjects: string[];
}

export const RecommendationsSlide = ({ grades, students, classData, professionalSubjects }: RecommendationsSlideProps) => {
  const currentQuarter = QUARTERS.find(q => grades.some(g => g.quarter === q)) || QUARTERS[0];
  const allSubjects = [...getAllSubjects(), ...professionalSubjects];

  // Analisar alunos
  const studentAnalyses = students.map(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const analysis = analyzeStudentPerformance(studentGrades, currentQuarter);
    return { student, ...analysis };
  });

  // Identificar alunos que precisam de intervenção urgente
  const urgentCases = studentAnalyses.filter(s => s.risk > 70 || s.trend.trend === 'Declínio');

  // Identificar disciplinas problemáticas
  const subjectStats = allSubjects.map(subject => {
    const subjectGrades = grades.filter(g => g.subject === subject);
    const values = subjectGrades.map(g => g.grade);
    const stats = calculateSummaryStatistics(values);
    const failureRate = values.length > 0 ? (values.filter(v => v < 6).length / values.length) * 100 : 0;
    return { subject, mean: stats.mean, failureRate, count: values.length };
  }).filter(s => s.count > 0)
    .sort((a, b) => b.failureRate - a.failureRate);

  const problematicSubjects = subjectStats.filter(s => s.failureRate > 30 || s.mean < 6);

  // Identificar alunos com tendência negativa
  const decliningStudents = studentAnalyses.filter(s => s.trend.trend === 'Declínio' && s.risk > 40);

  // Calcular média geral da turma
  const classAverage = calculateMean(grades.map(g => g.grade));

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{classData.name} - Recomendações Pedagógicas</h1>
            <p className="text-sm text-muted-foreground">
              Ações Sugeridas Baseadas em Análise de Dados
            </p>
          </div>
        </div>
      </div>

      {/* Seção 1: Recomendações Urgentes */}
      <Card className="bg-red-500/10 backdrop-blur border-red-500/20 mb-4">
        <CardContent className="pt-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Ações Urgentes (Próxima Semana)
          </h3>
          
          {urgentCases.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-background/50 rounded">
                <p className="font-semibold mb-2">
                  🚨 {urgentCases.length} aluno(s) em situação crítica
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Agendar reunião urgente com responsáveis</li>
                  <li>Implementar plano de recuperação individualizado</li>
                  <li>Acompanhamento psicopedagógico imediato</li>
                  <li>Reforço escolar intensivo (mínimo 2x/semana)</li>
                </ul>
                <div className="mt-2 flex flex-wrap gap-1">
                  {urgentCases.slice(0, 5).map(s => (
                    <Badge key={s.student.id} variant="destructive" className="text-xs">
                      {s.student.name.split(' ')[0]}
                    </Badge>
                  ))}
                  {urgentCases.length > 5 && (
                    <Badge variant="outline" className="text-xs">+{urgentCases.length - 5}</Badge>
                  )}
                </div>
              </div>

              {problematicSubjects.length > 0 && (
                <div className="p-3 bg-background/50 rounded">
                  <p className="font-semibold mb-2">
                    📚 Disciplinas críticas identificadas
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Revisão urgente de metodologia e conteúdo</li>
                    <li>Capacitação docente se necessário</li>
                    <li>Aulas de reforço coletivo</li>
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {problematicSubjects.slice(0, 3).map(s => (
                      <Badge key={s.subject} variant="destructive" className="text-xs">
                        {s.subject} ({s.failureRate.toFixed(0)}% reprovação)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma ação urgente necessária no momento.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Grid com Seções 2 e 3 */}
      <div className="flex-1 grid grid-cols-[35%_65%] gap-4">
        {/* Seção 2: Ações Preventivas */}
        <Card className="bg-yellow-500/10 backdrop-blur border-yellow-500/20">
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              Ações Preventivas
            </h3>
            <p className="text-xs text-muted-foreground mb-3">(Próximo Mês)</p>
            
            <div className="space-y-3 text-sm">
              {decliningStudents.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">
                    Alunos em Declínio: {decliningStudents.length}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Monitoramento próximo</li>
                    <li>Contato preventivo com família</li>
                    <li>Identificar causas do declínio</li>
                  </ul>
                </div>
              )}

              <div>
                <p className="font-semibold mb-1">Metodologia</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Diversificar estratégias de ensino</li>
                  <li>Aumentar avaliações formativas</li>
                  <li>Implementar metodologias ativas</li>
                  <li>Grupos de estudo colaborativo</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1">Infraestrutura</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Avaliar recursos disponíveis</li>
                  <li>Atualizar materiais didáticos</li>
                  <li>Melhorar ambiente de aprendizagem</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Estratégias Gerais */}
        <Card className="bg-primary/5 backdrop-blur">
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Estratégias Gerais (Longo Prazo)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Por Disciplina</h4>
                <div className="space-y-2 text-xs">
                  {classAverage < 7 && (
                    <div className="p-2 bg-background/50 rounded">
                      <p className="font-medium">Média Geral Abaixo da Meta</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>Revisar currículo e sequência didática</li>
                        <li>Alinhar expectativas com realidade</li>
                        <li>Formação continuada de professores</li>
                      </ul>
                    </div>
                  )}

                  {subjectStats.filter(s => s.mean >= 8).length > 0 && (
                    <div className="p-2 bg-green-500/10 rounded">
                      <p className="font-medium">Compartilhar Boas Práticas</p>
                      <p className="mt-1">
                        Disciplinas bem-sucedidas: {subjectStats.filter(s => s.mean >= 8).map(s => s.subject).join(', ')}
                      </p>
                      <p className="mt-1">Identificar e replicar metodologias eficazes</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Atividades Complementares</h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-background/50 rounded">
                    <p className="font-medium mb-1">Sugestões:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Olimpíadas e competições acadêmicas</li>
                      <li>Projetos interdisciplinares</li>
                      <li>Monitoria por alunos destaque</li>
                      <li>Palestras e workshops temáticos</li>
                      <li>Grupos de estudo autônomos</li>
                      <li>Plataformas de ensino digital</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <h4 className="font-semibold text-sm mb-2">Engajamento Familiar</h4>
                <div className="p-2 bg-background/50 rounded text-xs">
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Reuniões periódicas com famílias</li>
                    <li>Canal de comunicação ativo (WhatsApp/e-mail)</li>
                    <li>Relatórios mensais de desempenho</li>
                    <li>Envolver família no processo de aprendizagem</li>
                    <li>Oficinas para orientação de estudos em casa</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rodapé */}
      <div className="mt-4 p-3 bg-primary/10 rounded-lg">
        <p className="text-xs">
          <span className="font-semibold">Nota:</span> Estas recomendações são geradas automaticamente com base na análise de dados de desempenho.
          É fundamental que a equipe pedagógica avalie cada caso individualmente, considerando contextos específicos e particularidades de cada aluno.
        </p>
      </div>
    </div>
  );
};







