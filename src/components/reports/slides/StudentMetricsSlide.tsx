import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, AlertTriangle, Trophy, Users } from 'lucide-react';
import { Student, Grade, Incident } from '@/types';

interface StudentMetricsSlideProps {
  student: Student;
  grades: Grade[];
  incidents: Incident[];
  period: string;
  position: number;
  totalStudents: number;
}

export const StudentMetricsSlide = ({ student, grades, incidents, period, position, totalStudents }: StudentMetricsSlideProps) => {
  const filteredGrades = period === 'all' 
    ? grades 
    : grades.filter(g => g.quarter === period);

  const studentGrades = filteredGrades.filter(g => g.studentId === student.id);
  const averageGrade = studentGrades.length > 0
    ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length
    : 0;

  const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id));
  const criticalIncidents = studentIncidents.filter(i => 
    i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
  ).length;

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="h-24 w-24 border-4 border-primary/20">
          {student.photoUrl ? (
            <AvatarImage src={student.photoUrl} alt={student.name} />
          ) : (
            <AvatarFallback className="bg-primary/10 text-2xl">
              {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">{student.name}</h1>
          <p className="text-lg text-muted-foreground">
            Matrícula: {student.enrollment || 'Não informada'}
          </p>
          <p className="text-md text-muted-foreground">
            {period === 'all' ? 'Ano Letivo Completo' : period}
          </p>
        </div>
        <Badge 
          variant={position <= 3 ? 'default' : position <= totalStudents * 0.5 ? 'secondary' : 'outline'}
          className="text-2xl px-6 py-3"
        >
          {position}º / {totalStudents}
        </Badge>
      </div>

      {/* Metrics */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card className={`${
            averageGrade >= 7 ? 'bg-green-500/10 border-green-500/20' :
            averageGrade >= 6 ? 'bg-yellow-500/10 border-yellow-500/20' :
            'bg-red-500/10 border-red-500/20'
          } backdrop-blur`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <TrendingUp className={`h-12 w-12 ${
                  averageGrade >= 7 ? 'text-green-500' :
                  averageGrade >= 6 ? 'text-yellow-500' :
                  'text-red-500'
                }`} />
                <div>
                  <p className="text-sm text-muted-foreground">Média Geral</p>
                  <p className="text-5xl font-bold">{averageGrade.toFixed(1)}</p>
                </div>
              </div>
              <Badge 
                variant={averageGrade >= 7 ? 'default' : averageGrade >= 6 ? 'secondary' : 'destructive'}
                className="w-full justify-center text-lg py-2"
              >
                {averageGrade >= 7 ? 'Excelente Desempenho' : averageGrade >= 6 ? 'Desempenho Satisfatório' : 'Necessita Reforço'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Trophy className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Posição na Turma</p>
                  <p className="text-4xl font-bold">{position}º</p>
                </div>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${((totalStudents - position + 1) / totalStudents) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {position <= totalStudents * 0.3 ? 'Top 30% da turma' :
                 position <= totalStudents * 0.5 ? 'Acima da média' :
                 'Abaixo da média da turma'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className={`${
            studentIncidents.length === 0 ? 'bg-green-500/10 border-green-500/20' :
            criticalIncidents > 0 ? 'bg-red-500/10 border-red-500/20' :
            'bg-yellow-500/10 border-yellow-500/20'
          } backdrop-blur`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <AlertTriangle className={`h-10 w-10 ${
                  studentIncidents.length === 0 ? 'text-green-500' :
                  criticalIncidents > 0 ? 'text-red-500' :
                  'text-yellow-500'
                }`} />
                <div>
                  <p className="text-sm text-muted-foreground">Ocorrências</p>
                  <p className="text-4xl font-bold">{studentIncidents.length}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total</span>
                  <Badge variant="outline">{studentIncidents.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Graves/Gravíssimas</span>
                  <Badge variant={criticalIncidents > 0 ? 'destructive' : 'outline'}>
                    {criticalIncidents}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Estatísticas
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                  <span>Notas Lançadas</span>
                  <Badge variant="outline">{studentGrades.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                  <span>Abaixo de 6.0</span>
                  <Badge variant={studentGrades.filter(g => g.grade < 6).length > 0 ? 'destructive' : 'default'}>
                    {studentGrades.filter(g => g.grade < 6).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                  <span>Acima de 8.0</span>
                  <Badge variant="default">
                    {studentGrades.filter(g => g.grade >= 8).length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 backdrop-blur">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground text-center">
                {averageGrade < 6 ? 'Recomendação: Reforço escolar e reunião com responsáveis' :
                 averageGrade < 7 ? 'Recomendação: Acompanhamento pedagógico regular' :
                 'Recomendação: Atividades de enriquecimento e desafios'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};