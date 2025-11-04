import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, AlertCircle } from 'lucide-react';
import { Class, Student, Grade } from '@/types';

interface ClassSlide3Props {
  classData: Class;
  students: Student[];
  grades: Grade[];
}

export const ClassSlide3 = ({ classData, students, grades }: ClassSlide3Props) => {
  const classGrades = grades.filter(g => g.classId === classData.id);

  // Categorize students by performance
  const studentsByPerformance = students.map(student => {
    const studentGrades = classGrades.filter(g => g.studentId === student.id);
    const average = studentGrades.length > 0
      ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
      : 0;

    return { student, average };
  });

  const highPerformance = studentsByPerformance.filter(s => s.average >= 8);
  const mediumPerformance = studentsByPerformance.filter(s => s.average >= 6 && s.average < 8);
  const lowPerformance = studentsByPerformance.filter(s => s.average < 6);

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">{classData.name} - Categorias de Desempenho</h1>
        <p className="text-sm text-muted-foreground">
          Agrupamento por faixas de média ({students.length} alunos)
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {/* High Performance */}
        <Card className="bg-green-500/10 backdrop-blur border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-6 w-6 text-green-500" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Alto Desempenho (acima de 8.0)</h3>
                <p className="text-sm text-muted-foreground">
                  {highPerformance.length} alunos ({Math.round((highPerformance.length / students.length) * 100)}% da turma)
                </p>
              </div>
              <Badge variant="default" className="bg-green-500">
                {highPerformance.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Critérios:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Média geral acima de 8.0</li>
                  <li>• Participação ativa</li>
                  <li>• Entregas no prazo</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Exemplos:</p>
                <div className="space-y-1">
                  {highPerformance.slice(0, 3).map(item => (
                    <div key={item.student.id} className="text-sm flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{item.student.name}</span>
                      <span className="text-green-500 font-medium">{item.average.toFixed(1)}</span>
                    </div>
                  ))}
                  {highPerformance.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{highPerformance.length - 3} alunos
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background/50 rounded">
              <p className="text-sm font-medium mb-1">Ações Sugeridas:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Desafios e atividades complementares</li>
                <li>• Programa de monitoria (tutoria de colegas)</li>
                <li>• Reconhecimento e incentivos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Medium Performance */}
        <Card className="bg-yellow-500/10 backdrop-blur border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-yellow-500" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Desempenho Médio (6.0 - 7.9)</h3>
                <p className="text-sm text-muted-foreground">
                  {mediumPerformance.length} alunos ({Math.round((mediumPerformance.length / students.length) * 100)}% da turma)
                </p>
              </div>
              <Badge variant="secondary" className="bg-yellow-500/20">
                {mediumPerformance.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Critérios:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Média entre 6.0 e 7.9</li>
                  <li>• Desempenho regular</li>
                  <li>• Potencial de melhora</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Exemplos:</p>
                <div className="space-y-1">
                  {mediumPerformance.slice(0, 3).map(item => (
                    <div key={item.student.id} className="text-sm flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{item.student.name}</span>
                      <span className="text-yellow-500 font-medium">{item.average.toFixed(1)}</span>
                    </div>
                  ))}
                  {mediumPerformance.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{mediumPerformance.length - 3} alunos
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background/50 rounded">
              <p className="text-sm font-medium mb-1">Ações Sugeridas:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Aulas de reforço específicas</li>
                <li>• Revisão de conteúdos-chave</li>
                <li>• Acompanhamento individualizado</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Low Performance */}
        <Card className="bg-red-500/10 backdrop-blur border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Necessitam Intervenção (abaixo de 6.0)</h3>
                <p className="text-sm text-muted-foreground">
                  {lowPerformance.length} alunos ({Math.round((lowPerformance.length / students.length) * 100)}% da turma)
                </p>
              </div>
              <Badge variant="destructive">
                {lowPerformance.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Critérios:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Média abaixo de 6.0</li>
                  <li>• Risco de reprovação</li>
                  <li>• Requer atenção urgente</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Alunos:</p>
                <div className="space-y-1">
                  {lowPerformance.slice(0, 3).map(item => (
                    <div key={item.student.id} className="text-sm flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{item.student.name}</span>
                      <span className="text-red-500 font-medium">{item.average.toFixed(1)}</span>
                    </div>
                  ))}
                  {lowPerformance.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{lowPerformance.length - 3} alunos
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background/50 rounded border-l-4 border-red-500">
              <p className="text-sm font-medium mb-1 text-red-500">Ações Urgentes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Reunião imediata com responsáveis</li>
                <li>• Plano de recuperação personalizado</li>
                <li>• Acompanhamento psicopedagógico se necessário</li>
                <li>• Avaliação de possíveis dificuldades de aprendizagem</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};